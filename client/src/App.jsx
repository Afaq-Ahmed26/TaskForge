import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getHealth,
  loginUser,
  logoutUser,
  registerUser
} from "./services/api.js";
import "./styles.css";

function App() {
  const [apiStatus, setApiStatus] = useState("Checking API...");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    getHealth()
      .then(() => setApiStatus("API connected"))
      .catch(() => setApiStatus("API unavailable"));

    const token = localStorage.getItem("taskforge_token");
    if (token) {
      getCurrentUser(token)
        .then((result) => setUser({ ...result.data.user, token }))
        .catch(() => localStorage.removeItem("taskforge_token"));
    }
  }, []);

  function updateField(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value
    }));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    try {
      const action = authMode === "login" ? loginUser : registerUser;
      const payload =
        authMode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const result = await action(payload);
      const authenticatedUser = {
        ...result.data.user,
        token: result.data.token
      };

      localStorage.setItem("taskforge_token", result.data.token);
      setUser(authenticatedUser);
      setForm({ name: "", email: "", password: "" });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    if (user?.token) {
      await logoutUser(user.token).catch(() => {});
    }

    localStorage.removeItem("taskforge_token");
    setUser(null);
  }

  if (user) {
    return (
      <main className="app-shell">
        <section className="hero-card">
          <p className="eyebrow">Welcome back</p>
          <h1>{user.name}</h1>
          <p className="description">{user.email}</p>
          <button className="primary-button" type="button" onClick={handleLogout}>
            Log out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Project management, simplified</p>
        <h1>TaskForge</h1>
        <p className="description">
          Organize projects, track issues, and understand progress from one
          focused workspace.
        </p>
        <div className="status" aria-live="polite">
          <span className="status-dot" />
          {apiStatus}
        </div>
        <div className="auth-panel">
          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "tab active" : "tab"}
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "tab active" : "tab"}
              type="button"
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
            >
              Register
            </button>
          </div>
          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === "register" && (
              <label>
                Name
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  minLength="2"
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                minLength="8"
                required
              />
            </label>
            {authError && <p className="form-error">{authError}</p>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait..."
                : authMode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default App;
