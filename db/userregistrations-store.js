const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { sanitizeString, sanitizePayload } = require("../utils/security");
const { logSecurityEvent } = require("../utils/security");

class SecureUserRegistrationsStore {
  constructor() {
    this.dbDir = path.join(__dirname);
    this.filePath = path.join(this.dbDir, "userregistrations.json");
    this.lockFilePath = path.join(this.dbDir, "userregistrations.lock");
    this.maxFileSize = 50 * 1024 * 1024; e
    this.writeQueue = [];
    this.isWriting = false;
    this.lastWriteTime = 0;
    this.minWriteInterval = 100; 
    this.ensureDirectory();
    this.initializeFile();
  }

  ensureDirectory() {
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true, mode: 0o700 });
    }
    try {
      fs.chmodSync(this.dbDir, 0o700);
    } catch (err) {
      console.error("Warning: Could not set directory permissions:", err.message);
    }
  }

  initializeFile() {
    if (!fs.existsSync(this.filePath)) {
      const initialData = {
        _metadata: {
          version: "1.0",
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          totalUsers: 0,
          checksum: null,
        },
        users: [],
      };
      this.writeFileSyncSecure(JSON.stringify(initialData, null, 2));
    } else {

      this.verifyFileIntegrity();
    }
  }

  verifyFileIntegrity() {
    try {
      const content = fs.readFileSync(this.filePath, "utf8");
      if (content.length > this.maxFileSize) {
        throw new Error("File size exceeds maximum allowed size");
      }
      const data = JSON.parse(content);
      if (!data._metadata || !Array.isArray(data.users)) {
        throw new Error("Invalid file structure");
      }

      if (data._metadata.checksum) {
        const calculatedChecksum = this.calculateChecksum(data.users);
        if (calculatedChecksum !== data._metadata.checksum) {
          throw new Error("File integrity check failed - checksum mismatch");
        }
      }
    } catch (error) {
      console.error("File integrity verification failed:", error.message);

      this.createEmergencyBackup();
      throw error;
    }
  }

  calculateChecksum(data) {
    const hash = crypto.createHash("sha256");
    hash.update(JSON.stringify(data));
    return hash.digest("hex");
  }

  createEmergencyBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(this.dbDir, `userregistrations.backup.${timestamp}.json`);
      if (fs.existsSync(this.filePath)) {
        fs.copyFileSync(this.filePath, backupPath);
      }
    } catch (err) {
      console.error("Failed to create emergency backup:", err.message);
    }
  }

  acquireLock() {
    const maxAttempts = 50;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        if (!fs.existsSync(this.lockFilePath)) {
          fs.writeFileSync(this.lockFilePath, process.pid.toString(), { flag: "wx" });
          return true;
        }

        const lockStats = fs.statSync(this.lockFilePath);
        const lockAge = Date.now() - lockStats.mtimeMs;
        if (lockAge > 30000) {

          try {
            fs.unlinkSync(this.lockFilePath);
            fs.writeFileSync(this.lockFilePath, process.pid.toString(), { flag: "wx" });
            return true;
          } catch (e) {

          }
        }
        attempts++;

        const waitTime = Math.min(10 * attempts, 100);

        const start = Date.now();
        while (Date.now() - start < waitTime) {

        }
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error("Could not acquire file lock after multiple attempts");
        }
      }
    }
    return false;
  }

  async acquireLockAsync() {
    const maxAttempts = 50;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        try {
          await fsPromises.access(this.lockFilePath);

          const lockStats = await fsPromises.stat(this.lockFilePath);
          const lockAge = Date.now() - lockStats.mtimeMs;
          if (lockAge > 30000) {

            try {
              await fsPromises.unlink(this.lockFilePath);
            } catch (e) {

            }
          } else {

            attempts++;
            await new Promise((resolve) => setTimeout(resolve, Math.min(10 * attempts, 100)));
            continue;
          }
        } catch (err) {

        }

        try {
          await fsPromises.writeFile(this.lockFilePath, process.pid.toString(), { flag: "wx" });
          return true;
        } catch (e) {

          attempts++;
          await new Promise((resolve) => setTimeout(resolve, Math.min(10 * attempts, 100)));
        }
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error("Could not acquire file lock after multiple attempts");
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(10 * attempts, 100)));
      }
    }
    return false;
  }

  releaseLock() {
    try {
      if (fs.existsSync(this.lockFilePath)) {
        fs.unlinkSync(this.lockFilePath);
      }
    } catch (err) {
      console.error("Error releasing lock:", err.message);
    }
  }

  async releaseLockAsync() {
    try {
      await fsPromises.unlink(this.lockFilePath).catch(() => {

      });
    } catch (err) {
      console.error("Error releasing lock:", err.message);
    }
  }

  writeFileSyncSecure(content) {

    if (typeof content !== "string") {
      throw new Error("Content must be a string");
    }
    if (content.length > this.maxFileSize) {
      throw new Error("Content exceeds maximum file size");
    }

    try {
      JSON.parse(content);
    } catch (err) {
      throw new Error("Invalid JSON content");
    }

    const tempPath = this.filePath + ".tmp";
    const backupPath = this.filePath + ".bak";

    try {

      if (fs.existsSync(this.filePath)) {
        fs.copyFileSync(this.filePath, backupPath);
      }

      fs.writeFileSync(tempPath, content, {
        encoding: "utf8",
        mode: 0o600, 

        flag: "w",
      });

      fs.renameSync(tempPath, this.filePath);

      try {
        fs.chmodSync(this.filePath, 0o600);
      } catch (err) {
        console.error("Warning: Could not set file permissions:", err.message);
      }

      if (fs.existsSync(backupPath)) {
        setTimeout(() => {
          try {
            fs.unlinkSync(backupPath);
          } catch (e) {}
        }, 5000);
      }
    } catch (error) {

      if (fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, this.filePath);
        } catch (e) {
          console.error("Failed to restore from backup:", e.message);
        }
      }
      throw error;
    }
  }

  async writeFileSecure(content) {

    if (typeof content !== "string") {
      throw new Error("Content must be a string");
    }
    if (content.length > this.maxFileSize) {
      throw new Error("Content exceeds maximum file size");
    }

    try {
      JSON.parse(content);
    } catch (err) {
      throw new Error("Invalid JSON content");
    }

    const tempPath = this.filePath + ".tmp";
    const backupPath = this.filePath + ".bak";

    try {

      try {
        await fsPromises.access(this.filePath);
        await fsPromises.copyFile(this.filePath, backupPath);
      } catch (err) {

      }

      await fsPromises.writeFile(tempPath, content, {
        encoding: "utf8",
        mode: 0o600, 

        flag: "w",
      });

      await fsPromises.rename(tempPath, this.filePath);

      try {
        await fsPromises.chmod(this.filePath, 0o600);
      } catch (err) {
        console.error("Warning: Could not set file permissions:", err.message);
      }

      fsPromises.unlink(backupPath).catch(() => {

      });
    } catch (error) {

      try {
        await fsPromises.access(backupPath);
        await fsPromises.copyFile(backupPath, this.filePath);
      } catch (e) {
        console.error("Failed to restore from backup:", e.message);
      }
      throw error;
    }
  }

  sanitizeUser(user) {
    if (!user || typeof user !== "object") {
      throw new Error("User must be an object");
    }

    const sanitized = {
      _id: user._id || this.generateId(),
      username: sanitizeString((user.username || "").toString().toLowerCase().trim(), {
        maxLength: 60,
        stripHtml: true,
      }),
      password: user.password ? sanitizeString(user.password.toString(), {
        maxLength: 200,
        stripHtml: false,
      }) : undefined,
      firstName: sanitizeString((user.firstName || "").toString().trim(), {
        maxLength: 100,
        stripHtml: true,
      }),
      secondName: sanitizeString((user.secondName || "").toString().trim(), {
        maxLength: 100,
        stripHtml: true,
      }),
      email: sanitizeString((user.email || "").toString().toLowerCase().trim(), {
        maxLength: 200,
        stripHtml: true,
      }),
      phone: sanitizeString((user.phone || "").toString().trim(), {
        maxLength: 20,
        stripHtml: true,
      }),
      grade: sanitizeString((user.grade || "").toString().trim(), {
        maxLength: 50,
        stripHtml: true,
      }),
      role: sanitizeString((user.role || "student").toString().trim(), {
        maxLength: 50,
        stripHtml: true,
      }),
      approvalStatus: ["pending", "approved", "declined"].includes(user.approvalStatus)
        ? user.approvalStatus
        : "pending",
      verificationCode: user.verificationCode
        ? sanitizeString(user.verificationCode.toString(), {
            maxLength: 20,
            stripHtml: false,
          })
        : null,
      verificationCodeVerified: Boolean(user.verificationCodeVerified),
      verificationDate: user.verificationDate
        ? new Date(user.verificationDate).toISOString()
        : null,
      lastLoginAt: user.lastLoginAt
        ? new Date(user.lastLoginAt).toISOString()
        : null,
      createdAt: user.createdAt
        ? new Date(user.createdAt).toISOString()
        : new Date().toISOString(),
      reviewedBy: user.reviewedBy
        ? sanitizeString(user.reviewedBy.toString(), {
            maxLength: 60,
            stripHtml: true,
          })
        : undefined,
      reviewedAt: user.reviewedAt
        ? new Date(user.reviewedAt).toISOString()
        : undefined,
      reviewReason: user.reviewReason
        ? sanitizeString(user.reviewReason.toString(), {
            maxLength: 500,
            stripHtml: true,
          })
        : undefined,
      _isLocal: true, 

    };

    if (!sanitized.username || sanitized.username.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }
    if (!sanitized.email || !sanitized.email.includes("@")) {
      throw new Error("Invalid email address");
    }
    if (!sanitized.firstName || sanitized.firstName.length < 1) {
      throw new Error("First name is required");
    }

    return sanitized;
  }

  generateId() {
    return crypto.randomBytes(12).toString("hex");
  }

  async readAll() {
    const lockAcquired = await this.acquireLockAsync();
    if (!lockAcquired) {
      throw new Error("Could not acquire lock for read operation");
    }

    try {
      const content = await fsPromises.readFile(this.filePath, "utf8");
      const data = JSON.parse(content);

      if (!data._metadata || !Array.isArray(data.users)) {
        throw new Error("Invalid file structure");
      }

      return data.users.map((user) => ({
        ...user,
        _isLocal: true,
      }));
    } finally {
      await this.releaseLockAsync();
    }
  }

  async findById(id) {
    const users = await this.readAll();
    return users.find((u) => u._id === id) || null;
  }

  async findByUsername(username) {
    const normalized = sanitizeString((username || "").toString().toLowerCase().trim(), {
      maxLength: 60,
      stripHtml: true,
    });
    const users = await this.readAll();
    return users.find((u) => u.username === normalized) || null;
  }

  async findByEmail(email) {
    const normalized = sanitizeString((email || "").toString().toLowerCase().trim(), {
      maxLength: 200,
      stripHtml: true,
    });
    const users = await this.readAll();
    return users.find((u) => u.email === normalized) || null;
  }

  async find(query = {}) {
    const users = await this.readAll();

    if (!query || Object.keys(query).length === 0) {
      return users;
    }

    return users.filter((user) => {
      for (const [key, value] of Object.entries(query)) {
        if (key === "_id" && user._id !== value) {
          return false;
        }
        if (key === "username" && user.username !== value.toLowerCase()) {
          return false;
        }
        if (key === "email" && user.email !== value.toLowerCase()) {
          return false;
        }
        if (key === "approvalStatus" && user.approvalStatus !== value) {
          return false;
        }
        if (key === "role" && user.role !== value) {
          return false;
        }
        if (key === "grade" && user.grade !== value) {
          return false;
        }
      }
      return true;
    });
  }

  async create(userData) {
    const lockAcquired = await this.acquireLockAsync();
    if (!lockAcquired) {
      throw new Error("Could not acquire lock for write operation");
    }

    try {
      const content = await fsPromises.readFile(this.filePath, "utf8");
      const data = JSON.parse(content);

      if (!data._metadata || !Array.isArray(data.users)) {
        throw new Error("Invalid file structure");
      }

      const sanitized = this.sanitizeUser(userData);
      const existing = data.users.find(
        (u) => u.username === sanitized.username || u.email === sanitized.email
      );

      if (existing) {
        throw new Error("User with this username or email already exists");
      }

      data.users.push(sanitized);
      data._metadata.totalUsers = data.users.length;
      data._metadata.lastModified = new Date().toISOString();
      data._metadata.checksum = this.calculateChecksum(data.users);

      const jsonContent = JSON.stringify(data, null, 2);
      await this.writeFileSecure(jsonContent);

      await logSecurityEvent("user_action", [
        {
          name: "Action",
          value: "Local User Created",
          inline: true,
        },
        {
          name: "Username",
          value: sanitized.username,
          inline: true,
        },
      ]);

      return sanitized;
    } finally {
      await this.releaseLockAsync();
    }
  }

  async update(id, updateData) {

    throw new Error("Local users cannot be updated. Please contact carl to edit this user.");
  }

  async delete(id) {

    throw new Error("Local users cannot be deleted. Please contact carl to delete this user.");
  }

  async count(query = {}) {
    const users = await this.find(query);
    return users.length;
  }

  async adminUpdate(id, updateData, adminUsername) {

    if (!adminUsername || adminUsername.toLowerCase() !== "carl") {
      throw new Error("Unauthorized: Only carl can modify local users");
    }

    const lockAcquired = await this.acquireLockAsync();
    if (!lockAcquired) {
      throw new Error("Could not acquire lock for write operation");
    }

    try {
      const content = await fsPromises.readFile(this.filePath, "utf8");
      const data = JSON.parse(content);

      const userIndex = data.users.findIndex((u) => u._id === id);
      if (userIndex === -1) {
        throw new Error("User not found");
      }

      const existingUser = data.users[userIndex];
      const sanitizedUpdate = this.sanitizeUser({
        ...existingUser,
        ...updateData,
      });

      data.users[userIndex] = sanitizedUpdate;
      data._metadata.lastModified = new Date().toISOString();
      data._metadata.checksum = this.calculateChecksum(data.users);

      const jsonContent = JSON.stringify(data, null, 2);
      await this.writeFileSecure(jsonContent);

      await logSecurityEvent("admin_action", [
        {
          name: "Action",
          value: "Local User Updated (Admin)",
          inline: true,
        },
        {
          name: "Admin",
          value: adminUsername,
          inline: true,
        },
        {
          name: "Username",
          value: sanitizedUpdate.username,
          inline: true,
        },
      ]);

      return sanitizedUpdate;
    } finally {
      await this.releaseLockAsync();
    }
  }
}

module.exports = new SecureUserRegistrationsStore();

