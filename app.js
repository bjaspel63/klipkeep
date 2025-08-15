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
let currentView = "list"; // "list" or "category"

// --- Feedback System ---
const feedbackBox = document.createElement("div");
feedbackBox.id = "feedbackBox";
feedbackBox.style.position = "fixed";
feedbackBox.style.bottom = "20px";
feedbackBox.style.left = "50%";
feedbackBox.style.transform = "translateX(-50%)";
feedbackBox.style.padding = "10px 20px";
feedbackBox.style.borderRadius = "6px";
feedbackBox.style.color = "#fff";
feedbackBox.style.fontWeight = "bold";
feedbackBox.style.display = "none";
document.body.appendChild(feedbackBox);

function showFeedback(message, type = "success") {
  feedbackBox.textContent = message;
  feedbackBox.style.backgroundColor = type === "error" ? "#e74c3c" : "#27ae60";
  feedbackBox.style.display = "block";
  setTimeout(() => feedbackBox.style.display = "none", 3000);
}

// --- Auth Handlers (Email/Password) ---
signupBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth
    .createUserWithEmailAndPassword(email, password)
    .then(() => showFeedback("Signed up successfully!"))
    .catch((e) => showFeedback(e.message, "error"));
};

loginBtn.onclick = () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => showFeedback("Logged in!"))
    .catch((e) => showFeedback(e.message, "error"));
};

logoutBtn.onclick = () => {
  auth.signOut();
  showFeedback("Logged out!");
};

// --- Google Login ---
googleBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth
    .signInWithPopup(provider)
    .then(() => showFeedback("Logged in with Google!"))
    .catch((e) => showFeedback(e.message, "error"));
};

// --- Auth State Change ---
auth.onAuthStateChanged((user) => {
  document.getElementById("loadingScreen").style.display = "none";

  if (user) {
    authBox.style.display = "none";
    userMenu.style.display = "flex";
    userEmailSpan.textContent = user.email;
    searchSortBox.style.display = "flex";
    document.getElementById("siteTitle").style.display = "block";
    addLinkBtn.style.display = "block";
    loadUserLinks(user);
  } else {
    authBox.style.display = "flex";
    userMenu.style.display = "none";
    searchSortBox.style.display = "none";
    linksDiv.innerHTML = "";
    document.getElementById("siteTitle").style.display = "none";
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
window.addEventListener("click", (e) => {
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

  if (error) {
    showFeedback(`Error: ${error.message}`, "error");
    return;
  }

  allLinks = data || [];
  renderLinks(allLinks);
}

async function saveLink({ id, title, url, tags }) {
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

  if (res.error) {
    showFeedback("Save failed: " + res.error.message, "error");
  } else {
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
    .eq("id", id)
    .eq("user_id", user.uid);

  if (error) {
    showFeedback("Delete failed: " + error.message, "error");
  } else {
    loadUserLinks(user);
    showFeedback("Link deleted!");
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

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

// --- Toggle View Buttons (Optional in header) ---
function setView(view) {
  currentView = view;
  renderLinks(allLinks);
}

// --- Render Links ---
function renderLinks(links) {
  linksDiv.innerHTML = "";
  if (!links.length) return linksDiv.textContent = "No links saved yet.";

  if (currentView === "list") {
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
  } else if (currentView === "category") {
    const tagsMap = {};
    links.forEach(link => {
      (link.tags || "").split(",").map(t => t.trim()).forEach(tag => {
        if (!tagsMap[tag]) tagsMap[tag] = [];
        tagsMap[tag].push(link);
      });
    });

    for (let tag in tagsMap) {
      const section = document.createElement("div");
      section.className = "category-section";
      section.style.marginBottom = "20px";

      const header = document.createElement("h3");
      header.textContent = tag || "Untagged";
      header.style.cursor = "pointer";
      header.style.background = "#f1f5f9";
      header.style.padding = "8px 12px";
      header.style.borderRadius = "6px";
      header.style.userSelect = "none";
      section.appendChild(header);

      const content = document.createElement("div");
      content.className = "category-content";
      content.style.marginTop = "8px";

      tagsMap[tag].forEach(link => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        div.style.background = "#fff";
        div.style.padding = "6px 10px";
        div.style.marginBottom = "6px";
        div.style.borderRadius = "6px";
        div.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";

        const linkText = document.createElement("a");
        linkText.href = link.url;
        linkText.target = "_blank";
        linkText.rel = "noopener noreferrer";
        linkText.textContent = link.title;
        linkText.style.flex = "1";
        linkText.style.marginRight = "10px";
        div.appendChild(linkText);

        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.textContent = "Edit";
        editBtn.style.marginRight = "6px";
        editBtn.onclick = () => populateForm(link);
        div.appendChild(editBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.textContent = "Delete";
        delBtn.onclick = () => {
          pendingDeleteId = link.id;
          deleteMessage.textContent = `Are you sure you want to delete "${link.title}"?`;
          deleteModal.style.display = "flex";
        };
        div.appendChild(delBtn);

        content.appendChild(div);
      });

      section.appendChild(content);
      header.onclick = () => {
        content.style.display = content.style.display === "none" ? "block" : "none";
      };
      linksDiv.appendChild(section);
    }
  }
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
  if (!title || !url) return showFeedback("Fill title and URL.", "error");
  saveLink({ id: editLinkId, title, url, tags });
  editLinkId = null;
  linkForm.reset();
  linkModal.style.display = "none";
};
