import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

const recordOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform(_document, record) {
      record.id = record._id;
      delete record._id;
      delete record.ownerId;
      delete record.createdAt;
      delete record.updatedAt;
      return record;
    },
  },
};

function recordSchema(fields) {
  return new mongoose.Schema(
    {
      _id: { type: String, default: randomUUID },
      ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      ...fields,
    },
    recordOptions
  );
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, versionKey: false }
);

export const User = mongoose.model("User", userSchema);

const feedbackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000,
    },
  },
  { timestamps: true, versionKey: false }
);

export const Feedback = mongoose.model("Feedback", feedbackSchema);

export const Vehicle = mongoose.model(
  "Vehicle",
  recordSchema({
    brand: { type: String, required: true, trim: true, maxlength: 100 },
    model: { type: String, required: true, trim: true, maxlength: 100 },
    year: {
      type: Number,
      required: true,
      min: 1950,
      max: new Date().getFullYear() + 1,
      validate: Number.isInteger,
    },
    registration: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
      unique: true,
    },
    fuel: {
      type: String,
      required: true,
      enum: ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"],
    },
    mileage: { type: Number, required: true, min: 0, validate: Number.isInteger },
  })
);

export const Service = mongoose.model(
  "Service",
  recordSchema({
    registration: { type: String, required: true, trim: true, uppercase: true },
    serviceType: { type: String, required: true, trim: true, maxlength: 100 },
    date: {
      type: String,
      required: true,
      validate: { validator: validDate, message: "Enter a valid service date." },
    },
    cost: { type: Number, required: true, min: 0 },
    odometer: { type: Number, required: true, min: 0, validate: Number.isInteger },
    workshop: { type: String, trim: true, maxlength: 150, default: "" },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
  })
);

export const Reminder = mongoose.model(
  "Reminder",
  recordSchema({
    vehicle: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    dueDate: {
      type: String,
      required: true,
      validate: { validator: validDate, message: "Enter a valid due date." },
    },
    dueMileage: {
      type: Number,
      min: 0,
      validate: (value) => value == null || Number.isInteger(value),
      default: null,
    },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
  })
);

export const Expense = mongoose.model(
  "Expense",
  recordSchema({
    title: { type: String, required: true, trim: true, maxlength: 150 },
    category: {
      type: String,
      required: true,
      enum: ["Maintenance", "Fuel", "Repair", "Insurance", "Other"],
    },
    date: {
      type: String,
      required: true,
      validate: { validator: validDate, message: "Enter a valid expense date." },
    },
    amount: { type: Number, required: true, min: 0.01 },
  })
);

export const collections = {
  vehicles: Vehicle,
  services: Service,
  reminders: Reminder,
  expenses: Expense,
};
