// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyAjJQiWBxB4SB9YZpPbzmWAik_urKqAR64",
  authDomain: "link-repo-f0c5e.firebaseapp.com",
  projectId: "link-repo-f0c5e",
  storageBucket: "link-repo-f0c5e.firebasestorage.app",
  messagingSenderId: "315525659358",
  appId: "1:315525659358:web:1b6f3ed60f0fd6fb88204f",
  measurementId: "G-TVM2MGQE2Y"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ================= SUPABASE CONFIG =================
const SUPABASE_URL = "https://rqcguhfedkdgywlqoqyc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxY2d1aGZlZGtkZ3l3bHFvcXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjM1MDMsImV4cCI6MjA2OTkzOTUwM30.aACFNccWBisOoJ7Zz55QYBTGqN7MHiqIvqIar-sL7WY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= UI ELEMENTS =================
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authBox = document.getElementById("authBox");
const userMenu = document.getElementById("userMenu");
const userEmailSpan = document.getElementById("userEmail");
const linkForm = document.getElementById("linkForm");
const linksDiv = document.getElementById("links");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const addLinkBtn = document.getElementById("addLinkBtn");
const linkModal = document.getElementById("linkModal");
const modalTitle = document.getElementById("modalTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelLinkBtn = document.getElementById("cancelLinkBtn");
const googleBtn = document.getElementById("googleBtn");

// Delete modal
const deleteModal = document.getElementById("deleteModal");
const deleteMessage = document.getElementById("deleteMessage");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

let pendingDeleteId = null;
let editLinkId = null;
let allLinks = [];

// ================= FEEDBACK SYSTEM =================
const feedbackBox = document.createElement("div");
feedbackBox.id = "feedbackBox";
Object.assign(feedbackBox.style, {
  position: "fixed",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "10px 20px",
  borderRadius: "6px",
  color: "#fff",
  fontWeight: "bold",
  display: "none",
  zIndex: 1000
});
document.body.appendChild(feedbackBox);

const showFeedback = (message, type = "success") => {
  feedbackBox.textContent = message;
  feedbackBox.style.backgroundColor = type === "error" ? "#e74c3c" : "#27ae60";
  feedbackBox.style.display = "block";
  setTimeout(() => feedbackBox.style.display = "none", 3000);
};

// ================= AUTH HANDLERS =================
signupBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth.createUserWithEmailAndPassword(email, password)
      .then(() => showFeedback("Signed up successfully!"))
      .catch(e => showFeedback(e.message, "error"));
};

loginBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth.signInWithEmailAndPassword(email, password)
      .then(() => showFeedback("Logged in!"))
      .catch(e => showFeedback(e.message, "error"));
};

logoutBtn.onclick = () => {
  auth.signOut();
  showFeedback("Logged out!");
};

// Google Login
googleBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
      .then(() => showFeedback("Logged in with Google!"))
      .catch(e => showFeedback(e.message, "error"));
};

// ================= AUTH STATE CHANGE =================
auth.onAuthStateChanged(user => {
  document.getElementById("loadingScreen").style.display = "none";

  if (user) {
    authBox.style.display = "none";
    userMenu.style.display = "flex";
    userEmailSpan.textContent = user.email;
    document.getElementById("searchSortBox").style.display = "flex";
    document.getElementById("siteTitle").style.display = "block";
    addLinkBtn.style.display = "block";
    loadUserLinks(user);
  } else {
    authBox.style.display = "flex";
    userMenu.style.display = "none";
    document.getElementById("searchSortBox").style.display = "none";
    linksDiv.innerHTML = "";
    document.getElementById("siteTitle").style.display = "none";
    addLinkBtn.style.display = "none";
  }
});

// ================= MODAL HANDLERS =================
addLinkBtn.onclick = () => openLinkModal();
cancelLinkBtn.onclick = () => closeLinkModal();

window.addEventListener("click", e => {
  if (e.target === linkModal) closeLinkModal();
  if (e.target === deleteModal) deleteModal.style.display = "none";
});

