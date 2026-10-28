import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

function safeReturnPath(from) {
  if (
    typeof from?.pathname === "string" &&
    from.pathname.startsWith("/") &&
    !from.pathname.startsWith("//") &&
    !from.pathname.includes("\\")
  ) {
    return `${from.pathname}${from.search || ""}${from.hash || ""}`;
  }
  return "/dashboard";
}

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (isRegister) {
      if (name.trim().length < 2 || name.trim().length > 80) {
        setError("Your name must be between 2 and 80 characters.");
        return;
      }
      if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
        setError("Use a password of at least 12 characters and no more than 72 UTF-8 bytes.");
        return;
      }
      if (password !== confirmation) {
        setError("The passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const credentials = { email: email.trim(), password };
      if (isRegister) {
        await register({ ...credentials, name: name.trim() });
      } else {
        await login(credentials);
      }
      navigate(safeReturnPath(location.state?.from), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">AUTOCARE LOGGER</p>
      <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
      <p className="auth-description">
        {isRegister
          ? "Create a private space for your vehicle records."
          : "Sign in to view and manage your vehicle records."}
      </p>

      <form className="public-form" onSubmit={handleSubmit}>
        {isRegister && (
          <label>
            Name
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={isRegister ? 12 : undefined}
            maxLength={72}
            required
          />
          {isRegister && (
            <span className="field-help">At least 12 characters; no more than 72 UTF-8 bytes.</span>
          )}
        </label>
        {isRegister && (
          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={12}
              maxLength={72}
              required
            />
          </label>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting
            ? "Please wait…"
            : isRegister
              ? "Create account"
              : "Log in"}
        </button>
      </form>
      <p className="auth-switch">
        {isRegister ? "Already registered?" : "New to AutoCare Logger?"}{" "}
        <Link to={isRegister ? "/login" : "/register"}>
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
    </section>
  );
}
