// --- Firebase Auth Config ---
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

// --- Supabase Config ---
const SUPABASE_URL = "https://rqcguhfedkdgywlqoqyc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxY2d1aGZlZGtkZ3l3bHFvcXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjM1MDMsImV4cCI6MjA2OTkzOTUwM30.aACFNccWBisOoJ7Zz55QYBTGqN7MHiqIvqIar-sL7WY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- UI Elements ---
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authBox = document.getElementById("authBox");
const userMenu = document.getElementById("userMenu");
const userEmailSpan = document.getElementById("userEmail");
const linkForm = document.getElementById("linkForm");
const linksDiv = document.getElementById("links");
const searchSortBox = document.getElementById("searchSortBox");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const viewSelect = document.getElementById("viewSelect"); // NEW (list / category)

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

// --- Feedback System ---
function showFeedback(message, type = "success") {
  let box = document.getElementById("feedbackBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "feedbackBox";
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.style.backgroundColor = type === "error" ? "#e74c3c" : "#27ae60";
  box.style.display = "block";
  setTimeout(() => (box.style.display = "none"), 3000);
}

// --- Auth Handlers ---
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

// --- Auth State Change ---
auth.onAuthStateChanged(user => {
  if (user) {
    authBox.style.display = "none";
    userMenu.style.display = "flex";
    userEmailSpan.textContent = user.email;
    searchSortBox.style.display = "flex";
    addLinkBtn.style.display = "block";
    loadUserLinks(user);
  } else {
    authBox.style.display = "flex";
    userMenu.style.display = "none";
    searchSortBox.style.display = "none";
    linksDiv.innerHTML = "";
    addLinkBtn.style.display = "none";
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
window.addEventListener("click", e => {
  if (e.target === linkModal) linkModal.style.display = "none";
  if (e.target === deleteModal) deleteModal.style.display = "none";
});

// --- Supabase CRUD ---
async function loadUserLinks(user) {
  const { data, error } = await supabaseClient
    .from("links")
    .select("*")
    .eq("user_id", user.uid)
    .order("created_at", { ascending: false });

  if (error) return showFeedback("Error: " + error.message, "error");
  allLinks = data || [];
  applyFilters();
}

async function saveLink({ id, title, url, tags }) {
  const user = auth.currentUser;
  if (!user) return showFeedback("Login first!", "error");

  let res;
  if (id) {
    res = await supabaseClient
      .from("links")
      .update({ title, url, tags })
      .eq("id", id).eq("user_id", user.uid).select();
  } else {
    res = await supabaseClient
      .from("links")
      .insert([{ user_id: user.uid, title, url, tags }]).select();
  }

  if (res.error) showFeedback("Save failed: " + res.error.message, "error");
  else {
    loadUserLinks(user);
    showFeedback(id ? "Link updated!" : "Link added!");
  }
}

async function deleteLink(id) {
  const user = auth.currentUser;
  if (!user) return;
  const { error } = await supabaseClient
    .from("links")
    .delete()
    .eq("id", id).eq("user_id", user.uid);

  if (error) showFeedback("Delete failed: " + error.message, "error");
  else {
    loadUserLinks(user);
    showFeedback("Link deleted!");
  }
}

// --- Search, Sort & View ---
function applyFilters() {
  const q = searchInput.value.toLowerCase();
  let filtered = allLinks.filter(
    l =>
      l.title.toLowerCase().includes(q) ||
      (l.tags || "").toLowerCase().includes(q)
  );

  const sortValue = sortSelect.value;
  if (sortValue === "title-asc") filtered.sort((a, b) => a.title.localeCompare(b.title));
  if (sortValue === "title-desc") filtered.sort((a, b) => b.title.localeCompare(a.title));
  if (sortValue === "tags") filtered.sort((a, b) => (a.tags || "").localeCompare(b.tags || ""));

  if (viewSelect.value === "list") renderLinksList(filtered);
  else renderLinksByCategory(filtered);
}

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);
viewSelect.addEventListener("change", applyFilters);

// --- Render Functions ---
function renderLinksList(links) {
  linksDiv.innerHTML = "";
  if (!links.length) return (linksDiv.textContent = "No links saved yet.");

  const table = document.createElement("table");
  table.className = "links-table";
  table.innerHTML = `
    <thead>
      <tr><th>Name</th><th>URL</th><th>Tags</th><th>Actions</th></tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");

  links.forEach(link => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Name">${link.title}</td>
      <td data-label="URL"><a href="${link.url}" target="_blank">${link.url}</a></td>
      <td data-label="Tags">${link.tags || ""}</td>
      <td data-label="Actions"></td>
    `;
    const actionsCell = row.querySelector("td:last-child");
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.onclick = () => populateForm(link);
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      pendingDeleteId = link.id;
      deleteMessage.textContent = `Delete "${link.title}"?`;
      deleteModal.style.display = "flex";
    };
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(delBtn);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  linksDiv.appendChild(table);
}

function renderLinksByCategory(links) {
  linksDiv.innerHTML = "";
  if (!links.length) return (linksDiv.textContent = "No links saved yet.");

  const categories = {};
  links.forEach(l => {
    const tagList = (l.tags || "Uncategorized").split(",").map(t => t.trim());
    tagList.forEach(tag => {
      if (!categories[tag]) categories[tag] = [];
      categories[tag].push(l);
    });
  });

  Object.keys(categories).forEach(tag => {
    const section = document.createElement("div");
    section.className = "category-section";
    section.innerHTML = `<h3>${tag}</h3>`;
    const ul = document.createElement("ul");
    categories[tag].forEach(link => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="${link.url}" target="_blank">${link.title}</a>
        <button onclick="populateForm(${JSON.stringify(link)})">Edit</button>
        <button onclick="(pendingDeleteId='${link.id}',deleteMessage.textContent='Delete \"${link.title}\"?',deleteModal.style.display='flex')">Delete</button>
      `;
      ul.appendChild(li);
    });
    section.appendChild(ul);
    linksDiv.appendChild(section);
  });
}

// --- Delete Confirmation ---
confirmDeleteBtn.onclick = () => {
  if (pendingDeleteId) deleteLink(pendingDeleteId);
  pendingDeleteId = null;
  deleteModal.style.display = "none";
};
cancelDeleteBtn.onclick = () => (deleteModal.style.display = "none");

// --- Form Fill ---
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
linkForm.onsubmit = e => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const url = document.getElementById("url").value.trim();
  const tags = document.getElementById("tags").value.trim();
  if (!title || !url) return showFeedback("Fill title and URL.", "error");
  saveLink({ id: editLinkId, title, url, tags });
  editLinkId = null;
  linkForm.reset();
  linkModal.style.display = "none";
};
