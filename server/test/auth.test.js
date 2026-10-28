import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { normalizeEmail, validateFeedback } from "../src/validation.js";

const origin = "http://localhost:5173";
let mongo;
let app;
let sessionStore;
let User;
let Feedback;

async function createAccount(email) {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf").set("Origin", origin);
  const response = await agent
    .post("/api/auth/register")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({
      name: "Test Driver",
      email,
      password: "Strong-password-123",
    });
  return { agent, response };
}

async function csrfFor(agent) {
  const response = await agent.get("/api/auth/csrf").set("Origin", origin);
  assert.equal(response.status, 200);
  return response.body.csrfToken;
}

async function mutate(agent, method, path, body) {
  const csrf = await csrfFor(agent);
  return agent[method](path)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .send(body);
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.SESSION_SECRET = randomUUID() + randomUUID();
  process.env.CLIENT_ORIGIN = origin;
  process.env.NODE_ENV = "test";

  ({ app, sessionStore } = await import("../src/server.js"));
  ({ User, Feedback } = await import("../src/models.js"));
  await mongoose.connect(process.env.MONGODB_URI);
});

after(async () => {
  await sessionStore.close();
  await mongoose.disconnect();
  await mongo?.stop();
});

test("normalizes email and validates feedback lengths", () => {
  assert.equal(normalizeEmail("  Driver@Example.COM "), "driver@example.com");
  assert.throws(
    () => validateFeedback({ name: "A", email: "invalid", subject: "", message: "short" }),
    { status: 400 }
  );
  assert.deepEqual(
    validateFeedback({
      name: "Driver",
      email: " DRIVER@example.com ",
      subject: "Site feedback",
      message: "Please add another maintenance topic.",
    }),
    {
      name: "Driver",
      email: "driver@example.com",
      subject: "Site feedback",
      message: "Please add another maintenance topic.",
    }
  );
});

test("stores contact feedback without authentication and provides no public read route", async () => {
  const agent = request.agent(app);
  const csrf = await csrfFor(agent);
  const response = await agent
    .post("/api/feedback")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .send({
      name: "Feedback Sender",
      email: "sender@example.com",
      subject: "Maintenance tip",
      message: "Please include a reminder about tyre pressure.",
    });
  assert.equal(response.status, 201);
  assert.match(response.body.message, /saved/);
  assert.equal(await Feedback.countDocuments(), 1);
  assert.equal((await agent.get("/api/feedback")).status, 401);
});

test("registers unique accounts, hashes passwords, and returns generic login errors", async () => {
  const email = `first-${randomUUID()}@example.com`;
  const { agent, response } = await createAccount(email);
  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, email);
  assert.equal(response.body.user.passwordHash, undefined);
  const user = await User.findOne({ email }).select("+passwordHash");
  assert.notEqual(user.passwordHash, "Strong-password-123");
  assert.match(user.passwordHash, /^\$2[aby]\$/);

  const duplicate = await createAccount(email.toUpperCase());
  assert.equal(duplicate.response.status, 400);
  assert.match(duplicate.response.body.message, /Unable to register/);

  const weakPasswordAgent = request.agent(app);
  const weakPasswordCsrf = await csrfFor(weakPasswordAgent);
  const weakPassword = await weakPasswordAgent
    .post("/api/auth/register")
    .set("Origin", origin)
    .set("X-CSRF-Token", weakPasswordCsrf)
    .send({
      name: "Weak Password",
      email: `weak-${randomUUID()}@example.com`,
      password: "short",
    });
  assert.equal(weakPassword.status, 400);

  const badLogin = await mutate(agent, "post", "/api/auth/login", {
    email,
    password: "not-the-correct-password",
  });
  assert.equal(badLogin.status, 401);
  assert.equal(badLogin.body.message, "Invalid email or password.");

  const validLogin = await mutate(agent, "post", "/api/auth/login", {
    email: email.toUpperCase(),
    password: "Strong-password-123",
  });
  assert.equal(validLogin.status, 200);
  assert.equal((await agent.get("/api/auth/me")).body.user.email, email);
});

test("rejects private API requests without a valid session and invalidates logout", async () => {
  const anonymous = request.agent(app);
  assert.equal((await anonymous.get("/api/vehicles")).status, 401);
  assert.equal((await anonymous.get("/api/services")).status, 401);
  assert.equal((await anonymous.get("/api/reminders")).status, 401);
  assert.equal((await anonymous.get("/api/expenses")).status, 401);

  const { agent, response } = await createAccount(`logout-${randomUUID()}@example.com`);
  assert.equal(response.status, 201);
  const logout = await mutate(agent, "post", "/api/auth/logout", {});
  assert.equal(logout.status, 204);
  assert.equal((await agent.get("/api/auth/me")).status, 401);

  const invalidSession = request(app);
  assert.equal(
    (await invalidSession.get("/api/auth/me").set("Cookie", "vehiclelogger.sid=invalid-session-id"))
      .status,
    401
  );
});

