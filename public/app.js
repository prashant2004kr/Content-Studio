const $ = (id) => document.getElementById(id);
let token = localStorage.getItem("cmsToken") || "";
let currentUser = null;
let authMode = "login";
let currentItems = [];

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
}
function notify(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  setTimeout(() => $("toast").classList.add("hidden"), 3000);
}
function setAuthMode(mode) {
  authMode = mode;
  $("loginTab").classList.toggle("active", mode === "login");
  $("registerTab").classList.toggle("active", mode === "register");
  $("nameWrap").classList.toggle("hidden", mode !== "register");
  $("authSubmit").textContent = mode === "login" ? "Log in" : "Create account";
  $("passwordInput").autocomplete = mode === "login" ? "current-password" : "new-password";
  $("authMessage").textContent = "";
}
$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("registerTab").addEventListener("click", () => setAuthMode("register"));

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("authMessage").textContent = "Please wait…";
  const payload = { email: $("emailInput").value, password: $("passwordInput").value };
  if (authMode === "register") payload.name = $("nameInput").value;
  try {
    const data = await api(`/api/auth/${authMode === "login" ? "login" : "register"}`, { method: "POST", body: JSON.stringify(payload) });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem("cmsToken", token);
    showSignedIn();
    await loadWorkspace();
    notify(`Welcome, ${currentUser.name}`);
  } catch (err) { $("authMessage").textContent = err.message; }
});

function showSignedIn() {
  $("authPanel").classList.add("hidden");
  $("workspace").classList.remove("hidden");
  $("publicLibrary").classList.add("hidden");
  $("userLabel").textContent = `${currentUser.name} · ${currentUser.role}`;
  $("logoutBtn").classList.remove("hidden");
  $("heroCount").textContent = "Your content, organized";
}
function showSignedOut() {
  currentUser = null;
  token = "";

  localStorage.removeItem("cmsToken");

  $("authPanel").classList.remove("hidden");
  $("workspace").classList.add("hidden");
  $("publicLibrary").classList.remove("hidden");

  $("userLabel").textContent = "Not signed in";
  $("logoutBtn").classList.add("hidden");

  loadPublicContent();
}
$("logoutBtn").addEventListener("click", showSignedOut);
$("brandLink")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (currentUser) { showEditorMode(false); loadWorkspace(); }
  else { loadPublicContent(); }
});
$("showLibrary").addEventListener("click", () => {
  if (currentUser) { showEditorMode(false); loadWorkspace(); }
  else { $("publicLibrary").scrollIntoView({ behavior: "smooth" }); loadPublicContent(); }
});
$("showEditor").addEventListener("click", () => {
  if (!currentUser) { $("authPanel").scrollIntoView({ behavior: "smooth" }); notify("Log in or create an account to write."); return; }
  resetEditor(); showEditorMode(true);
});
$("newContentBtn").addEventListener("click", () => { resetEditor(); showEditorMode(true); });
$("cancelEditBtn").addEventListener("click", () => showEditorMode(false));
$("addCategoryBtn").addEventListener("click", async () => {
  const name = prompt("Enter category name:");

  if (!name || !name.trim()) return;

  try {
    await api("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim()
      })
    });

    await loadCategories();

    const option = [...$("categoryInput").options].find(
      o => o.textContent.toLowerCase() === name.trim().toLowerCase()
    );

    if (option) {
      $("categoryInput").value = option.value;
    }

    notify("Category created successfully.");
  } catch (error) {
    notify(error.message);
  }
});
$("searchBtn").addEventListener("click", loadWorkspace);
$("searchInput").addEventListener("keydown", e => { if (e.key === "Enter") loadWorkspace(); });
$("statusFilter").addEventListener("change", loadWorkspace);
$("publicSearchBtn").addEventListener("click", loadPublicContent);
$("publicSearchInput").addEventListener("keydown", e => { if (e.key === "Enter") loadPublicContent(); });

