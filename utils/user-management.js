const axios = require("axios");
const { sanitizeString } = require("./security");

function normalizeUsername(value) {
  return sanitizeString((value || "").toString().trim(), {
    maxLength: 60,
    stripHtml: true,
  }).toLowerCase();
}

function normalizeReason(value, fallback) {
  const trimmed = sanitizeString(value || "", {
    maxLength: 200,
    stripHtml: true,
  });
  return trimmed || fallback;
}

async function getBanRecord(username, BannedUser) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return null;
  }
  return await BannedUser.findOne({ usernameLower: normalized });
}

async function getUserPoints(username, UserPoints) {
  const normalized = normalizeUsername(username);
  const userPoints = await UserPoints.findOne({ username: normalized });
  return userPoints ? userPoints.points : 0;
}

async function addPointsToUser(
  username,
  amount,
  reason,
  adminUsername,
  UserPoints
) {
  const normalized = normalizeUsername(username);
  let userPoints = await UserPoints.findOne({ username: normalized });
  if (!userPoints) {
    userPoints = new UserPoints({
      username: normalized,
      points: 0,
    });
  }
  const delta = parseInt(amount, 10) || 0;
  userPoints.points += delta;
  userPoints.transactions.push({
    type: "earned",
    amount: delta,
    description: normalizeReason(reason, `نقاط مضافة من قبل ${adminUsername}`),
  });
  await userPoints.save();
  return userPoints.points;
}

async function removePointsFromUser(
  username,
  amount,
  reason,
  adminUsername,
  UserPoints
) {
  const normalized = normalizeUsername(username);
  let userPoints = await UserPoints.findOne({ username: normalized });
  if (!userPoints) {
    userPoints = new UserPoints({
      username: normalized,
      points: 0,
    });
  }
  const pointsToRemove = parseInt(amount, 10) || 0;
  userPoints.points = Math.max(0, userPoints.points - pointsToRemove);
  userPoints.transactions.push({
    type: "deducted",
    amount: pointsToRemove,
    description: normalizeReason(reason, `نقاط مخصومة من قبل ${adminUsername}`),
  });
  await userPoints.save();
  return userPoints.points;
}

async function sendUserManagementWebhook(
  action,
  adminUsername,
  targetUsername,
  details,
  webhookURL
) {
  if (!webhookURL) {
    return;
  }
  const actionColors = {
    points_added: 0x1abc9c,
    points_removed: 0xe74c3c,
    user_updated: 0x3498db,
    user_deleted: 0xe74c3c,
    user_banned: 0xe74c3c,
    user_unbanned: 0x27ae60,
  };
  const actionEmojis = {
    points_added: "🎁",
    points_removed: "⚠️",
    user_updated: "✏️",
    user_deleted: "🗑️",
    user_banned: "🚫",
    user_unbanned: "✅",
  };
  try {
    await axios
      .post(webhookURL, {
        content: `${
          actionEmojis[action] || "📝"
        } <@&1126336222206365696> User management action!`,
        embeds: [
          {
            title: `User Management: ${action}`,
            color: actionColors[action] || 0x95a5a6,
            fields: [
              { name: "Admin", value: adminUsername, inline: true },
              { name: "Target User", value: targetUsername, inline: true },
              ...(details || []),
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      })
      .catch(() => {});
  } catch (error) {
    console.error("Error sending user management webhook:", error);
  }
}

module.exports = {
  normalizeUsername,
  getBanRecord,
  getUserPoints,
  addPointsToUser,
  removePointsFromUser,
  sendUserManagementWebhook,
};
