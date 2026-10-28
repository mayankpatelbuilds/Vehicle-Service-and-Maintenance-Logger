import { randomUUID } from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import { collections, Feedback, Vehicle } from "./models.js";
import { feedbackLimiter, requireAuth, requireCsrf } from "./auth.js";
import { validateFeedback } from "./validation.js";

export const router = express.Router();

function ensureDatabase(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: "Database is not connected." });
  }
  return next();
}

function asDocument(Model, record, ownerId) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    const error = new Error("Request body must be an object.");
    error.status = 400;
    throw error;
  }
  const { id, _id, ownerId: _ignoredOwnerId, ...fields } = record;
  const recordId = id ?? _id ?? randomUUID();
  if (typeof recordId !== "string" || recordId.length > 100) {
    const error = new Error("Record id must be a string of at most 100 characters.");
    error.status = 400;
    throw error;
  }
  return new Model({ ...fields, _id: recordId, ownerId });
}

async function ensureRelatedVehicle(collection, record, ownerId) {
  const registration =
    collection === "services"
      ? record.registration
      : collection === "reminders"
        ? record.vehicle
        : null;
  if (
    registration &&
    !(await Vehicle.exists({ registration, ownerId }))
  ) {
    const error = new Error("Record must be linked to a registered vehicle.");
    error.status = 400;
    throw error;
  }
}

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

router.get("/db-status", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "connected" : "disconnected",
  });
});

router.post("/feedback", ensureDatabase, requireCsrf, feedbackLimiter, async (req, res, next) => {
  try {
    const feedback = await Feedback.create(validateFeedback(req.body));
    return res.status(201).json({
      message: "Thank you. Your feedback has been saved.",
      id: feedback.id,
    });
  } catch (error) {
    return next(error);
  }
});

router.use(ensureDatabase, requireAuth);

for (const [collection, Model] of Object.entries(collections)) {
  const path = `/${collection}`;

  router.get(path, async (req, res, next) => {
    try {
      const records = await Model.find({ ownerId: req.user._id }).sort({
        createdAt: -1,
      });
      return res.json(records.map((record) => record.toJSON()));
    } catch (error) {
      return next(error);
    }
  });

  router.post(path, async (req, res, next) => {
    try {
      const document = asDocument(Model, req.body, req.user._id);
      await ensureRelatedVehicle(collection, document, req.user._id);
      await document.save();
      return res.status(201).json(document.toJSON());
    } catch (error) {
      return next(error);
    }
  });

  router.put(`${path}/:id`, async (req, res, next) => {
    try {
      const document = await Model.findOne({
        _id: req.params.id,
        ownerId: req.user._id,
      });
      if (!document) {
        return res.status(404).json({ message: "Record not found." });
      }

      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({ message: "Request body must be an object." });
      }
      const updates = { ...req.body };
      delete updates.id;
      delete updates._id;
      delete updates.ownerId;
      document.set(updates);
      await ensureRelatedVehicle(collection, document, req.user._id);
      await document.save();
      return res.json(document.toJSON());
    } catch (error) {
      return next(error);
    }
  });

  router.delete(`${path}/:id`, async (req, res, next) => {
    try {
      const document = await Model.findOneAndDelete({
        _id: req.params.id,
        ownerId: req.user._id,
      });
      if (!document) {
        return res.status(404).json({ message: "Record not found." });
      }

      if (collection === "vehicles") {
        await Promise.all([
          collections.services.deleteMany({
            registration: document.registration,
            ownerId: req.user._id,
          }),
          collections.reminders.deleteMany({
            vehicle: document.registration,
            ownerId: req.user._id,
          }),
        ]);
      }

      return res.json({ id: req.params.id, deleted: true });
    } catch (error) {
      return next(error);
    }
  });
}
