import { randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import express from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { User } from "./models.js";
import {
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from "./validation.js";

export const authRouter = express.Router();

const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const dummyPasswordHash = bcrypt.hash(randomBytes(32).toString("hex"), 12);
const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many feedback submissions. Please try again later." },
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function verifyRequestOrigin(req, res, next) {
  if (!allowedOrigins.has(req.get("origin"))) {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }
  return next();
}

export function requireCsrf(req, res, next) {
  const submitted = req.get("x-csrf-token");
  const expected = req.session?.csrfToken;
  if (
    !allowedOrigins.has(req.get("origin")) ||
    typeof submitted !== "string" ||
    typeof expected !== "string"
  ) {
    return res.status(403).json({ message: "Request could not be verified." });
  }

  const submittedBytes = Buffer.from(submitted);
  const expectedBytes = Buffer.from(expected);
  if (
    submittedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(submittedBytes, expectedBytes)
  ) {
    return res.status(403).json({ message: "Request could not be verified." });
  }
  return next();
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

async function startUserSession(req, user) {
  await regenerateSession(req);
  req.session.userId = user.id;
  req.session.csrfToken = randomBytes(32).toString("hex");
  await saveSession(req);
}

authRouter.get("/csrf", async (req, res, next) => {
  try {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString("hex");
      await saveSession(req);
    }
    return res.json({ csrfToken: req.session.csrfToken });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.session.userId)) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Authentication required." });
    }
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

authRouter.post(
  "/register",
  authenticationLimiter,
  verifyRequestOrigin,
  requireCsrf,
  async (req, res, next) => {
    const { name, email, password } = req.body ?? {};
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = normalizeEmail(email);

    if (
      normalizedName.length < 2 ||
      normalizedName.length > 80 ||
      !isValidEmail(normalizedEmail) ||
      !isValidPassword(password)
    ) {
      return res.status(400).json({
        message:
          "Enter a valid name and email, and a password of 12 to 72 UTF-8 bytes.",
      });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
      });
      await startUserSession(req, user);
      return res.status(201).json({
        user: publicUser(user),
        csrfToken: req.session.csrfToken,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          message: "Unable to register with those details. Check them and try again.",
        });
      }
      return next(error);
    }
  }
);

authRouter.post(
  "/login",
  authenticationLimiter,
  verifyRequestOrigin,
  requireCsrf,
  async (req, res, next) => {
    const { email, password } = req.body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (
      !isValidEmail(normalizedEmail) ||
      typeof password !== "string" ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      await bcrypt.compare(
        typeof password === "string" ? password : "",
        await dummyPasswordHash
      );
      return res.status(401).json({ message: "Invalid email or password." });
    }

    try {
      const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
      const matches = await bcrypt.compare(
        password,
        user?.passwordHash ?? (await dummyPasswordHash)
      );
      if (!user || !matches) {
        return res.status(401).json({ message: "Invalid email or password." });
      }
      await startUserSession(req, user);
      return res.json({
        user: publicUser(user),
        csrfToken: req.session.csrfToken,
      });
    } catch (error) {
      return next(error);
    }
  }
);

authRouter.post("/logout", verifyRequestOrigin, requireCsrf, async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      req.session.destroy((error) => (error ? reject(error) : resolve()));
    });
    res.clearCookie("vehiclelogger.sid", {
      httpOnly: true,
      sameSite:
        process.env.COOKIE_SAME_SITE?.toLowerCase() === "none" ? "none" : "lax",
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.COOKIE_SAME_SITE?.toLowerCase() === "none",
      path: "/",
    });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export async function requireAuth(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.session.userId)) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Authentication required." });
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
