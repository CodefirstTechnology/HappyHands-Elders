const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const ApiError = require("./utils/ApiError");
const prisma = require("./config/prisma");

const app = express();

if (process.env.NODE_ENV === "production" || process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

function parseCorsOrigins(value) {
  if (!value || value.trim() === "*") return true;

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) return true;

  // Expo web / local dev often uses random localhost ports (8081, 19006, etc.)
  if (process.env.NODE_ENV !== "production") {
    return (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origins.includes(origin)) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    };
  }

  if (origins.length === 1) return origins[0];
  return origins;
}

const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
app.use(
  "/uploads",
  express.static(uploadDir, {
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: parseCorsOrigins(process.env.CLIENT_URL),
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(cookieParser());
app.use(morgan("combined"));

const isProduction = process.env.NODE_ENV === "production";
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || (isProduction ? 800 : 3000);

app.use(
  rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please wait a moment and try again."
    },
    skip: (req) => req.method === "OPTIONS"
  })
);

app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/caregivers", require("./routes/caregiverRoutes"));
app.use("/api/v1/skills", require("./routes/skillRoutes"));
app.use("/api/v1/bookings", require("./routes/bookingRoutes"));
app.use("/api/v1/time", require("./routes/timeRoutes"));
app.use("/api/v1/coordinator", require("./routes/coordinatorRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/v1/notifications", require("./routes/notificationRoutes"));
app.use("/api/v1/zones", require("./routes/zoneRoutes"));
app.use("/api/v1/geo", require("./routes/geoRoutes"));
app.use("/api/v1/kyc", require("./routes/kycRoutes"));

app.get("/", (req, res) => {
  res.json({ success: true, message: "ChildCare API Running" });
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", service: "childcare-api" });
  } catch (err) {
    logger.error("Health check failed", { message: err.message });
    res.status(503).json({ status: "error", service: "childcare-api" });
  }
});

app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.code === "P2002") {
    const fields = err.meta?.target || ["field"];
    const field = Array.isArray(fields) ? fields.join(", ") : fields;
    return res.status(400).json({
      success: false,
      message: `A record with this ${field} already exists`
    });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

module.exports = app;
