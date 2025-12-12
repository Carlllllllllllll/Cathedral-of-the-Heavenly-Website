const mongoose = require("mongoose");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const axios = require("axios");
const { appendOwnerMention } = require("./discord");

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, "..", "backup");
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(mongoUri) {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log("Database not connected yet, waiting...");
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Database connection timeout"));
          }, 30000);

          mongoose.connection.once("connected", () => {
            clearTimeout(timeout);
            resolve();
          });

          mongoose.connection.once("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          if (mongoose.connection.readyState === 1) {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      const timestamp = moment()
        .tz("Africa/Cairo")
        .format("YYYY-MM-DD_HH-mm-ss");
      const backupFileName = `backup_${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const collections = await db.listCollections().toArray();

      const backupData = {
        timestamp: new Date().toISOString(),
        version: "2.0",
        database: db.databaseName,
        collections: {},
        metadata: {
          totalCollections: collections.length,
          backupType: "full",
          compressed: false,
        },
      };

      let totalDocuments = 0;
      for (const collection of collections) {
        const collectionName = collection.name;
        try {
          const data = await db.collection(collectionName).find({}).toArray();
          backupData.collections[collectionName] = data;
          totalDocuments += data.length;
        } catch (err) {
          console.error(`Error backing up collection ${collectionName}:`, err);
          backupData.collections[collectionName] = { error: err.message };
        }
      }

      backupData.metadata.totalDocuments = totalDocuments;

      const tempPath = backupPath + ".tmp";
      fs.writeFileSync(tempPath, JSON.stringify(backupData, null, 2), "utf8");
      fs.renameSync(tempPath, backupPath);

      const stats = fs.statSync(backupPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      backupData.metadata.fileSizeMB = fileSizeMB;

      await this.logBackupToDiscord(
        backupFileName,
        collections.length,
        totalDocuments,
        fileSizeMB
      );

      this.cleanOldBackups();

      return {
        success: true,
        path: backupPath,
        fileName: backupFileName,
        size: fileSizeMB,
        documents: totalDocuments,
      };
    } catch (error) {
      console.error("Backup error:", error);
      await this.logBackupErrorToDiscord(error);
      return { success: false, error: error.message };
    }
  }

  async cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = moment();

      for (const file of files) {
        if (file.startsWith("backup_") && file.endsWith(".json")) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          const fileDate = moment(stats.mtime);
          const daysDiff = now.diff(fileDate, "days");

          if (daysDiff > 30) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old backup: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error("Error cleaning old backups:", error);
    }
  }

  async logBackupToDiscord(
    fileName,
    collectionCount,
    documentCount = 0,
    fileSizeMB = "0"
  ) {
    return;
  }

  async logBackupErrorToDiscord(error) {
    const webhookURL =
      process.env.SECURITY_WEBHOOK || process.env.ADMIN_ACTIVITY_WEBHOOK;
    if (!webhookURL) return;

    try {
      await axios
        .post(webhookURL, {
          content: appendOwnerMention(
            `⚠️ <@&1126336222206365696> Database backup failed!`
          ),
          embeds: [
            {
              title: "Backup Error",
              color: 0xe74c3c,
              fields: [
                {
                  name: "Error",
                  value: error.message || "Unknown error",
                  inline: false,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        })
        .catch(() => {});
    } catch (err) {
      console.error("Error logging backup error to Discord:", err);
    }
  }

  async restoreBackup(backupFileName) {
    try {
      if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Database connection timeout"));
          }, 30000);

          mongoose.connection.once("connected", () => {
            clearTimeout(timeout);
            resolve();
          });

          mongoose.connection.once("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          if (mongoose.connection.readyState === 1) {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      const backupPath = path.join(this.backupDir, backupFileName);
      if (!fs.existsSync(backupPath)) {
        throw new Error("Backup file not found");
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));
      const db = mongoose.connection.db;

      if (!db) {
        throw new Error("Database connection not available");
      }

      for (const [collectionName, data] of Object.entries(
        backupData.collections
      )) {
        await db.collection(collectionName).deleteMany({});
        if (data.length > 0) {
          await db.collection(collectionName).insertMany(data);
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Restore error:", error);
      return { success: false, error: error.message };
    }
  }
}

function scheduleDailyBackups(mongoUri) {
  const backup = new DatabaseBackup();

  mongoose.connection.once("connected", async () => {
    console.log("Database connected, running initial backup...");
    try {
      await backup.createBackup(mongoUri);
    } catch (error) {
      console.error("Initial backup failed:", error.message);
    }
  });

  if (mongoose.connection.readyState === 1) {
    console.log("Database already connected, running initial backup...");
    backup.createBackup(mongoUri).catch((error) => {
      console.error("Initial backup failed:", error.message);
    });
  }

  let lastBackupHour = -1;
  setInterval(async () => {
    const now = moment().tz("Africa/Cairo");
    const hour = now.hour();

    if (hour === 2 && lastBackupHour !== 2) {
      lastBackupHour = 2;
      if (mongoose.connection.readyState === 1) {
        try {
          await backup.createBackup(mongoUri);
        } catch (error) {
          console.error("Scheduled backup failed:", error.message);
        }
      } else {
        console.log("Database not connected, skipping scheduled backup");
      }
    } else if (hour !== 2) {
      lastBackupHour = -1;
    }
  }, 60 * 60 * 1000);
}

module.exports = { DatabaseBackup, scheduleDailyBackups };
