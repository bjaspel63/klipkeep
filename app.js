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
const googleBtn = document.getElementById("googleBtn");

const addLinkBtn = document.getElementById("addLinkBtn");
const linkModal = document.getElementById("linkModal");
const cancelLinkBtn = document.getElementById("cancelLinkBtn");
const modalTitle = document.getElementById("modalTitle");
const saveBtn = document.getElementById("saveBtn");

const deleteModal = document.getElementById("deleteModal");
const deleteMessage = document.getElementById("deleteMessage");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

// Modals (Error + Success)
const errorModal = document.getElementById("errorModal");
const errorMessage = document.getElementById("errorMessage");
const closeErrorBtn = document.getElementById("closeErrorBtn");

const successModal = document.getElementById("successModal");
const successMessage = document.getElementById("successMessage");
const closeSuccessBtn = document.getElementById("closeSuccessBtn");

// Change Password Modal
const changePasswordBtn = document.getElementById("changePasswordBtn");
const changePasswordModal = document.getElementById("changePasswordModal");
const cancelChangePasswordBtn = document.getElementById("cancelChangePasswordBtn");
const submitChangePasswordBtn = document.getElementById("submitChangePasswordBtn");

// Forgot Password
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

let pendingDeleteId = null;
let editLinkId = null;
let allLinks = [];

// --- Modal Helpers ---
function showError(msg) {
  errorMessage.textContent = msg;
  errorModal.style.display = "flex";
}
function showSuccess(msg) {
  successMessage.textContent = msg;
  successModal.style.display = "flex";
}
closeErrorBtn.onclick = () => (errorModal.style.display = "none");
closeSuccessBtn.onclick = () => (successModal.style.display = "none");

// --- Auth Handlers ---
signupBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth
    .createUserWithEmailAndPassword(email, password)
    .then(() => showSuccess("Signed up successfully!"))
    .catch((e) => showError(e.message));
};

loginBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => showSuccess("Logged in!"))
    .catch((e) => showError(e.message));
};

logoutBtn.onclick = () => auth.signOut();

googleBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth
    .signInWithPopup(provider)
    .then(() => showSuccess("Logged in with Google!"))
    .catch((e) => showError(e.message));
};

// Forgot Password
forgotPasswordBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return showError("Enter your email first!");
  auth
    .sendPasswordResetEmail(email)
    .then(() => showSuccess("Password reset email sent!"))
    .catch((e) => showError(e.message));
};

// Change Password
changePasswordBtn.onclick = () => (changePasswordModal.style.display = "flex");
cancelChangePasswordBtn.onclick = () => (changePasswordModal.style.display = "none");
submitChangePasswordBtn.onclick = () => {
  const newPass = document.getElementById("newPassword").value.trim();
  const user = auth.currentUser;
  if (!newPass) return showError("Enter a new password.");
  if (!user) return showError("You must be logged in.");
  user
    .updatePassword(newPass)
    .then(() => {
      showSuccess("Password updated successfully!");
      changePasswordModal.style.display = "none";
    })
    .catch((e) => showError(e.message));
};

// --- Auth State ---
auth.onAuthStateChanged((user) => {
  loadingScreen.style.display = "none";
  if (user) {
    authBox.style.display = "none";
    userMenu.style.display = "flex";
    userEmailSpan.textContent = user.email;
    searchSortBox.style.display = "flex";
    siteTitle.style.display = "block";
    addLinkBtn.style.display = "block";
    loadUserLinks(user);
  } else {
    authBox.style.display = "flex";
    userMenu.style.display = "none";
    searchSortBox.style.display = "none";
    linksDiv.innerHTML = "";
    siteTitle.style.display = "none";
    addLinkBtn.style.display = "none";
  }
});

// --- Link Modal ---
addLinkBtn.onclick = () => {
  editLinkId = null;
  linkForm.reset();
  modalTitle.textContent = "Add Link";
  saveBtn.textContent = "Add";
  linkModal.style.display = "flex";
};
cancelLinkBtn.onclick = () => (linkModal.style.display = "none");

window.onclick = (e) => {
  if (e.target === linkModal) linkModal.style.display = "none";
  if (e.target === deleteModal) deleteModal.style.display = "none";
  if (e.target === errorModal) errorModal.style.display = "none";
  if (e.target === successModal) successModal.style.display = "none";
  if (e.target === changePasswordModal) changePasswordModal.style.display = "none";
};

// --- Supabase CRUD ---
async function loadUserLinks(user, sortAlphabetically = false) {
  const { data, error } = await supabaseClient
    .from("links")
    .select("*")
    .eq("user_id", user.uid)
    .order("created_at", { ascending: false });

  if (error) return showError(error.message);

  allLinks = data || [];
  if (sortAlphabetically) allLinks.sort((a, b) => a.title.localeCompare(b.title));
  renderLinks(allLinks);
}

async function saveLink({ id, title, url, tags }) {
  const user = auth.currentUser;
  if (!user) return showError("Login first!");

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
    showError("Save failed: " + res.error.message);
  } else {
    showSuccess("Link saved!");
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
    showError("Delete failed: " + error.message);
  } else {
    showSuccess("Link deleted!");
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
  if (sortValue === "title-asc") filtered.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortValue === "title-desc") filtered.sort((a, b) => b.title.localeCompare(a.title));
  else if (sortValue === "tags") filtered.sort((a, b) => (a.tags || "").localeCompare(b.tags || ""));

  renderLinks(filtered);
}
searchInput.oninput = applyFilters;
sortSelect.onchange = applyFilters;

// --- Render Links ---
function renderLinks(links) {
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
  links.forEach((link) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="Name">${link.title}</td>
      <td data-label="URL"><a href="${link.url}" target="_blank">${link.url}</a></td>
      <td data-label="Tags">${link.tags || ""}</td>
      <td data-label="Actions"></td>
    `;

    const actionsCell = row.querySelector("td[data-label='Actions']");
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => populateForm(link);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      pendingDeleteId = link.id;
      deleteMessage.textContent = `Delete "${link.title}"?`;
      deleteModal.style.display = "flex";
    };

    actionsCell.append(editBtn, delBtn);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  linksDiv.appendChild(table);
}

// --- Delete Confirm ---
confirmDeleteBtn.onclick = () => {
  if (pendingDeleteId) deleteLink(pendingDeleteId);
  pendingDeleteId = null;
  deleteModal.style.display = "none";
};
cancelDeleteBtn.onclick = () => {
  pendingDeleteId = null;
  deleteModal.style.display = "none";
};

// --- Populate Form ---
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
  if (!title || !url) return showError("Fill title and URL.");
  saveLink({ id: editLinkId, title, url, tags });
  editLinkId = null;
  linkForm.reset();
  linkModal.style.display = "none";
};

