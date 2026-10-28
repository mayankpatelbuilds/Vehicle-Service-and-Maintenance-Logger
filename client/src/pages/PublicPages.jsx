import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api.js";
import heroImage from "../assets/hero.png";

export function HomePage() {
  return (
    <div className="public-page">
      <section className="public-hero">
        <div>
          <p className="eyebrow">A calmer way to care for your vehicle</p>
          <h1>Every service, reminder, and expense in one place.</h1>
          <p>
            Keep a clear record of the work your vehicle needs, the work it has
            received, and what it costs over time.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/register">Get started</Link>
            <Link className="secondary-button" to="/maintenance">
              Browse maintenance tips
            </Link>
          </div>
        </div>
        <img
          src={heroImage}
          alt="A vehicle ready for its next journey"
          className="public-hero-image"
        />
      </section>

      <section className="public-feature-grid" aria-label="Logger features">
        <article className="public-feature">
          <span aria-hidden="true">🚘</span>
          <h2>Your vehicles</h2>
          <p>Keep registration, model, year, fuel type, and mileage together.</p>
        </article>
        <article className="public-feature">
          <span aria-hidden="true">🔧</span>
          <h2>Service history</h2>
          <p>Track maintenance dates, odometer readings, workshop notes, and cost.</p>
        </article>
        <article className="public-feature">
          <span aria-hidden="true">📊</span>
          <h2>Reminders and expenses</h2>
          <p>See upcoming tasks and understand your vehicle spending.</p>
        </article>
      </section>
    </div>
  );
}

export function AboutPage() {
  return (
    <article className="public-reading">
      <p className="eyebrow">ABOUT AUTOCARE LOGGER</p>
      <h1>Simple records for better vehicle care.</h1>
      <p>
        Vehicle Service and Maintenance Logger helps owners keep their vehicle
        information and maintenance history organized, instead of spread across
        paper receipts, notes, and memory.
      </p>
      <h2>What you can do</h2>
      <ul>
        <li>Keep details for the vehicles you manage.</li>
        <li>Record services, repairs, dates, mileage, workshops, and costs.</li>
        <li>Set maintenance reminders and review expenses over time.</li>
        <li>Use a personal dashboard to see your own records at a glance.</li>
      </ul>
      <p>
        Public information pages are available to everyone. Personal records are
        available only after you sign in.
      </p>
      <Link className="primary-button" to="/register">Create an account</Link>
    </article>
  );
}

export function MaintenancePage() {
  return (
    <article className="public-reading">
      <p className="eyebrow">MAINTENANCE INFORMATION</p>
      <h1>Small checks can help you plan ahead.</h1>
      <p>
        Follow your owner's manual and local requirements first. Schedules vary
        by vehicle, age, use, climate, and manufacturer.
      </p>
      <div className="maintenance-grid">
        <section className="public-feature">
          <h2>Check fluids and filters</h2>
          <p>
            Review oil, coolant, brake fluid, and filters at the intervals in
            your manual. Use only the specified fluids and procedures.
          </p>
        </section>
        <section className="public-feature">
          <h2>Look after tyres</h2>
          <p>
            Check pressure when tyres are cold, inspect tread and sidewalls, and
            follow the vehicle placard for rotation and replacement guidance.
          </p>
        </section>
        <section className="public-feature">
          <h2>Pay attention to brakes</h2>
          <p>
            New noises, vibration, warning lights, or changes in braking should
            be inspected promptly by a qualified technician.
          </p>
        </section>
        <section className="public-feature">
          <h2>Keep a service record</h2>
          <p>
            Record the date, odometer reading, work completed, and receipts.
            This helps you plan routine maintenance and understand costs.
          </p>
        </section>
      </div>
      <p className="safety-note">
        These tips are general information, not a substitute for your vehicle's
        manual or advice from a qualified mechanic.
      </p>
    </article>
  );
}

export function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (
      form.name.trim().length < 2 ||
      form.name.trim().length > 80 ||
      form.subject.trim().length < 3 ||
      form.subject.trim().length > 150 ||
      form.message.trim().length < 10 ||
      form.message.trim().length > 3000
    ) {
      setError("Check the name, subject, and message lengths before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.sendFeedback({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setNotice(result.message);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="contact-layout">
      <div className="public-reading">
        <p className="eyebrow">CONTACT</p>
        <h1>Send a question or share feedback.</h1>
        <p>
          Feedback is stored securely for the site owner to review. No email is
          sent automatically.
        </p>
      </div>
      <form className="public-form contact-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label>
          Your email
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            maxLength={254}
            required
          />
        </label>
        <label>
          Subject
          <input
            name="subject"
            value={form.subject}
            onChange={handleChange}
            minLength={3}
            maxLength={150}
            required
          />
        </label>
        <label>
          Message
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            minLength={10}
            maxLength={3000}
            rows="6"
            required
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Send feedback"}
        </button>
      </form>
    </section>
  );
}
