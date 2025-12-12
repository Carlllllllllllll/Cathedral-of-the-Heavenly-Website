const mongoose = require("mongoose");

async function captureRemovals(items, targetType, recordDeletion) {
  if (!recordDeletion || !Array.isArray(items) || items.length === 0) {
    return;
  }
  for (const entry of items) {
    await recordDeletion({
      actor: "system",
      targetType,
      targetId: entry._id?.toString() || "unknown",
      snapshot: entry,
      reason: "scheduled_cleanup",
    });
  }
}

function scheduleDataCleanup(app, models, sendWebhook, recordDeletion) {
  const { GiftPurchase, LoginAttempt } = models;
  const runCleanup = async () => {
    if (mongoose.connection.readyState !== 1) {
      return;
    }
    try {
      const giftThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const loginThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const giftCandidates = await GiftPurchase.find({
        purchasedAt: { $lt: giftThreshold },
        status: { $in: ["accepted", "declined"] },
      }).lean();
      const loginCandidates = await LoginAttempt.find({
        timestamp: { $lt: loginThreshold },
      }).lean();
      await captureRemovals(giftCandidates, "GiftPurchase", recordDeletion);
      await captureRemovals(loginCandidates, "LoginAttempt", recordDeletion);
      if (giftCandidates.length) {
        await GiftPurchase.deleteMany({
          _id: { $in: giftCandidates.map((entry) => entry._id) },
        });
      }
      if (loginCandidates.length) {
        await LoginAttempt.deleteMany({
          _id: { $in: loginCandidates.map((entry) => entry._id) },
        });
      }
      if (giftCandidates.length || loginCandidates.length) {
        await sendWebhook("GIFT", {
          content: `[CLEANUP] Removed ${giftCandidates.length} fulfilled gift orders and ${loginCandidates.length} stale login attempts`,
        });
      }
    } catch (error) {
      console.error("Data cleanup error:", error.message);
      await sendWebhook("ERROR", {
        content: `[CLEANUP] Failure: ${error.message}`,
      });
    }
  };
  if (app && app.locals) {
    app.locals.runDataCleanup = runCleanup;
  }
  runCleanup().catch(() => {});
  setInterval(() => runCleanup().catch(() => {}), 7 * 24 * 60 * 60 * 1000);
}

module.exports = { scheduleDataCleanup };
