const axios = require("axios");
const { logSecurityEvent, sanitizeString } = require("./security");
const { appendOwnerMention } = require("./discord");

class AutoMod {
  constructor() {
    this.rules = this.buildRules();
    this.rateLimitMap = new Map();
    this.severityWeights = { info: 1, low: 1, medium: 2, high: 4, critical: 6 };
    this.blockSeverities = new Set(["high", "critical"]);
    this.violationWindow = this.parseNumber(
      process.env.AUTOMOD_WINDOW_MS,
      900000
    );
    this.banThreshold = this.parseNumber(process.env.AUTOMOD_BAN_SCORE, 12);
    this.inputLimit = this.parseNumber(process.env.AUTOMOD_MAX_INPUT, 12000);
    this.safeFields = new Set(
      (process.env.AUTOMOD_SAFE_FIELDS || "password,passwordConfirm,token")
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    );
    this.cleanup();
  }

  parseNumber(value, fallback) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return parsed;
  }

  buildRules() {
    return [
      {
        id: "script-tag",
        type: "xss",
        severity: "critical",
        test: (value) => /<script\b[^>]*?>[\s\S]*?<\/script>/i.test(value),
      },
      {
        id: "event-handler",
        type: "xss",
        severity: "high",
        test: (value) => /on[a-z]+\s*=\s*/i.test(value),
      },
      {
        id: "javascript-uri",
        type: "xss",
        severity: "high",
        test: (value) =>
          /javascript\s*:/i.test(value) && /(href|src|data)/i.test(value),
      },
      {
        id: "iframe",
        type: "xss",
        severity: "high",
        test: (value) => /<iframe/i.test(value),
      },
      {
        id: "style-expression",
        type: "xss",
        severity: "medium",
        test: (value) => /expression\s*\(/i.test(value),
      },
      {
        id: "sql-keywords",
        type: "injection",
        severity: "critical",
        test: (value) =>
          /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b[\s\S]*?(FROM|TABLE)/i.test(
            value
          ),
      },
      {
        id: "boolean-sql",
        type: "injection",
        severity: "critical",
        test: (value) => /(\'|\")\s*(or|and)\s+[^=]{1,40}=\s*\1/i.test(value),
      },
      {
        id: "union-select",
        type: "injection",
        severity: "high",
        test: (value) => /\bunion\s+select\b/i.test(value),
      },
      {
        id: "mongo-operators",
        type: "injection",
        severity: "high",
        test: (value) =>
          /\$(where|ne|gt|lt|regex|exists|in|nin|or|and)\b/i.test(value),
      },
      {
        id: "time-delay",
        type: "injection",
        severity: "high",
        test: (value) => /\b(pg_sleep|benchmark|sleep)\s*\(/i.test(value),
      },
      {
        id: "command-exec",
        type: "command",
        severity: "critical",
        test: (value) =>
          /\b(eval|exec|system|spawn|process\.env|child_process|require\s*\()/i.test(
            value
          ),
      },
      {
        id: "path-traversal",
        type: "command",
        severity: "high",
        test: (value) => /(\.\.|%2e%2e)(\/|\\)/i.test(value),
      },
      {
        id: "data-uri",
        type: "command",
        severity: "medium",
        test: (value) => /data:text\/html/i.test(value),
      },
    ];
  }

  middleware() {
    return this.scanRequest.bind(this);
  }

  async scanRequest(req, res, next) {
    try {
      const violation = await this.inspectRequest(req);
      if (violation && this.blockSeverities.has(violation.severity)) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Request blocked by security policy",
          });
      }
      return next();
    } catch (error) {
      console.error("AutoMod middleware error:", error.message);
      return res
        .status(500)
        .json({ success: false, message: "Security middleware failure" });
    }
  }

  async inspectRequest(req) {
    const payloads = [
      { source: "body", data: req.body },
      { source: "query", data: req.query },
      { source: "params", data: req.params },
    ];
    let highestViolation = null;
    for (const payload of payloads) {
      if (!payload.data) {
        continue;
      }
      const entries = this.extractStrings(payload.data, payload.source);
      for (const entry of entries) {
        if (typeof entry.value !== "string") {
          continue;
        }
        if (this.shouldSkipField(entry.key)) {
          continue;
        }
        if (entry.value.length > this.inputLimit) {
          const violation = {
            id: "input-overflow",
            type: "overflow",
            severity: "high",
            reason: "Input length exceeded limit",
            field: entry.key,
          };
          await this.handleViolation(req, violation, entry.value);
          highestViolation = this.compareViolation(highestViolation, violation);
          continue;
        }
        const normalized = entry.value.slice(0, this.inputLimit);
        const directMatch = this.evaluate(normalized);
        const heuristicMatch = this.detectAnomalies(normalized);
        const violation = directMatch || heuristicMatch;
        if (violation) {
          const enriched = { ...violation, field: entry.key };
          await this.handleViolation(req, enriched, normalized);
          highestViolation = this.compareViolation(highestViolation, enriched);
        }
      }
    }
    return highestViolation;
  }

  shouldSkipField(keyPath) {
    if (!keyPath) {
      return false;
    }
    const fragment = keyPath.split(".").pop() || "";
    return this.safeFields.has(fragment.toLowerCase());
  }

  evaluate(value) {
    for (const rule of this.rules) {
      if (rule.test(value)) {
        return rule;
      }
    }
    return null;
  }

  detectAnomalies(value) {
    const decoded = this.safeDecode(value);
    const tokenCount = (decoded.match(/('|"|;|--|#)/g) || []).length;
    const keywordMatch =
      /\b(select|insert|update|delete|drop|script|iframe)\b/i.test(decoded);
    if (tokenCount > 6 && keywordMatch) {
      return {
        id: "dense-keywords",
        type: "injection",
        severity: "high",
        reason: "Suspicious keyword density detected",
      };
    }
    if (/([A-Za-z0-9+/]{40,})=*/.test(decoded) && decoded.length > 80) {
      return {
        id: "encoded-payload",
        type: "obfuscation",
        severity: "medium",
        reason: "Large encoded payload detected",
      };
    }
    return null;
  }

  safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch (_) {
      return value;
    }
  }

  compareViolation(current, incoming) {
    if (!current) {
      return incoming;
    }
    const currentWeight = this.severityWeights[current.severity] || 0;
    const incomingWeight = this.severityWeights[incoming.severity] || 0;
    return incomingWeight > currentWeight ? incoming : current;
  }

  async handleViolation(req, violation, sample) {
    await this.recordViolation(req, violation.severity, violation);
    await this.logSecurityThreat(
      violation.type,
      violation.reason || violation.id,
      req,
      sample
    );
  }

  getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
      return Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(",")[0].trim();
    }
    return (
      req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown"
    );
  }

  async recordViolation(req, severity, metadata) {
    const ip = this.getClientIp(req);
    const weight = this.severityWeights[severity] || 1;
    const now = Date.now();
    const entry = this.rateLimitMap.get(ip) || [];
    const recent = entry.filter(
      (item) => now - item.timestamp < this.violationWindow
    );
    recent.push({ timestamp: now, weight });
    this.rateLimitMap.set(ip, recent);
    const score = recent.reduce((sum, item) => sum + item.weight, 0);
    if (score >= this.banThreshold) {
      await this.autoBan(ip, req, metadata?.reason || "Repeated violations");
      this.rateLimitMap.set(ip, []);
    }
  }

  async autoBan(ip, req, reason) {
    try {
      const mongooseInstance = require("mongoose");
      const BannedIP = mongooseInstance.models.BannedIP;
      if (!BannedIP) {
        return;
      }
      const existing = await BannedIP.findOne({ ip });
      if (existing) {
        return;
      }
      await BannedIP.create({
        ip,
        reason: reason || "Auto-moderation ban",
        attackType: "automod",
        bannedBy: "AutoMod",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await logSecurityEvent(
        "auto_ban",
        [{ name: "IP", value: ip, inline: true }],
        req
      );
      await this.postWebhookAlert(
        "AUTO_MOD",
        `🚫 Auto ban triggered for ${ip}`
      );
    } catch (error) {
      console.error("Auto-ban error:", error.message);
    }
  }

  async logSecurityThreat(threatType, details, req, sample) {
    await logSecurityEvent(
      threatType,
      [
        { name: "Reason", value: details, inline: false },
        sample
          ? {
              name: "Sample",
              value:
                sanitizeString(sample, { maxLength: 250, stripHtml: false }) ||
                "n/a",
              inline: false,
            }
          : null,
      ].filter(Boolean),
      req
    );
    await this.postWebhookAlert(
      "SECURITY",
      `🚨 ${threatType} detected: ${details}`
    );
  }

  async postWebhookAlert(key, message) {
    const webhookMap = {
      SECURITY: process.env.SECURITY_WEBHOOK,
      AUTO_MOD: process.env.AUTO_MOD_WEBHOOK || process.env.SECURITY_WEBHOOK,
    };
    const target = webhookMap[key];
    if (!target) {
      return;
    }
    try {
      const payload = { content: appendOwnerMention(message) };
      await axios
        .post(target, payload, {
          headers: { "Content-Type": "application/json" },
        })
        .catch(() => {});
    } catch (error) {
      console.error("AutoMod webhook error:", error.message);
    }
  }

  extractStrings(data, prefix) {
    const results = [];
    const traverse = (value, keyPath) => {
      if (typeof value === "string") {
        results.push({ key: keyPath, value });
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((entry, index) =>
          traverse(entry, `${keyPath}[${index}]`)
        );
        return;
      }
      if (value && typeof value === "object") {
        Object.entries(value).forEach(([key, nested]) =>
          traverse(nested, `${keyPath}.${key}`)
        );
      }
    };
    if (data && typeof data === "object") {
      traverse(data, prefix);
    }
    return results;
  }

  cleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [ip, entries] of this.rateLimitMap.entries()) {
        const filtered = entries.filter(
          (item) => now - item.timestamp < this.violationWindow
        );
        if (filtered.length === 0) {
          this.rateLimitMap.delete(ip);
        } else {
          this.rateLimitMap.set(ip, filtered);
        }
      }
    }, 10 * 60 * 1000);
  }
}

module.exports = new AutoMod();