const openLinkModal = (link = null) => {
  editLinkId = link ? link.id : null;
  linkForm.reset();
  modalTitle.textContent = link ? "Edit Link" : "Add Link";
  saveBtn.textContent = link ? "Update" : "Add";
  if (link) {
    document.getElementById("title").value = link.title;
    document.getElementById("url").value = link.url;
    document.getElementById("tags").value = link.tags || "";
  }
  linkModal.style.display = "flex";
};

const closeLinkModal = () => {
  linkModal.style.display = "none";
  editLinkId = null;
  linkForm.reset();
};

// ================= SUPABASE CRUD =================
const loadUserLinks = async (user, sortAlphabetically = false) => {
  const { data, error } = await supabaseClient
    .from("links")
    .select("*")
    .eq("user_id", user.uid)
    .order("created_at", { ascending: false });

  if (error) return showFeedback(`Error: ${error.message}`, "error");

  allLinks = data || [];
  if (sortAlphabetically) allLinks.sort((a, b) => a.title.localeCompare(b.title));
  renderLinks(allLinks);
};

const saveLink = async ({ id, title, url, tags }) => {
  const user = auth.currentUser;
  if (!user) return showFeedback("Login first!", "error");

  let res;
  if (id) {
    res = await supabaseClient
      .from("links")
      .update({ title, url, tags })
      .eq("id", id)
      .eq("user_id", user.uid)
      .select();
  } else {
    res = await supabaseClient
      .from("links")
      .insert([{ user_id: user.uid, title, url, tags }])
      .select();
  }

  if (res.error) return showFeedback("Save failed: " + res.error.message, "error");

  loadUserLinks(user);
  showFeedback(id ? "Link updated!" : "Link added!");
};

const deleteLink = async id => {
  const user = auth.currentUser;
  if (!user) return;
  const { error } = await supabaseClient
    .from("links")
    .delete()
    .eq("id", id)
    .eq("user_id", user.uid);

  if (error) return showFeedback("Delete failed: " + error.message, "error");

  loadUserLinks(user, true);
  showFeedback("Link deleted!");
};

// ================= SEARCH & SORT =================
const applyFilters = () => {
  const q = searchInput.value.toLowerCase();
  let filtered = allLinks.filter(l =>
    l.title.toLowerCase().includes(q) ||
    (l.tags || "").toLowerCase().includes(q)
  );

  const sortValue = sortSelect.value;
  if (sortValue === "title-asc") filtered.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortValue === "title-desc") filtered.sort((a, b) => b.title.localeCompare(a.title));
  else if (sortValue === "tags") filtered.sort((a, b) => (a.tags || "").localeCompare(b.tags || ""));

  renderLinks(filtered);
};

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

// ================= RENDER LINKS =================
const renderLinks = links => {
  linksDiv.innerHTML = "";
  if (!links.length) return linksDiv.textContent = "No links saved yet.";

  const table = document.createElement("table");
  table.className = "links-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Name</th>
      <th>URL</th>
      <th>Tags</th>
      <th>Actions</th>
    </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  links.forEach(link => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = link.title;
    row.appendChild(titleCell);

    const urlCell = document.createElement("td");
    const a = document.createElement("a");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.url;
    urlCell.appendChild(a);
    row.appendChild(urlCell);

    const tagsCell = document.createElement("td");
    tagsCell.textContent = link.tags || "";
    row.appendChild(tagsCell);

    const actionsCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openLinkModal(link);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      pendingDeleteId = link.id;
      deleteMessage.textContent = `Are you sure you want to delete "${link.title}"?`;
      deleteModal.style.display = "flex";
    };

    actionsCell.append(editBtn, delBtn);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  linksDiv.appendChild(table);
};

// ================= DELETE CONFIRM/CANCEL =================
confirmDeleteBtn.onclick = () => {
  if (pendingDeleteId) deleteLink(pendingDeleteId);
  pendingDeleteId = null;
  deleteModal.style.display = "none";
};

cancelDeleteBtn.onclick = () => {
  pendingDeleteId = null;
  deleteModal.style.display = "none";
};

// ================= FORM SUBMIT =================
linkForm.onsubmit = e => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const url = document.getElementById("url").value.trim();
  const tags = document.getElementById("tags").value.trim();

  if (!title || !url) return showFeedback("Fill title and URL.", "error");

  saveLink({ id: editLinkId, title, url, tags });
  closeLinkModal();
};
