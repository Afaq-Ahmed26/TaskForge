import { useEffect, useState } from "react";
import { getHealth } from "./services/api.js";
import "./styles.css";

function App() {
  const [apiStatus, setApiStatus] = useState("Checking API...");

  useEffect(() => {
    getHealth()
      .then(() => setApiStatus("API connected"))
      .catch(() => setApiStatus("API unavailable"));
  }, []);

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
      </section>
    </main>
  );
}

export default App;

