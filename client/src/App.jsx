import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getHealth,
  getProjects,
  loginUser,
  logoutUser,
  registerUser,
  createProject,
  updateProject,
  deleteProject,
  createIssue,
  addIssueComment,
  getIssueActivity,
  getIssueComments,
  getProjectDashboard,
  getProjectIssues,
  getUsers,
  addProjectMember,
  removeProjectMember,
  updateIssueStatus,
  updateIssuePriority,
  updateIssueAssignee as updateIssueAssigneeRequest,
  deleteIssue
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
  const [editingProject, setEditingProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [issueError, setIssueError] = useState("");
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [memberError, setMemberError] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assignee: ""
  });
  const [issueFilters, setIssueFilters] = useState({
    search: "",
    status: "",
    priority: "",
    label: ""
  });
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [issueDetails, setIssueDetails] = useState({});
  const [commentDraft, setCommentDraft] = useState("");

  function getOwnerId(project) {
    return project?.owner?._id || project?.owner;
  }

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
    if (!user?.token) {
      return;
    }

    getUsers(user.token)
      .then((result) => setUsers(result.data.users))
      .catch((error) => setMemberError(error.message));
  }, [user]);

  useEffect(() => {
    if (!user?.token || !selectedProject) {
      return;
    }

    setIsLoadingIssues(true);
    setIssueError("");
    Promise.all([
      getProjectIssues(user.token, selectedProject._id, issueFilters),
      getProjectDashboard(user.token, selectedProject._id)
    ])
      .then(([issuesResult, dashboardResult]) => {
        setIssues(issuesResult.data.issues);
        setDashboard(dashboardResult.data);
      })
      .catch((error) => setIssueError(error.message))
      .finally(() => setIsLoadingIssues(false));
  }, [user, selectedProject, issueFilters]);

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
    setDashboard(null);
    setSelectedMemberId("");
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

    function startProjectEdit() {
      setNewProject({
        name: selectedProject.name,
        description: selectedProject.description || ""
      });
      setEditingProject(true);
      setProjectError("");
    }

    function cancelProjectEdit() {
      setEditingProject(false);
      setNewProject({ name: "", description: "" });
      setProjectError("");
    }

    async function saveProject(event) {
      event.preventDefault();
      setProjectError("");

      try {
        const result = await updateProject(
          user.token,
          selectedProject._id,
          newProject
        );
        const updatedProject = {
          ...selectedProject,
          ...result.data.project
        };
        setProjects((currentProjects) =>
          currentProjects.map((project) =>
            project._id === updatedProject._id ? updatedProject : project
          )
        );
        setSelectedProject(updatedProject);
        cancelProjectEdit();
      } catch (error) {
        setProjectError(error.message);
      }
    }

    async function removeProject() {
      if (!window.confirm("Delete this project and its access?")) {
        return;
      }

      try {
        await deleteProject(user.token, selectedProject._id);
        setProjects((currentProjects) =>
          currentProjects.filter((project) => project._id !== selectedProject._id)
        );
        setSelectedProject(null);
        setIssues([]);
        setDashboard(null);
      } catch (error) {
        setProjectError(error.message);
      }
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
      setNewIssue({
        title: "",
        description: "",
        priority: "MEDIUM",
        assignee: ""
      });
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

  async function changePriority(issueId, priority) {
    try {
      const result = await updateIssuePriority(user.token, issueId, priority);
      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          issue._id === issueId ? result.data.issue : issue
        )
      );
    } catch (error) {
      setIssueError(error.message);
    }

    async function updateIssueAssignee(issueId, assignee) {
      try {
        const result = await updateIssueAssigneeRequest(
          user.token,
          issueId,
          assignee
        );
        setIssues((currentIssues) =>
          currentIssues.map((issue) =>
            issue._id === issueId ? result.data.issue : issue
          )
        );
      } catch (error) {
        setIssueError(error.message);
      }
    }
  }

  async function removeIssue(issueId) {
    if (!window.confirm("Delete this issue?")) {
      return;
    }

    try {
      await deleteIssue(user.token, issueId);
      setIssues((currentIssues) =>
        currentIssues.filter((issue) => issue._id !== issueId)
      );
    } catch (error) {
      setIssueError(error.message);
    }
  }

  function updateIssueFilter(event) {
    setIssueFilters((currentFilters) => ({
      ...currentFilters,
      [event.target.name]: event.target.value
    }));
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

  async function addMember() {
    if (!selectedProject || !selectedMemberId) {
      return;
    }

    setMemberError("");

    try {
      const result = await addProjectMember(
        user.token,
        selectedProject._id,
        selectedMemberId
      );
      const updatedProject = result.data.project;
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project._id === updatedProject._id ? updatedProject : project
        )
      );
      setSelectedProject(updatedProject);
      setSelectedMemberId("");
    } catch (error) {
      setMemberError(error.message);
    }
  }

  async function removeMember(userId) {
    if (!selectedProject) {
      return;
    }

    setMemberError("");

    try {
      const result = await removeProjectMember(
        user.token,
        selectedProject._id,
        userId
      );
      const updatedProject = result.data.project;
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project._id === updatedProject._id ? updatedProject : project
        )
      );
      setSelectedProject(updatedProject);
    } catch (error) {
      setMemberError(error.message);
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
            <form
              className="project-form"
              onSubmit={editingProject ? saveProject : submitProject}
            >
              <h2>{editingProject ? "Edit project" : "New project"}</h2>
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
                {editingProject ? "Save changes" : "Create project"}
              </button>
              {editingProject && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={cancelProjectEdit}
                >
                  Cancel
                </button>
              )}
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
                <div className="project-actions">
                  {selectedProject.owner?._id === user.id && (
                    <>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={startProjectEdit}
                      >
                        Edit project
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={removeProject}
                      >
                        Delete project
                      </button>
                    </>
                  )}
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setSelectedProject(null)}
                  >
                    Close
                  </button>
                </div>
              </header>
              {dashboard && (
                <div className="dashboard-stats">
                  <div className="stat-card">
                    <span>Total issues</span>
                    <strong>{dashboard.totalIssues}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Completed</span>
                    <strong>{dashboard.completedIssues}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Completion rate</span>
                    <strong>{dashboard.completionRate}%</strong>
                  </div>
                  <div className="stat-card">
                    <span>Overdue</span>
                    <strong>{dashboard.overdueIssues}</strong>
                  </div>
                </div>
              )}
              <section className="members-panel">
                <div className="section-heading">
                  <h3>Project members</h3>
                  <span>{selectedProject.members?.length || 0}</span>
                </div>
                <div className="member-controls">
                  <select
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                  >
                    <option value="">Select a user</option>
                    {users
                      .filter(
                        (candidate) =>
                          !selectedProject.members?.some(
                            (member) => member._id === candidate._id
                          )
                      )
                      .map((candidate) => (
                        <option value={candidate._id} key={candidate._id}>
                          {candidate.name} ({candidate.email})
                        </option>
                      ))}
                  </select>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={addMember}
                    disabled={!selectedMemberId}
                  >
                    Add member
                  </button>
                </div>
                {memberError && <p className="form-error">{memberError}</p>}
                <div className="member-list">
                  {selectedProject.members?.map((member) => (
                    <div className="member-row" key={member._id}>
                      <span>
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </span>
                      {member._id !== getOwnerId(selectedProject) && (
                        <button
                          className="remove-button"
                          type="button"
                          onClick={() => removeMember(member._id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
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
                <select
                  name="assignee"
                  value={newIssue.assignee}
                  onChange={updateIssueField}
                >
                  <option value="">Unassigned</option>
                  {selectedProject.members?.map((member) => (
                    <option value={member._id} key={member._id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button className="primary-button" type="submit">
                  Add issue
                </button>
              </form>
              <div className="issue-filters">
                <input
                  name="search"
                  placeholder="Search title or description"
                  value={issueFilters.search}
                  onChange={updateIssueFilter}
                />
                <select
                  name="status"
                  value={issueFilters.status}
                  onChange={updateIssueFilter}
                >
                  <option value="">All statuses</option>
                  <option value="TODO">Todo</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="DONE">Done</option>
                </select>
                <select
                  name="priority"
                  value={issueFilters.priority}
                  onChange={updateIssueFilter}
                >
                  <option value="">All priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <input
                  name="label"
                  placeholder="Label"
                  value={issueFilters.label}
                  onChange={updateIssueFilter}
                />
              </div>
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
                              <select
                                value={issue.priority}
                                onChange={(event) =>
                                  changePriority(issue._id, event.target.value)
                                }
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </select>
                              <select
                                value={issue.assignee?._id || issue.assignee || ""}
                                onChange={(event) =>
                                  updateIssueAssignee(issue._id, event.target.value)
                                }
                              >
                                <option value="">Unassigned</option>
                                {selectedProject.members?.map((member) => (
                                  <option value={member._id} key={member._id}>
                                    Assign to {member.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="remove-button issue-delete"
                                type="button"
                                onClick={() => removeIssue(issue._id)}
                              >
                                Delete issue
                              </button>
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
