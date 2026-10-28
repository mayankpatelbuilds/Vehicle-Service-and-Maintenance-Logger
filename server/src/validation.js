export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 12 &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

export function validateFeedback(input) {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const email = normalizeEmail(input?.email);
  const subject = typeof input?.subject === "string" ? input.subject.trim() : "";
  const message =
    typeof input?.message === "string" ? input.message.trim() : "";

  if (
    name.length < 2 ||
    name.length > 80 ||
    !isValidEmail(email) ||
    subject.length < 3 ||
    subject.length > 150 ||
    message.length < 10 ||
    message.length > 3000
  ) {
    const error = new Error("Please provide valid contact details and message.");
    error.status = 400;
    throw error;
  }

  return { name, email, subject, message };
}
