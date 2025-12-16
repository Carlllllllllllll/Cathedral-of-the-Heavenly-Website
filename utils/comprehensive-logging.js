const axios = require("axios");
const moment = require("moment-timezone");
const { getClientInfo, buildDataSnapshot } = require("./security");
const { appendOwnerMention } = require("./discord");

class ComprehensiveLogger {
  constructor() {
    this.webhookURL =
      process.env.MASTER_ACTIVITY_WEBHOOK ||
      process.env.ACTIVITY_WEBHOOK ||
      process.env.SECURITY_WEBHOOK ||
      process.env.ADMIN_ACTIVITY_WEBHOOK;
  }

  async log(eventType, data, req = null) {
    if (!this.webhookURL) {
      return;
    }
    try {
      const clientInfo = req
        ? getClientInfo(req)
        : { ip: "unknown", device: "unknown", userAgent: "unknown" };
      const timestamp = moment()
        .tz("Africa/Cairo")
        .format("YYYY-MM-DD HH:mm:ss");
      const eventColors = {
        login: 0x3498db,
        logout: 0x95a5a6,
        registration: 0xf39c12,
        form_submission: 0x2ecc71,
        gift_purchase: 0xf59e0b,
        admin_action: 0x9b59b6,
        security_event: 0xe74c3c,
        error: 0xe74c3c,
        database_backup: 0x27ae60,
        user_approval: 0x27ae60,
        user_decline: 0xe74c3c,
        points_added: 0x1abc9c,
        points_removed: 0xe74c3c,
        user_banned: 0xe74c3c,
        user_unbanned: 0x27ae60,
        verification_code_generated: 0x3498db,
        deletion_audit: 0xd946ef,
      };
      const eventEmojis = {
        login: "🔐",
        logout: "👋",
        registration: "📋",
        form_submission: "📝",
        gift_purchase: "🛒",
        admin_action: "⚙️",
        security_event: "🚨",
        error: "❌",
        database_backup: "💾",
        user_approval: "✅",
        user_decline: "❌",
        points_added: "🎁",
        points_removed: "⚠️",
        user_banned: "🚫",
        user_unbanned: "🔓",
        verification_code_generated: "🔑",
        deletion_audit: "🗑️",
      };
      const embed = {
        title: `${eventEmojis[eventType] || "📌"} ${eventType}`,
        color: eventColors[eventType] || 0x95a5a6,
        fields: [
          { name: "Timestamp", value: timestamp, inline: true },
          { name: "IP Address", value: clientInfo.ip, inline: true },
          { name: "Device", value: clientInfo.device, inline: true },
          ...(data || []),
        ],
        timestamp: new Date().toISOString(),
      };
      const content = appendOwnerMention(
        `${eventEmojis[eventType] || "📌"} <@&1126336222206365696> ${eventType}`
      );
      await axios
        .post(this.webhookURL, {
          content,
          embeds: [embed],
        })
        .catch((error) => {
          console.error("Error sending log to Discord:", error.message);
        });
    } catch (error) {
      console.error("Error in comprehensive logging:", error);
    }
  }

  async logLogin(username, success, req) {
    await this.log(
      "login",
      [
        { name: "Username", value: username, inline: true },
        {
          name: "Status",
          value: success ? "✅ Success" : "❌ Failed",
          inline: true,
        },
      ],
      req
    );
  }

  async logLogout(username, req) {
    await this.log(
      "logout",
      [{ name: "Username", value: username, inline: true }],
      req
    );
  }

  async logRegistration(username, email, grade, req) {
    await this.log(
      "registration",
      [
        { name: "Username", value: username, inline: true },
        { name: "Email", value: email, inline: true },
        { name: "Grade", value: grade, inline: true },
      ],
      req
    );
  }

  async logFormSubmission(username, formTopic, score, req) {
    await this.log(
      "form_submission",
      [
        { name: "Username", value: username, inline: true },
        { name: "Form", value: formTopic, inline: true },
        { name: "Score", value: score.toString(), inline: true },
      ],
      req
    );
  }

  async logGiftPurchase(username, itemName, cost, req) {
    await this.log(
      "gift_purchase",
      [
        { name: "Username", value: username, inline: true },
        { name: "Item", value: itemName, inline: true },
        { name: "Cost", value: `${cost} points`, inline: true },
      ],
      req
    );
  }

  async logAdminAction(action, adminUsername, target, details, req) {
    await this.log(
      "admin_action",
      [
        { name: "Action", value: action, inline: true },
        { name: "Admin", value: adminUsername, inline: true },
        { name: "Target", value: target || "N/A", inline: true },
        ...(details || []),
      ],
      req
    );
  }

  async logSecurityEvent(eventType, details, req) {
    await this.log(
      "security_event",
      [
        { name: "Event Type", value: eventType, inline: true },
        ...(details || []),
      ],
      req
    );
  }

  async logError(error, context, req) {
    await this.log(
      "error",
      [
        {
          name: "Error",
          value: error.message || "Unknown error",
          inline: false,
        },
        { name: "Context", value: context || "Unknown", inline: true },
      ],
      req
    );
  }

  async logVerificationCodeGenerated(username, code, adminUsername, req) {
    await this.log(
      "verification_code_generated",
      [
        { name: "Username", value: username, inline: true },
        { name: "Verification Code", value: `\`${code}\``, inline: true },
        { name: "Generated By", value: adminUsername, inline: true },
      ],
      req
    );
  }

  async logDeletionEvent({
    actor,
    targetType,
    targetId,
    oldData,
    reason,
    req,
  }) {
    const snapshot = buildDataSnapshot(oldData);
    await this.log(
      "deletion_audit",
      [
        { name: "Actor", value: actor || "system", inline: true },
        { name: "Target Type", value: targetType || "unknown", inline: true },
        { name: "Target ID", value: targetId || "n/a", inline: true },
        { name: "Reason", value: reason || "Not provided", inline: false },
        { name: "Snapshot", value: snapshot, inline: false },
      ],
      req
    );
  }

  async logAdminUserEdit({ actor, targetUser, changes, req }) {
    const formatted = (changes || []).map((change) => ({
      name: change.field,
      value: `${change.before} → ${change.after}`,
      inline: false,
    }));
    await this.log(
      "admin_action",
      [
        { name: "Action", value: "User Update", inline: true },
        { name: "Admin", value: actor || "unknown", inline: true },
        { name: "Target", value: targetUser || "unknown", inline: true },
        ...formatted,
      ],
      req
    );
  }
}

module.exports = new ComprehensiveLogger();