function showEditorMode(isEditor) {
  $("libraryView").classList.toggle("hidden", isEditor);
  $("editorView").classList.toggle("hidden", !isEditor);
  $("sectionTitle").textContent = isEditor ? ($("contentId").value ? "Edit content" : "Create content") : "Content library";
}
function resetEditor() {
  $("contentForm").reset(); $("contentId").value = ""; $("editorMessage").textContent = "";
  showEditorMode(true);
}
async function loadCategories() {
  const data = await api("/api/categories");
  $("categoryInput").innerHTML = '<option value="">No category</option>' + data.categories.map(c => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join("");
}
function cardMarkup(item, editable) {
  const categoryName = item.category?.name || "Uncategorized";
  const tags = (item.tags || []).slice(0, 4).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join("");
  const excerpt = item.excerpt || (item.body || "").slice(0, 125);
  const actions = editable ? `<div class="card-actions"><button data-action="edit" data-id="${item._id}">Edit</button><button data-action="revisions" data-id="${item._id}">History</button><button class="delete" data-action="delete" data-id="${item._id}">Delete</button></div>` : "";
  return `<article class="content-card"><div class="card-top"><span class="pill ${item.status === "draft" ? "draft" : ""}">${escapeHtml(item.status || "published")}</span><span class="card-date">${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ""}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(excerpt)}</p><div class="tags"><span class="tag">${escapeHtml(categoryName)}</span>${tags}</div>${actions}</article>`;
}
async function loadWorkspace() {
  try {
    await loadCategories();
    const status = $("statusFilter").value;
    let url = `/api/content?q=${encodeURIComponent($("searchInput").value)}&limit=30`;
    if (status === "draft") url += "&status=draft";
    else if (status === "mine") url += "&mine=true&status=published";
    const data = await api(url);
    currentItems = data.items;
    $("contentGrid").innerHTML = data.items.map(item => cardMarkup(item, true)).join("");
    $("emptyState").classList.toggle("hidden", data.items.length !== 0);
    $("heroCount").textContent = `${data.total} item${data.total === 1 ? "" : "s"} in your library`;
  } catch (err) { notify(err.message); }
}
async function loadPublicContent() {
  try {
    const q = $("publicSearchInput").value || "";
    const data = await api(`/api/content?q=${encodeURIComponent(q)}&limit=30`);
    $("publicGrid").innerHTML = data.items.map(item => cardMarkup(item, false)).join("");
  } catch (err) { console.error(err); }
}
$("contentGrid").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = currentItems.find(x => x._id === button.dataset.id);
  if (!item) return;
  try {
    if (button.dataset.action === "edit") {
      const data = await api(`/api/content/${item._id}`);
      const c = data.item;
      $("contentId").value = c._id; $("titleInput").value = c.title; $("excerptInput").value = c.excerpt || "";
      $("bodyInput").value = c.body; $("tagsInput").value = (c.tags || []).join(", ");
      $("categoryInput").value = c.category?._id || "";
      showEditorMode(true);
    } else if (button.dataset.action === "delete") {
      if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
      await api(`/api/content/${item._id}`, { method: "DELETE" }); notify("Content deleted."); loadWorkspace();
    } else if (button.dataset.action === "revisions") {
      const data = await api(`/api/content/${item._id}/revisions`);
      if (!data.revisions.length) return notify("No earlier revisions yet.");
      const latest = data.revisions[data.revisions.length - 1];
      if (confirm(`Latest saved revision from ${new Date(latest.savedAt).toLocaleString()}:\n\n${latest.title}\n\nRestore this revision?`)) {
        await api(`/api/content/${item._id}`, { method: "PUT", body: JSON.stringify({ title: latest.title, body: latest.body }) });
        notify("Revision restored as a new version."); loadWorkspace();
      }
    }
  } catch (err) { notify(err.message); }
});
$("contentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  const status = submitter?.dataset.status || "draft";
  const payload = {
    title: $("titleInput").value, excerpt: $("excerptInput").value, body: $("bodyInput").value,
    category: $("categoryInput").value || null,
    tags: $("tagsInput").value.split(",").map(t => t.trim()).filter(Boolean), status
  };
  try {
    const id = $("contentId").value;
    await api(id ? `/api/content/${id}` : "/api/content", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    notify(status === "published" ? "Content published." : "Draft saved.");
    showEditorMode(false); await loadWorkspace();
  } catch (err) { $("editorMessage").textContent = err.message; }
});

async function init() {
  if (token) {
    try {
      const data = await api("/api/auth/me"); currentUser = data.user; showSignedIn(); await loadWorkspace(); return;
    } catch (_err) { localStorage.removeItem("cmsToken"); token = ""; }
  }
  showSignedOut();
}
init();
