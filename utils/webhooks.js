const axios = require("axios");
const moment = require("moment-timezone");
const { appendOwnerMention } = require("./discord");

function calculateEmbedSize(embed) {
  let size = 0;
  if (embed.title) size += embed.title.length;
  if (embed.description) size += embed.description.length;
  if (embed.fields) {
    embed.fields.forEach((field) => {
      size += (field.name?.length || 0) + (field.value?.length || 0);
    });
  }
  if (embed.footer?.text) size += embed.footer.text.length;
  return size;
}

function truncateText(text, maxLength) {
  if (!text) {
    return "";
  }
  return text.length > maxLength
    ? `${text.slice(0, Math.max(0, maxLength - 3))}...`
    : text;
}

function normalizeAnswer(value, fallback) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : fallback;
  }
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value.toString();
}

async function sendWebhook(webhookURL, content, embeds) {
  if (!webhookURL) return;

  try {
    const embedsArray = Array.isArray(embeds) ? embeds : [embeds];
    const enrichedContent = appendOwnerMention(content || "");

    for (const embed of embedsArray) {
      const size = calculateEmbedSize(embed);

      if (size > 5000) {
        const smallerEmbeds = splitEmbed(embed);
        for (const smallEmbed of smallerEmbeds) {
          await axios
            .post(
              webhookURL,
              {
                content:
                  smallEmbed === smallerEmbeds[0] ? enrichedContent : null,
                embeds: [smallEmbed],
              },
              {
                headers: { "Content-Type": "application/json" },
              }
            )
            .catch(() => {});
        }
      } else {
        await axios
          .post(
            webhookURL,
            {
              content: enrichedContent,
              embeds: [embed],
            },
            {
              headers: { "Content-Type": "application/json" },
            }
          )
          .catch(() => {});
      }
    }
  } catch (error) {
    console.error("Error sending webhook:", error.message);
  }
}

function splitEmbed(embed) {
  const embeds = [];
  const maxFieldsPerEmbed = 20;

  if (!embed.fields || embed.fields.length === 0) {
    return [embed];
  }

  let currentEmbed = {
    title: embed.title,
    color: embed.color,
    fields: [],
    footer: embed.footer,
    timestamp: embed.timestamp,
  };

  for (const field of embed.fields) {
    if (currentEmbed.fields.length >= maxFieldsPerEmbed) {
      embeds.push({ ...currentEmbed });
      currentEmbed = {
        title: `${embed.title} (continued)`,
        color: embed.color,
        fields: [],
        footer: embed.footer,
        timestamp: embed.timestamp,
      };
    }

    const fieldSize = (field.name?.length || 0) + (field.value?.length || 0);
    if (fieldSize > 1024) {
      const truncatedValue = field.value.substring(0, 1020) + "...";
      currentEmbed.fields.push({
        name: field.name,
        value: truncatedValue,
        inline: field.inline,
      });
    } else {
      currentEmbed.fields.push(field);
    }
  }

  if (currentEmbed.fields.length > 0) {
    embeds.push(currentEmbed);
  }

  return embeds.length > 0 ? embeds : [embed];
}

