// --- Firebase Auth Config ---
const firebaseConfig = {
  apiKey: "AIzaSyAjJQiWBxB4SB9YZpPbzmWAik_urKqAR64",
  authDomain: "link-repo-f0c5e.firebaseapp.com",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// --- Supabase Config ---
const SUPABASE_URL = "https://rqcguhfedkdgywlqoqyc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxY2d1aGZlZGtkZ3l3bHFvcXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjM1MDMsImV4cCI6MjA2OTkzOTUwM30.aACFNccWBisOoJ7Zz55QYBTGqN7MHiqIvqIar-sL7WY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- UI Elements ---
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");
const authBox = document.getElementById("authBox");
const userMenu = document.getElementById("userMenu");
const userEmailSpan = document.getElementById("userEmail");
const linkForm = document.getElementById("linkForm");
const linksDiv = document.getElementById("links");
const searchSortBox = document.getElementById("searchSortBox");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

// Google button
const googleBtn = document.getElementById("googleBtn");

// Modals
const deleteModal = document.getElementById("deleteModal");
const deleteMessage = document.getElementById("deleteMessage");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

const addLinkBtn = document.getElementById("addLinkBtn");
const linkModal = document.getElementById("linkModal");
const cancelLinkBtn = document.getElementById("cancelLinkBtn");
const modalTitle = document.getElementById("modalTitle");
const saveBtn = document.getElementById("saveBtn");

let pendingDeleteId = null;
let editLinkId = null;
let allLinks = [];

// --- Auth Handlers (Email/Password) ---
signupBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth
    .createUserWithEmailAndPassword(email, password)
    .then(() => (authStatus.textContent = "Signed up successfully!"))
    .catch((e) => (authStatus.textContent = e.message));
};

loginBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => (authStatus.textContent = "Logged in!"))
    .catch((e) => (authStatus.textContent = e.message));
};

logoutBtn.onclick = () => auth.signOut();

// --- Google Login ---
googleBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth
    .signInWithPopup(provider)
    .then(() => (authStatus.textContent = "Logged in with Google!"))
    .catch((e) => (authStatus.textContent = e.message));
};

// --- Auth State Change ---
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("Logged in user UID:", user.uid);
    authBox.style.display = "none";
    userMenu.style.display = "flex";
    userEmailSpan.textContent = user.email;
    searchSortBox.style.display = "flex";
    loadUserLinks(user);
  } else {
    authBox.style.display = "flex";
    userMenu.style.display = "none";
    searchSortBox.style.display = "none";
    linksDiv.innerHTML = "";
    authStatus.textContent = "";
  }
});

// --- Modal Handlers ---
addLinkBtn.addEventListener("click", () => {
  editLinkId = null;
  linkForm.reset();
  modalTitle.textContent = "Add Link";
  saveBtn.textContent = "Add";
  linkModal.style.display = "flex";
});

cancelLinkBtn.addEventListener("click", () => {
  linkModal.style.display = "none";
});

// Close modals when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === linkModal) linkModal.style.display = "none";
  if (e.target === deleteModal) deleteModal.style.display = "none";
});

// --- Supabase CRUD ---
async function loadUserLinks(user, sortAlphabetically = false) {
  const { data, error } = await supabaseClient
    .from("links")
    .select("*")
    .eq("user_id", user.uid)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load links error:", error);
    authStatus.textContent = `Error: ${error.message}`;
    return;
  }

  allLinks = data || [];

  if (sortAlphabetically) {
    allLinks.sort((a, b) => a.title.localeCompare(b.title));
  }

  renderLinks(allLinks);
}

async function saveLink({ id, title, url, tags }) {
  const user = auth.currentUser;
  if (!user) return alert("Login first!");

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

  if (res.error) {
    console.error("Save link error:", res.error);
    alert("Save failed: " + res.error.message);
  } else {
    loadUserLinks(user);
  }
}

async function deleteLink(id) {
  const user = auth.currentUser;
  if (!user) return;

  const { error } = await supabaseClient
    .from("links")
    .delete()
    .eq("id", id)
    .eq("user_id", user.uid);

  if (error) {
    console.error("Delete link error:", error);
    alert("Delete failed: " + error.message);
  } else {
    // Automatically sort A to Z after deletion
    loadUserLinks(user, true);
  }
}

// --- Search & Sort ---
function applyFilters() {
  const q = searchInput.value.toLowerCase();
  let filtered = allLinks.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      (l.tags || "").toLowerCase().includes(q)
  );

  const sortValue = sortSelect.value;
  if (sortValue === "title-asc") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortValue === "title-desc") {
    filtered.sort((a, b) => b.title.localeCompare(a.title));
  } else if (sortValue === "tags") {
    filtered.sort((a, b) => (a.tags || "").localeCompare(b.tags || ""));
  }

  renderLinks(filtered);
}

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

// --- Render Links as Table ---
function renderLinks(links) {
  linksDiv.innerHTML = "";
  if (!links.length) {
    linksDiv.textContent = "No links saved yet.";
    return;
  }

  const table = document.createElement("table");
  table.className = "links-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Name</th>
      <th>URL</th>
      <th>Tags</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  links.forEach((link) => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = link.title;
    titleCell.setAttribute("data-label", "Link");
    row.appendChild(titleCell);

    const urlCell = document.createElement("td");
    urlCell.setAttribute("data-label", "URL");
    const a = document.createElement("a");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.url;
    urlCell.appendChild(a);
    row.appendChild(urlCell);

    const tagsCell = document.createElement("td");
    tagsCell.textContent = link.tags || "";
    tagsCell.setAttribute("data-label", "Tags");
    row.appendChild(tagsCell);

    const actionsCell = document.createElement("td");
    actionsCell.setAttribute("data-label", "Actions");

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => populateForm(link);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      pendingDeleteId = link.id;
      deleteMessage.textContent = `Are you sure you want to delete "${link.title}"?`;
      deleteModal.style.display = "flex";
    };

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(delBtn);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  linksDiv.appendChild(table);
}

// --- Global Delete Confirm/Cancel ---
confirmDeleteBtn.onclick = () => {
  if (pendingDeleteId) {
    deleteLink(pendingDeleteId);
    pendingDeleteId = null;
  }
  deleteModal.style.display = "none";
};

cancelDeleteBtn.onclick = () => {
  pendingDeleteId = null;
  deleteModal.style.display = "none";
};

// --- Edit / Add Modal Fill ---
function populateForm(link) {
  document.getElementById("title").value = link.title;
  document.getElementById("url").value = link.url;
  document.getElementById("tags").value = link.tags || "";
  editLinkId = link.id;
  modalTitle.textContent = "Edit Link";
  saveBtn.textContent = "Update";
  linkModal.style.display = "flex";
}

// --- Form Submit ---
linkForm.onsubmit = (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const url = document.getElementById("url").value.trim();
  const tags = document.getElementById("tags").value.trim();
  if (!title || !url) return alert("Fill title and url.");
  saveLink({ id: editLinkId, title, url, tags });
  editLinkId = null;
  linkForm.reset();
  linkModal.style.display = "none";
};
