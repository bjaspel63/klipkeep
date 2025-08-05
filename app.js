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
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authStatus = document.getElementById('authStatus');
const authBox = document.getElementById('authBox');
const userMenu = document.getElementById('userMenu');
const userEmailSpan = document.getElementById('userEmail');
const linkForm = document.getElementById('linkForm');
const linksDiv = document.getElementById('links');
const searchSortBox = document.getElementById('searchSortBox');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

// Single Delete Modal
const deleteModal = document.getElementById('deleteModal');
const deleteMessage = document.getElementById('deleteMessage');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Batch Delete Modal
const batchDeleteModal = document.getElementById('batchDeleteModal');
const batchDeleteMessage = document.getElementById('batchDeleteMessage');
const batchDeleteConfirmBtn = document.getElementById('batchDeleteConfirmBtn');
const batchDeleteCancelBtn = document.getElementById('batchDeleteCancelBtn');

// Batch Add Tag Modal
const batchAddTagModal = document.getElementById('batchAddTagModal');
const batchTagInput = document.getElementById('batchTagInput');
const batchAddTagConfirmBtn = document.getElementById('batchAddTagConfirmBtn');
const batchAddTagCancelBtn = document.getElementById('batchAddTagCancelBtn');

// Import/Export CSV
const exportCsvBtn = document.getElementById('exportCsvBtn');
const importCsvFileInput = document.getElementById('importCsvFile');
const importCsvBtn = document.getElementById('importCsvBtn');

let pendingDeleteId = null;
let editLinkId = null;
let allLinks = [];
let selectedIds = new Set();

// --- Auth Handlers ---
signupBtn.onclick = () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => authStatus.textContent = "Signed up successfully!")
    .catch(e => authStatus.textContent = e.message);
};

loginBtn.onclick = () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  auth.signInWithEmailAndPassword(email, password)
    .then(() => authStatus.textContent = "Logged in!")
    .catch(e => authStatus.textContent = e.message);
};

logoutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged(user => {
  if (user) {
    authBox.style.display = "none";
    userMenu.style.display = "flex";
    userEmailSpan.textContent = user.email;
    linkForm.style.display = "flex";
    searchSortBox.style.display = "flex";
    loadUserLinks(user);
  } else {
    authBox.style.display = "flex";
    userMenu.style.display = "none";
    linkForm.style.display = "none";
    searchSortBox.style.display = "none";
    linksDiv.innerHTML = '';
    authStatus.textContent = "";
  }
});

// --- Supabase CRUD ---
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
  if (error) alert("Delete failed: " + error.message);
  else loadUserLinks(user);
}

async function loadUserLinks(user) {
  const { data, error } = await supabaseClient
    .from("links")
    .select("*")
    .eq("user_id", user.uid)
    .order("created_at", { ascending: false });
  if (error) {
    authStatus.textContent = `Error: ${error.message}`;
    return;
  }
  allLinks = data || [];
  renderLinks(allLinks);
}

// --- Search & Sort ---
function applyFilters() {
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
}
searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

// --- Render Links ---
function renderLinks(links) {
  linksDiv.innerHTML = '';
  selectedIds = new Set();
  if (!links.length) {
    linksDiv.textContent = "No links saved yet.";
    return;
  }

  // Batch Toolbar
  const batchToolbar = document.createElement('div');
  batchToolbar.id = 'batchToolbar';
  batchToolbar.style.marginBottom = '20px';
  batchToolbar.style.display = 'flex';
  batchToolbar.style.gap = '12px';

  const deleteSelectedBtn = document.createElement('button');
  deleteSelectedBtn.textContent = 'Delete Selected';
  deleteSelectedBtn.disabled = true;

  const addTagSelectedBtn = document.createElement('button');
  addTagSelectedBtn.textContent = 'Add Tag to Selected';
  addTagSelectedBtn.disabled = true;

  batchToolbar.appendChild(deleteSelectedBtn);
  batchToolbar.appendChild(addTagSelectedBtn);
  linksDiv.appendChild(batchToolbar);

  function updateButtonsState() {
    const hasSelection = selectedIds.size > 0;
    deleteSelectedBtn.disabled = !hasSelection;
    addTagSelectedBtn.disabled = !hasSelection;
  }

  links.forEach(link => {
    const card = document.createElement('div');
    card.className = 'link-card';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.onchange = e => {
      if (e.target.checked) selectedIds.add(link.id);
      else selectedIds.delete(link.id);
      updateButtonsState();
    };
    card.appendChild(checkbox);

    const h3 = document.createElement('h3');
    h3.textContent = link.title;
    card.appendChild(h3);

    const a = document.createElement('a');
    a.href = link.url;
    a.target = "_blank";
    a.textContent = link.url;
    card.appendChild(a);

    if (link.tags) {
      const tagsContainer = document.createElement('div');
      link.tags.split(',').forEach(t => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = t.trim();
        tagsContainer.appendChild(tagEl);
      });
      card.appendChild(tagsContainer);
    }

    const actions = document.createElement('div');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => populateForm(link);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      pendingDeleteId = link.id;
      deleteMessage.textContent = `Are you sure you want to delete "${link.title}"?`;
      deleteModal.style.display = "flex";
    };
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    linksDiv.appendChild(card);
  });

  // Batch Delete -> modal
  deleteSelectedBtn.onclick = () => {
    batchDeleteMessage.textContent = `Delete ${selectedIds.size} selected link(s)?`;
    batchDeleteModal.style.display = "flex";
  };

  // Batch Add Tag -> modal
  addTagSelectedBtn.onclick = () => {
    batchTagInput.value = "";
    batchAddTagModal.style.display = "flex";
    batchTagInput.focus();
  };
}