async function sendFormSubmissionWebhook(form, submission, pointsEarned, req) {
  const webhookURL =
    process.env.ACTIVITY_WEBHOOK || process.env.FORM_SUBMISSION_WEBHOOK;
  if (!webhookURL) return;

  try {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = forwardedFor
      ? Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(",")[0].trim()
      : req.socket.remoteAddress || req.connection.remoteAddress || "unknown";

    const submissionTime = moment()
      .tz("Africa/Cairo")
      .format("YYYY-MM-DD HH:mm:ss");

    const answerDetails = form.questions.map((question, index) => {
      const rawAnswer = submission[`q${index}`];
      const comparisonAnswer = Array.isArray(rawAnswer)
        ? rawAnswer.join(", ")
        : rawAnswer?.toString() || "";
      const userAnswer = normalizeAnswer(rawAnswer, "لم يتم الإجابة");
      let correctAnswerRaw = "";

      if (question.questionType === "true-false") {
        correctAnswerRaw = question.correctAnswer || "";
      } else {
        const answerIndex =
          typeof question.correctAnswerIndex === "number"
            ? question.correctAnswerIndex
            : typeof question.correctAnswer === "number"
            ? question.correctAnswer
            : null;

        if (
          typeof answerIndex === "number" &&
          Array.isArray(question.options)
        ) {
          correctAnswerRaw = question.options[answerIndex] || "";
        } else if (typeof question.correctAnswer === "string") {
          correctAnswerRaw = question.correctAnswer;
        }
      }

      const comparisonCorrectAnswer = Array.isArray(correctAnswerRaw)
        ? correctAnswerRaw.join(", ")
        : correctAnswerRaw?.toString() || "";
      const correctAnswer = normalizeAnswer(correctAnswerRaw, "غير محدد");
      const questionPoints =
        typeof question.points === "number" ? question.points : 10;
      const isCorrect =
        comparisonAnswer.trim() === comparisonCorrectAnswer.trim();
      const points = isCorrect ? questionPoints : 0;

      return {
        questionNumber: index + 1,
        questionText: question.questionText || "",
        userAnswer,
        correctAnswer,
        isCorrect,
        points,
      };
    });

    const totalScore = answerDetails.filter((a) => a.isCorrect).length;
    const totalPoints = answerDetails.reduce((sum, a) => sum + a.points, 0);

    const embed = {
      title: "📝 Form Submission",
      color: 0x2ecc71,
      fields: [
        { name: "User", value: submission.username || "Unknown", inline: true },
        { name: "Grade", value: submission.grade || "N/A", inline: true },
        { name: "Form", value: form.topic, inline: true },
        {
          name: "Score",
          value: `${totalScore}/${form.questions.length}`,
          inline: true,
        },
        { name: "Points Earned", value: `${totalPoints} 🎁`, inline: true },
        { name: "Submission Time", value: submissionTime, inline: true },
        { name: "IP Address", value: ip, inline: true },
      ],
      footer: {
        text: `Form Link: ${req.protocol}://${req.get("host")}/form/${
          form.link
        }`,
      },
      timestamp: new Date().toISOString(),
    };

    const maxQuestionFields = Math.max(0, 25 - embed.fields.length);
    if (maxQuestionFields > 0 && answerDetails.length) {
      const fieldsToInclude = Math.min(maxQuestionFields, answerDetails.length);
      const detailFields = [];

      for (let i = 0; i < fieldsToInclude; i++) {
        const detail = answerDetails[i];
        const questionLabel = truncateText(
          detail.questionText || "سؤال بدون عنوان",
          200
        );
        const statusLabel = detail.isCorrect ? "✅ صحيح" : "❌ خطأ";
        const pointsInfo =
          typeof detail.points === "number"
            ? `\nالنقاط المكتسبة: ${detail.points}`
            : "";

        detailFields.push({
          name: `س${detail.questionNumber}: ${questionLabel}`,
          value: `اختيار الطالب: ${
            detail.userAnswer || "لم يتم الإجابة"
          }\nالإجابة الصحيحة: ${
            detail.correctAnswer || "غير محدد"
          }\n${statusLabel}${pointsInfo}`,
          inline: false,
        });
      }

      if (answerDetails.length > fieldsToInclude && detailFields.length) {
        detailFields[detailFields.length - 1].value += `\n\n... وتم اختصار ${
          answerDetails.length - fieldsToInclude
        } سؤالًا إضافيًا بسبب حدود ديسكورد.`;
      }

      embed.fields.push(...detailFields);
    }

    await sendWebhook(
      webhookURL,
      `📝 <@&1126336222206365696> Form submitted!`,
      embed
    );
  } catch (error) {
    console.error("Error preparing form submission webhook:", error);
  }
}

async function sendPurchaseWebhook(purchase, item, userPoints, req) {
  const webhookURL = process.env.ACTIVITY_WEBHOOK;
  if (!webhookURL) return;

  const embed = {
    title: "🛒 Gift Shop Purchase - Pending Review",
    color: 0xf59e0b,
    fields: [
      { name: "User", value: req.session.username, inline: true },
      { name: "Item", value: item.name, inline: true },
      { name: "Cost", value: `🎁 ${item.cost} points`, inline: true },
      { name: "Status", value: "⏳ قيد المراجعة", inline: true },
      {
        name: "Remaining Points",
        value: `🎁 ${userPoints} points`,
        inline: true,
      },
      { name: "Purchase ID", value: purchase._id.toString(), inline: false },
    ],
    footer: {
      text: "يجب مراجعة الطلب من قبل المسؤول",
    },
    timestamp: new Date().toISOString(),
  };

  await sendWebhook(
    webhookURL,
    `🛒 <@&1126336222206365696> New gift purchase request!`,
    embed
  );
}

async function sendBanWebhook(username, banType, reason, adminUsername) {
  const webhookURL =
    process.env.ADMIN_ACTIVITY_WEBHOOK || process.env.SECURITY_WEBHOOK;
  if (!webhookURL) return;

  const embed = {
    title: "🚫 User Banned",
    color: 0xe74c3c,
    fields: [
      { name: "Admin", value: adminUsername, inline: true },
      { name: "Banned User", value: username, inline: true },
      { name: "Ban Type", value: banType, inline: true },
      { name: "Reason", value: reason || "No reason provided", inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  await sendWebhook(
    webhookURL,
    `🚫 <@&1126336222206365696> User banned!`,
    embed
  );
}

module.exports = {
  sendWebhook,
  sendFormSubmissionWebhook,
  sendPurchaseWebhook,
  sendBanWebhook,
};

