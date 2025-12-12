const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const axios = require("axios");
const moment = require("moment-timezone");
const UAParser = require("ua-parser-js");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const fs = require("fs");

console.log(`[SERVER] Starting Church Website Application...`);

const GRADE_SLUGS = [
  "prep1",
  "prep2",
  "prep3",
  "sec1",
  "sec2",
  "sec3",
  "teachers",
  "admins",
];
const ROLE_TYPES = ["student", "teacher", "admin", "leadadmin"];
const FORM_TARGETS = ["all", ...GRADE_SLUGS, "teachers", "admins"];
const GRADE_ALIAS = {
  "prep-1": "prep1",
  "prep-2": "prep2",
  "prep-3": "prep3",
  "prep 1": "prep1",
  "prep 2": "prep2",
  "prep 3": "prep3",
  اعدادي1: "prep1",
  اعدادي2: "prep2",
  اعدادي3: "prep3",
  "sec-1": "sec1",
  "sec-2": "sec2",
  "sec-3": "sec3",
  secondary1: "sec1",
  secondary2: "sec2",
  secondary3: "sec3",
  ثانوي1: "sec1",
  ثانوي2: "sec2",
  ثانوي3: "sec3",
};
const GRADE_LABELS = {
  prep1: {
    short: "أولى إعدادي",
    long: "Preparatory Grade 1",
    verse: "لاَ يَسْتَهِنْ أَحَدٌ بِحَدَاثَتِكَ.",
  },
  prep2: {
    short: "ثانية إعدادي",
    long: "Preparatory Grade 2",
    verse: "ثَبِّتُوا قُلُوبَكُمْ، لأَنَّ مَجِيءَ الرَّبِّ قَدِ اقْتَرَبَ.",
  },
  prep3: {
    short: "ثالثة إعدادي",
    long: "Preparatory Grade 3",
    verse: "إِنَّمَا الْقَلِيلُ حِينَ يُزْرَعُ يُكْثَرُ.",
  },
  sec1: {
    short: "أولى ثانوي",
    long: "Secondary Grade 1",
    verse: "اِذْكُرْ خَالِقَكَ فِي أَيَّامِ شَبَابِكَ.",
  },
  sec2: {
    short: "ثانية ثانوي",
    long: "Secondary Grade 2",
    verse: "كُلُّ شَيْءٍ يَسْتَقِيمُ بِحِكْمَةٍ.",
  },
  sec3: {
    short: "ثالثة ثانوي",
    long: "Secondary Grade 3",
    verse:
      "لأَنِّي عَرَفْتُ الأَفْكَارَ الَّتِي أَنَا مُفَكِّرٌ بِهَا عَنْكُمْ.",
  },
};
const gradeBlueprints = {
  prep1: {
    heroTitle: "أولى إعدادي",
    heroSubtitle:
      'لاَ تَخَفْ لأَنِّي مَعَكَ، وَأُبَارِكُكَ" (سفر التكوين 26: 24)',
  },
  prep2: {
    heroTitle: "ثانية إعدادي",
    heroSubtitle:
      'لاَ تَخَفْ لأَنِّي مَعَكَ، وَأُبَارِكُكَ" (سفر التكوين 26: 24)',
  },
  prep3: {
    heroTitle: "ثالثة إعدادي",
    heroSubtitle:
      'لاَ تَخَفْ لأَنِّي مَعَكَ، وَأُبَارِكُكَ" (سفر التكوين 26: 24)',
  },
  sec1: {
    heroTitle: "أولى ثانوي",
    heroSubtitle:
      'لاَ تَخَفْ لأَنِّي مَعَكَ، وَأُبَارِكُكَ" (سفر التكوين 26: 24)',
  },
  sec2: {
    heroTitle: "ثانية ثانوي",
    heroSubtitle:
      'لاَ تَخَفْ لأَنِّي مَعَكَ، وَأُبَارِكُكَ" (سفر التكوين 26: 24)',
  },
  sec3: {
    heroTitle: "ثالثة ثانوي",
    heroSubtitle:
      'لاَ تَخَفْ لأَنِّي مَعَكَ، وَأُبَارِكُكَ" (سفر التكوين 26: 24)',
  },
};

dotenv.config();

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://kenisa-el-sama2eyeen.ooguy.com",
      "https://kenisa-el-sama2eyeen.ooguy.com",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", "https://www.google.com", "https://google.com"],
      },
    },
  })
);