// --- Form Handler ---
linkForm.onsubmit = e => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const url = document.getElementById('url').value.trim();
  const tags = document.getElementById('tags').value.trim();
  if (!title || !url) return alert("Fill title and url.");
  saveLink({ id: editLinkId, title, url, tags });
  editLinkId = null;
  linkForm.reset();
  linkForm.querySelector('button').textContent = 'Add / Update Link';
};
function populateForm(link) {
  document.getElementById('title').value = link.title;
  document.getElementById('url').value = link.url;
  document.getElementById('tags').value = link.tags || "";
  editLinkId = link.id;
  linkForm.querySelector('button').textContent = 'Update Link';
}

// --- Delete Modal Handlers ---
confirmDeleteBtn.onclick = () => {
  if (pendingDeleteId) {
    deleteLink(pendingDeleteId);
    pendingDeleteId = null;
  }
  deleteModal.style.display = "none";
};
cancelDeleteBtn.onclick = () => deleteModal.style.display = "none";

// --- Batch Delete Modal Handlers ---
batchDeleteConfirmBtn.onclick = async () => {
  const user = auth.currentUser;
  const idsArray = Array.from(selectedIds);
  const { error } = await supabaseClient
    .from('links')
    .delete()
    .in('id', idsArray)
    .eq('user_id', user.uid);
  if (error) alert("Batch delete failed: " + error.message);
  else {
    alert(`Deleted ${idsArray.length} link(s).`);
    selectedIds.clear();
    loadUserLinks(user);
  }
  batchDeleteModal.style.display = "none";
};
batchDeleteCancelBtn.onclick = () => batchDeleteModal.style.display = "none";

// --- Batch Add Tag Modal Handlers ---
batchAddTagConfirmBtn.onclick = async () => {
  const newTag = batchTagInput.value.trim();
  if (!newTag) return alert("Please enter a tag.");
  const user = auth.currentUser;
  for (const id of selectedIds) {
    const existing = allLinks.find(l => l.id === id);
    let tags = existing?.tags ? existing.tags.split(',').map(t => t.trim()) : [];
    if (!tags.includes(newTag)) {
      tags.push(newTag);
      await supabaseClient
        .from('links')
        .update({ tags: tags.join(', ') })
        .eq('id', id)
        .eq('user_id', user.uid);
    }
  }
  alert(`Added tag "${newTag}" to ${selectedIds.size} link(s).`);
  selectedIds.clear();
  loadUserLinks(user);
  batchAddTagModal.style.display = "none";
};
batchAddTagCancelBtn.onclick = () => batchAddTagModal.style.display = "none";

// --- CSV Export ---
function exportToCSV() {
  if (!allLinks.length) return alert("No links to export.");
  const headers = ["title", "url", "tags"];
  const rows = allLinks.map(({ title, url, tags }) =>
    [title, url, tags].map(field => `"${(field || "").replace(/"/g, '""')}"`).join(",")
  );
  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "links.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
exportCsvBtn.onclick = exportToCSV;

// --- CSV Import ---
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim().toLowerCase());
  return lines.map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] ? values[i].replace(/^"(.*)"$/, '$1') : "";
    });
    return obj;
  });
}
importCsvBtn.onclick = () => {
  const file = importCsvFileInput.files[0];
  if (!file) return alert("Select a CSV file.");
  const reader = new FileReader();
  reader.onload = async e => {
    let linksToImport;
    try { linksToImport = parseCSV(e.target.result); }
    catch (error) { return alert("Parse error: " + error.message); }
    for (const link of linksToImport) if (!link.title || !link.url) return alert("Each link needs title and url.");
    await bulkInsertLinks(linksToImport);
  };
  reader.readAsText(file);
};
async function bulkInsertLinks(links) {
  const user = auth.currentUser;
  if (!user) return alert("Please log in first.");
  const insertData = links.map(({ title, url, tags }) => ({ user_id: user.uid, title, url, tags: tags || "" }));
  const { error } = await supabaseClient.from("links").insert(insertData);
  if (error) alert("Import failed: " + error.message);
  else {
    alert(`Imported ${insertData.length} links!`);
    loadUserLinks(user);
    importCsvFileInput.value = "";
  }
}
