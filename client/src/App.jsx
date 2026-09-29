import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getHealth,
  getProjects,
  loginUser,
  logoutUser,
  registerUser,
  createProject,
  createIssue,
  addIssueComment,
  getIssueActivity,
  getIssueComments,
  getProjectIssues,
  updateIssueStatus
} from "./services/api.js";
import "./styles.css";

function App() {
  const [apiStatus, setApiStatus] = useState("Checking API...");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectError, setProjectError] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: ""
  });
  const [selectedProject, setSelectedProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [issueError, setIssueError] = useState("");
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "MEDIUM"
  });
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [issueDetails, setIssueDetails] = useState({});
  const [commentDraft, setCommentDraft] = useState("");

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

  useEffect(() => {
    if (!user?.token) {
      return;
    }

    setIsLoadingProjects(true);
    getProjects(user.token)
      .then((result) => setProjects(result.data.projects))
      .catch((error) => setProjectError(error.message))
      .finally(() => setIsLoadingProjects(false));
  }, [user]);

  useEffect(() => {
    if (!user?.token || !selectedProject) {
      return;
    }

    setIsLoadingIssues(true);
    setIssueError("");
    getProjectIssues(user.token, selectedProject._id)
      .then((result) => setIssues(result.data.issues))
      .catch((error) => setIssueError(error.message))
      .finally(() => setIsLoadingIssues(false));
  }, [user, selectedProject]);

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
    setProjects([]);
    setSelectedProject(null);
    setIssues([]);
  }

  function updateProjectField(event) {
    setNewProject((currentProject) => ({
      ...currentProject,
      [event.target.name]: event.target.value
    }));
  }

  async function submitProject(event) {
    event.preventDefault();
    setProjectError("");

    try {
      const result = await createProject(user.token, newProject);
      setProjects((currentProjects) => [result.data.project, ...currentProjects]);
      setNewProject({ name: "", description: "" });
    } catch (error) {
      setProjectError(error.message);
    }
  }

  function updateIssueField(event) {
    setNewIssue((currentIssue) => ({
      ...currentIssue,
      [event.target.name]: event.target.value
    }));
  }

  async function submitIssue(event) {
    event.preventDefault();
    setIssueError("");

    try {
      const result = await createIssue(
        user.token,
        selectedProject._id,
        newIssue
      );
      setIssues((currentIssues) => [result.data.issue, ...currentIssues]);
      setNewIssue({ title: "", description: "", priority: "MEDIUM" });
    } catch (error) {
      setIssueError(error.message);
    }
  }

  async function changeStatus(issueId, status) {
    try {
      const result = await updateIssueStatus(user.token, issueId, status);
      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          issue._id === issueId ? result.data.issue : issue
        )
      );
    } catch (error) {
      setIssueError(error.message);
    }
  }

  async function toggleIssueDetails(issueId) {
    if (expandedIssueId === issueId) {
      setExpandedIssueId(null);
      return;
    }

    setIssueError("");
    setExpandedIssueId(issueId);

    try {
      const [commentsResult, activityResult] = await Promise.all([
        getIssueComments(user.token, issueId),
        getIssueActivity(user.token, issueId)
      ]);

      setIssueDetails((currentDetails) => ({
        ...currentDetails,
        [issueId]: {
          comments: commentsResult.data.comments,
          activity: activityResult.data.activities
        }
      }));
    } catch (error) {
      setIssueError(error.message);
    }
  }

  async function submitComment(event, issueId) {
    event.preventDefault();

    if (!commentDraft.trim()) {
      return;
    }

    try {
      const result = await addIssueComment(
        user.token,
        issueId,
        commentDraft.trim()
      );
      setIssueDetails((currentDetails) => ({
        ...currentDetails,
        [issueId]: {
          ...currentDetails[issueId],
          comments: [
            ...(currentDetails[issueId]?.comments || []),
            result.data.comment
          ],
          activity: [
            ...(currentDetails[issueId]?.activity || []),
            {
              _id: `local-${Date.now()}`,
              type: "COMMENT_ADDED",
              actor: user,
              createdAt: new Date().toISOString()
            }
          ]
        }
      }));
      setCommentDraft("");
    } catch (error) {
      setIssueError(error.message);
    }
  }

  if (user) {
    return (
      <main className="app-shell">
        <section className="workspace">
          <header className="workspace-header">
            <div>
              <p className="eyebrow">Your workspace</p>
              <h1>Projects</h1>
              <p className="description">Welcome back, {user.name}.</p>
            </div>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              Log out
            </button>
          </header>
          <div className="workspace-grid">
            <form className="project-form" onSubmit={submitProject}>
              <h2>New project</h2>
              <label>
                Name
                <input
                  name="name"
                  value={newProject.name}
                  onChange={updateProjectField}
                  minLength="2"
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  value={newProject.description}
                  onChange={updateProjectField}
                  rows="4"
                />
              </label>
              {projectError && <p className="form-error">{projectError}</p>}
              <button className="primary-button" type="submit">
                Create project
              </button>
            </form>
            <section className="project-list">
              <div className="section-heading">
                <h2>Accessible projects</h2>
                <span>{projects.length}</span>
              </div>
              {isLoadingProjects && <p className="muted-text">Loading projects...</p>}
              {!isLoadingProjects && projects.length === 0 && (
                <p className="muted-text">No projects yet. Create your first one.</p>
              )}
              <div className="project-cards">
                {projects.map((project) => (
                  <article
                    className={
                      selectedProject?._id === project._id
                        ? "project-card selected"
                        : "project-card"
                    }
                    key={project._id}
                    onClick={() => setSelectedProject(project)}
                  >
                    <h3>{project.name}</h3>
                    <p>{project.description || "No description provided."}</p>
                    <small>{project.members?.length || 0} member(s)</small>
                  </article>
                ))}
              </div>
            </section>
          </div>
          {selectedProject && (
            <section className="issue-workspace">
              <header className="section-heading">
                <div>
                  <h2>{selectedProject.name} issues</h2>
                  <p className="muted-text">
                    Select a status to move an issue across the board.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setSelectedProject(null)}
                >
                  Close
                </button>
              </header>
              <form className="issue-form" onSubmit={submitIssue}>
                <input
                  name="title"
                  placeholder="Issue title"
                  value={newIssue.title}
                  onChange={updateIssueField}
                  minLength="2"
                  required
                />
                <input
                  name="description"
                  placeholder="Short description"
                  value={newIssue.description}
                  onChange={updateIssueField}
                />
                <select
                  name="priority"
                  value={newIssue.priority}
                  onChange={updateIssueField}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <button className="primary-button" type="submit">
                  Add issue
                </button>
              </form>
              {issueError && <p className="form-error">{issueError}</p>}
              {isLoadingIssues ? (
                <p className="muted-text">Loading issues...</p>
              ) : (
                <div className="kanban-board">
                  {["TODO", "IN_PROGRESS", "DONE"].map((status) => (
                    <section className="kanban-column" key={status}>
                      <div className="column-heading">
                        <h3>{status.replace("_", " ")}</h3>
                        <span>
                          {issues.filter((issue) => issue.status === status).length}
                        </span>
                      </div>
                      <div className="issue-cards">
                        {issues
                          .filter((issue) => issue.status === status)
                          .map((issue) => (
                            <article className="issue-card" key={issue._id}>
                              <div className="issue-card-header">
                                <h4>{issue.title}</h4>
                                <span className={`priority ${issue.priority.toLowerCase()}`}>
                                  {issue.priority}
                                </span>
                              </div>
                              <p>{issue.description || "No description."}</p>
                              <select
                                value={issue.status}
                                onChange={(event) =>
                                  changeStatus(issue._id, event.target.value)
                                }
                              >
                                <option value="TODO">Todo</option>
                                <option value="IN_PROGRESS">In progress</option>
                                <option value="DONE">Done</option>
                              </select>
                              <button
                                className="details-button"
                                type="button"
                                onClick={() => toggleIssueDetails(issue._id)}
                              >
                                {expandedIssueId === issue._id
                                  ? "Hide details"
                                  : "Comments & activity"}
                              </button>
                              {expandedIssueId === issue._id && (
                                <div className="issue-details">
                                  <h5>Comments</h5>
                                  {issueDetails[issue._id]?.comments?.length ? (
                                    issueDetails[issue._id].comments.map((comment) => (
                                      <p className="comment" key={comment._id}>
                                        <strong>{comment.author?.name}</strong>{" "}
                                        {comment.text}
                                      </p>
                                    ))
                                  ) : (
                                    <p className="muted-text">No comments yet.</p>
                                  )}
                                  <form
                                    className="comment-form"
                                    onSubmit={(event) =>
                                      submitComment(event, issue._id)
                                    }
                                  >
                                    <input
                                      value={commentDraft}
                                      onChange={(event) =>
                                        setCommentDraft(event.target.value)
                                      }
                                      placeholder="Add a comment"
                                    />
                                    <button className="primary-button" type="submit">
                                      Comment
                                    </button>
                                  </form>
                                  <h5>Activity</h5>
                                  {issueDetails[issue._id]?.activity?.map((item) => (
                                    <p className="activity-item" key={item._id}>
                                      {item.type.replaceAll("_", " ").toLowerCase()}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </article>
                          ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          )}
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