test("isolates vehicle, service, reminder, and expense CRUD by account ownership", async () => {
  const userA = await createAccount(`owner-a-${randomUUID()}@example.com`);
  const userB = await createAccount(`owner-b-${randomUUID()}@example.com`);
  assert.equal(userA.response.status, 201);
  assert.equal(userB.response.status, 201);

  const legacyId = randomUUID();
  await mongoose.connection.db.collection("vehicles").insertOne({
    _id: legacyId,
    brand: "Legacy",
    model: "Unassigned",
    year: 2018,
    registration: `OLD${randomUUID().slice(0, 8)}`.toUpperCase(),
    fuel: "Diesel",
    mileage: 50000,
  });

  const vehicle = {
    id: randomUUID(),
    ownerId: userB.response.body.user.id,
    brand: "Example",
    model: "One",
    year: 2022,
    registration: `TEST${randomUUID().slice(0, 8)}`.toUpperCase(),
    fuel: "Petrol",
    mileage: 12000,
  };
  const createdVehicle = await mutate(userA.agent, "post", "/api/vehicles", vehicle);
  assert.equal(createdVehicle.status, 201);
  assert.equal(createdVehicle.body.ownerId, undefined);
  const storedVehicle = await mongoose.model("Vehicle").findById(vehicle.id);
  assert.equal(String(storedVehicle.ownerId), userA.response.body.user.id);
  assert.equal((await userB.agent.get("/api/vehicles")).body.length, 0);
  assert.equal(
    (await mutate(userB.agent, "delete", `/api/vehicles/${legacyId}`, {})).status,
    404
  );
  assert.equal(
    (await mutate(userB.agent, "put", `/api/vehicles/${vehicle.id}`, { mileage: 1 })).status,
    404
  );
  assert.equal(
    (await mutate(userB.agent, "delete", `/api/vehicles/${vehicle.id}`, {})).status,
    404
  );

  const service = {
    id: randomUUID(),
    registration: vehicle.registration,
    serviceType: "Oil change",
    date: "2026-10-01",
    cost: 120,
    odometer: 12000,
    workshop: "",
    notes: "",
  };
  const createdService = await mutate(userA.agent, "post", "/api/services", service);
  assert.equal(createdService.status, 201);
  assert.equal(
    (await mutate(userB.agent, "post", "/api/services", { ...service, id: randomUUID() })).status,
    400
  );
  assert.equal((await userB.agent.get("/api/services")).body.length, 0);
  assert.equal(
    (await mutate(userB.agent, "put", `/api/services/${service.id}`, { cost: 1 })).status,
    404
  );
  assert.equal(
    (await mutate(userB.agent, "delete", `/api/services/${service.id}`, {})).status,
    404
  );
  assert.equal(
    (await mutate(userA.agent, "put", `/api/services/${service.id}`, { cost: 150 })).status,
    200
  );
  assert.equal(
    (await mutate(userA.agent, "delete", `/api/services/${service.id}`, {})).status,
    200
  );

  const reminder = {
    id: randomUUID(),
    vehicle: vehicle.registration,
    title: "Next service",
    dueDate: "2026-12-01",
    dueMileage: 15000,
    notes: "",
  };
  const createdReminder = await mutate(
    userA.agent,
    "post",
    "/api/reminders",
    reminder
  );
  assert.equal(createdReminder.status, 201);
  assert.equal((await userB.agent.get("/api/reminders")).body.length, 0);
  assert.equal(
    (await mutate(userB.agent, "put", `/api/reminders/${reminder.id}`, { title: "stolen" }))
      .status,
    404
  );
  assert.equal(
    (await mutate(userB.agent, "delete", `/api/reminders/${reminder.id}`, {})).status,
    404
  );
  assert.equal(
    (await mutate(userA.agent, "put", `/api/reminders/${reminder.id}`, { title: "Check tyres" })).status,
    200
  );
  assert.equal(
    (await mutate(userA.agent, "delete", `/api/reminders/${reminder.id}`, {})).status,
    200
  );

  const expense = {
    id: randomUUID(),
    title: "Fuel",
    category: "Fuel",
    date: "2026-10-01",
    amount: 75,
  };
  const createdExpense = await mutate(userA.agent, "post", "/api/expenses", expense);
  assert.equal(createdExpense.status, 201);
  assert.equal((await userB.agent.get("/api/expenses")).body.length, 0);
  assert.equal(
    (await mutate(userB.agent, "put", `/api/expenses/${expense.id}`, { amount: 1 })).status,
    404
  );
  assert.equal(
    (await mutate(userB.agent, "delete", `/api/expenses/${expense.id}`, {})).status,
    404
  );
  assert.equal(
    (await mutate(userA.agent, "put", `/api/expenses/${expense.id}`, { amount: 90 })).status,
    200
  );
  assert.equal(
    (await mutate(userA.agent, "delete", `/api/expenses/${expense.id}`, {})).status,
    200
  );

  assert.equal((await userA.agent.get("/api/vehicles")).body.length, 1);
  assert.equal((await userA.agent.get("/api/services")).body.length, 0);
  assert.equal((await userA.agent.get("/api/reminders")).body.length, 0);
  assert.equal((await userA.agent.get("/api/expenses")).body.length, 0);
});
