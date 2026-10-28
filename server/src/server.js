import "dotenv/config";
import cors from "cors";
import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import { pathToFileURL } from "node:url";
import { authRouter } from "./auth.js";
import { router } from "./routes.js";

export const app = express();
const port = Number(process.env.PORT) || 5000;
const databaseRetryDelay = 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const sessionCookieName = "vehiclelogger.sid";
const sameSiteSetting =
  process.env.COOKIE_SAME_SITE?.toLowerCase() === "none" ? "none" : "lax";
const secureCookie =
  process.env.NODE_ENV === "production" || sameSiteSetting === "none";
const mongoUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;
if (!mongoUri) {
  throw new Error("MONGODB_URI is required to start the API server.");
}
if (!sessionSecret || Buffer.byteLength(sessionSecret, "utf8") < 32) {
  throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
}

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.includes(origin)),
    credentials: true,
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  })
);
app.use(express.json({ limit: "1mb" }));
export const sessionStore = MongoStore.create({
  mongoUrl: mongoUri,
  collectionName: "vehicleLoggerSessions",
  ttl: 8 * 60 * 60,
  autoRemove: "native",
});

app.use(
  session({
    name: sessionCookieName,
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: sameSiteSetting,
      secure: secureCookie,
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    },
  })
);
app.use("/api/auth", authRouter);
app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ message: "Request body must contain valid JSON." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with that unique value already exists." });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) {
    console.error("API request failed.", error.name);
  }
  return res.status(status).json({
    message: status >= 500 ? "An unexpected server error occurred." : error.message,
  });
});

async function start() {
  void connectToDatabase(mongoUri);

  app.listen(port, () => {
    console.log(`API server listening on port ${port}.`);
  });
}

async function connectToDatabase(mongoUri) {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connection established.");
  } catch (error) {
    console.error(
      `MongoDB connection failed; retrying in ${databaseRetryDelay / 1000} seconds.`,
      error.name
    );
    const retry = setTimeout(() => {
      void connectToDatabase(mongoUri);
    }, databaseRetryDelay);
    retry.unref();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}