app.use(mongoSanitize());
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname, "design")));
app.use(express.static(path.join(__dirname, "scripts")));
app.use(express.static(path.join(__dirname, "UI")));
app.use("/design", express.static(path.join(__dirname, "design")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use("/UI", express.static(path.join(__dirname, "UI")));

app.get("/design2.css", (req, res) => {
  res.sendFile(path.join(__dirname, "design", "design2.css"));
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60,
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const WEBHOOK_REGISTRY = {
  SECURITY: {
    env: "SECURITY_WEBHOOK",
    fallbackEnvs: ["MASTER_ACTIVITY_WEBHOOK", "SYSTEM_WEBHOOK"],
    label: "Security",
    emoji: "🚨",
  },
  ADMIN: {
    env: "ADMIN_ACTIVITY_WEBHOOK",
    fallbackEnvs: [
      "MASTER_ACTIVITY_WEBHOOK",
      "SYSTEM_WEBHOOK",
      "SECURITY_WEBHOOK",
    ],
    label: "Admin",
    emoji: "🛡️",
  },
  USER: {
    env: "USER_ACTIVITY_WEBHOOK",
    fallbackEnvs: [
      "ACTIVITY_WEBHOOK",
      "ADMIN_ACTIVITY_WEBHOOK",
      "MASTER_ACTIVITY_WEBHOOK",
    ],
    label: "User Activity",
    emoji: "👤",
  },
  REGISTRATION_APPROVAL: {
    env: "REGISTRATION_APPROVAL_WEBHOOK",
    fallbackEnvs: [
      "USER_ACTIVITY_WEBHOOK",
      "ADMIN_ACTIVITY_WEBHOOK",
      "MASTER_ACTIVITY_WEBHOOK",
    ],
    label: "Registration Approval",
    emoji: "📨",
  },
  FORM: {
    env: "FORM_ACTIVITY_WEBHOOK",
    fallbackEnvs: [
      "USER_ACTIVITY_WEBHOOK",
      "ACTIVITY_WEBHOOK",
      "MASTER_ACTIVITY_WEBHOOK",
    ],
    label: "Forms",
    emoji: "📝",
  },
  GIFT: {
    env: "GIFT_SHOP_ACTIVITY_WEBHOOK",
    fallbackEnvs: [
      "ADMIN_ACTIVITY_WEBHOOK",
      "USER_ACTIVITY_WEBHOOK",
      "ACTIVITY_WEBHOOK",
    ],
    label: "Gift Shop",
    emoji: "🎁",
  },
  SUGGESTION: {
    env: "SUGGESTION_ACTIVITY_WEBHOOK",
    fallbackEnvs: [
      "USER_ACTIVITY_WEBHOOK",
      "ACTIVITY_WEBHOOK",
      "MASTER_ACTIVITY_WEBHOOK",
    ],
    label: "Suggestions",
    emoji: "💡",
  },
  DATABASE: {
    env: "DATABASE_BACKUP_WEBHOOK",
    fallbackEnvs: ["SYSTEM_WEBHOOK", "SECURITY_WEBHOOK"],
    label: "Database",
    emoji: "💾",
  },
  ERROR: {
    env: "ERROR_LOGGING_WEBHOOK",
    fallbackEnvs: [
      "SYSTEM_WEBHOOK",
      "SECURITY_WEBHOOK",
      "MASTER_ACTIVITY_WEBHOOK",
    ],
    label: "Errors",
    emoji: "❌",
  },
  ATTENDANCE: {
    env: "ATTENDANCE_ACTIVITY_WEBHOOK",
    fallbackEnvs: ["USER_ACTIVITY_WEBHOOK", "ACTIVITY_WEBHOOK"],
    label: "Attendance",
    emoji: "📋",
  },
  FILE_DELETE: {
    env: "FILE_DELETE_WEBHOOK",
    fallbackEnvs: ["SYSTEM_WEBHOOK", "SECURITY_WEBHOOK"],
    label: "File Deletion",
    emoji: "🗑️",
  },
  SYSTEM: {
    env: "SYSTEM_WEBHOOK",
    fallbackEnvs: ["MASTER_ACTIVITY_WEBHOOK", "ADMIN_ACTIVITY_WEBHOOK"],
    label: "System",
    emoji: "🖥️",
  },
  NADY: {
    env: "WEBHOOK_URL1",
    fallbackEnvs: ["SUGGESTION_ACTIVITY_WEBHOOK"],
    label: "Nady Suggestions",
    emoji: "🌠",
  },
  TRIP: {
    env: "WEBHOOK_URL2",
    fallbackEnvs: ["SUGGESTION_ACTIVITY_WEBHOOK"],
    label: "Trip Suggestions",
    emoji: "✈️",
  },
  EKTMAA: {
    env: "WEBHOOK_URL3",
    fallbackEnvs: ["SUGGESTION_ACTIVITY_WEBHOOK"],
    label: "Ektmaa Suggestions",
    emoji: "🤝",
  },
};

const WEBHOOK_TIMEOUT_MS =
  Number(process.env.WEBHOOK_TIMEOUT_MS) > 0
    ? Number(process.env.WEBHOOK_TIMEOUT_MS)
    : 7000;
const WEBHOOK_RETRY_ATTEMPTS = 3;
const WEBHOOK_RETRY_DELAYS = [0, 750, 2000];
const webhookHealth = new Map();

const sleep = (ms) => (ms && ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

function prefixContent(content, prefix) {
  if (!content || typeof content !== "string") {
    return `${prefix} update`;
  }
  const trimmed = content.trim();
  if (trimmed.startsWith(prefix)) {
    return trimmed;
  }
  return `${prefix} ${trimmed}`;
}

function formatEmbeds(embeds, meta) {
  if (!Array.isArray(embeds)) {
    return [];
  }
  return embeds.map((embed) => {
    const clone = { ...embed };
    if (Array.isArray(embed.fields)) {
      clone.fields = embed.fields.map((field) => ({ ...field }));
    }
    const footerParts = [
      embed.footer?.text,
      `${meta.label || meta.type} • ${meta.eventId.slice(0, 8)}`,
    ].filter(Boolean);
    clone.footer = {
      ...(embed.footer || {}),
      text: footerParts.join(" | "),
    };
    clone.timestamp = embed.timestamp || new Date().toISOString();
    return clone;
  });
}

function buildWebhookPayload(data, meta) {
  const base =
    typeof data === "string"
      ? { content: data }
      : Array.isArray(data)
      ? { embeds: data }
      : { ...data };
  const prefix = `${meta.emoji || "📌"} [${meta.label || meta.type}]`;
  base.content = prefixContent(base.content, prefix);
  if (base.embeds) {
    base.embeds = formatEmbeds(base.embeds, meta);
  }
  base.username = base.username || "Church Activity Logs";
  return base;
}

async function dispatchWebhookTarget(target, payload, meta) {
  for (let attempt = 1; attempt <= WEBHOOK_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[WEBHOOK][${meta.type}][${meta.eventId}] attempt ${attempt} via ${target.envKey}`
      );
      await axios.post(target.url, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: WEBHOOK_TIMEOUT_MS,
      });
      console.log(
        `[WEBHOOK][${meta.type}][${meta.eventId}] delivered via ${target.envKey}`
      );
      return true;
    } catch (error) {
      console.error(
        `[WEBHOOK][${meta.type}][${meta.eventId}] attempt ${attempt} via ${target.envKey} failed: ${error.message}`
      );
      if (attempt < WEBHOOK_RETRY_ATTEMPTS) {
        const wait =
          WEBHOOK_RETRY_DELAYS[attempt] ||
          WEBHOOK_RETRY_DELAYS[WEBHOOK_RETRY_DELAYS.length - 1];
        await sleep(wait);
      }
    }
  }
  return false;
}

function updateWebhookStats(envKey, success) {
  if (!envKey) return;
  const current =
    webhookHealth.get(envKey) || {
      success: 0,
      failure: 0,
      consecutiveFailures: 0,
    };
  if (success) {
    current.success += 1;
    current.consecutiveFailures = 0;
    current.lastSuccess = Date.now();
  } else {
    current.failure += 1;
    current.consecutiveFailures += 1;
    current.lastFailure = Date.now();
    if (current.consecutiveFailures % WEBHOOK_RETRY_ATTEMPTS === 0) {
      console.warn(
        `[WEBHOOK][HEALTH] ${envKey} consecutive failures: ${current.consecutiveFailures}`
      );
    }
  }
  webhookHealth.set(envKey, current);
}

async function sendWebhook(webhookType, data = {}) {
  const registryEntry = WEBHOOK_REGISTRY[webhookType];
  const eventId = uuidv4();
  if (!registryEntry) {
    console.warn(`[WEBHOOK][${eventId}] unknown type ${webhookType}`);
    return false;
  }
  const envKeys = [registryEntry.env, ...(registryEntry.fallbackEnvs || [])].filter(
    Boolean
  );
  const targets = envKeys
    .map((envKey) => ({
      envKey,
      url: process.env[envKey],
    }))
    .filter((target) => Boolean(target.url));
  if (targets.length === 0) {
    console.warn(
      `[WEBHOOK][${webhookType}][${eventId}] missing webhook env (${envKeys.join(
        ", "
      )})`
    );
    return false;
  }
  const payload = buildWebhookPayload(data, {
    type: webhookType,
    label: registryEntry.label,
    emoji: registryEntry.emoji,
    eventId,
  });
  for (const target of targets) {
    const delivered = await dispatchWebhookTarget(target, payload, {
      type: webhookType,
      eventId,
    });
    updateWebhookStats(target.envKey, delivered);
    if (delivered) {
      return true;
    }
  }
  console.error(
    `[WEBHOOK][${webhookType}][${eventId}] failed for targets ${targets
      .map((t) => t.envKey)
      .join(", ")}`
  );
  return false;
}

async function sendFileDeleteWebhook(
  filePath,
  deletedBy,
  reason = "System cleanup"
) {
  const stats = fs.statSync(filePath);
  const fileInfo = {
    name: path.basename(filePath),
    path: filePath,
    size: formatBytes(stats.size),
    created: stats.birthtime,
    modified: stats.mtime,
    type: path.extname(filePath).toUpperCase() || "Unknown",
  };

  await sendWebhook("FILE_DELETE", {
    embeds: [
      {
        title: "🗑️ File Deleted",
        color: 0xe74c3c,
        fields: [
          { name: "File Name", value: fileInfo.name, inline: true },
          { name: "File Type", value: fileInfo.type, inline: true },
          { name: "File Size", value: fileInfo.size, inline: true },
          { name: "Deleted By", value: deletedBy, inline: true },
          { name: "Reason", value: reason, inline: true },
          { name: "Full Path", value: `\`${filePath}\``, inline: false },
          {
            name: "Created",
            value: moment(fileInfo.created).format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
          {
            name: "Last Modified",
            value: moment(fileInfo.modified).format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
          {
            name: "Timestamp",
            value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

async function cleanupOldFiles() {
  const directories = [
    path.join(__dirname, "uploads"),
    path.join(__dirname, "temp"),
    path.join(__dirname, "backups"),
  ];

  const maxAge = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;

    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await sendFileDeleteWebhook(
            filePath,
            "System",
            "Automatic cleanup of old files"
          );
          fs.unlinkSync(filePath);
          console.log(`[CLEANUP] Deleted old file: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`[CLEANUP ERROR] ${dir}:`, error.message);
    }
  }
}

setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);

setTimeout(cleanupOldFiles, 30000);

const AnnouncementSchema = new mongoose.Schema({
  page: String,
  title: String,
  content: String,
  author: String,
  timestamp: { type: Date, default: Date.now },
  priority: { type: String, default: "normal" },
});

const Announcement = mongoose.model("Announcement", AnnouncementSchema);

const PageContentSchema = new mongoose.Schema({
  page: { type: String, unique: true },
  content: String,
  lastEdited: { type: Date, default: Date.now },
  editedBy: String,
});

const PageContent = mongoose.model("PageContent", PageContentSchema);

const FormSchema = new mongoose.Schema({
  topic: { type: String, unique: true },
  expiry: Date,
  description: { type: String, default: "" },
  targetGrade: { type: String, enum: FORM_TARGETS, default: "all" },
  status: {
    type: String,
    enum: ["draft", "published", "expired"],
    default: "draft",
  },
  allowRetake: { type: Boolean, default: false },
  createdBy: String,
  updatedBy: String,
  updatedAt: { type: Date, default: Date.now },
  questions: [
    {
      questionText: String,
      questionType: {
        type: String,
        enum: ["true-false", "multiple-choice"],
        default: "multiple-choice",
      },
      options: [String],
      correctAnswer: mongoose.Schema.Types.Mixed,
      correctAnswerIndex: Number,
      required: { type: Boolean, default: true },
      points: { type: Number, default: 10 },
    },
  ],
  link: { type: String, unique: true },
  submissions: [
    {
      username: String,
      score: Number,
      grade: String,
      deviceId: String,
      ip: String,
      submissionTime: { type: Date, default: Date.now },
    },
  ],
});

const Form = mongoose.model("Form", FormSchema);

const SuggestionSchema = new mongoose.Schema({
  username: { type: String, required: true, lowercase: true, index: true },
  displayName: { type: String, default: "" },
  grade: { type: String, enum: GRADE_SLUGS, default: null },
  category: { type: String, default: "meeting" },
  text: { type: String, required: true, trim: true, maxlength: 600 },
  createdAt: { type: Date, default: Date.now },
});

SuggestionSchema.index({ username: 1, category: 1, createdAt: -1 });

const Suggestion = mongoose.model("Suggestion", SuggestionSchema);

const BannedUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  usernameLower: { type: String, required: true, unique: true },
  banType: { type: String, enum: ["login", "forms", "all"], default: "all" },
  reason: { type: String, default: "" },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
});

const BannedUser = mongoose.model("BannedUser", BannedUserSchema);

const UserRegistrationSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  secondName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true, index: true },
  grade: { type: String, enum: GRADE_SLUGS, required: true },
  role: { type: String, enum: ROLE_TYPES, default: "student" },
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "declined"],
    default: "pending",
    index: true,
  },
  verificationCode: { type: String, default: null },
  verificationCodeVerified: { type: Boolean, default: false },
  verificationDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  reviewedBy: String,
  reviewedAt: Date,
  reviewReason: String,
});

const UserRegistration = mongoose.model(
  "UserRegistration",
  UserRegistrationSchema
);

const UserPointsSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  points: { type: Number, default: 0 },
  transactions: [
    {
      type: {
        type: String,
        enum: ["earned", "spent", "deducted"],
        required: true,
      },
      amount: { type: Number, required: true },
      description: String,
      formLink: String,
      itemId: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const UserPoints = mongoose.model("UserPoints", UserPointsSchema);

const GiftShopItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  cost: { type: Number, required: true },
  stock: { type: Number, default: -1 },
  purchaseLimit: { type: Number, default: -1 },
  image: String,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const GiftShopItem = mongoose.model("GiftShopItem", GiftShopItemSchema);

const GiftPurchaseSchema = new mongoose.Schema({
  username: { type: String, required: true, lowercase: true },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GiftShopItem",
    required: true,
  },
  itemName: { type: String, required: true },
  cost: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending",
  },
  declineReason: String,
  reviewedBy: String,
  reviewedAt: Date,
  purchasedAt: { type: Date, default: Date.now },
  pointsRefunded: { type: Boolean, default: false },
});

const GiftPurchase = mongoose.model("GiftPurchase", GiftPurchaseSchema);

const LeaderboardAccessSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, enum: ROLE_TYPES, required: true },
  hasLeaderboardAccess: { type: Boolean, default: false },
  grantedBy: String,
  grantedAt: { type: Date, default: Date.now },
});

const LeaderboardAccess = mongoose.model(
  "LeaderboardAccess",
  LeaderboardAccessSchema
);

const ActiveSessionSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userAgent: String,
  ip: String,
  loginTime: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
});

const ActiveSession = mongoose.model("ActiveSession", ActiveSessionSchema);

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await sendWebhook("DATABASE", {
      content: `[DATABASE] Connected to database`,
    });
    await sendWebhook("SYSTEM", {
      embeds: [
        {
          title: "🔌 Database Connection",
          color: 0x10b981,
          fields: [
            { name: "Status", value: "✅ Connected", inline: true },
            {
              name: "Connection Time",
              value: new Date().toLocaleString(),
              inline: true,
            },
            {
              name: "Environment",
              value: process.env.NODE_ENV || "development",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (connectionError) {
    console.error(`[DATABASE] Connection failed:`, connectionError.message);
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Database Connection Failed",
          color: 0xe74c3c,
          fields: [
            { name: "Error", value: connectionError.message },
            { name: "Time", value: new Date().toLocaleString() },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    process.exit(1);
  }
}

connectToDatabase();

function normalizeGradeSlug(value) {
  if (!value) return null;
  const normalized = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (GRADE_SLUGS.includes(normalized)) {
    return normalized;
  }
  if (GRADE_ALIAS[normalized]) {
    return GRADE_ALIAS[normalized];
  }
  return null;
}

function validateUsername(username) {
  if (!username || typeof username !== "string") return false;
  if (username.length < 3 || username.length > 30) return false;
  const arabicEnglishPattern = /^[\u0600-\u06FF\u0750-\u077F\w_-]+$/;
  return arabicEnglishPattern.test(username);
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^(\+20|0)?1[0-9]{9}$/;
  const cleaned = phone.replace(/[\s-]/g, "");
  return phoneRegex.test(cleaned);
}

function parseUsers() {
  const registry = {};
  const userData = process.env.USERS || "";
  const lines = userData
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const parts = line.split(":").map((part) => part.trim());
    if (parts.length < 3) return;

    const username = parts[0];
    const password = parts[1];
    let roleCandidate = (parts[2] || "").toLowerCase();
    let pointer = 3;

    const record = {
      password,
      role: "student",
      grade: null,
      gradeAccess: [],
      allowedPages: ["all"],
      originalUsername: username,
      hasLeaderboardAccess: false,
    };

    if (ROLE_TYPES.includes(roleCandidate)) {
      record.role = roleCandidate;
      if (roleCandidate === "leadadmin") {
        record.hasLeaderboardAccess = true;
      }
    } else {
      const derivedGrade = normalizeGradeSlug(roleCandidate);
      if (derivedGrade) {
        record.role = "student";
        record.grade = derivedGrade;
        record.gradeAccess = [derivedGrade];
      } else {
        record.role = "student";
      }
    }

    if (
      (record.role === "student" || record.role === "teacher") &&
      parts[pointer]
    ) {
      const gradeSegment = parts[pointer];
      pointer += 1;

      if (record.role === "student") {
        const gradeSlug = normalizeGradeSlug(gradeSegment);
        if (gradeSlug) {
          record.grade = gradeSlug;
          record.gradeAccess = [gradeSlug];
        }
      } else {
        record.gradeAccess = gradeSegment
          .split("|")
          .map((g) => normalizeGradeSlug(g))
          .filter(Boolean);
      }
    }

    if (
      (record.role === "admin" || record.role === "leadadmin") &&
      record.gradeAccess.length === 0
    ) {
      record.gradeAccess = [...GRADE_SLUGS];
    }

    if (record.role === "teacher" && record.gradeAccess.length === 0) {
      record.gradeAccess = [...GRADE_SLUGS];
    }

    const allowedPages = parts
      .slice(pointer)
      .map((p) => p.trim())
      .filter(Boolean);
    if (allowedPages.length > 0) {
      record.allowedPages = allowedPages;
    } else if (record.role === "admin" && record.role !== "leadadmin") {
      record.allowedPages = ["form-editor", "user-approver", "gift-approver"];
    }

    if (record.role === "admin" && allowedPages.includes("leaderboard")) {
      record.hasLeaderboardAccess = true;
    }

    registry[username] = record;
    registry[username.toLowerCase()] = record;
  });

  return registry;
}

const users = parseUsers();

function getSessionUser(req) {
  if (!req.session || !req.session.username) return null;
  const envUser =
    users[req.session.username] || users[req.session.username.toLowerCase()];
  if (envUser) return envUser;
  if (req.session.role && req.session.role === "student") {
    return {
      originalUsername: req.session.username,
      role: req.session.role,
      grade: req.session.grade || null,
      gradeAccess:
        req.session.gradeAccess ||
        (req.session.grade ? [req.session.grade] : []),
      allowedPages: req.session.allowedPages || ["all"],
    };
  }
  return null;
}

function userHasGradeAccess(user, gradeSlug) {
  if (!user || !gradeSlug) return false;
  const normalized =
    gradeSlug === "all" ? "all" : normalizeGradeSlug(gradeSlug);
  if (!normalized) return false;

  if (user.role === "leadadmin" || user.role === "admin") {
    return true;
  }

  if (normalized === "all") {
    return true;
  }

  if (user.role === "teacher") {
    return user.gradeAccess && user.gradeAccess.includes(normalized);
  }

  if (user.role === "student") {
    const userGrade = user.grade || (user.gradeAccess && user.gradeAccess[0]);
    return normalizeGradeSlug(userGrade) === normalized;
  }

  return false;
}

function normalizeFormTarget(value) {
  if (!value) return "all";
  const normalized = value.toString().trim().toLowerCase();
  if (FORM_TARGETS.includes(normalized)) {
    return normalized;
  }
  const gradeSlug = normalizeGradeSlug(value);
  return gradeSlug || "all";
}

function getDefaultLandingPath(user) {
  if (!user) return "/login";
  if (user.role === "leadadmin" || user.role === "admin") {
    return "/form-panel";
  }
  if (user.role === "teacher") {
    return "/form-panel";
  }
  if (user.role === "student" && user.grade) {
    return `/grades/${user.grade}`;
  }
  return "/login";
}

function canUserAccessForm(user, form) {
  if (!form) return false;
  const target = normalizeFormTarget(form.targetGrade || "all");

  if (target === "all") {
    return !!user;
  }

  if (target === "teachers") {
    return (
      !!user &&
      (user.role === "teacher" ||
        user.role === "admin" ||
        user.role === "leadadmin")
    );
  }

  if (target === "admins") {
    return !!user && (user.role === "admin" || user.role === "leadadmin");
  }

  return userHasGradeAccess(user, target);
}

async function getBanRecord(username) {
  if (!username) return null;
  return await BannedUser.findOne({ usernameLower: username.toLowerCase() });
}

async function hasLeaderboardAccess(username) {
  if (!username) return false;

  const user = users[username] || users[username.toLowerCase()];
  if (user) {
    if (user.role === "leadadmin") return true;
    if (user.role === "admin" && user.hasLeaderboardAccess) return true;
  }

  const accessRecord = await LeaderboardAccess.findOne({
    username: username.toLowerCase(),
    hasLeaderboardAccess: true,
  });

  return !!accessRecord;
}

async function requireAuth(req, res, next) {
  if (!req.session.isAuthenticated) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🔒 Authentication Required",
          color: 0xf59e0b,
          fields: [
            { name: "Path", value: req.path, inline: true },
            { name: "Method", value: req.method, inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
            { name: "Status", value: "Redirected to login", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.redirect("/login");
  }

  const user = getSessionUser(req);
  if (user && user.role === "student") {
    const allowedPaths = [
      "/grades",
      "/form",
      "/api/suggestions",
      "/api/user-info",
      "/api/gift-shop",
      "/api/forms/active",
      "/api/grades",
      "/logout",
      "/gift-shop",
    ];

    const path = req.path;
    const isAllowed =
      allowedPaths.some((allowed) => path.startsWith(allowed)) ||
      path === "/" ||
      path.match(/^\/grades\/[^\/]+$/);

    if (!isAllowed) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Unauthorized Student Access",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Path", value: path, inline: true },
              { name: "Role", value: "student", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(403)
        .sendFile(require("path").join(__dirname, "views/403.html"));
    }
  }

  next();
}

function requireRole(allowedRoles) {
  return async (req, res, next) => {
    if (!req.session.isAuthenticated) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🔒 Role Check Failed - Not Authenticated",
            color: 0xf59e0b,
            fields: [
              { name: "Path", value: req.path, inline: true },
              {
                name: "Required Roles",
                value: allowedRoles.join(", "),
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.redirect("/login");
    }
    const user = getSessionUser(req);
    if (!user) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Invalid User Session",
            color: 0xe74c3c,
            fields: [
              {
                name: "Session Username",
                value: req.session.username || "none",
                inline: true,
              },
              { name: "Path", value: req.path, inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      if (req.accepts("html")) {
        return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
      }
      return res.status(403).json({ error: "Access denied" });
    }
    if (allowedRoles.includes(user.role) || user.role === "leadadmin") {
      return next();
    }
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Insufficient Role Privileges",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "User Role", value: user.role, inline: true },
            {
              name: "Required Roles",
              value: allowedRoles.join(", "),
              inline: true,
            },
            { name: "Path", value: req.path, inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    if (req.accepts("html")) {
      return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
    }
    res.status(403).json({ error: "Access denied" });
  };
}

function hasSpecialRole(user, roleName) {
  if (!user) return false;
  if (user.role === "leadadmin") return true;
  if (
    user.role === "admin" &&
    user.allowedPages &&
    user.allowedPages.includes(roleName)
  ) {
    return true;
  }
  return false;
}

function requireSpecialRole(roleName) {
  return async (req, res, next) => {
    if (!req.session.isAuthenticated) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🔒 Special Role Check Failed",
            color: 0xf59e0b,
            fields: [
              { name: "Required Role", value: roleName, inline: true },
              { name: "Path", value: req.path, inline: true },
              { name: "Status", value: "Not authenticated", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = getSessionUser(req);
    if (!user) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Invalid User for Special Role",
            color: 0xe74c3c,
            fields: [
              {
                name: "Username",
                value: req.session.username || "none",
                inline: true,
              },
              { name: "Required Role", value: roleName, inline: true },
              { name: "Path", value: req.path, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).json({ error: "Access denied" });
    }
    if (hasSpecialRole(user, roleName) || user.role === "leadadmin") {
      return next();
    }
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Missing Special Role",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "User Role", value: user.role, inline: true },
            { name: "Required Role", value: roleName, inline: true },
            {
              name: "User Allowed Pages",
              value: user.allowedPages?.join(", ") || "none",
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res
      .status(403)
      .json({ error: "Access denied. You need the " + roleName + " role." });
  };
}

function sanitizeQuestions(rawQuestions = []) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error("يجب إضافة سؤال واحد على الأقل.");
  }

  return rawQuestions.map((question, index) => {
    const questionText = (question.questionText || "").trim();
    const questionType =
      question.questionType === "true-false" ? "true-false" : "multiple-choice";
    const required = question.required === false ? false : true;
    const points = typeof question.points === "number" ? question.points : 10;

    if (!questionText) {
      throw new Error(`نص السؤال رقم ${index + 1} غير موجود.`);
    }

    let options = [];
    let correctAnswer = question.correctAnswer;
    let correctAnswerIndex =
      typeof question.correctAnswerIndex === "number"
        ? question.correctAnswerIndex
        : undefined;

    if (questionType === "true-false") {
      options = ["True", "False"];
      const normalizedAnswer = (question.correctAnswer || "")
        .toString()
        .toLowerCase();
      correctAnswer =
        normalizedAnswer === "true" || normalizedAnswer === "1"
          ? "True"
          : "False";
      correctAnswerIndex = correctAnswer === "True" ? 0 : 1;
    } else {
      options = (question.options || [])
        .map((opt) => (opt || "").trim())
        .filter(Boolean);
      if (options.length < 2) {
        throw new Error(`السؤال رقم ${index + 1} يحتاج إلى خيارين على الأقل.`);
      }

      if (typeof correctAnswerIndex !== "number") {
        const parsedAnswer = parseInt(question.correctAnswer, 10);
        if (!Number.isNaN(parsedAnswer)) {
          correctAnswerIndex = parsedAnswer;
        }
      }

      if (
        correctAnswerIndex === undefined ||
        correctAnswerIndex < 0 ||
        correctAnswerIndex >= options.length
      ) {
        throw new Error(`اختر إجابة صحيحة للسؤال رقم ${index + 1}.`);
      }

      correctAnswer = correctAnswerIndex;
    }

    return {
      questionText,
      questionType,
      options,
      correctAnswer,
      correctAnswerIndex,
      required,
      points,
    };
  });
}

function parseExpiryDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("تاريخ انتهاء غير صالح");
  }
  return date;
}

function serializeForm(form) {
  return {
    topic: form.topic,
    link: form.link,
    expiry: form.expiry,
    description: form.description,
    targetGrade: form.targetGrade,
    status: form.status,
    allowRetake: form.allowRetake,
    createdBy: form.createdBy,
    updatedBy: form.updatedBy,
    updatedAt: form.updatedAt,
    questions: form.questions,
  };
}

app.get("/", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "🏠 Homepage Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/", inline: true },
          { name: "Method", value: "GET", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "User Agent",
            value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
            inline: false,
          },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/login", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "🔐 Login Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/login", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "User Agent",
            value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
            inline: false,
          },
          {
            name: "Already Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Current User",
            value: req.session.username || "None",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  if (req.session.isAuthenticated) {
    const user = getSessionUser(req);
    if (user) {
      return res.redirect(getDefaultLandingPath(user));
    }
  }
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/register", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "📝 Registration Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/register", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "User Agent",
            value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
            inline: false,
          },
          {
            name: "Already Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  if (req.session.isAuthenticated) {
    const user = getSessionUser(req);
    if (user) {
      return res.redirect(getDefaultLandingPath(user));
    }
  }
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (
    !username ||
    !password ||
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "❌ Invalid Login Data Format",
          color: 0xe74c3c,
          fields: [
            {
              name: "Username Provided",
              value: username ? "Yes" : "No",
              inline: true,
            },
            {
              name: "Password Provided",
              value: password ? "Yes" : "No",
              inline: true,
            },
            { name: "Username Type", value: typeof username, inline: true },
            { name: "Password Type", value: typeof password, inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res
      .status(400)
      .json({ success: false, message: "البيانات المدخلة غير صحيحة" });
  }

  const userAgent = req.headers["user-agent"] || "unknown";
  const normalizedUsername = username.toLowerCase().trim();

  await sendWebhook("USER", {
    embeds: [
      {
        title: "🔐 Login Attempt Initiated",
        color: 0xf59e0b,
        fields: [
          { name: "Username", value: username, inline: true },
          {
            name: "Normalized Username",
            value: normalizedUsername,
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "User Agent",
            value: userAgent.substring(0, 100),
            inline: false,
          },
          {
            name: "Timestamp",
            value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  const existingSession = await ActiveSession.findOne({
    username: normalizedUsername,
    expiresAt: { $gt: new Date() },
  });

  if (existingSession) {
    const parser = new UAParser();
    const deviceInfo = parser.setUA(userAgent).getResult();
    const device = `${deviceInfo.os.name || "Unknown OS"} (${
      deviceInfo.browser.name || "Unknown Browser"
    })`;

    await sendWebhook("SECURITY", {
      content: `⚠️ **Multiple Login Detected - Logging Out Old Session**`,
      embeds: [
        {
          title: "User Logged In On Another Device - Force Logout",
          color: 0xf59e0b,
          fields: [
            { name: "Username", value: username, inline: true },
            { name: "New Device", value: device, inline: true },
            {
              name: "Old Session IP",
              value: existingSession.ip || "unknown",
              inline: true,
            },
            {
              name: "Old Session Device",
              value: existingSession.userAgent?.substring(0, 100) || "Unknown",
              inline: false,
            },
            {
              name: "Old Session Login Time",
              value: existingSession.loginTime.toLocaleString(),
              inline: true,
            },
            {
              name: "Old Session ID",
              value: existingSession.sessionId?.substring(0, 20) + "...",
              inline: true,
            },
            {
              name: "Status",
              value: "Force logout old session, allowing new login",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    try {
      const sessionStore = req.sessionStore;
      if (sessionStore && sessionStore.destroy && existingSession.sessionId) {
        await new Promise((resolve, reject) => {
          sessionStore.destroy(existingSession.sessionId, (err) => {
            if (err) {
              console.error("[SESSION DESTROY ERROR]", err.message);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    } catch (sessionError) {
      console.error("[SESSION DESTROY ERROR]", sessionError.message);
    }

    await ActiveSession.deleteMany({
      username: normalizedUsername,
    });
  }

  const isEmail = username.includes("@");
  const isPhone = /^01\d{9}$/.test(username.replace(/\D/g, ""));

  let user = users[username] || users[normalizedUsername];
  let isAdminUser = !!user;

  if (!user) {
    try {
      let registeredUser = null;
      if (isEmail) {
        registeredUser = await UserRegistration.findOne({
          email: username.toLowerCase(),
        });
      } else if (isPhone) {
        const cleanedPhone = username.replace(/\D/g, "");
        registeredUser = await UserRegistration.findOne({
          phone: cleanedPhone,
        });
      } else {
        registeredUser = await UserRegistration.findOne({
          username: normalizedUsername,
        });
      }

      if (registeredUser) {
        if (registeredUser.approvalStatus === "pending") {
          const passwordMatch = await bcrypt.compare(
            password,
            registeredUser.password
          );
          if (!passwordMatch) {
            await sendWebhook("SECURITY", {
              embeds: [
                {
                  title: "❌ Login Attempt - Wrong Password (Pending Account)",
                  color: 0xe74c3c,
                  fields: [
                    { name: "Username", value: username },
                    { name: "Error", value: "Wrong password" },
                    {
                      name: "Account Status",
                      value: "Pending approval",
                      inline: true,
                    },
                    {
                      name: "Time",
                      value: moment()
                        .tz("Africa/Cairo")
                        .format("YYYY-MM-DD HH:mm:ss"),
                    },
                    { name: "IP", value: req.ip || "unknown", inline: true },
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
            });
            return res
              .status(401)
              .json({ success: false, message: "البيانات المدخلة غير صحيحة" });
          }

          await sendWebhook("SECURITY", {
            embeds: [
              {
                title: "⚠️ Login Attempt - Pending Account",
                color: 0xf39c12,
                fields: [
                  { name: "Username", value: username },
                  { name: "Status", value: "Pending approval" },
                  {
                    name: "Name",
                    value: `${registeredUser.firstName} ${registeredUser.secondName}`,
                    inline: true,
                  },
                  { name: "Grade", value: registeredUser.grade, inline: true },
                  {
                    name: "Time",
                    value: moment()
                      .tz("Africa/Cairo")
                      .format("YYYY-MM-DD HH:mm:ss"),
                  },
                  { name: "IP", value: req.ip || "unknown", inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
          return res.status(403).json({
            success: false,
            message:
              "حسابك في انتظار الموافقة. يرجى الانتظار حتى تتم مراجعة طلبك.",
          });
        }
        if (registeredUser.approvalStatus === "declined") {
          const passwordMatch = await bcrypt.compare(
            password,
            registeredUser.password
          );
          if (!passwordMatch) {
            await sendWebhook("SECURITY", {
              embeds: [
                {
                  title: "❌ Login Attempt - Wrong Password (Declined Account)",
                  color: 0xe74c3c,
                  fields: [
                    { name: "Username", value: username },
                    { name: "Error", value: "Wrong password" },
                    { name: "Account Status", value: "Declined", inline: true },
                    {
                      name: "Time",
                      value: moment()
                        .tz("Africa/Cairo")
                        .format("YYYY-MM-DD HH:mm:ss"),
                    },
                    { name: "IP", value: req.ip || "unknown", inline: true },
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
            });
            return res
              .status(401)
              .json({ success: false, message: "البيانات المدخلة غير صحيحة" });
          }

          await sendWebhook("SECURITY", {
            embeds: [
              {
                title: "🚫 Login Attempt - Declined Account",
                color: 0xe74c3c,
                fields: [
                  { name: "Username", value: username },
                  { name: "Status", value: "Account declined" },
                  {
                    name: "Decline Reason",
                    value: registeredUser.reviewReason || "No reason",
                    inline: false,
                  },
                  {
                    name: "Declined By",
                    value: registeredUser.reviewedBy || "System",
                    inline: true,
                  },
                  {
                    name: "Time",
                    value: moment()
                      .tz("Africa/Cairo")
                      .format("YYYY-MM-DD HH:mm:ss"),
                  },
                  { name: "IP", value: req.ip || "unknown", inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
          return res.status(403).json({
            success: false,
            message: "تم رفض طلب التسجيل الخاص بك. يرجى التواصل مع الإدارة.",
          });
        }

        const passwordMatch = await bcrypt.compare(
          password,
          registeredUser.password
        );
        if (passwordMatch) {
          if (
            registeredUser.verificationCode &&
            !registeredUser.verificationCodeVerified
          ) {
            const { verificationCode } = req.body;
            if (!verificationCode || verificationCode.length !== 6) {
              await sendWebhook("SECURITY", {
                embeds: [
                  {
                    title: "⚠️ Login Attempt - Invalid Verification Format",
                    color: 0xf39c12,
                    fields: [
                      { name: "Username", value: username },
                      {
                        name: "Error",
                        value: "Invalid verification code format",
                      },
                      {
                        name: "Code Provided",
                        value: verificationCode || "None",
                        inline: true,
                      },
                      {
                        name: "Code Length",
                        value: verificationCode?.length || 0,
                        inline: true,
                      },
                      {
                        name: "Time",
                        value: moment()
                          .tz("Africa/Cairo")
                          .format("YYYY-MM-DD HH:mm:ss"),
                      },
                      { name: "IP", value: req.ip || "unknown", inline: true },
                    ],
                    timestamp: new Date().toISOString(),
                  },
                ],
              });
              return res.status(403).json({
                success: false,
                requiresVerification: true,
                message: "البيانات المدخلة غير صحيحة",
              });
            }
            if (verificationCode !== registeredUser.verificationCode) {
              await sendWebhook("SECURITY", {
                embeds: [
                  {
                    title: "⚠️ Login Attempt - Wrong Verification Code",
                    color: 0xf39c12,
                    fields: [
                      { name: "Username", value: username },
                      { name: "Error", value: "Wrong verification code" },
                      {
                        name: "Expected Code",
                        value: registeredUser.verificationCode,
                        inline: true,
                      },
                      {
                        name: "Provided Code",
                        value: verificationCode,
                        inline: true,
                      },
                      {
                        name: "Time",
                        value: moment()
                          .tz("Africa/Cairo")
                          .format("YYYY-MM-DD HH:mm:ss"),
                      },
                      { name: "IP", value: req.ip || "unknown", inline: true },
                    ],
                    timestamp: new Date().toISOString(),
                  },
                ],
              });
              return res.status(403).json({
                success: false,
                requiresVerification: true,
                message: "البيانات المدخلة غير صحيحة",
              });
            }
            registeredUser.verificationCodeVerified = true;
            await registeredUser.save();

            await sendWebhook("USER", {
              embeds: [
                {
                  title: "✅ Verification Code Successfully Verified",
                  color: 0x10b981,
                  fields: [
                    { name: "Username", value: username, inline: true },
                    {
                      name: "Verification Code",
                      value: verificationCode,
                      inline: true,
                    },
                    {
                      name: "Verification Date",
                      value: new Date().toLocaleString(),
                      inline: true,
                    },
                    { name: "IP", value: req.ip || "unknown", inline: true },
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
            });
          }

          const derivedRole = registeredUser.role || "student";
          const gradeAccess =
            derivedRole === "admin" || derivedRole === "leadadmin"
              ? GRADE_SLUGS
              : [registeredUser.grade];

          let allowedPages = [];
          if (derivedRole === "admin" || derivedRole === "leadadmin") {
            const envUser =
              users[registeredUser.username] ||
              users[registeredUser.username.toLowerCase()];
            if (envUser && envUser.allowedPages) {
              allowedPages = envUser.allowedPages;
            } else {
              allowedPages = ["form-editor", "user-approver", "gift-approver"];
            }
          }

          user = {
            originalUsername: registeredUser.username,
            role: derivedRole,
            grade: registeredUser.grade,
            gradeAccess,
            allowedPages: allowedPages,
            hasLeaderboardAccess: await hasLeaderboardAccess(
              registeredUser.username
            ),
          };
        } else {
          await sendWebhook("SECURITY", {
            embeds: [
              {
                title: "❌ Login Attempt - Wrong Password",
                color: 0xe74c3c,
                fields: [
                  { name: "Username", value: username },
                  { name: "Error", value: "Wrong password" },
                  {
                    name: "Account Status",
                    value: registeredUser.approvalStatus,
                    inline: true,
                  },
                  { name: "User Type", value: "Registered User", inline: true },
                  {
                    name: "Time",
                    value: moment()
                      .tz("Africa/Cairo")
                      .format("YYYY-MM-DD HH:mm:ss"),
                  },
                  { name: "IP", value: req.ip || "unknown", inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
          return res
            .status(401)
            .json({ success: false, message: "البيانات المدخلة غير صحيحة" });
        }
      } else {
        await sendWebhook("SECURITY", {
          embeds: [
            {
              title: "❌ Login Attempt - User Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Username", value: username },
                { name: "Error", value: "User not found" },
                {
                  name: "Search Type",
                  value: isEmail ? "Email" : isPhone ? "Phone" : "Username",
                  inline: true,
                },
                {
                  name: "Time",
                  value: moment()
                    .tz("Africa/Cairo")
                    .format("YYYY-MM-DD HH:mm:ss"),
                },
                { name: "IP", value: req.ip || "unknown", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(401)
          .json({ success: false, message: "البيانات المدخلة غير صحيحة" });
      }
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Login Error - Database Query Failed",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(500)
        .json({ success: false, message: "فشل التحقق من البيانات" });
    }
  }

  if (!user) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "❌ Login Attempt - Invalid User Object",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: username },
            { name: "Error", value: "Invalid user object" },
            {
              name: "User Type",
              value: isAdminUser ? "Admin User" : "Registered User",
              inline: true,
            },
            {
              name: "Time",
              value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res
      .status(401)
      .json({ success: false, message: "البيانات المدخلة غير صحيحة" });
  }

  try {
    const banRecord = await getBanRecord(username);
    if (
      banRecord &&
      (banRecord.banType === "login" || banRecord.banType === "all")
    ) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Login Attempt - Banned User",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: username },
              { name: "Ban Type", value: banRecord.banType },
              { name: "Reason", value: banRecord.reason || "No reason" },
              {
                name: "Banned By",
                value: banRecord.createdBy || "System",
                inline: true,
              },
              {
                name: "Ban Date",
                value: banRecord.createdAt.toLocaleString(),
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      let banMessage = "تم حظر هذا المستخدم من تسجيل الدخول.";
      if (banRecord.reason && banRecord.reason.trim()) {
        banMessage = `تم حظرك من تسجيل الدخول. السبب: ${banRecord.reason}`;
      }
      return res.status(403).json({
        success: false,
        message: banMessage,
      });
    }
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "⚠️ Ban Check Error",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: username },
            { name: "Error", value: error.message },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res
      .status(500)
      .json({ success: false, message: "فشل التحقق من الصلاحيات" });
  }

  if (isAdminUser) {
    let passwordMatch = false;
    if (
      user.password &&
      (user.password.startsWith("$2a$") ||
        user.password.startsWith("$2b$") ||
        user.password.startsWith("$2y$"))
    ) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      passwordMatch = user.password === password;
    }

    if (!passwordMatch) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "❌ Admin Login Attempt - Wrong Password",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: username },
              { name: "User Role", value: user.role, inline: true },
              {
                name: "Password Hash Type",
                value: user.password?.startsWith("$2") ? "BCrypt" : "Plain",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(401)
        .json({ success: false, message: "البيانات المدخلة غير صحيحة" });
    }
  }

  req.session.isAuthenticated = true;
  req.session.username = user.originalUsername || username;
  req.session.role = user.role;
  req.session.allowedPages = user.allowedPages;
  req.session.grade = user.grade || null;
  req.session.gradeAccess = user.gradeAccess || [];
  req.session.hasLeaderboardAccess = user.hasLeaderboardAccess || false;

  req.session.displayName = user.originalUsername || username;

  const parser = new UAParser();
  const deviceInfo = parser.setUA(userAgent).getResult();
  const device = `${deviceInfo.os.name || "Unknown OS"} (${
    deviceInfo.browser.name || "Unknown Browser"
  })`;

  const loginTime = moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss");

  const gradeLabel = user.grade
    ? GRADE_LABELS[user.grade]?.long || user.grade
    : "N/A";

  const sessionId = req.sessionID;
  const sessionExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const activeSession = new ActiveSession({
    username: normalizedUsername,
    sessionId: sessionId,
    userAgent: userAgent,
    ip: req.ip || "unknown",
    loginTime: new Date(),
    expiresAt: sessionExpiry,
  });

  try {
    await activeSession.save();
  } catch (sessionError) {
    console.error("[SESSION ERROR]", sessionError.message);
  }

  await sendWebhook("USER", {
    content: `🔐 **User Logged In Successfully**`,
    embeds: [
      {
        title: "✅ User Login",
        color: 0x1abc9c,
        fields: [
          {
            name: "Username",
            value: user.originalUsername || username,
            inline: true,
          },
          { name: "Role", value: user.role.toUpperCase(), inline: true },
          { name: "Grade", value: gradeLabel, inline: true },
          { name: "Device", value: device, inline: false },
          {
            name: "Browser",
            value: deviceInfo.browser.name || "Unknown",
            inline: true,
          },
          { name: "OS", value: deviceInfo.os.name || "Unknown", inline: true },
          { name: "Login Time", value: loginTime, inline: false },
          {
            name: "Grade Access",
            value: (user.gradeAccess || []).join(", ") || "None",
            inline: false,
          },
          {
            name: "Allowed Pages",
            value: (user.allowedPages || []).join(", ") || "All",
            inline: false,
          },
          {
            name: "Leaderboard Access",
            value: user.hasLeaderboardAccess ? "✅ Yes" : "❌ No",
            inline: false,
          },
          {
            name: "Session ID",
            value: sessionId.substring(0, 20) + "...",
            inline: false,
          },
          {
            name: "Session Expires",
            value: sessionExpiry.toLocaleString(),
            inline: false,
          },
          { name: "IP Address", value: req.ip || "unknown", inline: true },
          {
            name: "User Type",
            value: isAdminUser ? "Admin User" : "Registered User",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  const redirectPath = getDefaultLandingPath(user);
  return res.status(200).json({
    success: true,
    message: "Authenticated",
    role: user.role,
    grade: user.grade || null,
    redirect: redirectPath,
    hasLeaderboardAccess: user.hasLeaderboardAccess || false,
  });
});

app.post("/logout", async (req, res) => {
  const username = req.session.username;
  const role = req.session.role;
  const grade = req.session.grade;
  const sessionId = req.sessionID;

  await sendWebhook("USER", {
    embeds: [
      {
        title: "🚪 Logout Request Received",
        color: 0x95a5a6,
        fields: [
          { name: "Username", value: username || "Unknown", inline: true },
          { name: "Role", value: role || "Unknown", inline: true },
          {
            name: "Session ID",
            value: sessionId?.substring(0, 20) + "..." || "Unknown",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "Timestamp",
            value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  try {
    if (username) {
      await ActiveSession.deleteMany({
        username: username.toLowerCase(),
      });
    }
  } catch (sessionError) {
    console.error("[SESSION CLEANUP ERROR]", sessionError.message);
  }

  const gradeLabel = grade ? GRADE_LABELS[grade]?.long || grade : "N/A";
  const logoutTime = moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss");

  req.session.destroy(async (err) => {
    if (err) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Logout Session Destruction Error",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: username || "Unknown", inline: true },
              { name: "Error", value: err.message, inline: false },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(500).json({ success: false, message: "Logout failed" });
    }

    await sendWebhook("USER", {
      content: `🚪 **User Logged Out**`,
      embeds: [
        {
          title: "User Logout",
          color: 0x95a5a6,
          fields: [
            { name: "Username", value: username || "Unknown", inline: true },
            {
              name: "Role",
              value: role ? role.toUpperCase() : "Unknown",
              inline: true,
            },
            { name: "Grade", value: gradeLabel, inline: true },
            { name: "Logout Time", value: logoutTime, inline: false },
            { name: "Session Cleared", value: "✅ Yes", inline: true },
            { name: "Active Session Removed", value: "✅ Yes", inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json({ success: true });
  });
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Try again later.",
  },
});

app.post("/api/register", registrationLimiter, async (req, res) => {
  try {
    const { username, password, firstName, secondName, email, phone, grade } =
      req.body;

    await sendWebhook("USER", {
      embeds: [
        {
          title: "📋 New Registration Attempt",
          color: 0x3498db,
          fields: [
            {
              name: "Username",
              value: username || "Not provided",
              inline: true,
            },
            { name: "Email", value: email || "Not provided", inline: true },
            { name: "Phone", value: phone || "Not provided", inline: true },
            { name: "Grade", value: grade || "Not provided", inline: true },
            {
              name: "Name",
              value:
                `${firstName || ""} ${secondName || ""}`.trim() ||
                "Not provided",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
            {
              name: "User Agent",
              value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (
      !username ||
      !password ||
      !firstName ||
      !secondName ||
      !email ||
      !phone ||
      !grade
    ) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Missing Fields",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: username ? "✅" : "❌", inline: true },
              { name: "Password", value: password ? "✅" : "❌", inline: true },
              {
                name: "First Name",
                value: firstName ? "✅" : "❌",
                inline: true,
              },
              {
                name: "Second Name",
                value: secondName ? "✅" : "❌",
                inline: true,
              },
              { name: "Email", value: email ? "✅" : "❌", inline: true },
              { name: "Phone", value: phone ? "✅" : "❌", inline: true },
              { name: "Grade", value: grade ? "✅" : "❌", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "جميع الحقول مطلوبة" });
    }

    if (!validateUsername(username)) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Invalid Username",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: username, inline: true },
              {
                name: "Username Length",
                value: username.length.toString(),
                inline: true,
              },
              { name: "Validation Result", value: "Failed", inline: true },
              {
                name: "Expected",
                value:
                  "3-30 chars, Arabic/English letters, numbers, underscore, hyphen",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(400).json({
        success: false,
        message:
          "اسم المستخدم يجب أن يكون 3-30 حرف، ويمكن أن يحتوي على أحرف عربية وإنجليزية وأرقام وشرطة سفلية",
      });
    }

    const normalizedUsername = username.toLowerCase();
    const normalizedGrade = normalizeGradeSlug(grade);

    if (!normalizedGrade) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Invalid Grade",
            color: 0xe74c3c,
            fields: [
              { name: "Grade Provided", value: grade, inline: true },
              { name: "Normalized Grade", value: "null", inline: true },
              {
                name: "Valid Grades",
                value: GRADE_SLUGS.join(", "),
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(400).json({ success: false, message: "الصف غير صالح" });
    }

    if (!validateEmail(email)) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Invalid Email",
            color: 0xe74c3c,
            fields: [
              { name: "Email Provided", value: email, inline: true },
              { name: "Validation Result", value: "Failed", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "البريد الإلكتروني غير صالح" });
    }

    if (!validatePhone(phone)) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Invalid Phone",
            color: 0xe74c3c,
            fields: [
              { name: "Phone Provided", value: phone, inline: true },
              {
                name: "Cleaned Phone",
                value: phone.replace(/[\s-]/g, ""),
                inline: true,
              },
              { name: "Validation Result", value: "Failed", inline: true },
              {
                name: "Expected Format",
                value: "Egyptian phone number (+20 or 0 followed by 11 digits)",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(400).json({
        success: false,
        message: "رقم الهاتف غير صالح. يجب أن يكون رقم هاتف مصري صحيح",
      });
    }

    if (users[normalizedUsername]) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Username Exists (Admin User)",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: username, inline: true },
              { name: "Conflict Type", value: "Admin User", inline: true },
              {
                name: "User Role",
                value: users[normalizedUsername]?.role || "Unknown",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "اسم المستخدم موجود بالفعل" });
    }
    const existingUser = await UserRegistration.findOne({
      username: normalizedUsername,
    });
    if (existingUser) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Username Exists (Registered User)",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: username, inline: true },
              { name: "Conflict Type", value: "Registered User", inline: true },
              {
                name: "Account Status",
                value: existingUser.approvalStatus,
                inline: true,
              },
              {
                name: "Created Date",
                value: existingUser.createdAt.toLocaleString(),
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "اسم المستخدم موجود بالفعل" });
    }

    const existingEmail = await UserRegistration.findOne({
      email: email.toLowerCase(),
    });
    if (existingEmail) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Email Exists",
            color: 0xe74c3c,
            fields: [
              { name: "Email", value: email, inline: true },
              {
                name: "Existing Username",
                value: existingEmail.username,
                inline: true,
              },
              {
                name: "Account Status",
                value: existingEmail.approvalStatus,
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    if (password.length < 8) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Password Too Short",
            color: 0xe74c3c,
            fields: [
              {
                name: "Password Length",
                value: password.length.toString(),
                inline: true,
              },
              { name: "Minimum Required", value: "8", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(400).json({
        success: false,
        message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
      });
    }
    if (password.length > 128) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Password Too Long",
            color: 0xe74c3c,
            fields: [
              {
                name: "Password Length",
                value: password.length.toString(),
                inline: true,
              },
              { name: "Maximum Allowed", value: "128", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "كلمة المرور طويلة جداً" });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Registration Failed - Weak Password",
            color: 0xe74c3c,
            fields: [
              {
                name: "Contains Letters",
                value: /[a-zA-Z]/.test(password) ? "✅" : "❌",
                inline: true,
              },
              {
                name: "Contains Numbers",
                value: /[0-9]/.test(password) ? "✅" : "❌",
                inline: true,
              },
              { name: "Password Strength", value: "Weak", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(400).json({
        success: false,
        message: "كلمة المرور يجب أن تحتوي على أحرف وأرقام",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const registration = new UserRegistration({
      username: normalizedUsername,
      password: hashedPassword,
      firstName,
      secondName,
      email: email.toLowerCase(),
      phone,
      grade: normalizedGrade,
      approvalStatus: "pending",
    });

    await registration.save();

    await sendWebhook("USER", {
      content: `📋 **New Registration Request**`,
      embeds: [
        {
          title: "New User Registration",
          color: 0xf39c12,
          fields: [
            { name: "Username", value: normalizedUsername },
            { name: "Name", value: `${firstName} ${secondName}` },
            { name: "Email", value: email.toLowerCase() },
            { name: "Phone", value: phone },
            { name: "Grade", value: normalizedGrade },
            { name: "Status", value: "⏳ Pending Approval" },
            { name: "Registration Date", value: new Date().toLocaleString() },
            { name: "IP Address", value: req.ip || "unknown" },
            {
              name: "User Agent",
              value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
              inline: false,
            },
            {
              name: "Password Hash",
              value: hashedPassword.substring(0, 20) + "...",
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json({
      success: true,
      message:
        "تم إرسال طلب التسجيل بنجاح. يرجى الانتظار حتى تتم مراجعة طلبك من قبل الإدارة.",
    });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Registration Error - Database Operation Failed",
          color: 0xe74c3c,
          fields: [
            { name: "Error", value: error.message },
            { name: "Error Code", value: error.code || "N/A", inline: true },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 1000) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
            {
              name: "Username Attempted",
              value: req.body.username || "Unknown",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "اسم المستخدم أو البريد الإلكتروني موجود بالفعل",
      });
    }
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التسجيل. يرجى المحاولة لاحقاً.",
    });
  }
});

app.get(
  "/api/registrations",
  requireAuth,
  requireSpecialRole("user-approver"),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "📋 Admin Fetching Registrations",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              { name: "Endpoint", value: "/api/registrations", inline: true },
              {
                name: "Status",
                value: "Fetching pending registrations",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registrations = await UserRegistration.find({
        approvalStatus: "pending",
      }).sort({ createdAt: -1 });

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Admin Fetched Registrations",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Registrations Found",
                value: registrations.length.toString(),
                inline: true,
              },
              { name: "Endpoint", value: "/api/registrations", inline: true },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json(registrations);
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Registrations Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "تعذر تحميل طلبات التسجيل" });
    }
  }
);

app.get(
  "/api/registrations/declined",
  requireAuth,
  requireSpecialRole("user-approver"),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "📋 Admin Fetching Declined Registrations",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              {
                name: "Endpoint",
                value: "/api/registrations/declined",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const declinedRegistrations = await UserRegistration.find({
        approvalStatus: "declined",
      }).sort({ reviewedAt: -1 });

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Admin Fetched Declined Registrations",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Declined Registrations Found",
                value: declinedRegistrations.length.toString(),
                inline: true,
              },
              {
                name: "Endpoint",
                value: "/api/registrations/declined",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json(declinedRegistrations);
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Declined Registrations Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "تعذر تحميل المستخدمين المرفوضين" });
    }
  }
);

app.post(
  "/api/registrations/:id/reactivate",
  requireAuth,
  requireSpecialRole("user-approver"),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🔄 Admin Attempting Reactivation",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Registration ID", value: req.params.id, inline: true },
              {
                name: "Action",
                value: "Reactivate Registration",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Reactivation Failed - Registration Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Registration ID", value: req.params.id, inline: true },
                {
                  name: "Error",
                  value: "Registration not found",
                  inline: true,
                },
                { name: "IP", value: req.ip || "unknown", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "طلب التسجيل غير موجود" });
      }

      if (registration.approvalStatus !== "declined") {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Reactivation Failed - Wrong Status",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                {
                  name: "Username",
                  value: registration.username,
                  inline: true,
                },
                {
                  name: "Current Status",
                  value: registration.approvalStatus,
                  inline: true,
                },
                { name: "Required Status", value: "declined", inline: true },
                { name: "IP", value: req.ip || "unknown", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(400)
          .json({ success: false, message: "هذا الطلب غير مرفوض" });
      }

      registration.approvalStatus = "pending";
      registration.reviewedBy = null;
      registration.reviewedAt = null;
      registration.reviewReason = null;
      registration.verificationCode = null;
      registration.verificationCodeVerified = false;
      registration.verificationDate = null;

      await registration.save();

      await sendWebhook("ADMIN", {
        content: `🔄 **Registration Reactivated**`,
        embeds: [
          {
            title: "Registration Reactivated",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User", value: registration.username },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
              },
              { name: "Previous Status", value: "declined", inline: true },
              { name: "New Status", value: "pending", inline: true },
              {
                name: "Reactivated At",
                value: new Date().toLocaleString(),
                inline: true,
              },
              { name: "Grade", value: registration.grade, inline: true },
              { name: "Email", value: registration.email, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, message: "تم إعادة تفعيل طلب التسجيل" });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Reactivate Registration Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Registration ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res
        .status(500)
        .json({ success: false, message: "تعذر إعادة تفعيل الطلب" });
    }
  }
);

app.post(
  "/api/registrations/:id/approve",
  requireAuth,
  requireSpecialRole("user-approver"),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Admin Attempting Approval",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Registration ID", value: req.params.id, inline: true },
              { name: "Action", value: "Approve Registration", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Approval Failed - Registration Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Registration ID", value: req.params.id, inline: true },
                {
                  name: "Error",
                  value: "Registration not found",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "طلب التسجيل غير موجود" });
      }

      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      registration.approvalStatus = "approved";
      registration.reviewedBy = req.session.username;
      registration.reviewedAt = new Date();
      registration.verificationCode = verificationCode;
      registration.verificationDate = new Date();

      await registration.save();

      const approvalWebhookPayload = {
        content: `✅ Registration approved for ${registration.username}`,
        embeds: [
          {
            title: "User Registration Approved",
            color: 0x1abc9c,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "User", value: registration.username, inline: true },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
              },
              {
                name: "Grade",
                value: registration.grade || "N/A",
                inline: true,
              },
              {
                name: "Email",
                value: registration.email || "N/A",
                inline: true,
              },
              {
                name: "Phone",
                value: registration.phone || "N/A",
                inline: true,
              },
              {
                name: "Verification Code",
                value: `\`${verificationCode}\``,
                inline: true,
              },
              {
                name: "Registration ID",
                value: registration._id.toString(),
                inline: true,
              },
              {
                name: "Approved At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const approvalWebhookDelivered = await sendWebhook(
        "REGISTRATION_APPROVAL",
        approvalWebhookPayload
      );
      if (!approvalWebhookDelivered) {
        console.warn(
          `[WEBHOOK][REGISTRATION_APPROVAL] delivery failed for registration ${registration._id}`
        );
      }

      await sendWebhook("ADMIN", {
        content: `✅ **Registration Approved**`,
        embeds: [
          {
            title: "Registration Approved",
            color: 0x27ae60,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User", value: registration.username },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
              },
              { name: "Verification Code", value: `\`${verificationCode}\`` },
              { name: "Grade", value: registration.grade, inline: true },
              { name: "Email", value: registration.email, inline: true },
              { name: "Phone", value: registration.phone, inline: true },
              {
                name: "Approval Date",
                value: new Date().toLocaleString(),
                inline: true,
              },
              {
                name: "⚠️ IMPORTANT",
                value: `أرسل هذا الكود للمستخدم: **${verificationCode}**`,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({
        success: true,
        message: "تم الموافقة على طلب التسجيل",
        verificationCode: verificationCode,
      });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Approve Registration Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Registration ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res
        .status(500)
        .json({ success: false, message: "تعذر الموافقة على الطلب" });
    }
  }
);

app.post(
  "/api/registrations/:id/decline",
  requireAuth,
  requireSpecialRole("user-approver"),
  async (req, res) => {
    try {
      const { reason } = req.body || {};

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "❌ Admin Attempting Decline",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Registration ID", value: req.params.id, inline: true },
              { name: "Action", value: "Decline Registration", inline: true },
              {
                name: "Reason",
                value: reason || "No reason provided",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Decline Failed - Registration Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Registration ID", value: req.params.id, inline: true },
                {
                  name: "Error",
                  value: "Registration not found",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "طلب التسجيل غير موجود" });
      }

      registration.approvalStatus = "declined";
      registration.reviewedBy = req.session.username;
      registration.reviewedAt = new Date();
      registration.reviewReason = reason || "";

      await registration.save();

      await sendWebhook("ADMIN", {
        content: `❌ **Registration Declined**`,
        embeds: [
          {
            title: "Registration Declined",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User", value: registration.username },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
                inline: true,
              },
              { name: "Grade", value: registration.grade, inline: true },
              { name: "Email", value: registration.email, inline: true },
              { name: "Reason", value: reason || "No reason provided" },
              {
                name: "Declined At",
                value: new Date().toLocaleString(),
                inline: true,
              },
              {
                name: "Registration Date",
                value: registration.createdAt.toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      return res.json({ success: true, message: "تم رفض طلب التسجيل" });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Decline Registration Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Registration ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(500)
        .json({ success: false, message: "تعذر رفض الطلب" });
    }
  }
);

app.get("/form-panel", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  if (
    !user ||
    (user.role !== "leadadmin" &&
      user.role !== "admin" &&
      user.role !== "teacher")
  ) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Unauthorized Access - Admin Panel",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Role", value: user ? user.role : "Unknown" },
            { name: "Path", value: req.path },
            {
              name: "Required Roles",
              value: "leadadmin, admin, teacher",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
            {
              name: "User Agent",
              value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
  }

  await sendWebhook("USER", {
    embeds: [
      {
        title: "📊 Admin Panel Accessed",
        color: 0x3498db,
        fields: [
          { name: "Username", value: req.session.username, inline: true },
          { name: "Role", value: user.role, inline: true },
          { name: "Path", value: "/form-panel", inline: true },
          {
            name: "Allowed Pages",
            value: user.allowedPages?.join(", ") || "All",
            inline: false,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.sendFile(path.join(__dirname, "views", "form-panel.html"));
});

app.get("/admin/user-approvals", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  if (
    !user ||
    (!hasSpecialRole(user, "user-approver") && user.role !== "leadadmin")
  ) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Unauthorized Access - User Approvals",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Role", value: user ? user.role : "Unknown" },
            { name: "Path", value: req.path },
            {
              name: "Required Role",
              value: "user-approver or leadadmin",
              inline: true,
            },
            {
              name: "User Allowed Pages",
              value: user?.allowedPages?.join(", ") || "None",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
  }

  await sendWebhook("ADMIN", {
    embeds: [
      {
        title: "👥 User Approvals Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Admin", value: req.session.username, inline: true },
          { name: "Role", value: user.role, inline: true },
          { name: "Special Role", value: "user-approver", inline: true },
          { name: "Path", value: "/admin/user-approvals", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.sendFile(path.join(__dirname, "views", "user-approvals.html"));
});

app.get("/admin/gift-shop/add", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  if (
    !user ||
    (!hasSpecialRole(user, "form-editor") && user.role !== "leadadmin")
  ) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Unauthorized Access - Gift Shop Add",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Role", value: user ? user.role : "Unknown" },
            { name: "Path", value: req.path },
            {
              name: "Required Role",
              value: "form-editor or leadadmin",
              inline: true,
            },
            {
              name: "User Allowed Pages",
              value: user?.allowedPages?.join(", ") || "None",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
  }

  await sendWebhook("ADMIN", {
    embeds: [
      {
        title: "🛍️ Gift Shop Add Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Admin", value: req.session.username, inline: true },
          { name: "Role", value: user.role, inline: true },
          { name: "Special Role", value: "form-editor", inline: true },
          { name: "Path", value: "/admin/gift-shop/add", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.sendFile(path.join(__dirname, "views", "gift-shop-add.html"));
});

app.get("/admin/gift-shop/approvals", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  if (
    !user ||
    (!hasSpecialRole(user, "gift-approver") && user.role !== "leadadmin")
  ) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Unauthorized Access - Gift Approvals",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Role", value: user ? user.role : "Unknown" },
            { name: "Path", value: req.path },
            {
              name: "Required Role",
              value: "gift-approver or leadadmin",
              inline: true,
            },
            {
              name: "User Allowed Pages",
              value: user?.allowedPages?.join(", ") || "None",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
  }

  await sendWebhook("ADMIN", {
    embeds: [
      {
        title: "🎁 Gift Approvals Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Admin", value: req.session.username, inline: true },
          { name: "Role", value: user.role, inline: true },
          { name: "Special Role", value: "gift-approver", inline: true },
          { name: "Path", value: "/admin/gift-shop/approvals", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.sendFile(path.join(__dirname, "views", "gift-shop-approvals.html"));
});

app.get("/gift-shop", requireAuth, async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "🛍️ Gift Shop Accessed",
        color: 0x3498db,
        fields: [
          { name: "Username", value: req.session.username, inline: true },
          { name: "Role", value: req.session.role, inline: true },
          { name: "Grade", value: req.session.grade || "N/A", inline: true },
          { name: "Path", value: "/gift-shop", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "Timestamp",
            value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "gift-shop-view.html"));
});

app.get("/admin/user-management", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  if (
    !user ||
    (!hasSpecialRole(user, "user-approver") && user.role !== "leadadmin")
  ) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Unauthorized Access - User Management",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Role", value: user ? user.role : "Unknown" },
            { name: "Path", value: req.path },
            {
              name: "Required Role",
              value: "user-approver or leadadmin",
              inline: true,
            },
            {
              name: "User Allowed Pages",
              value: user?.allowedPages?.join(", ") || "None",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
  }

  await sendWebhook("ADMIN", {
    embeds: [
      {
        title: "👥 User Management Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Admin", value: req.session.username, inline: true },
          { name: "Role", value: user.role, inline: true },
          { name: "Special Role", value: "user-approver", inline: true },
          { name: "Path", value: "/admin/user-management", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.sendFile(path.join(__dirname, "views", "user-management.html"));
});

app.get("/admin/leaderboard", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  if (!user || !user.hasLeaderboardAccess) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Unauthorized Leaderboard Access",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Role", value: user ? user.role : "Unknown" },
            { name: "Path", value: req.path },
            {
              name: "Has Leaderboard Access",
              value: user?.hasLeaderboardAccess ? "✅ Yes" : "❌ No",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
  }

  await sendWebhook("ADMIN", {
    embeds: [
      {
        title: "🏆 Admin Leaderboard Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Admin", value: req.session.username, inline: true },
          { name: "Role", value: user.role, inline: true },
          { name: "Leaderboard Access", value: "✅ Granted", inline: true },
          { name: "Path", value: "/admin/leaderboard", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.sendFile(path.join(__dirname, "views", "leaderboard.ejs"));
});

app.get(
  "/admin/leaderboard/access",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    await sendWebhook("ADMIN", {
      embeds: [
        {
          title: "🔓 Leaderboard Access Page Accessed",
          color: 0x3498db,
          fields: [
            { name: "Admin", value: req.session.username, inline: true },
            { name: "Role", value: req.session.role, inline: true },
            { name: "Path", value: "/admin/leaderboard/access", inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.sendFile(path.join(__dirname, "views", "leaderboard.ejs"));
  }
);

app.get("/admin/suggestion/ektma3at", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  if (!user || (user.role !== "leadadmin" && user.role !== "admin")) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Unauthorized Access - Admin Suggestions",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Role", value: user ? user.role : "Unknown" },
            { name: "Path", value: req.path },
            { name: "Required Roles", value: "leadadmin, admin", inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
  }

  await sendWebhook("ADMIN", {
    embeds: [
      {
        title: "💡 Admin Suggestions Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Admin", value: req.session.username, inline: true },
          { name: "Role", value: user.role, inline: true },
          { name: "Path", value: "/admin/suggestion/ektma3at", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.sendFile(path.join(__dirname, "views", "ektm3at-suggestion.html"));
});

app.get("/admin/suggestions", requireAuth, async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "🔀 Suggestions Redirect",
        color: 0x3498db,
        fields: [
          {
            name: "Username",
            value: req.session.username || "Unknown",
            inline: true,
          },
          { name: "From Path", value: "/admin/suggestions", inline: true },
          {
            name: "To Path",
            value: "/admin/suggestion/ektma3at",
            inline: true,
          },
          { name: "Redirect Type", value: "301 Permanent", inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  return res.redirect(301, "/admin/suggestion/ektma3at");
});

app.get(
  "/api/admin/users",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { grade } = req.query;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "👥 Admin Fetching Users",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              { name: "Grade Filter", value: grade || "all", inline: true },
              { name: "Endpoint", value: "/api/admin/users", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      let query = { approvalStatus: "approved" };
      if (grade && grade !== "all") {
        query.grade = grade;
      }

      const registrations = await UserRegistration.find(query).sort({
        createdAt: -1,
      });
      const usersWithPoints = await Promise.all(
        registrations.map(async (reg) => {
          const points = await UserPoints.findOne({ username: reg.username });
          const leaderboardAccess = await LeaderboardAccess.findOne({
            username: reg.username.toLowerCase(),
          });
          return {
            _id: reg._id,
            username: reg.username,
            firstName: reg.firstName,
            secondName: reg.secondName,
            email: reg.email,
            phone: reg.phone,
            grade: reg.grade,
            role: reg.role || "student",
            verificationCode: reg.verificationCode,
            points: points ? points.points : 0,
            hasLeaderboardAccess: leaderboardAccess
              ? leaderboardAccess.hasLeaderboardAccess
              : false,
            createdAt: reg.createdAt,
            lastActivity:
              points && points.transactions.length > 0
                ? points.transactions[points.transactions.length - 1].timestamp
                : reg.createdAt,
          };
        })
      );

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Admin Fetched Users",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Users Found",
                value: usersWithPoints.length.toString(),
                inline: true,
              },
              { name: "Grade Filter", value: grade || "all", inline: true },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json(usersWithPoints);
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Users Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "تعذر تحميل المستخدمين" });
    }
  }
);

app.get(
  "/api/admin/users/:id",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "👤 Admin Fetching User Details",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "User ID", value: req.params.id, inline: true },
              {
                name: "Endpoint",
                value: `/api/admin/users/${req.params.id}`,
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ User Details Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User ID", value: req.params.id, inline: true },
                { name: "Error", value: "User not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      const leaderboardAccess = await LeaderboardAccess.findOne({
        username: registration.username.toLowerCase(),
      });
      const userData = registration.toObject();
      userData.hasLeaderboardAccess = leaderboardAccess
        ? leaderboardAccess.hasLeaderboardAccess
        : false;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ User Details Fetched",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "User", value: registration.username, inline: true },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
                inline: true,
              },
              {
                name: "Role",
                value: registration.role || "student",
                inline: true,
              },
              {
                name: "Leaderboard Access",
                value: userData.hasLeaderboardAccess ? "✅ Yes" : "❌ No",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json(userData);
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch User Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ message: "تعذر تحميل بيانات المستخدم" });
    }
  }
);

app.post(
  "/api/admin/users/:id/give-points",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { amount, reason } = req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🎁 Admin Giving Points",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "User ID", value: req.params.id, inline: true },
              {
                name: "Amount",
                value: amount?.toString() || "0",
                inline: true,
              },
              {
                name: "Reason",
                value: reason || "No reason provided",
                inline: false,
              },
              { name: "Action", value: "Give Points", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Give Points Failed - User Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User ID", value: req.params.id, inline: true },
                { name: "Error", value: "User not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "المستخدم غير موجود" });
      }

      let userPoints = await UserPoints.findOne({
        username: registration.username,
      });
      if (!userPoints) {
        userPoints = new UserPoints({
          username: registration.username,
          points: 0,
        });
      }

      const pointsToAdd = parseInt(amount) || 0;
      const previousPoints = userPoints.points;
      userPoints.points += pointsToAdd;
      userPoints.transactions.push({
        type: "earned",
        amount: pointsToAdd,
        description: reason || `نقاط مضافة من قبل ${req.session.username}`,
      });

      await userPoints.save();

      await sendWebhook("ADMIN", {
        content: `🎁 **Points Given to User**`,
        embeds: [
          {
            title: "Points Given",
            color: 0x1abc9c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User", value: registration.username },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
                inline: true,
              },
              { name: "Grade", value: registration.grade, inline: true },
              { name: "Amount", value: `${pointsToAdd} points` },
              {
                name: "Previous Points",
                value: `${previousPoints} points`,
                inline: true,
              },
              {
                name: "New Points",
                value: `${userPoints.points} points`,
                inline: true,
              },
              { name: "Reason", value: reason || "No reason provided" },
              {
                name: "Given At",
                value: new Date().toLocaleString(),
                inline: true,
              },
              {
                name: "Transaction ID",
                value:
                  userPoints.transactions[
                    userPoints.transactions.length - 1
                  ]._id
                    .toString()
                    .substring(0, 10) + "...",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, newPoints: userPoints.points });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Give Points Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر إضافة النقاط" });
    }
  }
);

app.post(
  "/api/admin/users/:id/remove-points",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { amount, reason } = req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "⚠️ Admin Removing Points",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "User ID", value: req.params.id, inline: true },
              {
                name: "Amount",
                value: amount?.toString() || "0",
                inline: true,
              },
              {
                name: "Reason",
                value: reason || "No reason provided",
                inline: false,
              },
              { name: "Action", value: "Remove Points", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Remove Points Failed - User Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User ID", value: req.params.id, inline: true },
                { name: "Error", value: "User not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "المستخدم غير موجود" });
      }

      let userPoints = await UserPoints.findOne({
        username: registration.username,
      });
      if (!userPoints) {
        userPoints = new UserPoints({
          username: registration.username,
          points: 0,
        });
      }

      const pointsToRemove = parseInt(amount) || 0;
      const previousPoints = userPoints.points;
      userPoints.points = Math.max(0, userPoints.points - pointsToRemove);
      userPoints.transactions.push({
        type: "deducted",
        amount: pointsToRemove,
        description: reason || `نقاط مخصومة من قبل ${req.session.username}`,
      });

      await userPoints.save();

      await sendWebhook("ADMIN", {
        content: `⚠️ **Points Removed from User**`,
        embeds: [
          {
            title: "Points Removed",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User", value: registration.username },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
                inline: true,
              },
              { name: "Grade", value: registration.grade, inline: true },
              { name: "Amount", value: `${pointsToRemove} points` },
              {
                name: "Previous Points",
                value: `${previousPoints} points`,
                inline: true,
              },
              {
                name: "New Points",
                value: `${userPoints.points} points`,
                inline: true,
              },
              { name: "Reason", value: reason || "No reason provided" },
              {
                name: "Removed At",
                value: new Date().toLocaleString(),
                inline: true,
              },
              {
                name: "Transaction ID",
                value:
                  userPoints.transactions[
                    userPoints.transactions.length - 1
                  ]._id
                    .toString()
                    .substring(0, 10) + "...",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, newPoints: userPoints.points });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Remove Points Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر خصم النقاط" });
    }
  }
);

app.put(
  "/api/admin/users/:id",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { firstName, secondName, email, phone, password, grade, role } =
        req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✏️ Admin Updating User",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "User ID", value: req.params.id, inline: true },
              {
                name: "Fields to Update",
                value: Object.keys(req.body).join(", ") || "None",
                inline: false,
              },
              { name: "Action", value: "Update User", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Update Failed - User Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User ID", value: req.params.id, inline: true },
                { name: "Error", value: "User not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "المستخدم غير موجود" });
      }
      const changeLog = [];
      const captureChange = (field, nextValue) => {
        const previous = registration[field];
        const normalizedNext =
          typeof nextValue === "string" ? nextValue.trim() : nextValue;
        if (normalizedNext === undefined || normalizedNext === null) {
          return;
        }
        if (previous === normalizedNext) {
          return;
        }
        changeLog.push({
          field,
          before:
            previous === undefined || previous === null || previous === ""
              ? "N/A"
              : String(previous),
          after:
            normalizedNext === "" ||
            normalizedNext === undefined ||
            normalizedNext === null
              ? "N/A"
              : String(normalizedNext),
        });
        registration[field] = normalizedNext;
      };
      if (firstName) captureChange("firstName", firstName);
      if (secondName) captureChange("secondName", secondName);
      if (email) captureChange("email", email.toLowerCase());
      if (phone) captureChange("phone", phone);
      if (grade && GRADE_SLUGS.includes(grade)) {
        captureChange("grade", grade);
      }
      if (role && ROLE_TYPES.includes(role)) {
        if (req.session.role !== "leadadmin") {
          await sendWebhook("ADMIN", {
            embeds: [
              {
                title: "🚫 Update Failed - Insufficient Permissions",
                color: 0xe74c3c,
                fields: [
                  { name: "Admin", value: req.session.username, inline: true },
                  { name: "Admin Role", value: req.session.role, inline: true },
                  { name: "Required Role", value: "leadadmin", inline: true },
                  {
                    name: "Attempted Action",
                    value: "Change user role",
                    inline: true,
                  },
                  {
                    name: "Target User",
                    value: registration.username,
                    inline: true,
                  },
                  { name: "Target Role", value: role, inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
          return res
            .status(403)
            .json({ success: false, message: "ليست لديك صلاحية لتغيير الدور" });
        }
        captureChange("role", role);
      }
      if (password) {
        if (
          password.length >= 8 &&
          password.length <= 128 &&
          /[a-zA-Z]/.test(password) &&
          /[0-9]/.test(password)
        ) {
          const oldPasswordHash =
            registration.password.substring(0, 20) + "...";
          registration.password = await bcrypt.hash(password, 15);
          changeLog.push({
            field: "password",
            before: oldPasswordHash,
            after: registration.password.substring(0, 20) + "...",
          });
        } else {
          await sendWebhook("ADMIN", {
            embeds: [
              {
                title: "❌ Update Failed - Invalid Password",
                color: 0xe74c3c,
                fields: [
                  { name: "Admin", value: req.session.username, inline: true },
                  { name: "User", value: registration.username, inline: true },
                  {
                    name: "Password Length",
                    value: password.length.toString(),
                    inline: true,
                  },
                  {
                    name: "Has Letters",
                    value: /[a-zA-Z]/.test(password) ? "✅" : "❌",
                    inline: true,
                  },
                  {
                    name: "Has Numbers",
                    value: /[0-9]/.test(password) ? "✅" : "❌",
                    inline: true,
                  },
                  { name: "Validation", value: "Failed", inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
          return res.status(400).json({
            success: false,
            message: "كلمة المرور يجب أن تكون 8-128 حرف وتحتوي على أحرف وأرقام",
          });
        }
      }
      if (changeLog.length === 0) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "ℹ️ No Updates Made",
              color: 0x95a5a6,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User", value: registration.username, inline: true },
                { name: "Reason", value: "No changes detected", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.json({ success: true, message: "لا توجد تحديثات" });
      }
      await registration.save();
      const diffFields = changeLog.map((change) => ({
        name: change.field,
        value: `${change.before} → ${change.after}`,
        inline: false,
      }));
      await sendWebhook("ADMIN", {
        content: `✏️ **User Updated**`,
        embeds: [
          {
            title: "User Updated",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "User", value: registration.username, inline: true },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
                inline: true,
              },
              {
                name: "Total Changes",
                value: changeLog.length.toString(),
                inline: true,
              },
              ...diffFields,
              {
                name: "Updated At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.json({ success: true });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Update User Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر تحديث المستخدم" });
    }
  }
);

app.delete(
  "/api/admin/users/:id",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🗑️ Admin Deleting User",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "User ID", value: req.params.id, inline: true },
              { name: "Action", value: "Delete User", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Delete Failed - User Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User ID", value: req.params.id, inline: true },
                { name: "Error", value: "User not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "المستخدم غير موجود" });
      }
      const criticalRoles = ["teacher", "admin", "leadadmin"];
      if (criticalRoles.includes(registration.role)) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "🚫 Delete Failed - Critical Role User",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User", value: registration.username, inline: true },
                { name: "User Role", value: registration.role, inline: true },
                {
                  name: "Protected Roles",
                  value: criticalRoles.join(", "),
                  inline: false,
                },
                {
                  name: "Error",
                  value: "Cannot delete critical role user",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(403)
          .json({ success: false, message: "لا يمكن حذف هذا المستخدم" });
      }
      await UserRegistration.deleteOne({ _id: registration._id });
      const pointsDoc = await UserPoints.findOne({
        username: registration.username,
      }).lean();
      if (pointsDoc) {
        await UserPoints.deleteOne({ _id: pointsDoc._id });
      }
      const leaderboardDoc = await LeaderboardAccess.findOne({
        username: registration.username.toLowerCase(),
      }).lean();
      if (leaderboardDoc) {
        await LeaderboardAccess.deleteOne({ _id: leaderboardDoc._id });
      }
      await sendWebhook("ADMIN", {
        content: `🗑️ **User Deleted**`,
        embeds: [
          {
            title: "User Deleted",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Deleted User", value: registration.username },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
                inline: true,
              },
              { name: "Grade", value: registration.grade, inline: true },
              { name: "Email", value: registration.email, inline: true },
              { name: "Role", value: registration.role, inline: true },
              {
                name: "Account Created",
                value: registration.createdAt.toLocaleString(),
                inline: true,
              },
              {
                name: "Points Record Deleted",
                value: pointsDoc ? "✅ Yes" : "❌ No",
                inline: true,
              },
              {
                name: "Leaderboard Access Deleted",
                value: leaderboardDoc ? "✅ Yes" : "❌ No",
                inline: true,
              },
              {
                name: "Deleted At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.json({ success: true });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Delete User Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر حذف المستخدم" });
    }
  }
);

app.post(
  "/api/admin/users/:id/logout-all",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const registration = await UserRegistration.findById(req.params.id);
      if (!registration) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Logout All Failed - User Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User ID", value: req.params.id, inline: true },
                { name: "Error", value: "User not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "المستخدم غير موجود" });
      }

      const activeSessions = await ActiveSession.find({
        username: registration.username.toLowerCase(),
      });

      const sessionStore = req.sessionStore;
      const destroyedSessions = [];

      if (sessionStore && sessionStore.destroy) {
        for (const session of activeSessions) {
          try {
            await new Promise((resolve, reject) => {
              sessionStore.destroy(session.sessionId, (err) => {
                if (err) {
                  console.error(
                    `[SESSION DESTROY ERROR] ${session.sessionId}:`,
                    err.message
                  );
                  reject(err);
                } else {
                  destroyedSessions.push(session.sessionId);
                  resolve();
                }
              });
            });
          } catch (sessionError) {
            console.error(
              `[SESSION DESTROY ERROR] ${session.sessionId}:`,
              sessionError.message
            );
          }
        }
      }

      const deletedSessions = await ActiveSession.deleteMany({
        username: registration.username.toLowerCase(),
      });

      const forms = await Form.find({});
      for (const form of forms) {
      }

      await sendWebhook("ADMIN", {
        content: `🚪 **Logged Out All User Sessions**`,
        embeds: [
          {
            title: "All User Sessions Logged Out",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Target User", value: registration.username },
              {
                name: "Name",
                value: `${registration.firstName} ${registration.secondName}`,
                inline: true,
              },
              { name: "Grade", value: registration.grade, inline: true },
              {
                name: "Active Sessions Found",
                value: activeSessions.length.toString(),
                inline: true,
              },
              {
                name: "Sessions Destroyed from Store",
                value: destroyedSessions.length.toString(),
                inline: true,
              },
              {
                name: "Database Records Removed",
                value: deletedSessions.deletedCount.toString(),
                inline: true,
              },
              {
                name: "Action",
                value: "Force Logout All Sessions",
                inline: true,
              },
              {
                name: "Logged Out At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({
        success: true,
        message: `تم تسجيل الخروج من جميع جلسات المستخدم (${deletedSessions.deletedCount} جلسة)`,
        sessionsRemoved: deletedSessions.deletedCount,
        sessionsDestroyed: destroyedSessions.length,
      });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Logout All Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "User ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res
        .status(500)
        .json({ success: false, message: "تعذر تسجيل الخروج من جميع الجلسات" });
    }
  }
);

app.get(
  "/api/admin/leaderboard/access",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🔓 Admin Fetching Leaderboard Access",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              {
                name: "Endpoint",
                value: "/api/admin/leaderboard/access",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const accessRecords = await LeaderboardAccess.find().sort({
        username: 1,
      });

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Leaderboard Access Fetched",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Records Found",
                value: accessRecords.length.toString(),
                inline: true,
              },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json(accessRecords);
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Leaderboard Access Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "تعذر تحميل بيانات صلاحيات لوحة الصدارة" });
    }
  }
);

app.post(
  "/api/admin/leaderboard/access",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { username, hasLeaderboardAccess } = req.body;

      if (!username) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Leaderboard Access Update Failed - Missing Username",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Error", value: "Username is required", inline: true },
                {
                  name: "Access Action",
                  value: hasLeaderboardAccess ? "Grant" : "Revoke",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(400)
          .json({ success: false, message: "اسم المستخدم مطلوب" });
      }

      const normalizedUsername = username.toLowerCase();
      const user = await UserRegistration.findOne({
        username: normalizedUsername,
      });
      if (!user) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Leaderboard Access Update Failed - User Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Username", value: username, inline: true },
                { name: "Error", value: "User not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "المستخدم غير موجود" });
      }

      if (user.role === "student") {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Leaderboard Access Update Failed - Student Role",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "User", value: username, inline: true },
                { name: "User Role", value: user.role, inline: true },
                {
                  name: "Error",
                  value: "Cannot grant leaderboard access to students",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(400).json({
          success: false,
          message: "لا يمكن منح صلاحيات لوحة الصدارة للطلاب",
        });
      }

      let accessRecord = await LeaderboardAccess.findOne({
        username: normalizedUsername,
      });

      if (hasLeaderboardAccess) {
        if (!accessRecord) {
          accessRecord = new LeaderboardAccess({
            username: normalizedUsername,
            role: user.role,
            hasLeaderboardAccess: true,
            grantedBy: req.session.username,
            grantedAt: new Date(),
          });
        } else {
          accessRecord.hasLeaderboardAccess = true;
          accessRecord.grantedBy = req.session.username;
          accessRecord.grantedAt = new Date();
        }
        await accessRecord.save();

        await sendWebhook("ADMIN", {
          content: `🔓 **Leaderboard Access Granted**`,
          embeds: [
            {
              title: "Leaderboard Access Granted",
              color: 0x27ae60,
              fields: [
                { name: "Admin", value: req.session.username },
                { name: "User", value: username },
                {
                  name: "Name",
                  value: `${user.firstName} ${user.secondName}`,
                  inline: true,
                },
                { name: "Role", value: user.role },
                { name: "Access", value: "Granted" },
                {
                  name: "Granted At",
                  value: new Date().toLocaleString(),
                  inline: true,
                },
                {
                  name: "Previous Status",
                  value: accessRecord ? "Had Access" : "No Access",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });

        res.json({
          success: true,
          message: "تم منح صلاحيات لوحة الصدارة للمستخدم",
        });
      } else {
        if (accessRecord) {
          await LeaderboardAccess.deleteOne({ _id: accessRecord._id });
          await sendWebhook("ADMIN", {
            content: `🔒 **Leaderboard Access Revoked**`,
            embeds: [
              {
                title: "Leaderboard Access Revoked",
                color: 0xe74c3c,
                fields: [
                  { name: "Admin", value: req.session.username },
                  { name: "User", value: username },
                  {
                    name: "Name",
                    value: `${user.firstName} ${user.secondName}`,
                    inline: true,
                  },
                  { name: "Role", value: user.role },
                  { name: "Access", value: "Revoked" },
                  {
                    name: "Revoked At",
                    value: new Date().toLocaleString(),
                    inline: true,
                  },
                  {
                    name: "Previous Access Since",
                    value: accessRecord.grantedAt.toLocaleString(),
                    inline: true,
                  },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
        } else {
          await sendWebhook("ADMIN", {
            embeds: [
              {
                title: "ℹ️ Leaderboard Access Revoke - No Record Found",
                color: 0x95a5a6,
                fields: [
                  { name: "Admin", value: req.session.username, inline: true },
                  { name: "User", value: username, inline: true },
                  {
                    name: "Status",
                    value: "No access record to revoke",
                    inline: true,
                  },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
        }
        res.json({
          success: true,
          message: "تم إزالة صلاحيات لوحة الصدارة من المستخدم",
        });
      }
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Update Leaderboard Access Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Username", value: req.body.username || "Unknown" },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res
        .status(500)
        .json({ success: false, message: "تعذر تحديث صلاحيات لوحة الصدارة" });
    }
  }
);

app.get("/api/user-info", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "👤 User Info Request",
        color: 0x3498db,
        fields: [
          { name: "Endpoint", value: "/api/user-info", inline: true },
          { name: "Method", value: "GET", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "User Agent",
            value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (req.session.isAuthenticated) {
    const user = getSessionUser(req);
    const allowedPages = user
      ? user.allowedPages
      : req.session.allowedPages || [];
    const leaderboardAccess = req.session.hasLeaderboardAccess || false;

    res.json({
      isAuthenticated: true,
      username: req.session.username,
      role: req.session.role,
      grade: req.session.grade || (user && user.grade) || null,
      gradeAccess: user ? user.gradeAccess : req.session.gradeAccess || [],
      allowedPages: allowedPages,
      hasLeaderboardAccess: leaderboardAccess,
      hasFormEditorRole:
        user &&
        (user.role === "leadadmin" ||
          (user.role === "admin" && allowedPages.includes("form-editor"))),
      hasUserApproverRole:
        user &&
        (user.role === "leadadmin" ||
          (user.role === "admin" && allowedPages.includes("user-approver"))),
      hasGiftApproverRole:
        user &&
        (user.role === "leadadmin" ||
          (user.role === "admin" && allowedPages.includes("gift-approver"))),
      landing: getDefaultLandingPath(user),
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.get("/api/announcements/:page", async (req, res) => {
  try {
    const { page } = req.params;

    await sendWebhook("USER", {
      embeds: [
        {
          title: "📢 Announcements Request",
          color: 0x3498db,
          fields: [
            {
              name: "Endpoint",
              value: `/api/announcements/${page}`,
              inline: true,
            },
            { name: "Page", value: page, inline: true },
            {
              name: "Authenticated",
              value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
              inline: true,
            },
            {
              name: "Username",
              value: req.session.username || "Guest",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const announcements = await Announcement.find({ page })
      .sort({ timestamp: -1 })
      .limit(10);

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Announcements Fetched",
          color: 0x10b981,
          fields: [
            { name: "Page", value: page, inline: true },
            {
              name: "Announcements Found",
              value: announcements.length.toString(),
              inline: true,
            },
            {
              name: "Username",
              value: req.session.username || "Guest",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json(announcements);
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch Announcements Error",
          color: 0xe74c3c,
          fields: [
            { name: "Page", value: req.params.page },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.post(
  "/api/announcements",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { page, title, content, priority } = req.body;

      if (!page || !title || !content) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Create Announcement Failed - Missing Fields",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Page", value: page || "Missing", inline: true },
                { name: "Title", value: title ? "✅" : "❌", inline: true },
                { name: "Content", value: content ? "✅" : "❌", inline: true },
                {
                  name: "Error",
                  value: "Missing required fields",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(400).json({ error: "Missing required fields" });
      }

      const announcement = new Announcement({
        page,
        title,
        content,
        author: req.session.username,
        priority: priority || "normal",
      });

      await announcement.save();

      await sendWebhook("ADMIN", {
        content: `📢 **New Announcement Created**`,
        embeds: [
          {
            title: "Announcement Created",
            color: 0x1abc9c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Page", value: page, inline: true },
              { name: "Title", value: title, inline: true },
              { name: "Priority", value: priority || "normal", inline: true },
              {
                name: "Content Preview",
                value:
                  content.substring(0, 200) +
                  (content.length > 200 ? "..." : ""),
                inline: false,
              },
              {
                name: "Created At",
                value: new Date().toLocaleString(),
                inline: true,
              },
              {
                name: "Announcement ID",
                value: announcement._id.toString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, announcement });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Create Announcement Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Page", value: req.body.page || "Unknown" },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "Failed to create announcement" });
    }
  }
);

app.delete(
  "/api/announcements/:id",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🗑️ Admin Deleting Announcement",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Announcement ID", value: req.params.id, inline: true },
              { name: "Action", value: "Delete Announcement", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const announcement = await Announcement.findById(req.params.id);
      if (!announcement) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Delete Announcement Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Announcement ID", value: req.params.id, inline: true },
                {
                  name: "Error",
                  value: "Announcement not found",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "الإعلان غير موجود" });
      }
      await Announcement.deleteOne({ _id: announcement._id });

      await sendWebhook("ADMIN", {
        content: `🗑️ **Announcement Deleted**`,
        embeds: [
          {
            title: "Announcement Deleted",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Announcement Title", value: announcement.title },
              { name: "Page", value: announcement.page, inline: true },
              { name: "Author", value: announcement.author, inline: true },
              { name: "Priority", value: announcement.priority, inline: true },
              {
                name: "Created Date",
                value: announcement.timestamp.toLocaleString(),
                inline: true,
              },
              {
                name: "Deleted At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Delete Announcement Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Announcement ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  }
);

app.get("/api/page-content/:page", async (req, res) => {
  try {
    const { page } = req.params;

    await sendWebhook("USER", {
      embeds: [
        {
          title: "📄 Page Content Request",
          color: 0x3498db,
          fields: [
            {
              name: "Endpoint",
              value: `/api/page-content/${page}`,
              inline: true,
            },
            { name: "Page", value: page, inline: true },
            {
              name: "Authenticated",
              value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
              inline: true,
            },
            {
              name: "Username",
              value: req.session.username || "Guest",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    let pageContent = await PageContent.findOne({ page });
    if (!pageContent) {
      pageContent = new PageContent({ page, content: "" });
      await pageContent.save();

      await sendWebhook("USER", {
        embeds: [
          {
            title: "🆕 Page Content Created",
            color: 0x10b981,
            fields: [
              { name: "Page", value: page, inline: true },
              { name: "Status", value: "New page created", inline: true },
              {
                name: "Username",
                value: req.session.username || "Guest",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } else {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "✅ Page Content Fetched",
            color: 0x10b981,
            fields: [
              { name: "Page", value: page, inline: true },
              {
                name: "Last Edited",
                value: pageContent.lastEdited.toLocaleString(),
                inline: true,
              },
              {
                name: "Edited By",
                value: pageContent.editedBy || "System",
                inline: true,
              },
              {
                name: "Content Length",
                value: `${pageContent.content.length} characters`,
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }

    res.json(pageContent);
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch Page Content Error",
          color: 0xe74c3c,
          fields: [
            { name: "Page", value: req.params.page },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ error: "Failed to fetch page content" });
  }
});

app.put(
  "/api/page-content/:page",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { page } = req.params;
      const { content } = req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✏️ Admin Updating Page Content",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Page", value: page, inline: true },
              {
                name: "Content Length",
                value: content?.length.toString() || "0",
                inline: true,
              },
              { name: "Action", value: "Update Page Content", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      let pageContent = await PageContent.findOne({ page });
      const previousContent = pageContent ? pageContent.content : "";
      const previousEditedBy = pageContent ? pageContent.editedBy : "System";
      const previousEditDate = pageContent
        ? pageContent.lastEdited
        : new Date();

      if (pageContent) {
        pageContent.content = content;
        pageContent.lastEdited = new Date();
        pageContent.editedBy = req.session.username;
      } else {
        pageContent = new PageContent({
          page,
          content,
          editedBy: req.session.username,
        });
      }

      await pageContent.save();

      await sendWebhook("ADMIN", {
        content: `✏️ **Page Content Updated**`,
        embeds: [
          {
            title: "Page Content Updated",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Page", value: page },
              {
                name: "Previous Editor",
                value: previousEditedBy,
                inline: true,
              },
              { name: "New Editor", value: req.session.username, inline: true },
              {
                name: "Previous Edit Date",
                value: previousEditDate.toLocaleString(),
                inline: true,
              },
              {
                name: "New Edit Date",
                value: new Date().toLocaleString(),
                inline: true,
              },
              {
                name: "Previous Content Length",
                value: `${previousContent.length} characters`,
                inline: true,
              },
              {
                name: "New Content Length",
                value: `${content.length} characters`,
                inline: true,
              },
              {
                name: "Content Preview",
                value:
                  content.substring(0, 200) +
                  (content.length > 200 ? "..." : ""),
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, pageContent });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Update Page Content Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Page", value: req.params.page },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "Failed to update page content" });
    }
  }
);

app.get("/gym", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "🏋️ Gym Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/gym", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "User Agent",
            value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "gym.html"));
});

app.get("/ektm3at", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "👥 Ektm3at Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/ektm3at", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "ektma3.html"));
});

app.get("/2odasat", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "🙏 2odasat Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/2odasat", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "2odasat.html"));
});

app.get("/elnady", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "🌟 Elnady Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/elnady", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "elnady.html"));
});

app.get("/ektra7tk-elnady-&-an4eta", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "💡 Ektra7tk Elnady Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/ektra7tk-elnady-&-an4eta", inline: true },
          { name: "Page Name", value: "Suggestion 1 - Elnady", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "suggestion1.html"));
});

app.get("/ektra7tk-re7la-elsef", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "✈️ Ektra7tk Re7la Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/ektra7tk-re7la-elsef", inline: true },
          { name: "Page Name", value: "Suggestion 2 - Re7la", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "suggestion2.html"));
});

app.get("/ektra7tk-l2ktma3-el5edma", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "🤝 Ektra7tk L2ktma3 Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/ektra7tk-l2ktma3-el5edma", inline: true },
          { name: "Page Name", value: "Suggestion 3 - L2ktma3", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "suggestion3.html"));
});

app.get("/tasbe7a-4ahr-keyahk", async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "📿 Tasbe7a Page Accessed",
        color: 0x3498db,
        fields: [
          { name: "Path", value: "/tasbe7a-4ahr-keyahk", inline: true },
          { name: "Page Name", value: "Tasbe7a Keyahk", inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  res.sendFile(path.join(__dirname, "views", "tasbe7a-keyahk.html"));
});

GRADE_SLUGS.forEach((slug) => {
  app.get(`/${slug}`, requireAuth, async (req, res) => {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "🔀 Grade Slug Redirect",
          color: 0x3498db,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Grade Slug", value: slug, inline: true },
            { name: "From Path", value: `/${slug}`, inline: true },
            { name: "To Path", value: `/grades/${slug}`, inline: true },
            { name: "Redirect Type", value: "302 Temporary", inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.redirect(`/grades/${slug}`);
  });
});

app.get("/grades/:gradeSlug", requireAuth, async (req, res) => {
  const normalizedSlug = normalizeGradeSlug(req.params.gradeSlug);
  if (!normalizedSlug) {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "❌ Grade Page - Invalid Slug",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            {
              name: "Requested Slug",
              value: req.params.gradeSlug,
              inline: true,
            },
            { name: "Normalized Slug", value: "null", inline: true },
            {
              name: "Valid Slugs",
              value: GRADE_SLUGS.join(", "),
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
  }

  const user = getSessionUser(req);
  if (!userHasGradeAccess(user, normalizedSlug)) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "🚫 Unauthorized Grade Access",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "User Role", value: user?.role || "Unknown", inline: true },
            { name: "User Grade", value: user?.grade || "None", inline: true },
            { name: "Requested Grade", value: normalizedSlug, inline: true },
            {
              name: "User Grade Access",
              value: user?.gradeAccess?.join(", ") || "None",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).sendFile(path.join(__dirname, "views", "403.html"));
  }

  await sendWebhook("USER", {
    embeds: [
      {
        title: "📚 Grade Dashboard Accessed",
        color: 0x3498db,
        fields: [
          { name: "Username", value: req.session.username, inline: true },
          { name: "User Role", value: user.role, inline: true },
          { name: "Grade Slug", value: normalizedSlug, inline: true },
          {
            name: "Grade Label",
            value: GRADE_LABELS[normalizedSlug]?.short || normalizedSlug,
            inline: true,
          },
          { name: "Path", value: `/grades/${normalizedSlug}`, inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.render("grade-dashboard", {
    gradeSlug: normalizedSlug,
    gradeMeta: gradeBlueprints[normalizedSlug] || {},
    gradeLabel: GRADE_LABELS[normalizedSlug] || {},
    user: {
      username: req.session.username,
      role: req.session.role,
      grade: req.session.grade || null,
    },
  });
});

app.get(
  "/grades/:gradeSlug/suggestion/ektm3at",
  requireAuth,
  async (req, res) => {
    const normalizedSlug = normalizeGradeSlug(req.params.gradeSlug);
    if (!normalizedSlug) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Grade Suggestion Page - Invalid Slug",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "Requested Slug",
                value: req.params.gradeSlug,
                inline: true,
              },
              { name: "Normalized Slug", value: "null", inline: true },
              { name: "Page", value: "Suggestion Ektm3at", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(404)
        .sendFile(path.join(__dirname, "views", "404.html"));
    }

    const user = getSessionUser(req);
    if (!userHasGradeAccess(user, normalizedSlug)) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Unauthorized Grade Suggestion Access",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "User Role",
                value: user?.role || "Unknown",
                inline: true,
              },
              { name: "Requested Grade", value: normalizedSlug, inline: true },
              { name: "Page", value: "Grade Suggestion Ektm3at", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(403)
        .sendFile(path.join(__dirname, "views", "403.html"));
    }

    await sendWebhook("USER", {
      embeds: [
        {
          title: "💡 Grade Suggestion Page Accessed",
          color: 0x3498db,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Grade Slug", value: normalizedSlug, inline: true },
            {
              name: "Grade Label",
              value: GRADE_LABELS[normalizedSlug]?.short || normalizedSlug,
              inline: true,
            },
            { name: "Page", value: "Ektm3at Suggestion", inline: true },
            {
              name: "Path",
              value: `/grades/${normalizedSlug}/suggestion/ektm3at`,
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.render("ektm3at-suggestion", {
      gradeSlug: normalizedSlug,
      gradeLabel: GRADE_LABELS[normalizedSlug] || {},
      gradeMeta: gradeBlueprints[normalizedSlug] || {},
      user: {
        username: req.session.username,
        role: req.session.role,
        grade: req.session.grade || null,
      },
    });
  }
);

app.post("/api/suggestions", requireAuth, async (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "❌ Suggestion Submission - No User",
            color: 0xe74c3c,
            fields: [
              { name: "Endpoint", value: "/api/suggestions", inline: true },
              { name: "Method", value: "POST", inline: true },
              {
                name: "Error",
                value: "User not found in session",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(401).json({ success: false, message: "غير مصرح" });
    }

    const { text, category } = req.body;
    const suggestionText = (text || "").trim();

    await sendWebhook("USER", {
      embeds: [
        {
          title: "💡 New Suggestion Attempt",
          color: 0xf59e0b,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Role", value: user.role, inline: true },
            { name: "Grade", value: user.grade || "N/A", inline: true },
            { name: "Category", value: category || "meeting", inline: true },
            {
              name: "Text Length",
              value: suggestionText.length.toString(),
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (suggestionText.length < 5) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Suggestion Submission - Too Short",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "Text Length",
                value: suggestionText.length.toString(),
                inline: true,
              },
              { name: "Minimum Required", value: "5", inline: true },
              { name: "Category", value: category || "meeting", inline: true },
              { name: "Error", value: "Text too short", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "اكتب اقتراحاً أوضح." });
    }
    if (suggestionText.length > 600) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Suggestion Submission - Too Long",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "Text Length",
                value: suggestionText.length.toString(),
                inline: true,
              },
              { name: "Maximum Allowed", value: "600", inline: true },
              { name: "Category", value: category || "meeting", inline: true },
              { name: "Error", value: "Text too long", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "الحد الأقصى 600 حرف." });
    }

    const normalizedCategory = category || "meeting";
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const recent = await Suggestion.findOne({
      username: (req.session.username || "").toLowerCase(),
      category: normalizedCategory,
      createdAt: { $gte: cutoff },
    });

    if (recent) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "⏰ Suggestion Submission - Rate Limited",
            color: 0xf59e0b,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Category", value: normalizedCategory, inline: true },
              {
                name: "Last Submission",
                value: recent.createdAt.toLocaleString(),
                inline: true,
              },
              {
                name: "Time Since Last",
                value: `${Math.floor(
                  (new Date() - recent.createdAt) / (1000 * 60 * 60 * 24)
                )} days`,
                inline: true,
              },
              {
                name: "Limit",
                value: "1 suggestion per week per category",
                inline: false,
              },
              { name: "Error", value: "Rate limited", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(429).json({
        success: false,
        message: "يمكنك إرسال اقتراح واحد فقط كل أسبوع لنفس القسم.",
      });
    }

    let displayName = req.session.displayName || req.session.username || "";
    try {
      const profile = await UserRegistration.findOne({
        username: (req.session.username || "").toLowerCase(),
      });
      if (profile) {
        displayName = `${profile.firstName} ${profile.secondName}`.trim();
      }
    } catch (err) {
      console.error("[SUGGESTION PROFILE ERROR]", err.message);
    }

    const userGrade = user.grade || req.session.grade || null;
    const gradeLabel = userGrade
      ? GRADE_LABELS[userGrade]?.long || userGrade
      : "N/A";

    const saved = await Suggestion.create({
      username: (req.session.username || "").toLowerCase(),
      displayName,
      grade: userGrade,
      category: normalizedCategory,
      text: suggestionText,
    });

    await sendWebhook("SUGGESTION", {
      content: `💡 **New Suggestion Submitted**`,
      embeds: [
        {
          title: "New Suggestion",
          color: 0x9b59b6,
          fields: [
            { name: "Display Name", value: displayName, inline: true },
            { name: "Username", value: req.session.username, inline: true },
            {
              name: "Role",
              value: user.role ? user.role.toUpperCase() : "STUDENT",
              inline: true,
            },
            { name: "Grade", value: gradeLabel, inline: true },
            { name: "Category", value: normalizedCategory, inline: true },
            {
              name: "Submitted At",
              value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
              inline: true,
            },
            {
              name: "Suggestion ID",
              value: saved._id.toString(),
              inline: true,
            },
            {
              name: "Text Length",
              value: `${suggestionText.length} characters`,
              inline: true,
            },
            {
              name: "Suggestion",
              value: suggestionText.substring(0, 1024) || "No text",
              inline: false,
            },
            { name: "IP Address", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return res.json({ success: true, suggestion: saved });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Suggestion Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username || "Unknown" },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res
      .status(500)
      .json({ success: false, message: "تعذر حفظ الاقتراح" });
  }
});

app.get(
  "/api/suggestions",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { category = "all", grade = "all", search = "" } = req.query;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "💡 Admin Fetching Suggestions",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              { name: "Category Filter", value: category, inline: true },
              { name: "Grade Filter", value: grade, inline: true },
              { name: "Search Term", value: search || "None", inline: true },
              { name: "Endpoint", value: "/api/suggestions", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const query = {};
      if (category !== "all") {
        query.category = category;
      }
      if (grade !== "all") {
        const normalized = normalizeGradeSlug(grade);
        if (normalized) {
          query.grade = normalized;
        }
      }
      if (search) {
        const regex = new RegExp(search.trim(), "i");
        query.$or = [
          { displayName: regex },
          { username: regex },
          { text: regex },
        ];
      }

      const suggestions = await Suggestion.find(query)
        .sort({ createdAt: -1 })
        .limit(500);

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Admin Fetched Suggestions",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Suggestions Found",
                value: suggestions.length.toString(),
                inline: true,
              },
              { name: "Category Filter", value: category, inline: true },
              { name: "Grade Filter", value: grade, inline: true },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      return res.json({ success: true, suggestions });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Suggestions Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(500)
        .json({ success: false, message: "تعذر تحميل الاقتراحات" });
    }
  }
);

app.post("/api/nady", async (req, res) => {
  const { description } = req.body;
  const webhookURL = process.env.WEBHOOK_URL1;
  const userId = crypto
    .createHash("sha256")
    .update(req.headers["user-agent"] + req.ip)
    .digest("hex");

  await sendWebhook("USER", {
    embeds: [
      {
        title: "🌟 Nady Suggestion Attempt",
        color: 0xf59e0b,
        fields: [
          { name: "Endpoint", value: "/api/nady", inline: true },
          {
            name: "Description Length",
            value: description?.length.toString() || "0",
            inline: true,
          },
          {
            name: "User Hash",
            value: userId.substring(0, 16) + "...",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "Webhook URL",
            value: webhookURL ? "✅ Set" : "❌ Missing",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (!description) {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "❌ Nady Suggestion Failed - Missing Description",
          color: 0xe74c3c,
          fields: [
            { name: "Endpoint", value: "/api/nady", inline: true },
            { name: "Error", value: "Description is required", inline: true },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(400).json({ message: "All fields are required." });
  }

  const embed = {
    content: `<@&1126336222206365696>`,
    embeds: [
      {
        title: "🌟 اقتراح جديد!",
        color: 0x1abc9c,
        fields: [
          {
            name: "📝 الوصف",
            value: description || "لم يتم تقديم وصف.",
            inline: false,
          },
          {
            name: "👤 رقم المستخدم",
            value: userId || "مستخدم غير معروف",
            inline: true,
          },
          {
            name: "📊 وصف الطول",
            value: `${description.length} حرف`,
            inline: true,
          },
          {
            name: "🕐 الوقت",
            value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
        ],
      },
    ],
  };

  try {
    const delivered = await sendWebhook("NADY", embed);
    if (delivered) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "✅ Nady Suggestion Sent Successfully",
            color: 0x10b981,
            fields: [
              { name: "Endpoint", value: "/api/nady", inline: true },
              {
                name: "Description Length",
                value: description.length.toString(),
                inline: true,
              },
              {
                name: "User Hash",
                value: userId.substring(0, 16) + "...",
                inline: true,
              },
              {
                name: "Webhook Delivery",
                value: "Success",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(200)
        .json({ message: "لقد انتهيت و تم إرسال اقتراحك بنجاح" });
    }
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "⚠️ Nady Suggestion Delivery Failed",
          color: 0xf59e0b,
          fields: [
            { name: "Endpoint", value: "/api/nady", inline: true },
            {
              name: "Description Length",
              value: description.length.toString(),
              inline: true,
            },
            {
              name: "Webhook Configured",
              value: webhookURL ? "✅ Yes" : "❌ No",
              inline: true,
            },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(500).json({ message: "Failed to submit request." });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Nady Suggestion Error",
          color: 0xe74c3c,
          fields: [
            { name: "Endpoint", value: "/api/nady", inline: true },
            { name: "Error", value: error.message, inline: false },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    console.error("Nady submission error:", error);
    return res.status(500).json({ message: "Error submitting request." });
  }
});

app.post("/api/trip", async (req, res) => {
  const { description } = req.body;
  const webhookURL = process.env.WEBHOOK_URL2;
  const userId = crypto
    .createHash("sha256")
    .update(req.headers["user-agent"] + req.ip)
    .digest("hex");

  await sendWebhook("USER", {
    embeds: [
      {
        title: "✈️ Trip Suggestion Attempt",
        color: 0xf59e0b,
        fields: [
          { name: "Endpoint", value: "/api/trip", inline: true },
          {
            name: "Description Length",
            value: description?.length.toString() || "0",
            inline: true,
          },
          {
            name: "User Hash",
            value: userId.substring(0, 16) + "...",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "Webhook URL",
            value: webhookURL ? "✅ Set" : "❌ Missing",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (!description) {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "❌ Trip Suggestion Failed - Missing Description",
          color: 0xe74c3c,
          fields: [
            { name: "Endpoint", value: "/api/trip", inline: true },
            { name: "Error", value: "Description is required", inline: true },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(400).json({ message: "All fields are required." });
  }

  const embed = {
    content: `<@&1126336222206365696>`,
    embeds: [
      {
        title: "🌟 اقتراح جديد!",
        color: 0x1abc9c,
        fields: [
          {
            name: "📝 الوصف",
            value: description || "لم يتم تقديم وصف.",
            inline: false,
          },
          {
            name: "👤 رقم المستخدم",
            value: userId || "مستخدم غير معروف",
            inline: true,
          },
          {
            name: "📊 وصف الطول",
            value: `${description.length} حرف`,
            inline: true,
          },
          {
            name: "🕐 الوقت",
            value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
        ],
      },
    ],
  };

  try {
    const delivered = await sendWebhook("TRIP", embed);
    if (delivered) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "✅ Trip Suggestion Sent Successfully",
            color: 0x10b981,
            fields: [
              { name: "Endpoint", value: "/api/trip", inline: true },
              {
                name: "Description Length",
                value: description.length.toString(),
                inline: true,
              },
              {
                name: "User Hash",
                value: userId.substring(0, 16) + "...",
                inline: true,
              },
              {
                name: "Webhook Delivery",
                value: "Success",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(200)
        .json({ message: "لقد انتهيت و تم إرسال اقتراحك بنجاح" });
    }
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "⚠️ Trip Suggestion Delivery Failed",
          color: 0xf59e0b,
          fields: [
            { name: "Endpoint", value: "/api/trip", inline: true },
            {
              name: "Description Length",
              value: description.length.toString(),
              inline: true,
            },
            {
              name: "Webhook Configured",
              value: webhookURL ? "✅ Yes" : "❌ No",
              inline: true,
            },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(500).json({ message: "Failed to submit request." });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Trip Suggestion Error",
          color: 0xe74c3c,
          fields: [
            { name: "Endpoint", value: "/api/trip", inline: true },
            { name: "Error", value: error.message, inline: false },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    console.error("Trip submission error:", error);
    return res.status(500).json({ message: "Error submitting request." });
  }
});

app.post("/api/ektmaa", async (req, res) => {
  const { description } = req.body;
  const webhookURL = process.env.WEBHOOK_URL3;
  const userId = crypto
    .createHash("sha256")
    .update(req.headers["user-agent"] + req.ip)
    .digest("hex");

  await sendWebhook("USER", {
    embeds: [
      {
        title: "🤝 Ektmaa Suggestion Attempt",
        color: 0xf59e0b,
        fields: [
          { name: "Endpoint", value: "/api/ektmaa", inline: true },
          {
            name: "Description Length",
            value: description?.length.toString() || "0",
            inline: true,
          },
          {
            name: "User Hash",
            value: userId.substring(0, 16) + "...",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "Webhook URL",
            value: webhookURL ? "✅ Set" : "❌ Missing",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (!description) {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "❌ Ektmaa Suggestion Failed - Missing Description",
          color: 0xe74c3c,
          fields: [
            { name: "Endpoint", value: "/api/ektmaa", inline: true },
            { name: "Error", value: "Description is required", inline: true },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(400).json({ message: "All fields are required." });
  }

  const embed = {
    content: `<@&1126336222206365696>`,
    embeds: [
      {
        title: "🌟 اقتراح جديد!",
        color: 0x1abc9c,
        fields: [
          {
            name: "📝 الوصف",
            value: description || "لم يتم تقديم وصف.",
            inline: false,
          },
          {
            name: "👤 رقم المستخدم",
            value: userId || "مستخدم غير معروف",
            inline: true,
          },
          {
            name: "📊 وصف الطول",
            value: `${description.length} حرف`,
            inline: true,
          },
          {
            name: "🕐 الوقت",
            value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            inline: true,
          },
        ],
      },
    ],
  };

  try {
    const delivered = await sendWebhook("EKTMAA", embed);
    if (delivered) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "✅ Ektmaa Suggestion Sent Successfully",
            color: 0x10b981,
            fields: [
              { name: "Endpoint", value: "/api/ektmaa", inline: true },
              {
                name: "Description Length",
                value: description.length.toString(),
                inline: true,
              },
              {
                name: "User Hash",
                value: userId.substring(0, 16) + "...",
                inline: true,
              },
              {
                name: "Webhook Delivery",
                value: "Success",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(200)
        .json({ message: "لقد انتهيت و تم إرسال اقتراحك بنجاح" });
    }
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "⚠️ Ektmaa Suggestion Delivery Failed",
          color: 0xf59e0b,
          fields: [
            { name: "Endpoint", value: "/api/ektmaa", inline: true },
            {
              name: "Description Length",
              value: description.length.toString(),
              inline: true,
            },
            {
              name: "Webhook Configured",
              value: webhookURL ? "✅ Yes" : "❌ No",
              inline: true,
            },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(500).json({ message: "Failed to submit request." });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Ektmaa Suggestion Error",
          color: 0xe74c3c,
          fields: [
            { name: "Endpoint", value: "/api/ektmaa", inline: true },
            { name: "Error", value: error.message, inline: false },
            {
              name: "User Hash",
              value: userId.substring(0, 16) + "...",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    console.error("Ektmaa submission error:", error);
    return res.status(500).json({ message: "Error submitting request." });
  }
});

app.get("/api/forms/active", async (req, res) => {
  try {
    const user = req.session.isAuthenticated ? getSessionUser(req) : null;
    const now = new Date();

    await sendWebhook("USER", {
      embeds: [
        {
          title: "📋 Active Forms Request",
          color: 0x3498db,
          fields: [
            { name: "Endpoint", value: "/api/forms/active", inline: true },
            {
              name: "Authenticated",
              value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
              inline: true,
            },
            {
              name: "Username",
              value: req.session.username || "Guest",
              inline: true,
            },
            { name: "User Role", value: user?.role || "Guest", inline: true },
            { name: "User Grade", value: user?.grade || "N/A", inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    let query = {
      status: "published",
      $and: [
        {
          $or: [{ expiry: null }, { expiry: { $gt: now } }],
        },
      ],
    };
    if (user) {
      const userGrade = user.grade || (user.gradeAccess && user.gradeAccess[0]);
      if (userGrade) {
        const targetGradeConditions = [
          { targetGrade: "all" },
          { targetGrade: userGrade },
        ];
        if (
          user.role === "teacher" ||
          user.role === "admin" ||
          user.role === "leadadmin"
        ) {
          targetGradeConditions.push(
            { targetGrade: "teachers" },
            { targetGrade: "admins" }
          );
        }
        query.$and.push({
          $or: targetGradeConditions,
        });
      } else {
        const targetGradeConditions = [{ targetGrade: "all" }];
        if (
          user.role === "teacher" ||
          user.role === "admin" ||
          user.role === "leadadmin"
        ) {
          targetGradeConditions.push(
            { targetGrade: "teachers" },
            { targetGrade: "admins" }
          );
        }
        query.$and.push({
          $or: targetGradeConditions,
        });
      }
    } else {
      query.$and.push({ targetGrade: "all" });
    }

    const forms = await Form.find(query).sort({ updatedAt: -1 }).limit(20);

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Active Forms Fetched",
          color: 0x10b981,
          fields: [
            { name: "Endpoint", value: "/api/forms/active", inline: true },
            {
              name: "Forms Found",
              value: forms.length.toString(),
              inline: true,
            },
            {
              name: "Username",
              value: req.session.username || "Guest",
              inline: true,
            },
            {
              name: "Query Conditions",
              value: JSON.stringify(query.$and).substring(0, 200) + "...",
              inline: false,
            },
            {
              name: "Timestamp",
              value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json(
      forms.map((form) => ({
        id: form.link,
        topic: form.topic,
        description: form.description || "",
        link: form.link,
        expiry: form.expiry,
        updatedAt: form.updatedAt,
        allowRetake: form.allowRetake,
        targetGrade: form.targetGrade,
        allowedGrades: form.targetGrade === "all" ? [] : [form.targetGrade],
      }))
    );
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch Active Forms Error",
          color: 0xe74c3c,
          fields: [
            { name: "Endpoint", value: "/api/forms/active" },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ message: "تعذر تحميل النماذج" });
  }
});

app.get("/api/forms/active/:gradeSlug", requireAuth, async (req, res) => {
  try {
    const gradeSlug = normalizeGradeSlug(req.params.gradeSlug);

    await sendWebhook("USER", {
      embeds: [
        {
          title: "📋 Grade Active Forms Request",
          color: 0x3498db,
          fields: [
            {
              name: "Endpoint",
              value: `/api/forms/active/${req.params.gradeSlug}`,
              inline: true,
            },
            {
              name: "Requested Grade",
              value: req.params.gradeSlug,
              inline: true,
            },
            {
              name: "Normalized Grade",
              value: gradeSlug || "Invalid",
              inline: true,
            },
            { name: "Username", value: req.session.username, inline: true },
            { name: "User Role", value: req.session.role, inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (!gradeSlug) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Grade Forms - Invalid Grade Slug",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "Requested Grade",
                value: req.params.gradeSlug,
                inline: true,
              },
              { name: "Normalized Grade", value: "null", inline: true },
              {
                name: "Valid Grades",
                value: GRADE_SLUGS.join(", "),
                inline: false,
              },
              { name: "Error", value: "Grade not found", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(404).json({ message: "الصف غير موجود" });
    }

    const user = getSessionUser(req);
    if (!userHasGradeAccess(user, gradeSlug)) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Unauthorized Grade Forms Access",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "User Role",
                value: user?.role || "Unknown",
                inline: true,
              },
              {
                name: "User Grade",
                value: user?.grade || "None",
                inline: true,
              },
              { name: "Requested Grade", value: gradeSlug, inline: true },
              {
                name: "User Grade Access",
                value: user?.gradeAccess?.join(", ") || "None",
                inline: false,
              },
              { name: "Error", value: "No grade access", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(403)
        .json({ message: "غير مصرح لك بالاطلاع على هذه النماذج" });
    }

    const now = new Date();
    const forms = await Form.find({
      status: "published",
      $and: [
        {
          $or: [{ targetGrade: "all" }, { targetGrade: gradeSlug }],
        },
        {
          $or: [{ expiry: null }, { expiry: { $gt: now } }],
        },
      ],
    }).sort({ updatedAt: -1 });

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Grade Forms Fetched",
          color: 0x10b981,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Grade", value: gradeSlug, inline: true },
            {
              name: "Forms Found",
              value: forms.length.toString(),
              inline: true,
            },
            {
              name: "Grade Label",
              value: GRADE_LABELS[gradeSlug]?.short || gradeSlug,
              inline: true,
            },
            {
              name: "Timestamp",
              value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json(
      forms.map((form) => ({
        id: form.link,
        topic: form.topic,
        title: form.topic,
        description: form.description || "",
        link: form.link,
        expiry: form.expiry,
        deadline: form.expiry,
        updatedAt: form.updatedAt,
        allowRetake: form.allowRetake,
        targetGrade: form.targetGrade,
        status: "active",
      }))
    );
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch Grade Forms Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username },
            { name: "Grade", value: req.params.gradeSlug },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ message: "تعذر تحميل النماذج الخاصة بالصف" });
  }
});

app.get("/api/grades/:gradeSlug/forms", requireAuth, async (req, res) => {
  try {
    const gradeSlug = normalizeGradeSlug(req.params.gradeSlug);

    await sendWebhook("USER", {
      embeds: [
        {
          title: "📋 Grade Forms Request",
          color: 0x3498db,
          fields: [
            {
              name: "Endpoint",
              value: `/api/grades/${req.params.gradeSlug}/forms`,
              inline: true,
            },
            {
              name: "Requested Grade",
              value: req.params.gradeSlug,
              inline: true,
            },
            {
              name: "Normalized Grade",
              value: gradeSlug || "Invalid",
              inline: true,
            },
            { name: "Username", value: req.session.username, inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (!gradeSlug) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Grade Forms - Invalid Slug",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "Requested Grade",
                value: req.params.gradeSlug,
                inline: true,
              },
              { name: "Error", value: "Grade not found", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(404).json({ message: "الصف غير موجود" });
    }

    const user = getSessionUser(req);
    if (!userHasGradeAccess(user, gradeSlug)) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Unauthorized Grade Forms Access",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "User Role",
                value: user?.role || "Unknown",
                inline: true,
              },
              { name: "Requested Grade", value: gradeSlug, inline: true },
              { name: "Error", value: "No access to this grade", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(403)
        .json({ message: "غير مصرح لك بالاطلاع على هذه النماذج" });
    }

    const now = new Date();
    const forms = await Form.find({
      status: "published",
      $and: [
        {
          $or: [{ targetGrade: "all" }, { targetGrade: gradeSlug }],
        },
        {
          $or: [{ expiry: null }, { expiry: { $gt: now } }],
        },
      ],
    }).sort({ updatedAt: -1 });

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Grade Forms Fetched",
          color: 0x10b981,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Grade", value: gradeSlug, inline: true },
            {
              name: "Forms Found",
              value: forms.length.toString(),
              inline: true,
            },
            {
              name: "Timestamp",
              value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json(
      forms.map((form) => ({
        topic: form.topic,
        description: form.description,
        link: form.link,
        expiry: form.expiry,
        updatedAt: form.updatedAt,
        allowRetake: form.allowRetake,
        targetGrade: form.targetGrade,
      }))
    );
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch Grade Forms Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username },
            { name: "Grade", value: req.params.gradeSlug },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ message: "تعذر تحميل النماذج الخاصة بالصف" });
  }
});

app.get(
  "/api/forms",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "📋 Admin Fetching All Forms",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              { name: "Endpoint", value: "/api/forms", inline: true },
              { name: "Action", value: "Fetch all forms", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const now = new Date();
      const allForms = await Form.find().sort({ updatedAt: -1 });

      const activeForms = [];
      const expiredForms = [];

      allForms.forEach((form) => {
        const isExpired = form.expiry && new Date(form.expiry) < now;
        if (isExpired) {
          expiredForms.push(serializeForm(form));
        } else {
          activeForms.push(serializeForm(form));
        }
      });

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Admin Fetched All Forms",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Total Forms",
                value: allForms.length.toString(),
                inline: true,
              },
              {
                name: "Active Forms",
                value: activeForms.length.toString(),
                inline: true,
              },
              {
                name: "Expired Forms",
                value: expiredForms.length.toString(),
                inline: true,
              },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({
        active: activeForms,
        expired: expiredForms,
      });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Forms Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ message: "تعذر تحميل النماذج" });
    }
  }
);

app.post(
  "/api/forms",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const {
        topic,
        expiry,
        questions,
        description,
        targetGrade,
        status,
        allowRetake,
      } = req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "📝 Admin Creating Form",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Topic", value: topic || "Not provided", inline: true },
              {
                name: "Target Grade",
                value: targetGrade || "all",
                inline: true,
              },
              {
                name: "Questions Count",
                value: questions?.length.toString() || "0",
                inline: true,
              },
              { name: "Action", value: "Create Form", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const expiryDate = parseExpiryDate(expiry);

      if (!topic) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Create Form Failed - Missing Topic",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Error", value: "Topic is required", inline: true },
                {
                  name: "Target Grade",
                  value: targetGrade || "all",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(400).json({ message: "يرجى إدخال اسم للنموذج" });
      }

      const existingForm = await Form.findOne({ topic: topic.trim() });
      if (existingForm) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Create Form Failed - Duplicate Topic",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Topic", value: topic, inline: true },
                {
                  name: "Existing Form Link",
                  value: existingForm.link,
                  inline: true,
                },
                {
                  name: "Existing Form Status",
                  value: existingForm.status,
                  inline: true,
                },
                { name: "Error", value: "Duplicate topic", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(400)
          .json({ message: "يوجد نموذج بنفس الاسم بالفعل" });
      }

      const sanitizedQuestions = sanitizeQuestions(questions);
      const normalizedStatus = "published";
      const normalizedTarget = normalizeFormTarget(targetGrade);
      const link = uuidv4();

      const newForm = new Form({
        topic: topic.trim(),
        expiry: expiryDate,
        description: description || "",
        targetGrade: normalizedTarget,
        status: normalizedStatus,
        allowRetake: false,
        questions: sanitizedQuestions,
        link,
        createdBy: req.session.username,
        updatedBy: req.session.username,
        updatedAt: new Date(),
      });

      await newForm.save();

      const user = getSessionUser(req);
      const gradeLabel =
        GRADE_LABELS[newForm.targetGrade]?.long || newForm.targetGrade;

      await sendWebhook("FORM", {
        content: `📝 **New Form Created**`,
        embeds: [
          {
            title: "Form Created",
            color: 0x1abc9c,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Role",
                value: user ? user.role.toUpperCase() : "ADMIN",
                inline: true,
              },
              { name: "Form Name", value: newForm.topic, inline: true },
              {
                name: "Target Grade",
                value: gradeLabel || newForm.targetGrade,
                inline: true,
              },
              { name: "Status", value: newForm.status, inline: true },
              {
                name: "Questions Count",
                value: `${newForm.questions.length}`,
                inline: true,
              },
              {
                name: "Total Points",
                value: `${newForm.questions.reduce(
                  (sum, q) => sum + (q.points || 10),
                  0
                )}`,
                inline: true,
              },
              {
                name: "Form Link",
                value: `${req.protocol}://${req.get("host")}/form/${
                  newForm.link
                }`,
                inline: false,
              },
              {
                name: "Expiry Date",
                value: newForm.expiry
                  ? new Date(newForm.expiry).toLocaleString("ar-EG")
                  : "No expiry",
                inline: true,
              },
              {
                name: "Created At",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
              { name: "Form ID", value: newForm._id.toString(), inline: true },
              {
                name: "Questions Types",
                value: newForm.questions.map((q) => q.questionType).join(", "),
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({
        success: true,
        form: serializeForm(newForm),
        shareUrl: `${req.protocol}://${req.get("host")}/form/${link}`,
      });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Create Form Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Topic", value: req.body.topic || "Unknown" },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(400).json({
        success: false,
        message: error.message || "تعذر إنشاء النموذج",
      });
    }
  }
);

app.get(
  "/api/forms/:link",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "📋 Admin Fetching Form Details",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Form Link", value: req.params.link, inline: true },
              {
                name: "Endpoint",
                value: `/api/forms/${req.params.link}`,
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const form = await Form.findOne({ link: req.params.link });
      if (!form) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Fetch Form Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Form Link", value: req.params.link, inline: true },
                { name: "Error", value: "Form not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(404).json({ message: "النموذج غير موجود" });
      }

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Form Details Fetched",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Link", value: form.link, inline: true },
              { name: "Status", value: form.status, inline: true },
              {
                name: "Questions",
                value: form.questions.length.toString(),
                inline: true,
              },
              {
                name: "Submissions",
                value: form.submissions.length.toString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json(serializeForm(form));
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Form Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Form Link", value: req.params.link },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ message: "تعذر تحميل النموذج" });
    }
  }
);

app.put(
  "/api/forms/:link",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const {
        topic,
        expiry,
        questions,
        description,
        targetGrade,
        status,
        allowRetake,
      } = req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✏️ Admin Updating Form",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Form Link", value: req.params.link, inline: true },
              { name: "Topic", value: topic || "No change", inline: true },
              {
                name: "Questions Count",
                value: questions?.length.toString() || "No change",
                inline: true,
              },
              { name: "Action", value: "Update Form", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const form = await Form.findOne({ link: req.params.link });
      if (!form) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Update Form Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Form Link", value: req.params.link, inline: true },
                { name: "Error", value: "Form not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(404).json({ message: "النموذج غير موجود" });
      }

      const expiryDate = parseExpiryDate(expiry);

      if (topic && topic.trim() !== form.topic) {
        const duplicate = await Form.findOne({ topic: topic.trim() });
        if (duplicate) {
          await sendWebhook("ADMIN", {
            embeds: [
              {
                title: "❌ Update Form Failed - Duplicate Topic",
                color: 0xe74c3c,
                fields: [
                  { name: "Admin", value: req.session.username, inline: true },
                  { name: "Form Link", value: req.params.link, inline: true },
                  { name: "New Topic", value: topic, inline: true },
                  {
                    name: "Existing Form Link",
                    value: duplicate.link,
                    inline: true,
                  },
                  { name: "Error", value: "Duplicate topic", inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
          return res.status(400).json({ message: "يوجد نموذج آخر بنفس الاسم" });
        }
        form.topic = topic.trim();
      }

      if (typeof description === "string") form.description = description;
      if (targetGrade) form.targetGrade = normalizeFormTarget(targetGrade);
      form.status = "published";
      form.allowRetake = false;
      if (expiry !== undefined) {
        form.expiry = expiryDate;
      }

      if (questions && questions.length > 0) {
        form.questions = sanitizeQuestions(questions);
      }

      form.updatedBy = req.session.username;
      form.updatedAt = new Date();

      await form.save();

      const wasExpired = form.expiry && new Date(form.expiry) < new Date();
      const isNowActive = expiryDate && new Date(expiryDate) > new Date();
      if (wasExpired && isNowActive) {
        await sendWebhook("FORM", {
          content: `🔄 **Form Reactivated**`,
          embeds: [
            {
              title: "Form Reactivated",
              color: 0x27ae60,
              fields: [
                { name: "Admin", value: req.session.username },
                { name: "Form", value: form.topic },
                { name: "Form Link", value: form.link, inline: true },
                {
                  name: "New Expiry",
                  value: expiryDate
                    ? new Date(expiryDate).toLocaleString("ar-EG")
                    : "No expiry",
                },
                { name: "Previous Status", value: "expired", inline: true },
                { name: "New Status", value: "published", inline: true },
                {
                  name: "Reactivated At",
                  value: new Date().toLocaleString(),
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }

      const updateUser = getSessionUser(req);
      await sendWebhook("FORM", {
        content: `✏️ **Form Updated**`,
        embeds: [
          {
            title: "Form Updated",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Role",
                value: updateUser ? updateUser.role.toUpperCase() : "ADMIN",
                inline: true,
              },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Link", value: form.link, inline: true },
              { name: "Status", value: form.status, inline: true },
              {
                name: "Questions Count",
                value: form.questions.length.toString(),
                inline: true,
              },
              { name: "Target Grade", value: form.targetGrade, inline: true },
              {
                name: "Updated At",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
              { name: "Form ID", value: form._id.toString(), inline: true },
              { name: "Previous Editor", value: form.updatedBy, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, form: serializeForm(form) });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Update Form Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Form Link", value: req.params.link },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(400).json({
        success: false,
        message: error.message || "تعذر تحديث النموذج",
      });
    }
  }
);

app.delete(
  "/api/forms/:link",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { link } = req.params;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🗑️ Admin Deleting Form",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Form Link", value: link, inline: true },
              { name: "Action", value: "Mark Form as Expired", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const form = await Form.findOne({ link });
      if (!form) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Delete Form Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Form Link", value: link, inline: true },
                { name: "Error", value: "Form not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(404).json({ message: "النموذج غير موجود" });
      }
      form.status = "expired";
      form.updatedBy = req.session.username;
      form.updatedAt = new Date();
      if (!form.expiry || form.expiry > new Date()) {
        form.expiry = new Date();
      }
      await form.save();
      const deleteUser = getSessionUser(req);
      await sendWebhook("FORM", {
        content: `🕒 **Form Marked Expired**`,
        embeds: [
          {
            title: "Form Marked Expired",
            color: 0xe67e22,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Role",
                value: deleteUser ? deleteUser.role.toUpperCase() : "ADMIN",
                inline: true,
              },
              { name: "Form Name", value: form.topic, inline: true },
              { name: "Form Link", value: link, inline: true },
              { name: "Status", value: form.status, inline: true },
              { name: "Previous Status", value: "published", inline: true },
              {
                name: "Questions Count",
                value: form.questions.length.toString(),
                inline: true,
              },
              {
                name: "Submissions Count",
                value: form.submissions.length.toString(),
                inline: true,
              },
              {
                name: "Updated At",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
              { name: "Form ID", value: form._id.toString(), inline: true },
              {
                name: "New Expiry",
                value: form.expiry.toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.json({
        success: true,
        message: "تم تحويل حالة النموذج إلى منتهي الصلاحية.",
      });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Delete Form Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Form Link", value: req.params.link },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر حذف النموذج" });
    }
  }
);

app.get(
  "/api/banned-users",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🚫 Admin Fetching Banned Users",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              { name: "Endpoint", value: "/api/banned-users", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const bans = await BannedUser.find().sort({ createdAt: -1 });

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Banned Users Fetched",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Bans Found",
                value: bans.length.toString(),
                inline: true,
              },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json(bans);
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Banned Users Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ message: "تعذر تحميل القائمة" });
    }
  }
);

app.post(
  "/api/banned-users",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { username, banType, reason } = req.body;
      const normalized = username.toLowerCase();

      if (!normalized) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Ban User Failed - Missing Username",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Ban Type", value: banType || "all", inline: true },
                { name: "Reason", value: reason || "No reason", inline: true },
                { name: "Error", value: "Username is required", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(400).json({ message: "يرجى إدخال اسم المستخدم" });
      }

      const allowedBanTypes = ["login", "forms", "all"];
      const selectedBanType = allowedBanTypes.includes(banType)
        ? banType
        : "all";

      const existingBan = await BannedUser.findOne({
        usernameLower: normalized,
      });
      const isUpdate = !!existingBan;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: isUpdate ? "⚠️ Admin Updating Ban" : "🚫 Admin Creating Ban",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Username", value: username, inline: true },
              { name: "Ban Type", value: selectedBanType, inline: true },
              {
                name: "Reason",
                value: reason || "No reason provided",
                inline: false,
              },
              {
                name: "Action",
                value: isUpdate ? "Update Ban" : "Create Ban",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const ban = await BannedUser.findOneAndUpdate(
        { usernameLower: normalized },
        {
          username: username.trim(),
          usernameLower: normalized,
          banType: selectedBanType,
          reason: reason || "",
          createdBy: req.session.username,
          createdAt: new Date(),
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      await sendWebhook("SECURITY", {
        content: isUpdate ? `🔄 **User Ban Updated**` : `🚫 **User Banned**`,
        embeds: [
          {
            title: isUpdate ? "User Ban Updated" : "User Banned",
            color: isUpdate ? 0xf39c12 : 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Banned User", value: username },
              { name: "Ban Type", value: selectedBanType },
              { name: "Reason", value: reason || "No reason provided" },
              {
                name: "Action",
                value: isUpdate ? "Updated" : "Created",
                inline: true,
              },
              {
                name: "Previous Ban Type",
                value: isUpdate ? existingBan.banType : "None",
                inline: true,
              },
              {
                name: "Previous Reason",
                value: isUpdate ? existingBan.reason : "None",
                inline: true,
              },
              {
                name: "Banned At",
                value: new Date().toLocaleString(),
                inline: true,
              },
              { name: "Ban ID", value: ban._id.toString(), inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, ban });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Ban User Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Username", value: req.body.username || "Unknown" },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(400).json({ success: false, message: "تعذر حفظ قرار الحظر" });
    }
  }
);

app.delete(
  "/api/banned-users/:username",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const normalized = req.params.username.toLowerCase();

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Admin Unbanning User",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Username", value: req.params.username, inline: true },
              { name: "Normalized", value: normalized, inline: true },
              { name: "Action", value: "Unban User", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      if (!normalized) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Unban Failed - Invalid Username",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Username", value: req.params.username, inline: true },
                { name: "Error", value: "Invalid username", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(400).json({ message: "اسم المستخدم غير صالح" });
      }
      const banRecord = await BannedUser.findOne({ usernameLower: normalized });
      if (!banRecord) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Unban Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Username", value: req.params.username, inline: true },
                {
                  name: "Error",
                  value: "User not found in ban list",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ message: "المستخدم غير موجود في قائمة الحظر" });
      }
      await BannedUser.deleteOne({ _id: banRecord._id });
      await sendWebhook("SECURITY", {
        content: `✅ **User Unbanned**`,
        embeds: [
          {
            title: "User Unbanned",
            color: 0x27ae60,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Unbanned User", value: req.params.username },
              {
                name: "Previous Ban Type",
                value: banRecord.banType,
                inline: true,
              },
              {
                name: "Previous Reason",
                value: banRecord.reason || "No reason",
                inline: true,
              },
              {
                name: "Banned By",
                value: banRecord.createdBy || "System",
                inline: true,
              },
              {
                name: "Banned Date",
                value: banRecord.createdAt.toLocaleString(),
                inline: true,
              },
              {
                name: "Unbanned At",
                value: new Date().toLocaleString(),
                inline: true,
              },
              {
                name: "Ban Duration",
                value: `${Math.floor(
                  (new Date() - banRecord.createdAt) / (1000 * 60 * 60 * 24)
                )} days`,
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Unban User Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Username", value: req.params.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res
        .status(500)
        .json({ success: false, message: "تعذر إزالة المستخدم من الحظر" });
    }
  }
);

app.get("/form/:link", requireAuth, async (req, res) => {
  try {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "📄 Form Access Attempt",
          color: 0x3498db,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Role", value: req.session.role, inline: true },
            { name: "Form Link", value: req.params.link, inline: true },
            { name: "Path", value: `/form/${req.params.link}`, inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const form = await Form.findOne({ link: req.params.link });
    if (!form) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Form Not Found",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form Link", value: req.params.link, inline: true },
              { name: "Error", value: "Form not found", inline: true },
              { name: "Redirect", value: "/404.html", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(404).redirect("/404.html");
    }

    const user = getSessionUser(req);
    const isAdminViewer =
      user && (user.role === "admin" || user.role === "leadadmin");
    if (form.status === "draft" && !isAdminViewer) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "🚫 Draft Form Access Denied",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Link", value: form.link, inline: true },
              { name: "Form Status", value: "draft", inline: true },
              {
                name: "User Role",
                value: user?.role || "Unknown",
                inline: true,
              },
              {
                name: "Required Role",
                value: "admin or leadadmin",
                inline: true,
              },
              {
                name: "Error",
                value: "Draft form access denied",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).redirect("/404.html");
    }
    if (form.status === "expired" && !isAdminViewer) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "🕒 Expired Form Access Denied",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Link", value: form.link, inline: true },
              { name: "Form Status", value: "expired", inline: true },
              {
                name: "Expiry Date",
                value: form.expiry?.toLocaleString() || "No expiry",
                inline: true,
              },
              {
                name: "Error",
                value: "Expired form access denied",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).redirect("/404.html");
    }

    if (!canUserAccessForm(user, form)) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Unauthorized Form Access",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "User Role",
                value: user?.role || "Unknown",
                inline: true,
              },
              {
                name: "User Grade",
                value: user?.grade || "None",
                inline: true,
              },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Target", value: form.targetGrade, inline: true },
              { name: "Form Status", value: form.status, inline: true },
              { name: "Error", value: "No form access", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).redirect("/404.html");
    }

    const currentTime = new Date();
    if (form.expiry && currentTime > form.expiry) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "🕒 Form Expired",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Link", value: form.link, inline: true },
              {
                name: "Expiry Date",
                value: form.expiry.toLocaleString(),
                inline: true,
              },
              {
                name: "Current Time",
                value: currentTime.toLocaleString(),
                inline: true,
              },
              { name: "Error", value: "Form expired", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).redirect("/404.html");
    }

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Form Accessed Successfully",
          color: 0x10b981,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Form", value: form.topic, inline: true },
            { name: "Form Link", value: form.link, inline: true },
            { name: "Form Status", value: form.status, inline: true },
            {
              name: "Questions",
              value: form.questions.length.toString(),
              inline: true,
            },
            { name: "Target Grade", value: form.targetGrade, inline: true },
            {
              name: "Expiry Date",
              value: form.expiry?.toLocaleString() || "No expiry",
              inline: true,
            },
            {
              name: "Access Time",
              value: currentTime.toLocaleString(),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.render("form", {
      form,
      sessionUser: {
        username: req.session.username,
        role: req.session.role,
        grade: req.session.grade || null,
      },
    });
  } catch (err) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Render Form Error",
          color: 0xe74c3c,
          fields: [
            { name: "Form Link", value: req.params.link },
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Error", value: err.message },
            {
              name: "Stack Trace",
              value: err.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    if (req.accepts("html")) {
      return res.status(500).sendFile(path.join(__dirname, "views/500.html"));
    }
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/form/:link", requireAuth, async (req, res) => {
  const formLink = req.params.link;
  const { deviceId, ...answers } = req.body;
  const userIp = req.ip || "unknown";
  const sessionUser = getSessionUser(req);

  await sendWebhook("USER", {
    embeds: [
      {
        title: "📝 Form Submission Attempt",
        color: 0xf59e0b,
        fields: [
          { name: "Username", value: req.session.username, inline: true },
          { name: "Form Link", value: formLink, inline: true },
          {
            name: "Device ID",
            value: deviceId?.substring(0, 20) + "..." || "Missing",
            inline: true,
          },
          {
            name: "Answers Count",
            value: Object.keys(answers).length.toString(),
            inline: true,
          },
          { name: "IP", value: userIp, inline: true },
          {
            name: "User Agent",
            value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (!sessionUser) {
    await sendWebhook("SECURITY", {
      embeds: [
        {
          title: "❌ Form Submission - No Session User",
          color: 0xe74c3c,
          fields: [
            { name: "Form Link", value: formLink, inline: true },
            {
              name: "Device ID",
              value: deviceId?.substring(0, 20) + "..." || "Missing",
              inline: true,
            },
            { name: "IP", value: userIp, inline: true },
            {
              name: "Error",
              value: "Session expired or invalid",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(403).json({
      success: false,
      message: "الجلسة انتهت. يرجى تسجيل الدخول مرة أخرى.",
    });
  }

  if (!deviceId || typeof deviceId !== "string") {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "❌ Form Submission - Invalid Device ID",
          color: 0xe74c3c,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Form Link", value: formLink, inline: true },
            { name: "Device ID Type", value: typeof deviceId, inline: true },
            {
              name: "Device ID Value",
              value: deviceId || "null",
              inline: true,
            },
            {
              name: "Error",
              value: "Invalid or missing device ID",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return res.status(400).json({
      success: false,
      message: "الجهاز غير صالح أو غير موجود. يرجى المحاولة مرة أخرى.",
    });
  }

  try {
    const form = await Form.findOne({ link: formLink });
    if (!form) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Form Submission - Form Not Found",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form Link", value: formLink, inline: true },
              { name: "Error", value: "Form not found", inline: true },
              { name: "Redirect", value: "/404.html", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(404).redirect("/404.html");
    }

    if (!canUserAccessForm(sessionUser, form)) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Form Submission - No Access",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "User Role", value: sessionUser.role, inline: true },
              {
                name: "User Grade",
                value: sessionUser.grade || "None",
                inline: true,
              },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Target", value: form.targetGrade, inline: true },
              { name: "Error", value: "No form access", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).json({
        success: false,
        message: "ليست لديك صلاحية لحل هذا النموذج.",
      });
    }

    const isAdminViewer =
      req.session &&
      (req.session.role === "admin" || req.session.role === "leadadmin");
    if (form.status === "draft" && !isAdminViewer) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "🚫 Form Submission - Draft Form",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Status", value: "draft", inline: true },
              {
                name: "Error",
                value: "Draft form not available",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).json({
        success: false,
        message: "هذا النموذج غير متاح حالياً.",
      });
    }
    if (form.status === "expired" && !isAdminViewer) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "🕒 Form Submission - Expired Form",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Status", value: "expired", inline: true },
              {
                name: "Expiry Date",
                value: form.expiry?.toLocaleString() || "No expiry",
                inline: true,
              },
              { name: "Error", value: "Form expired", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).json({
        success: false,
        message: "انتهت صلاحية هذا النموذج.",
      });
    }

    const banRecord = await getBanRecord(
      req.session.username || (sessionUser && sessionUser.originalUsername)
    );
    if (
      banRecord &&
      (banRecord.banType === "forms" || banRecord.banType === "all")
    ) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Form Submission - Banned User",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form", value: form.topic, inline: true },
              { name: "Ban Type", value: banRecord.banType, inline: true },
              {
                name: "Ban Reason",
                value: banRecord.reason || "No reason",
                inline: true,
              },
              {
                name: "Banned By",
                value: banRecord.createdBy || "System",
                inline: true,
              },
              { name: "Error", value: "User banned from forms", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      let banMessage = "تم حظرك من إرسال النماذج.";
      if (banRecord.reason && banRecord.reason.trim()) {
        banMessage = `تم حظرك من إرسال النماذج. السبب: ${banRecord.reason}`;
      }
      return res.status(403).json({
        success: false,
        message: banMessage,
      });
    }

    if (
      req.session.submittedForms &&
      req.session.submittedForms.includes(formLink) &&
      !form.allowRetake
    ) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "⚠️ Form Submission - Already Submitted",
            color: 0xf59e0b,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Link", value: formLink, inline: true },
              {
                name: "Allow Retake",
                value: form.allowRetake ? "✅ Yes" : "❌ No",
                inline: true,
              },
              { name: "Error", value: "Already submitted", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(400).json({
        success: false,
        message: "لقد قمت بإرسال هذا النموذج من قبل.",
      });
    }

    if (!form.allowRetake) {
      const existingSubmission = form.submissions.find(
        (submission) =>
          submission.deviceId === deviceId || submission.ip === userIp
      );

      if (existingSubmission) {
        await sendWebhook("USER", {
          embeds: [
            {
              title: "⚠️ Form Submission - Duplicate Device/IP",
              color: 0xf59e0b,
              fields: [
                { name: "Username", value: req.session.username, inline: true },
                { name: "Form", value: form.topic, inline: true },
                {
                  name: "Device ID",
                  value: deviceId.substring(0, 20) + "...",
                  inline: true,
                },
                { name: "IP", value: userIp, inline: true },
                {
                  name: "Existing Submission Time",
                  value: existingSubmission.submissionTime.toLocaleString(),
                  inline: true,
                },
                {
                  name: "Error",
                  value: "Duplicate device/IP submission",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(400).json({
          success: false,
          message: ".لقد قمت بإرسال هذا النموذج مسبقًا",
        });
      }
    }

    const score = form.questions.reduce((total, question, index) => {
      const userAnswerKey = answers[`q${index}`];
      let correctAnswerValue = "";
      if (question.questionType === "true-false") {
        correctAnswerValue = question.correctAnswer;
      } else {
        const answerIndex =
          typeof question.correctAnswerIndex === "number"
            ? question.correctAnswerIndex
            : question.correctAnswer;
        correctAnswerValue = question.options[answerIndex] || "";
      }

      if (
        userAnswerKey &&
        correctAnswerValue &&
        userAnswerKey.toString().trim() === correctAnswerValue.toString().trim()
      ) {
        total += 1;
      }
      return total;
    }, 0);

    const pointsEarned = form.questions.reduce((total, question, index) => {
      const userAnswerKey = answers[`q${index}`];
      let correctAnswerValue = "";
      if (question.questionType === "true-false") {
        correctAnswerValue = question.correctAnswer;
      } else {
        const answerIndex =
          typeof question.correctAnswerIndex === "number"
            ? question.correctAnswerIndex
            : question.correctAnswer;
        correctAnswerValue = question.options[answerIndex] || "";
      }

      if (
        userAnswerKey &&
        correctAnswerValue &&
        userAnswerKey.toString().trim() === correctAnswerValue.toString().trim()
      ) {
        const questionPoints =
          typeof question.points === "number" ? question.points : 10;
        return total + questionPoints;
      }
      return total;
    }, 0);

    const submissionUsername =
      req.session.username ||
      (sessionUser && (sessionUser.username || sessionUser.originalUsername)) ||
      "غير معروف";
    form.submissions.push({
      username: submissionUsername,
      grade:
        req.session.grade || (sessionUser && sessionUser.grade) || "غير محدد",
      score: score,
      deviceId,
      ip: userIp,
      submissionTime: new Date(),
    });

    await form.save();

    if (pointsEarned > 0 && sessionUser && sessionUser.role === "student") {
      try {
        let userPoints = await UserPoints.findOne({
          username: req.session.username.toLowerCase(),
        });
        if (!userPoints) {
          userPoints = new UserPoints({
            username: req.session.username.toLowerCase(),
            points: 0,
          });
        }

        const previousPoints = userPoints.points;
        userPoints.points += pointsEarned;
        userPoints.transactions.push({
          type: "earned",
          amount: pointsEarned,
          description: `إجابة صحيحة على نموذج: ${form.topic}`,
          formLink: formLink,
        });

        await userPoints.save();

        await sendWebhook("USER", {
          embeds: [
            {
              title: "🎁 Points Awarded for Form",
              color: 0x1abc9c,
              fields: [
                { name: "Username", value: req.session.username, inline: true },
                { name: "Form", value: form.topic, inline: true },
                {
                  name: "Points Earned",
                  value: pointsEarned.toString(),
                  inline: true,
                },
                {
                  name: "Previous Points",
                  value: previousPoints.toString(),
                  inline: true,
                },
                {
                  name: "New Points",
                  value: userPoints.points.toString(),
                  inline: true,
                },
                { name: "Transaction Type", value: "earned", inline: true },
                {
                  name: "Transaction ID",
                  value:
                    userPoints.transactions[
                      userPoints.transactions.length - 1
                    ]._id
                      .toString()
                      .substring(0, 10) + "...",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } catch (error) {
        await sendWebhook("ERROR", {
          embeds: [
            {
              title: "❌ Award Points Error",
              color: 0xe74c3c,
              fields: [
                { name: "User", value: req.session.username },
                { name: "Form", value: form.topic },
                { name: "Points Attempted", value: pointsEarned.toString() },
                { name: "Error", value: error.message },
                {
                  name: "Stack Trace",
                  value: error.stack?.substring(0, 500) || "No stack",
                  inline: false,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }
    }

    if (!form.allowRetake) {
      req.session.submittedForms = req.session.submittedForms || [];
      req.session.submittedForms.push(formLink);
    }

    const totalQuestions = form.questions.length;
    const percentage =
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    const parser = new UAParser();
    const userAgent = req.headers["user-agent"];
    const deviceInfo = parser.setUA(userAgent).getResult();
    const device = `${deviceInfo.os.name || "Unknown OS"} (${
      deviceInfo.browser.name || "Unknown Browser"
    })`;

    const submissionTime = moment()
      .tz("Africa/Cairo")
      .format("YYYY-MM-DD HH:mm:ss");
    const userGrade =
      req.session.grade || (sessionUser && sessionUser.grade) || null;
    const gradeLabel = userGrade
      ? GRADE_LABELS[userGrade]?.long || userGrade
      : "غير محدد";
    const userRole = req.session.role || "student";

    await sendWebhook("FORM", {
      content: `📝 **New Form Submission**`,
      embeds: [
        {
          title: "Form Submission Report",
          color: pointsEarned > 0 ? 0x10b981 : 0x6366f1,
          fields: [
            {
              name: "👤 User Information",
              value: `**Username:** ${
                req.session.username
              }\n**Grade:** ${gradeLabel}\n**Role:** ${userRole.toUpperCase()}`,
              inline: true,
            },
            {
              name: "📋 Form Information",
              value: `**Topic:** ${form.topic}\n**Target Grade:** ${
                GRADE_LABELS[form.targetGrade]?.long || form.targetGrade
              }\n**Questions:** ${totalQuestions}`,
              inline: true,
            },
            {
              name: "📊 Results",
              value: `**Score:** ${score}/${totalQuestions}\n**Percentage:** ${percentage}%\n**Points:** 🎁 ${pointsEarned}`,
              inline: false,
            },
            {
              name: "🕐 Submission Details",
              value: `**Time:** ${submissionTime}\n**Device:** ${device}\n**IP:** ${userIp}\n**Device ID:** ${deviceId.substring(
                0,
                20
              )}...`,
              inline: false,
            },
            {
              name: "📈 Additional Info",
              value: `**Form Link:** ${formLink}\n**Form ID:** ${form._id.toString()}\n**Submission ID:** ${form.submissions[
                form.submissions.length - 1
              ]._id
                .toString()
                .substring(0, 10)}...\n**Allow Retake:** ${
                form.allowRetake ? "✅ Yes" : "❌ No"
              }\n**Total Submissions:** ${form.submissions.length}`,
              inline: false,
            },
          ],
          footer: {
            text: `Form: ${formLink}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const pointsMessage =
      pointsEarned > 0 ? ` لقد ربحت ${pointsEarned} نقطة!` : "";
    res.json({
      success: true,
      message: `لقد انتهيت و تم إرسال النموذج بنجاح!${pointsMessage}`,
      pointsEarned: pointsEarned,
    });
  } catch (err) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Form Submission Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username },
            { name: "Form Link", value: formLink },
            { name: "Error", value: err.message },
            {
              name: "Stack Trace",
              value: err.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تقديم النموذج. يرجى المحاولة لاحقًا.",
    });
  }
});

app.get("/form/:link/leaderboard", requireAuth, async (req, res) => {
  try {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "🏆 Form Leaderboard Access",
          color: 0x3498db,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Form Link", value: req.params.link, inline: true },
            {
              name: "Path",
              value: `/form/${req.params.link}/leaderboard`,
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const form = await Form.findOne({ link: req.params.link });
    if (!form) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Form Leaderboard - Form Not Found",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Form Link", value: req.params.link, inline: true },
              { name: "Error", value: "Form not found", inline: true },
              { name: "Redirect", value: "/404.html", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(404).redirect("/404.html");
    }

    const user = getSessionUser(req);
    if (!canUserAccessForm(user, form)) {
      await sendWebhook("SECURITY", {
        embeds: [
          {
            title: "🚫 Form Leaderboard - No Access",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              {
                name: "User Role",
                value: user?.role || "Unknown",
                inline: true,
              },
              { name: "Form", value: form.topic, inline: true },
              { name: "Form Target", value: form.targetGrade, inline: true },
              { name: "Error", value: "No form access", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.status(403).redirect("/404.html");
    }

    const leaderboard = form.submissions
      .sort((a, b) => b.score - a.score)
      .map((submission, index) => ({
        rank: index + 1,
        username: submission.username,
        grade: submission.grade,
        score: submission.score,
        submissionTime: submission.submissionTime.toLocaleString("en-US", {
          timeZone: "Africa/Cairo",
        }),
      }));

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Form Leaderboard Fetched",
          color: 0x10b981,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Form", value: form.topic, inline: true },
            { name: "Form Link", value: form.link, inline: true },
            {
              name: "Submissions Count",
              value: form.submissions.length.toString(),
              inline: true,
            },
            {
              name: "Leaderboard Entries",
              value: leaderboard.length.toString(),
              inline: true,
            },
            {
              name: "Top Score",
              value:
                leaderboard.length > 0 ? leaderboard[0].score.toString() : "0",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.render("leaderboard", { form, leaderboard });
  } catch (err) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Leaderboard Error",
          color: 0xe74c3c,
          fields: [
            { name: "Form Link", value: req.params.link },
            { name: "Username", value: req.session.username || "Unknown" },
            { name: "Error", value: err.message },
            {
              name: "Stack Trace",
              value: err.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    if (req.accepts("html")) {
      return res.status(500).sendFile(path.join(__dirname, "views/500.html"));
    }
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/UI/*", (req, res) => {
  const imageName = req.params[0];
  const imagePath = path.join(__dirname, "UI", imageName);

  sendWebhook("USER", {
    embeds: [
      {
        title: "🖼️ UI Image Accessed",
        color: 0x3498db,
        fields: [
          { name: "Image Name", value: imageName, inline: true },
          { name: "Path", value: `/UI/${imageName}`, inline: true },
          { name: "Full Path", value: imagePath, inline: false },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  res.sendFile(imagePath);
});

app.get("/api/gift-shop/items", requireAuth, async (req, res) => {
  try {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "🛍️ Gift Shop Items Request",
          color: 0x3498db,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Role", value: req.session.role, inline: true },
            { name: "Endpoint", value: "/api/gift-shop/items", inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const items = await GiftShopItem.find({ active: true }).sort({ cost: 1 });

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Gift Shop Items Fetched",
          color: 0x10b981,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            {
              name: "Items Found",
              value: items.length.toString(),
              inline: true,
            },
            {
              name: "Active Items",
              value: items.filter((i) => i.active).length.toString(),
              inline: true,
            },
            {
              name: "Total Cost Range",
              value:
                items.length > 0
                  ? `${items[0].cost} - ${items[items.length - 1].cost} points`
                  : "No items",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json(items);
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch Gift Shop Items Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ error: "تعذر تحميل العناصر" });
  }
});

app.get("/api/gift-shop/my-points", requireAuth, async (req, res) => {
  try {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "🎁 User Points Request",
          color: 0x3498db,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            {
              name: "Endpoint",
              value: "/api/gift-shop/my-points",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const normalizedUsername = req.session.username.toLowerCase();
    const userPoints = await UserPoints.findOne({
      username: normalizedUsername,
    });

    const points = userPoints ? userPoints.points : 0;

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ User Points Fetched",
          color: 0x10b981,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Points", value: points.toString(), inline: true },
            {
              name: "Has Points Record",
              value: userPoints ? "✅ Yes" : "❌ No",
              inline: true,
            },
            {
              name: "Transactions Count",
              value: userPoints
                ? userPoints.transactions.length.toString()
                : "0",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json({ points: points });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch User Points Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ error: "تعذر تحميل النقاط" });
  }
});

app.post("/api/gift-shop/purchase", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.body;

    await sendWebhook("USER", {
      embeds: [
        {
          title: "🛒 Gift Purchase Attempt",
          color: 0xf59e0b,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Item ID", value: itemId, inline: true },
            {
              name: "Endpoint",
              value: "/api/gift-shop/purchase",
              inline: true,
            },
            { name: "Action", value: "Purchase Gift", inline: true },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const normalizedUsername = req.session.username.toLowerCase();

    let userPoints = await UserPoints.findOne({ username: normalizedUsername });
    if (!userPoints) {
      userPoints = new UserPoints({
        username: normalizedUsername,
        points: 0,
      });
    }

    const item = await GiftShopItem.findById(itemId);
    if (!item || !item.active) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Gift Purchase Failed - Item Not Found",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Item ID", value: itemId, inline: true },
              {
                name: "Item Active",
                value: item ? (item.active ? "✅ Yes" : "❌ No") : "Not found",
                inline: true,
              },
              {
                name: "Error",
                value: "Item not found or inactive",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(404)
        .json({ success: false, message: "العنصر غير موجود" });
    }

    if (item.stock !== -1 && item.stock <= 0) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Gift Purchase Failed - Out of Stock",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Item", value: item.name, inline: true },
              { name: "Item ID", value: itemId, inline: true },
              { name: "Stock", value: item.stock.toString(), inline: true },
              { name: "Error", value: "Item out of stock", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "العنصر غير متوفر" });
    }

    if (item.purchaseLimit !== -1 && item.purchaseLimit > 0) {
      const userPurchases = await GiftPurchase.countDocuments({
        username: normalizedUsername,
        itemId: itemId,
        status: { $in: ["pending", "accepted"] },
      });
      if (userPurchases >= item.purchaseLimit) {
        await sendWebhook("USER", {
          embeds: [
            {
              title: "❌ Gift Purchase Failed - Purchase Limit",
              color: 0xe74c3c,
              fields: [
                { name: "Username", value: req.session.username, inline: true },
                { name: "Item", value: item.name, inline: true },
                {
                  name: "Purchases Made",
                  value: userPurchases.toString(),
                  inline: true,
                },
                {
                  name: "Purchase Limit",
                  value: item.purchaseLimit.toString(),
                  inline: true,
                },
                {
                  name: "Error",
                  value: "Purchase limit reached",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(400).json({
          success: false,
          message: `لقد وصلت للحد الأقصى من عمليات الشراء لهذا العنصر (${item.purchaseLimit})`,
        });
      }
    }

    if (userPoints.points < item.cost) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "❌ Gift Purchase Failed - Insufficient Points",
            color: 0xe74c3c,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Item", value: item.name, inline: true },
              { name: "Item Cost", value: item.cost.toString(), inline: true },
              {
                name: "User Points",
                value: userPoints.points.toString(),
                inline: true,
              },
              {
                name: "Points Needed",
                value: (item.cost - userPoints.points).toString(),
                inline: true,
              },
              { name: "Error", value: "Insufficient points", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res
        .status(400)
        .json({ success: false, message: "نقاطك غير كافية" });
    }

    const previousPoints = userPoints.points;
    userPoints.points -= item.cost;
    userPoints.transactions.push({
      type: "spent",
      amount: item.cost,
      description: `شراء: ${item.name} (قيد المراجعة)`,
      itemId: itemId,
    });

    const purchase = new GiftPurchase({
      username: normalizedUsername,
      itemId: itemId,
      itemName: item.name,
      cost: item.cost,
      status: "pending",
    });
    await purchase.save();

    if (item.stock !== -1) {
      item.stock -= 1;
      await item.save();
    }

    await userPoints.save();

    const giftUser = getSessionUser(req);
    const giftUserGrade =
      req.session.grade || (giftUser && giftUser.grade) || null;
    const giftGradeLabel = giftUserGrade
      ? GRADE_LABELS[giftUserGrade]?.long || giftUserGrade
      : "N/A";

    await sendWebhook("GIFT", {
      content: `🛒 **New Gift Purchase Request**`,
      embeds: [
        {
          title: "Gift Shop Purchase - Pending Review",
          color: 0xf59e0b,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            { name: "Grade", value: giftGradeLabel, inline: true },
            {
              name: "Role",
              value: giftUser ? giftUser.role.toUpperCase() : "STUDENT",
              inline: true,
            },
            { name: "Item", value: item.name, inline: true },
            { name: "Item ID", value: itemId, inline: true },
            { name: "Cost", value: `🎁 ${item.cost} points`, inline: true },
            {
              name: "Previous Points",
              value: `🎁 ${previousPoints}`,
              inline: true,
            },
            {
              name: "Remaining Points",
              value: `🎁 ${userPoints.points}`,
              inline: true,
            },
            { name: "Status", value: "⏳ قيد المراجعة", inline: true },
            {
              name: "Purchase ID",
              value: purchase._id.toString(),
              inline: true,
            },
            {
              name: "Time",
              value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
              inline: true,
            },
            {
              name: "Stock After Purchase",
              value: item.stock === -1 ? "Unlimited" : item.stock.toString(),
              inline: true,
            },
            {
              name: "Transaction ID",
              value:
                userPoints.transactions[userPoints.transactions.length - 1]._id
                  .toString()
                  .substring(0, 10) + "...",
              inline: true,
            },
          ],
          footer: {
            text: "يجب مراجعة الطلب من قبل المسؤول",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json({
      success: true,
      message: `تم تقديم طلب الشراء بنجاح! سنراجع هديتك وسنتواصل معك قريباً.`,
      remainingPoints: userPoints.points,
      purchaseId: purchase._id,
      status: "pending",
    });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Gift Purchase Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username },
            { name: "Item ID", value: req.body.itemId || "Unknown" },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ success: false, message: "تعذر إتمام الشراء" });
  }
});

app.get("/api/gift-shop/transactions", requireAuth, async (req, res) => {
  try {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "💳 User Transactions Request",
          color: 0x3498db,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            {
              name: "Endpoint",
              value: "/api/gift-shop/transactions",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const normalizedUsername = req.session.username.toLowerCase();
    const userPoints = await UserPoints.findOne({
      username: normalizedUsername,
    });
    if (!userPoints) {
      await sendWebhook("USER", {
        embeds: [
          {
            title: "✅ No Transactions Found",
            color: 0x95a5a6,
            fields: [
              { name: "Username", value: req.session.username, inline: true },
              { name: "Status", value: "No points record found", inline: true },
              { name: "Total Points", value: "0", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return res.json({ transactions: [] });
    }

    const transactions = userPoints.transactions.sort(
      (a, b) => b.timestamp - a.timestamp
    );

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Transactions Fetched",
          color: 0x10b981,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            {
              name: "Total Transactions",
              value: transactions.length.toString(),
              inline: true,
            },
            {
              name: "Current Points",
              value: userPoints.points.toString(),
              inline: true,
            },
            {
              name: "Earned Transactions",
              value: transactions
                .filter((t) => t.type === "earned")
                .length.toString(),
              inline: true,
            },
            {
              name: "Spent Transactions",
              value: transactions
                .filter((t) => t.type === "spent")
                .length.toString(),
              inline: true,
            },
            {
              name: "Deducted Transactions",
              value: transactions
                .filter((t) => t.type === "deducted")
                .length.toString(),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json({
      transactions: transactions,
    });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch Transactions Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ error: "تعذر تحميل المعاملات" });
  }
});

app.get("/api/gift-shop/my-purchases", requireAuth, async (req, res) => {
  try {
    await sendWebhook("USER", {
      embeds: [
        {
          title: "📦 User Purchases Request",
          color: 0x3498db,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            {
              name: "Endpoint",
              value: "/api/gift-shop/my-purchases",
              inline: true,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const normalizedUsername = req.session.username.toLowerCase();
    const purchases = await GiftPurchase.find({ username: normalizedUsername })
      .sort({ purchasedAt: -1 })
      .populate("itemId", "name image");

    await sendWebhook("USER", {
      embeds: [
        {
          title: "✅ Purchases Fetched",
          color: 0x10b981,
          fields: [
            { name: "Username", value: req.session.username, inline: true },
            {
              name: "Total Purchases",
              value: purchases.length.toString(),
              inline: true,
            },
            {
              name: "Pending",
              value: purchases
                .filter((p) => p.status === "pending")
                .length.toString(),
              inline: true,
            },
            {
              name: "Accepted",
              value: purchases
                .filter((p) => p.status === "accepted")
                .length.toString(),
              inline: true,
            },
            {
              name: "Declined",
              value: purchases
                .filter((p) => p.status === "declined")
                .length.toString(),
              inline: true,
            },
            {
              name: "Total Spent",
              value: `${purchases.reduce((sum, p) => sum + p.cost, 0)} points`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    res.json({ purchases });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Fetch Purchases Error",
          color: 0xe74c3c,
          fields: [
            { name: "User", value: req.session.username },
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            { name: "IP", value: req.ip || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    res.status(500).json({ error: "تعذر تحميل المشتريات" });
  }
});

app.get(
  "/api/admin/gift-shop/items",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🛍️ Admin Fetching Gift Shop Items",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              {
                name: "Endpoint",
                value: "/api/admin/gift-shop/items",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const items = await GiftShopItem.find().sort({ createdAt: -1 });

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Gift Shop Items Fetched",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Total Items",
                value: items.length.toString(),
                inline: true,
              },
              {
                name: "Active Items",
                value: items.filter((i) => i.active).length.toString(),
                inline: true,
              },
              {
                name: "Inactive Items",
                value: items.filter((i) => !i.active).length.toString(),
                inline: true,
              },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json(items);
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Gift Shop Items Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "تعذر تحميل العناصر" });
    }
  }
);

app.post(
  "/api/admin/gift-shop/items",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { name, description, cost, stock, purchaseLimit, image } = req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🛍️ Admin Creating Gift Shop Item",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Item Name",
                value: name || "Not provided",
                inline: true,
              },
              { name: "Cost", value: cost?.toString() || "0", inline: true },
              { name: "Stock", value: stock?.toString() || "-1", inline: true },
              { name: "Action", value: "Create Gift Item", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const parsedCost = Number.parseInt(cost, 10);
      const parsedStock = stock === undefined ? -1 : Number.parseInt(stock, 10);
      const parsedLimit =
        purchaseLimit === undefined ? -1 : Number.parseInt(purchaseLimit, 10);

      if (!name) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Create Gift Item Failed - Missing Name",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Error", value: "Name is required", inline: true },
                { name: "Cost", value: cost?.toString() || "0", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res.status(400).json({ success: false, message: "الاسم مطلوب" });
      }

      const safeCost =
        !Number.isNaN(parsedCost) && parsedCost > 0 ? parsedCost : 1;
      const safeStock = Number.isNaN(parsedStock) ? -1 : parsedStock;
      const safeLimit = Number.isNaN(parsedLimit) ? -1 : parsedLimit;

      const item = new GiftShopItem({
        name,
        description: description || "",
        cost: safeCost,
        stock: safeStock,
        purchaseLimit: safeLimit,
        image: image || "",
        active: true,
      });

      await item.save();

      await sendWebhook("GIFT", {
        content: `🛍️ **Gift Shop Item Created**`,
        embeds: [
          {
            title: "Gift Shop Item Created",
            color: 0x9b59b6,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Item Name", value: item.name },
              {
                name: "Description",
                value: item.description || "No description",
                inline: false,
              },
              { name: "Cost", value: `${item.cost} points` },
              {
                name: "Stock",
                value: item.stock === -1 ? "Unlimited" : item.stock.toString(),
              },
              {
                name: "Purchase Limit",
                value:
                  item.purchaseLimit === -1
                    ? "Unlimited"
                    : item.purchaseLimit.toString(),
                inline: true,
              },
              {
                name: "Active",
                value: item.active ? "✅ Yes" : "❌ No",
                inline: true,
              },
              {
                name: "Image",
                value: item.image ? "✅ Yes" : "❌ No",
                inline: true,
              },
              {
                name: "Created At",
                value: new Date().toLocaleString(),
                inline: true,
              },
              { name: "Item ID", value: item._id.toString(), inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, item });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Create Gift Shop Item Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Item Name", value: req.body.name || "Unknown" },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر إنشاء العنصر" });
    }
  }
);

app.put(
  "/api/admin/gift-shop/items/:id",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      const { name, description, cost, stock, image, active } = req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✏️ Admin Updating Gift Shop Item",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Item ID", value: req.params.id, inline: true },
              {
                name: "Fields to Update",
                value: Object.keys(req.body).join(", ") || "None",
                inline: false,
              },
              { name: "Action", value: "Update Gift Item", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const item = await GiftShopItem.findById(req.params.id);

      if (!item) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Update Gift Item Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Item ID", value: req.params.id, inline: true },
                { name: "Error", value: "Item not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "العنصر غير موجود" });
      }

      const previousState = {
        name: item.name,
        description: item.description,
        cost: item.cost,
        stock: item.stock,
        image: item.image,
        active: item.active,
      };

      if (name) item.name = name;
      if (description !== undefined) item.description = description;
      if (cost !== undefined) item.cost = parseInt(cost);
      if (stock !== undefined) item.stock = parseInt(stock);
      if (image !== undefined) item.image = image;
      if (active !== undefined) item.active = active;

      await item.save();

      const changes = [];
      if (name && name !== previousState.name)
        changes.push(`Name: ${previousState.name} → ${name}`);
      if (
        description !== undefined &&
        description !== previousState.description
      )
        changes.push(`Description updated`);
      if (cost !== undefined && parseInt(cost) !== previousState.cost)
        changes.push(`Cost: ${previousState.cost} → ${cost}`);
      if (stock !== undefined && parseInt(stock) !== previousState.stock)
        changes.push(`Stock: ${previousState.stock} → ${stock}`);
      if (active !== undefined && active !== previousState.active)
        changes.push(
          `Active: ${previousState.active ? "Yes" : "No"} → ${
            active ? "Yes" : "No"
          }`
        );

      await sendWebhook("GIFT", {
        content: `✏️ **Gift Shop Item Updated**`,
        embeds: [
          {
            title: "Gift Shop Item Updated",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Item", value: item.name },
              { name: "Item ID", value: item._id.toString(), inline: true },
              {
                name: "Status",
                value: item.active ? "Active" : "Inactive",
                inline: true,
              },
              {
                name: "Changes Made",
                value: changes.length > 0 ? changes.join(", ") : "No changes",
                inline: false,
              },
              {
                name: "Current Cost",
                value: `${item.cost} points`,
                inline: true,
              },
              {
                name: "Current Stock",
                value: item.stock === -1 ? "Unlimited" : item.stock.toString(),
                inline: true,
              },
              {
                name: "Updated At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, item });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Update Gift Shop Item Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Item ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر تحديث العنصر" });
    }
  }
);

app.delete(
  "/api/admin/gift-shop/items/:id",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🗑️ Admin Deleting Gift Shop Item",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Item ID", value: req.params.id, inline: true },
              { name: "Action", value: "Delete Gift Item", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const item = await GiftShopItem.findById(req.params.id);
      if (!item) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Delete Gift Item Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Item ID", value: req.params.id, inline: true },
                { name: "Error", value: "Item not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "العنصر غير موجود" });
      }
      await GiftShopItem.deleteOne({ _id: item._id });
      await sendWebhook("GIFT", {
        content: `🗑️ **Gift Shop Item Deleted**`,
        embeds: [
          {
            title: "Gift Shop Item Deleted",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Deleted Item", value: item.name },
              { name: "Item ID", value: item._id.toString(), inline: true },
              {
                name: "Previous Cost",
                value: `${item.cost} points`,
                inline: true,
              },
              {
                name: "Previous Stock",
                value: item.stock === -1 ? "Unlimited" : item.stock.toString(),
                inline: true,
              },
              {
                name: "Active Status",
                value: item.active ? "Active" : "Inactive",
                inline: true,
              },
              {
                name: "Created Date",
                value: item.createdAt.toLocaleString(),
                inline: true,
              },
              {
                name: "Deleted At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Delete Gift Shop Item Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Item ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر حذف العنصر" });
    }
  }
);

app.get(
  "/api/admin/gift-shop/purchases",
  requireAuth,
  requireSpecialRole("gift-approver"),
  async (req, res) => {
    try {
      const { status } = req.query;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "📦 Admin Fetching Gift Purchases",
            color: 0x3498db,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Role", value: req.session.role, inline: true },
              { name: "Special Role", value: "gift-approver", inline: true },
              { name: "Status Filter", value: status || "All", inline: true },
              {
                name: "Endpoint",
                value: "/api/admin/gift-shop/purchases",
                inline: true,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const query = status ? { status } : {};
      const purchases = await GiftPurchase.find(query)
        .sort({ purchasedAt: -1 })
        .populate("itemId", "name image");

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Gift Purchases Fetched",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Total Purchases",
                value: purchases.length.toString(),
                inline: true,
              },
              { name: "Status Filter", value: status || "All", inline: true },
              {
                name: "Pending",
                value: purchases
                  .filter((p) => p.status === "pending")
                  .length.toString(),
                inline: true,
              },
              {
                name: "Accepted",
                value: purchases
                  .filter((p) => p.status === "accepted")
                  .length.toString(),
                inline: true,
              },
              {
                name: "Declined",
                value: purchases
                  .filter((p) => p.status === "declined")
                  .length.toString(),
                inline: true,
              },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ purchases });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Fetch Gift Purchases Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ error: "تعذر تحميل الطلبات" });
    }
  }
);

app.post(
  "/api/admin/gift-shop/purchases/:id/accept",
  requireAuth,
  requireSpecialRole("gift-approver"),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "✅ Admin Accepting Gift Purchase",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Purchase ID", value: req.params.id, inline: true },
              { name: "Action", value: "Accept Gift Purchase", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const purchase = await GiftPurchase.findById(req.params.id);
      if (!purchase) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Accept Purchase Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Purchase ID", value: req.params.id, inline: true },
                { name: "Error", value: "Purchase not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "الطلب غير موجود" });
      }

      if (purchase.status !== "pending") {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Accept Purchase Failed - Already Processed",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Purchase ID", value: req.params.id, inline: true },
                {
                  name: "Current Status",
                  value: purchase.status,
                  inline: true,
                },
                { name: "Required Status", value: "pending", inline: true },
                { name: "Error", value: "Already processed", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(400)
          .json({ success: false, message: "الطلب تمت معالجته مسبقاً" });
      }

      purchase.status = "accepted";
      purchase.reviewedBy = req.session.username;
      purchase.reviewedAt = new Date();
      await purchase.save();

      const acceptUser = getSessionUser(req);
      await sendWebhook("GIFT", {
        content: `✅ **Gift Purchase Approved**`,
        embeds: [
          {
            title: "Gift Purchase Approved",
            color: 0x10b981,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Admin Role",
                value: acceptUser ? acceptUser.role.toUpperCase() : "ADMIN",
                inline: true,
              },
              { name: "User", value: purchase.username, inline: true },
              { name: "Item", value: purchase.itemName, inline: true },
              {
                name: "Item ID",
                value: purchase.itemId.toString(),
                inline: true,
              },
              { name: "Cost", value: `🎁 ${purchase.cost}`, inline: true },
              {
                name: "Purchase ID",
                value: purchase._id.toString(),
                inline: true,
              },
              { name: "Previous Status", value: "pending", inline: true },
              { name: "New Status", value: "accepted", inline: true },
              {
                name: "Time",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
              {
                name: "Purchased At",
                value: purchase.purchasedAt.toLocaleString(),
                inline: true,
              },
              {
                name: "Reviewed At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, purchase });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Accept Gift Purchase Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Purchase ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res
        .status(500)
        .json({ success: false, message: "تعذر الموافقة على الطلب" });
    }
  }
);

class SessionCleanup {
  constructor(intervalMinutes = 60) {
    this.isRunning = false;
    this.intervalMinutes = intervalMinutes;
    this.cleanupInterval = null;
  }

  async cleanupExpiredSessions() {
    if (this.isRunning) {
      console.log("[CLEANUP] Cleanup is already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("[CLEANUP] Starting expired session cleanup...");

    try {
      const expiredSessions = await ActiveSession.find({
        expiresAt: { $lt: new Date() },
      });

      if (expiredSessions.length === 0) {
        console.log("[CLEANUP] No expired sessions found");
        this.isRunning = false;
        return;
      }

      const result = await ActiveSession.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      console.log(
        `[CLEANUP] Removed ${result.deletedCount} expired active sessions from database`
      );

      await sendWebhook("SYSTEM", {
        content: `🧹 **Cleaned Up Expired Sessions**`,
        embeds: [
          {
            title: "Session Cleanup",
            color: 0x3498db,
            fields: [
              {
                name: "Cleaned Sessions",
                value: `${result.deletedCount}`,
                inline: true,
              },
              {
                name: "Expired Sessions Found",
                value: `${expiredSessions.length}`,
                inline: true,
              },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (error) {
      console.error("[CLEANUP ERROR] Active session cleanup:", error.message);
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "Session Cleanup Error",
            color: 0xe74c3c,
            fields: [
              { name: "Error", value: error.message },
              {
                name: "Timestamp",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } finally {
      this.isRunning = false;
    }
  }

  scheduleCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.intervalMinutes * 60 * 1000);

    const nextRun = new Date(Date.now() + this.intervalMinutes * 60 * 1000);
    console.log(
      `[CLEANUP] Cleanup scheduled to run every ${this.intervalMinutes} minutes`
    );
    console.log(`[CLEANUP] Next cleanup at: ${nextRun.toISOString()}`);
  }

  start() {
    console.log("[CLEANUP] Session cleanup system initialized");

    this.cleanupExpiredSessions();

    this.scheduleCleanup();
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log("[CLEANUP] Cleanup scheduler stopped");
    }
  }

  setInterval(minutes) {
    this.intervalMinutes = minutes;
    if (this.cleanupInterval) {
      this.scheduleCleanup();
    }
  }

  async runNow() {
    console.log("[CLEANUP] Manual cleanup triggered");
    await this.cleanupExpiredSessions();
  }
}

const sessionCleanup = new SessionCleanup(60);
sessionCleanup.start();

class DatabaseBackup {
  constructor() {
    this.isBackupRunning = false;
    this.backupCycleInProgress = false;
    this.allCollections = [];
    this.currentCollectionIndex = 0;
    this.collectionStats = [];
    this.CHUNK_SIZE = 1500;
    this.COLLECTION_DELAY_MS = 5000;
    this.BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
    this.CHUNK_DELAY_MS = 3000;
    this.MAX_COLLECTIONS_PER_BACKUP = 15;
  }

  async backupDatabase() {
    if (this.isBackupRunning) {
      console.log("[BACKUP] Backup is already running, skipping...");
      return;
    }

    this.isBackupRunning = true;
    const backupStartTime = new Date();

    try {
      if (mongoose.connection.readyState !== 1) {
        console.log(
          "[BACKUP] Database not connected, attempting to reconnect..."
        );
        await mongoose.connect(process.env.MONGODB_URI);
      }

      const db = mongoose.connection.db;
      if (!db) {
        console.log("[BACKUP] Database instance not available, skipping...");
        this.isBackupRunning = false;
        return;
      }

      await sendWebhook("DATABASE", {
        embeds: [
          {
            title: "🚀 Database Backup Started",
            color: 0x3498db,
            fields: [
              { name: "Status", value: "Starting backup cycle", inline: true },
              {
                name: "Time",
                value: backupStartTime.toISOString(),
                inline: true,
              },
              {
                name: "Environment",
                value: process.env.NODE_ENV || "development",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      await this.startBackupCycle(db);
    } catch (error) {
      console.error("[BACKUP ERROR]", error.message);
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Database Backup Failed",
            color: 0xe74c3c,
            fields: [
              { name: "Error", value: error.message },
              { name: "Time", value: new Date().toISOString() },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack trace",
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      this.resetBackupState();
    }
  }

  async startBackupCycle(db) {
    if (!this.backupCycleInProgress) {
      console.log(
        "[BACKUP] Starting new backup cycle at",
        new Date().toISOString()
      );

      this.allCollections = await db.listCollections().toArray();
      this.allCollections = this.allCollections.filter(
        (collection) =>
          !collection.name.startsWith("system.") &&
          collection.name !== "sessions"
      );

      if (this.allCollections.length > this.MAX_COLLECTIONS_PER_BACKUP) {
        console.log(
          `[BACKUP] Limiting to ${this.MAX_COLLECTIONS_PER_BACKUP} collections per backup cycle`
        );
        this.allCollections = this.allCollections.slice(
          0,
          this.MAX_COLLECTIONS_PER_BACKUP
        );
      }

      this.currentCollectionIndex = 0;
      this.collectionStats = [];
      this.backupCycleInProgress = true;
      await sendWebhook("DATABASE", {
        embeds: [
          {
            title: "📊 Database Collections to Backup",
            color: 0x9b59b6,
            description: `Found ${
              this.allCollections.length
            } collections to backup:\n\n${this.allCollections
              .map((c) => `• ${c.name}`)
              .join("\n")}`,
            fields: [
              {
                name: "Total Collections",
                value: this.allCollections.length.toString(),
                inline: true,
              },
              { name: "Backup Cycle", value: "Starting", inline: true },
              {
                name: "Estimated Time",
                value: `${Math.ceil(this.allCollections.length * 2)} minutes`,
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }

    if (this.currentCollectionIndex >= this.allCollections.length) {
      await this.completeBackupCycle();
      return;
    }

    const collection = this.allCollections[this.currentCollectionIndex];
    await this.backupCollection(db, collection.name);
  }

  async backupCollection(db, collectionName) {
    console.log(`[BACKUP] Backing up Collection: ${collectionName}`);
    await sendWebhook("DATABASE", {
      embeds: [
        {
          title: `📂 Backing up: ${collectionName}`,
          color: 0xf39c12,
          fields: [
            { name: "Collection", value: collectionName, inline: true },
            {
              name: "Progress",
              value: `${this.currentCollectionIndex + 1}/${
                this.allCollections.length
              }`,
              inline: true,
            },
            { name: "Status", value: "Starting", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    try {
      const count = await db.collection(collectionName).countDocuments();

      if (count === 0) {
        this.collectionStats.push({
          name: collectionName,
          documents: 0,
          chunks: 0,
          size: 0,
          status: "empty",
        });

        console.log(`[BACKUP] ${collectionName}: Empty collection`);

        await sendWebhook("DATABASE", {
          embeds: [
            {
              title: `📂 ${collectionName} - Empty`,
              color: 0x95a5a6,
              fields: [
                { name: "Status", value: "Empty collection", inline: true },
                { name: "Documents", value: "0", inline: true },
                {
                  name: "Progress",
                  value: `${this.currentCollectionIndex + 1}/${
                    this.allCollections.length
                  }`,
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });

        this.currentCollectionIndex++;
        await this.delay(2000);
        this.isBackupRunning = false;
        this.backupDatabase();
        return;
      }
      const maxDocuments = 500;
      const data = await db
        .collection(collectionName)
        .find({})
        .limit(maxDocuments)
        .toArray();

      const jsonString = JSON.stringify(
        {
          collection: collectionName,
          totalDocuments: count,
          backedUpDocuments: data.length,
          timestamp: new Date().toISOString(),
          data: data,
        },
        null,
        2
      );

      const chunks = [];
      for (let i = 0; i < jsonString.length; i += this.CHUNK_SIZE) {
        chunks.push(jsonString.substring(i, i + this.CHUNK_SIZE));
      }

      this.collectionStats.push({
        name: collectionName,
        documents: count,
        backedUpDocuments: data.length,
        chunks: chunks.length,
        size: jsonString.length,
        status: "completed",
      });

      console.log(
        `[BACKUP] ${collectionName}: ${count} total documents, backing up ${data.length}, ${chunks.length} parts`
      );

      await sendWebhook("DATABASE", {
        embeds: [
          {
            title: `📦 ${collectionName} - Starting Data Transfer`,
            color: 0x3498db,
            fields: [
              {
                name: "Total Documents",
                value: count.toString(),
                inline: true,
              },
              {
                name: "Backing Up",
                value: data.length.toString(),
                inline: true,
              },
              { name: "Chunks", value: chunks.length.toString(), inline: true },
              {
                name: "Size",
                value: `${Math.round(jsonString.length / 1024)} KB`,
                inline: true,
              },
              {
                name: "Progress",
                value: `${this.currentCollectionIndex + 1}/${
                  this.allCollections.length
                }`,
                inline: true,
              },
              { name: "Status", value: "Transferring", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      for (let i = 0; i < chunks.length; i++) {
        const chunkNumber = i + 1;
        const message = `\`\`\`json\n${chunks[i]}\n\`\`\``;

        try {
          await sendWebhook("DATABASE", {
            content: `**${collectionName}** - Chunk ${chunkNumber}/${chunks.length}\n${message}`,
          });

          console.log(
            `[BACKUP] ${collectionName}: Sent chunk ${chunkNumber}/${chunks.length}`
          );

          if (chunkNumber < chunks.length) {
            await this.delay(this.CHUNK_DELAY_MS);
          }
        } catch (webhookErr) {
          if (webhookErr.response?.status === 429) {
            const retryAfter =
              parseInt(webhookErr.response.headers["retry-after"]) || 30;
            console.log(
              `[BACKUP] Rate limited, waiting ${retryAfter} seconds...`
            );

            await sendWebhook("ERROR", {
              embeds: [
                {
                  title: "⚠️ Backup Rate Limited",
                  color: 0xf59e0b,
                  fields: [
                    { name: "Collection", value: collectionName },
                    { name: "Chunk", value: `${chunkNumber}/${chunks.length}` },
                    { name: "Wait Time", value: `${retryAfter} seconds` },
                    { name: "Will Retry", value: "Yes" },
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
            });

            await this.delay(retryAfter * 1000 + 1000);

            await sendWebhook("DATABASE", {
              content: `**${collectionName}** - Chunk ${chunkNumber}/${chunks.length} (Retry)\n${message}`,
            });
          } else {
            throw webhookErr;
          }
        }
      }

      await sendWebhook("DATABASE", {
        embeds: [
          {
            title: `✅ ${collectionName} - Backup Complete`,
            color: 0x10b981,
            fields: [
              { name: "Status", value: "Completed", inline: true },
              {
                name: "Total Documents",
                value: count.toString(),
                inline: true,
              },
              {
                name: "Backed Up",
                value: data.length.toString(),
                inline: true,
              },
              {
                name: "Chunks Sent",
                value: chunks.length.toString(),
                inline: true,
              },
              {
                name: "Progress",
                value: `${this.currentCollectionIndex + 1}/${
                  this.allCollections.length
                }`,
                inline: true,
              },
              {
                name: "Next Collection",
                value:
                  this.currentCollectionIndex < this.allCollections.length - 1
                    ? this.allCollections[this.currentCollectionIndex + 1].name
                    : "Finalizing",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      this.currentCollectionIndex++;

      if (this.currentCollectionIndex < this.allCollections.length) {
        console.log(
          `[BACKUP] ${collectionName} completed, next collection in 5 seconds...`
        );
        await this.delay(this.COLLECTION_DELAY_MS);
      }

      this.isBackupRunning = false;
      this.backupDatabase();
    } catch (err) {
      console.error(`[BACKUP ERROR] ${collectionName}:`, err.message);

      this.collectionStats.push({
        name: collectionName,
        documents: 0,
        chunks: 0,
        size: 0,
        status: "failed",
        error: err.message,
      });

      await sendWebhook("ERROR", {
        embeds: [
          {
            title: `❌ ${collectionName} - Backup Failed`,
            color: 0xe74c3c,
            fields: [
              { name: "Collection", value: collectionName },
              { name: "Error", value: err.message },
              {
                name: "Progress",
                value: `${this.currentCollectionIndex + 1}/${
                  this.allCollections.length
                }`,
              },
              { name: "Will Continue", value: "Yes" },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      this.currentCollectionIndex++;
      await this.delay(5000);
      this.isBackupRunning = false;
      this.backupDatabase();
    }
  }

  async completeBackupCycle() {
    const backupEndTime = new Date();
    const duration = Math.round(
      (backupEndTime -
        new Date(
          backupEndTime.getTime() -
            this.allCollections.length * this.COLLECTION_DELAY_MS
        )) /
        1000 /
        60
    );

    const totalDocuments = this.collectionStats.reduce(
      (sum, stat) => sum + (stat.documents || 0),
      0
    );
    const totalBackedUp = this.collectionStats.reduce(
      (sum, stat) => sum + (stat.backedUpDocuments || stat.documents || 0),
      0
    );
    const totalChunks = this.collectionStats.reduce(
      (sum, stat) => sum + (stat.chunks || 0),
      0
    );
    const successfulCollections = this.collectionStats.filter(
      (stat) => stat.status === "completed" || stat.status === "empty"
    ).length;
    const failedCollections = this.collectionStats.filter(
      (stat) => stat.status === "failed"
    ).length;

    let summaryMessage = "# 📊 Database Backup Summary\n\n";

    summaryMessage += "## Collection Statistics:\n";
    this.collectionStats.forEach((stat, index) => {
      const statusIcon =
        stat.status === "completed"
          ? "✅"
          : stat.status === "empty"
          ? "📭"
          : stat.status === "failed"
          ? "❌"
          : "❓";
      summaryMessage += `${statusIcon} **${stat.name}**: ${
        stat.documents || 0
      } documents`;
      if (stat.backedUpDocuments && stat.backedUpDocuments !== stat.documents) {
        summaryMessage += ` (${stat.backedUpDocuments} backed up)`;
      }
      if (stat.chunks) {
        summaryMessage += `, ${stat.chunks} chunks`;
      }
      if (stat.status === "failed" && stat.error) {
        summaryMessage += ` - Error: ${stat.error.substring(0, 100)}`;
      }
      summaryMessage += "\n";
    });

    summaryMessage += `\n## Overall Statistics:\n`;
    summaryMessage += `• **Total Collections**: ${this.collectionStats.length}\n`;
    summaryMessage += `• **Successful**: ${successfulCollections}\n`;
    summaryMessage += `• **Failed**: ${failedCollections}\n`;
    summaryMessage += `• **Total Documents**: ${totalDocuments}\n`;
    summaryMessage += `• **Documents Backed Up**: ${totalBackedUp}\n`;
    summaryMessage += `• **Total Chunks Sent**: ${totalChunks}\n`;
    summaryMessage += `• **Duration**: ${duration} minutes\n\n`;
    summaryMessage += `**Backup Cycle Completed Successfully** 🎉\n`;
    summaryMessage += `**End Time**: ${backupEndTime.toISOString()}`;

    const summaryChunks = [];
    const maxChunkSize = 1800;

    for (let i = 0; i < summaryMessage.length; i += maxChunkSize) {
      summaryChunks.push(summaryMessage.substring(i, i + maxChunkSize));
    }

    for (let i = 0; i < summaryChunks.length; i++) {
      await sendWebhook("DATABASE", {
        content: `\`\`\`markdown\n${summaryChunks[i]}\n\`\`\``,
      });
      if (i < summaryChunks.length - 1) {
        await this.delay(2000);
      }
    }

    console.log(
      "[BACKUP] Backup cycle completed at",
      backupEndTime.toISOString()
    );
    console.log(
      `[BACKUP] Statistics: ${successfulCollections} successful, ${failedCollections} failed, ${totalDocuments} documents`
    );

    this.resetBackupState();
    this.scheduleNextBackup();
  }

  resetBackupState() {
    this.backupCycleInProgress = false;
    this.isBackupRunning = false;
    this.allCollections = [];
    this.currentCollectionIndex = 0;
    this.collectionStats = [];
  }

  scheduleNextBackup() {
    setTimeout(() => {
      this.backupDatabase();
    }, this.BACKUP_INTERVAL_MS);

    const nextRun = new Date(Date.now() + this.BACKUP_INTERVAL_MS);
    console.log(`[BACKUP] Next backup scheduled for: ${nextRun.toISOString()}`);

    sendWebhook("DATABASE", {
      embeds: [
        {
          title: "⏰ Next Backup Scheduled",
          color: 0x9b59b6,
          fields: [
            { name: "Next Run", value: nextRun.toISOString(), inline: true },
            {
              name: "In",
              value: `${Math.round(
                this.BACKUP_INTERVAL_MS / 1000 / 60 / 60
              )} hours`,
              inline: true,
            },
            { name: "Status", value: "Scheduled", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  start() {
    console.log("[BACKUP] Database backup system initialized");
    console.log(
      `[BACKUP] Backup interval: ${
        this.BACKUP_INTERVAL_MS / 1000 / 60 / 60
      } hours`
    );
    console.log(
      `[BACKUP] Max collections per cycle: ${this.MAX_COLLECTIONS_PER_BACKUP}`
    );

    setTimeout(() => {
      this.backupDatabase();
    }, 30000);
  }

  async triggerManualBackup() {
    console.log("[BACKUP] Manual backup triggered");
    await sendWebhook("DATABASE", {
      embeds: [
        {
          title: "🔄 Manual Backup Triggered",
          color: 0xf59e0b,
          fields: [
            { name: "Triggered By", value: "Manual", inline: true },
            { name: "Time", value: new Date().toISOString(), inline: true },
            { name: "Status", value: "Starting", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await this.backupDatabase();
  }
}

const databaseBackup = new DatabaseBackup();

app.post(
  "/api/admin/database/backup",
  requireAuth,
  requireRole(["admin", "leadadmin"]),
  async (req, res) => {
    try {
      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "🔧 Admin Triggered Database Backup",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Action", value: "Manual Database Backup", inline: true },
              { name: "Time", value: new Date().toISOString(), inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      databaseBackup.triggerManualBackup();

      res.json({
        success: true,
        message:
          "Database backup has been triggered. Check Discord for progress.",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Manual Backup Trigger Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Error", value: error.message },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.status(500).json({
        success: false,
        message: "Failed to trigger backup",
      });
    }
  }
);

databaseBackup.start();

app.post(
  "/api/admin/gift-shop/purchases/:id/decline",
  requireAuth,
  requireSpecialRole("gift-approver"),
  async (req, res) => {
    try {
      const { reason } = req.body;

      await sendWebhook("ADMIN", {
        embeds: [
          {
            title: "❌ Admin Declining Gift Purchase",
            color: 0xf59e0b,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              { name: "Purchase ID", value: req.params.id, inline: true },
              {
                name: "Reason",
                value: reason || "No reason provided",
                inline: false,
              },
              { name: "Action", value: "Decline Gift Purchase", inline: true },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const purchase = await GiftPurchase.findById(req.params.id);
      if (!purchase) {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Decline Purchase Failed - Not Found",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Purchase ID", value: req.params.id, inline: true },
                { name: "Error", value: "Purchase not found", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(404)
          .json({ success: false, message: "الطلب غير موجود" });
      }

      if (purchase.status !== "pending") {
        await sendWebhook("ADMIN", {
          embeds: [
            {
              title: "❌ Decline Purchase Failed - Already Processed",
              color: 0xe74c3c,
              fields: [
                { name: "Admin", value: req.session.username, inline: true },
                { name: "Purchase ID", value: req.params.id, inline: true },
                {
                  name: "Current Status",
                  value: purchase.status,
                  inline: true,
                },
                { name: "Required Status", value: "pending", inline: true },
                { name: "Error", value: "Already processed", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
        return res
          .status(400)
          .json({ success: false, message: "الطلب تمت معالجته مسبقاً" });
      }

      if (!purchase.pointsRefunded) {
        try {
          let userPoints = await UserPoints.findOne({
            username: purchase.username,
          });
          if (!userPoints) {
            userPoints = new UserPoints({
              username: purchase.username,
              points: 0,
            });
          }

          const previousPoints = userPoints.points;
          userPoints.points += purchase.cost;
          userPoints.transactions.push({
            type: "earned",
            amount: purchase.cost,
            description: `استرداد نقاط - طلب مرفوض: ${purchase.itemName}`,
            itemId: purchase.itemId,
          });
          await userPoints.save();

          await sendWebhook("USER", {
            embeds: [
              {
                title: "💰 Points Refunded for Declined Purchase",
                color: 0x1abc9c,
                fields: [
                  { name: "Username", value: purchase.username, inline: true },
                  {
                    name: "Purchase ID",
                    value: purchase._id.toString(),
                    inline: true,
                  },
                  { name: "Item", value: purchase.itemName, inline: true },
                  {
                    name: "Refund Amount",
                    value: `${purchase.cost} points`,
                    inline: true,
                  },
                  {
                    name: "Previous Points",
                    value: `${previousPoints} points`,
                    inline: true,
                  },
                  {
                    name: "New Points",
                    value: `${userPoints.points} points`,
                    inline: true,
                  },
                  {
                    name: "Reason",
                    value: reason || "No reason provided",
                    inline: false,
                  },
                  {
                    name: "Refunded At",
                    value: new Date().toLocaleString(),
                    inline: true,
                  },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });

          purchase.pointsRefunded = true;
        } catch (error) {
          await sendWebhook("ERROR", {
            embeds: [
              {
                title: "❌ Refund Points Error",
                color: 0xe74c3c,
                fields: [
                  { name: "Admin", value: req.session.username },
                  { name: "Purchase ID", value: req.params.id },
                  { name: "User", value: purchase.username },
                  { name: "Error", value: error.message },
                  {
                    name: "Stack Trace",
                    value: error.stack?.substring(0, 500) || "No stack",
                    inline: false,
                  },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
        }
      }

      const item = await GiftShopItem.findById(purchase.itemId);
      if (item && item.stock !== -1) {
        const previousStock = item.stock;
        item.stock += 1;
        await item.save();

        await sendWebhook("GIFT", {
          embeds: [
            {
              title: "📦 Stock Restored for Declined Purchase",
              color: 0x3498db,
              fields: [
                { name: "Item", value: item.name, inline: true },
                { name: "Item ID", value: item._id.toString(), inline: true },
                {
                  name: "Previous Stock",
                  value: previousStock.toString(),
                  inline: true,
                },
                {
                  name: "New Stock",
                  value: item.stock.toString(),
                  inline: true,
                },
                {
                  name: "Purchase ID",
                  value: purchase._id.toString(),
                  inline: true,
                },
                {
                  name: "Restored At",
                  value: new Date().toLocaleString(),
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }

      purchase.status = "declined";
      purchase.declineReason = reason || "لم يتم تقديم سبب";
      purchase.reviewedBy = req.session.username;
      purchase.reviewedAt = new Date();
      await purchase.save();

      const declineUser = getSessionUser(req);
      await sendWebhook("GIFT", {
        content: `❌ **Gift Purchase Declined**`,
        embeds: [
          {
            title: "Gift Purchase Declined",
            color: 0xef4444,
            fields: [
              { name: "Admin", value: req.session.username, inline: true },
              {
                name: "Admin Role",
                value: declineUser ? declineUser.role.toUpperCase() : "ADMIN",
                inline: true,
              },
              { name: "User", value: purchase.username, inline: true },
              { name: "Item", value: purchase.itemName, inline: true },
              {
                name: "Item ID",
                value: purchase.itemId.toString(),
                inline: true,
              },
              {
                name: "Points Refunded",
                value: `🎁 ${purchase.cost}`,
                inline: true,
              },
              {
                name: "Points Refunded Status",
                value: purchase.pointsRefunded ? "✅ Yes" : "❌ No",
                inline: true,
              },
              {
                name: "Stock Restored",
                value:
                  item && item.stock !== -1
                    ? "✅ Yes"
                    : item
                    ? "❌ No (unlimited)"
                    : "❌ Item not found",
                inline: true,
              },
              {
                name: "Reason",
                value: reason || "No reason provided",
                inline: true,
              },
              {
                name: "Purchase ID",
                value: purchase._id.toString(),
                inline: true,
              },
              {
                name: "Time",
                value: moment()
                  .tz("Africa/Cairo")
                  .format("YYYY-MM-DD HH:mm:ss"),
                inline: false,
              },
              {
                name: "Purchased At",
                value: purchase.purchasedAt.toLocaleString(),
                inline: true,
              },
              {
                name: "Declined At",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      res.json({ success: true, purchase });
    } catch (error) {
      await sendWebhook("ERROR", {
        embeds: [
          {
            title: "❌ Decline Gift Purchase Error",
            color: 0xe74c3c,
            fields: [
              { name: "Admin", value: req.session.username },
              { name: "Purchase ID", value: req.params.id },
              { name: "Error", value: error.message },
              {
                name: "Stack Trace",
                value: error.stack?.substring(0, 500) || "No stack",
                inline: false,
              },
              { name: "IP", value: req.ip || "unknown", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      res.status(500).json({ success: false, message: "تعذر رفض الطلب" });
    }
  }
);

async function checkAndBanUnverifiedUsers() {
  try {
    const banDays = parseInt(process.env.UNVERIFIED_USER_BAN_DAYS) || 3;
    const banDate = new Date();
    banDate.setDate(banDate.getDate() - banDays);

    await sendWebhook("SYSTEM", {
      embeds: [
        {
          title: "🔍 Checking Unverified Users",
          color: 0x3498db,
          fields: [
            {
              name: "Action",
              value: "Auto-ban check for unverified users",
              inline: true,
            },
            {
              name: "Ban Days Threshold",
              value: banDays.toString(),
              inline: true,
            },
            {
              name: "Cutoff Date",
              value: banDate.toLocaleString(),
              inline: true,
            },
            {
              name: "Current Time",
              value: new Date().toLocaleString(),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const unverifiedUsers = await UserRegistration.find({
      approvalStatus: "approved",
      verificationCodeVerified: false,
      verificationDate: { $lte: banDate },
    });

    let bannedCount = 0;
    for (const user of unverifiedUsers) {
      const existingBan = await BannedUser.findOne({
        usernameLower: user.username.toLowerCase(),
      });
      if (!existingBan) {
        await BannedUser.create({
          username: user.username,
          usernameLower: user.username.toLowerCase(),
          banType: "all",
          reason: `تم الحظر تلقائياً: لم يتم التحقق من الحساب خلال ${banDays} أيام`,
          createdBy: "AutoMod System",
          createdAt: new Date(),
        });

        bannedCount++;

        await sendWebhook("SECURITY", {
          content: `🚨 **User Auto-Banned for Unverified Account!**`,
          embeds: [
            {
              title: "Auto-Ban: Unverified Account",
              color: 0xe74c3c,
              fields: [
                { name: "Username", value: user.username },
                { name: "Name", value: `${user.firstName} ${user.secondName}` },
                {
                  name: "Reason",
                  value: `لم يتم التحقق من الحساب خلال ${banDays} أيام`,
                },
                {
                  name: "Approved Date",
                  value: user.verificationDate
                    ? new Date(user.verificationDate).toLocaleString("ar-EG")
                    : "N/A",
                },
                {
                  name: "Days Since Approval",
                  value: Math.floor(
                    (new Date() - user.verificationDate) / (1000 * 60 * 60 * 24)
                  ).toString(),
                  inline: true,
                },
                {
                  name: "Timestamp",
                  value: moment()
                    .tz("Africa/Cairo")
                    .format("YYYY-MM-DD HH:mm:ss"),
                },
                { name: "Ban Type", value: "all", inline: true },
                {
                  name: "Auto-Ban System",
                  value: "✅ Activated",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }
    }

    await sendWebhook("SYSTEM", {
      embeds: [
        {
          title: "✅ Unverified Users Check Complete",
          color: 0x10b981,
          fields: [
            {
              name: "Users Checked",
              value: unverifiedUsers.length.toString(),
              inline: true,
            },
            { name: "New Bans", value: bannedCount.toString(), inline: true },
            {
              name: "Already Banned",
              value: (unverifiedUsers.length - bannedCount).toString(),
              inline: true,
            },
            {
              name: "Ban Days Threshold",
              value: banDays.toString(),
              inline: true,
            },
            {
              name: "Check Completed",
              value: new Date().toLocaleString(),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (error) {
    await sendWebhook("ERROR", {
      embeds: [
        {
          title: "❌ Auto-Ban Check Error",
          color: 0xe74c3c,
          fields: [
            { name: "Error", value: error.message },
            {
              name: "Stack Trace",
              value: error.stack?.substring(0, 500) || "No stack",
              inline: false,
            },
            {
              name: "Timestamp",
              value: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
}

setInterval(checkAndBanUnverifiedUsers, 60 * 60 * 1000);
setTimeout(checkAndBanUnverifiedUsers, 5000);

app.use(async (err, req, res, next) => {
  await sendWebhook("ERROR", {
    embeds: [
      {
        title: "❌ Server Error",
        color: 0xe74c3c,
        fields: [
          { name: "Path", value: req.path },
          { name: "Method", value: req.method },
          { name: "Error", value: err.message },
          {
            name: "Error Code",
            value: err.status || err.statusCode || "500",
            inline: true,
          },
          {
            name: "Username",
            value: req.session?.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "Stack Trace",
            value: err.stack ? err.stack.substring(0, 1000) : "No stack trace",
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (req.accepts("html")) {
    if (err.status === 400 || err.statusCode === 400) {
      return res.status(400).sendFile(path.join(__dirname, "views/400.html"));
    } else if (err.status === 403 || err.statusCode === 403) {
      return res.status(403).sendFile(path.join(__dirname, "views/403.html"));
    } else if (err.status === 404 || err.statusCode === 404) {
      return res.status(404).sendFile(path.join(__dirname, "views/404.html"));
    } else {
      return res.status(500).sendFile(path.join(__dirname, "views/500.html"));
    }
  } else {
    res.status(err.status || err.statusCode || 500).json({
      error: err.message || "Internal server error",
    });
  }
});

app.use(async (req, res) => {
  await sendWebhook("USER", {
    embeds: [
      {
        title: "❌ 404 Not Found",
        color: 0xe74c3c,
        fields: [
          { name: "Path", value: req.path, inline: true },
          { name: "Method", value: req.method, inline: true },
          {
            name: "Authenticated",
            value: req.session.isAuthenticated ? "✅ Yes" : "❌ No",
            inline: true,
          },
          {
            name: "Username",
            value: req.session.username || "Guest",
            inline: true,
          },
          { name: "IP", value: req.ip || "unknown", inline: true },
          {
            name: "User Agent",
            value: req.headers["user-agent"]?.substring(0, 100) || "unknown",
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (req.accepts("html")) {
    res.status(404).sendFile(path.join(__dirname, "views/404.html"));
  } else {
    res.status(404).json({ error: "Resource not found" });
  }
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("\x1b[33m%s\x1b[0m", "┌───────────────────────────────────────┐");
  console.log("\x1b[33m%s\x1b[0m", "│  👑 Made by Carl                      │");
  console.log("\x1b[33m%s\x1b[0m", "│  🟢 Server is online                  │");
  console.log("\x1b[33m%s\x1b[0m", "│  🔗 MongoDB is connected              │");
  console.log(
    "\x1b[33m%s\x1b[0m",
    `│  ⚓ Working on port: ${PORT}             │`
  );
  console.log("\x1b[33m%s\x1b[0m", "└───────────────────────────────────────┘");
});
