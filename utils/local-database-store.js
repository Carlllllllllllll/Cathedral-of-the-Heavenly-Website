const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const { sendWebhook } = require("./webhooks");

class LocalDatabaseStore {
  constructor() {
    this.storageDir = path.join(__dirname, "..", "local-database");
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  getEssentialCollections() {
    const override = process.env.LOCAL_DATABASE_COLLECTIONS;
    if (override) {
      return override
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
    }
    return [
      "forms",
      "userregistrations",
      "userpoints",
      "giftshopitems",
      "giftpurchases",
    ];
  }

  getSnapshotLimit() {
    const limit = parseInt(process.env.LOCAL_DATABASE_SNAPSHOTS || "5", 10);
    return Number.isNaN(limit) ? 5 : Math.max(limit, 1);
  }

  getSnapshotFiles() {
    const files = fs
      .readdirSync(this.storageDir)
      .filter((file) => file.endsWith(".json"));
    return files
      .map((file) => {
        const fullPath = path.join(this.storageDir, file);
        const stats = fs.statSync(fullPath);
        return { file, fullPath, updatedAt: stats.mtimeMs };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  pruneSnapshots() {
    const files = this.getSnapshotFiles();
    const limit = this.getSnapshotLimit();
    if (files.length <= limit) {
      return;
    }
    const toDelete = files.slice(limit);
    toDelete.forEach((entry) => {
      try {
        fs.unlinkSync(entry.fullPath);
      } catch (_) {}
    });
  }

  async persistSnapshot() {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        return { success: false, reason: "database-not-ready" };
      }
      const collections = this.getEssentialCollections();
      const snapshot = {
        createdAt: new Date().toISOString(),
        collections: {},
      };
      for (const collectionName of collections) {
        const exists = await db
          .listCollections({ name: collectionName })
          .next();
        if (!exists) {
          continue;
        }
        const docs = await db.collection(collectionName).find({}).toArray();
        snapshot.collections[collectionName] = docs;
      }
      const timestamp = moment().tz("Africa/Cairo").format("YYYYMMDD_HHmmss");
      const fileName = `embedded_${timestamp}.json`;
      const tempPath = path.join(this.storageDir, `${fileName}.tmp`);
      const finalPath = path.join(this.storageDir, fileName);
      fs.writeFileSync(tempPath, JSON.stringify(snapshot));
      fs.renameSync(tempPath, finalPath);
      this.pruneSnapshots();
      await this.notify(`Embedded snapshot ${fileName} saved`);
      return { success: true, fileName, path: finalPath };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  getLatestSnapshot() {
    const files = this.getSnapshotFiles();
    return files.length > 0 ? files[0] : null;
  }

  async hydrateLatestSnapshot() {
    try {
      const target = this.getLatestSnapshot();
      if (!target) {
        return { hydrated: false, reason: "no-snapshot" };
      }
      const db = mongoose.connection.db;
      if (!db) {
        return { hydrated: false, reason: "database-not-ready" };
      }
      const payload = JSON.parse(fs.readFileSync(target.fullPath, "utf8"));
      const entries = Object.entries(payload.collections || {});
      const result = {};
      for (const [collectionName, docs] of entries) {
        await db.collection(collectionName).deleteMany({});
        if (Array.isArray(docs) && docs.length) {
          await db.collection(collectionName).insertMany(docs);
        }
        result[collectionName] = Array.isArray(docs) ? docs.length : 0;
      }
      await this.notify(`Embedded snapshot ${target.file} restored`);
      return { hydrated: true, fileName: target.file, collections: result };
    } catch (error) {
      return { hydrated: false, reason: error.message };
    }
  }

  async notify(message) {
    const webhook =
      process.env.DATABASE_BACKUP_WEBHOOK ||
      process.env.SECURITY_WEBHOOK ||
      process.env.ADMIN_ACTIVITY_WEBHOOK;
    if (!webhook) {
      return;
    }
    try {
      await sendWebhook(webhook, message);
    } catch (_) {}
  }
}

module.exports = new LocalDatabaseStore();
