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

// Modal elements for delete confirmation
const deleteModal = document.getElementById('deleteModal');
const deleteMessage = document.getElementById('deleteMessage');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Import/Export CSV elements
const exportCsvBtn = document.getElementById('exportCsvBtn');
const importCsvFileInput = document.getElementById('importCsvFile');
const importCsvBtn = document.getElementById('importCsvBtn');

let pendingDeleteId = null;
let editLinkId = null;
let allLinks = [];

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
    console.log("Logged in user UID:", user.uid);
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
    console.error("Save link error:", res.error);
    alert("Save failed: " + res.error.message);
  } else {
    console.log("Saved link(s):", res.data);
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
    loadUserLinks(user);
  }
}

async function loadUserLinks(user) {
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

  console.log("Loaded links:", data);
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
  if (sortValue === "title-asc") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortValue === "title-desc") {
    filtered.sort((a, b) => b.title.localeCompare(a.title));
  } else if (sortValue === "tags") {
    filtered.sort((a, b) => (a.tags || "").localeCompare(b.tags || ""));
  } else {
    // newest - do nothing (already sorted by created_at desc)
  }

  renderLinks(filtered);
}

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

// --- Render Links ---
function renderLinks(links) {
  linksDiv.innerHTML = '';
  if (!links.length) {
    linksDiv.textContent = "No links saved yet.";
    return;
  }

  // Create batch action toolbar
  const batchToolbar = document.createElement('div');
  batchToolbar.id = 'batchToolbar';
  batchToolbar.style.marginBottom = '20px';
  batchToolbar.style.display = 'flex';
  batchToolbar.style.gap = '12px';

  const deleteSelectedBtn = document.createElement('button');
  deleteSelectedBtn.textContent = 'Delete Selected';
  deleteSelectedBtn.disabled = true;
  deleteSelectedBtn.style.backgroundColor = 'var(--danger)';
  deleteSelectedBtn.style.color = 'white';
  deleteSelectedBtn.style.border = 'none';
  deleteSelectedBtn.style.padding = '8px 16px';
  deleteSelectedBtn.style.borderRadius = '8px';
  deleteSelectedBtn.style.cursor = 'pointer';

  const addTagSelectedBtn = document.createElement('button');
  addTagSelectedBtn.textContent = 'Add Tag to Selected';
  addTagSelectedBtn.disabled = true;
  addTagSelectedBtn.style.backgroundColor = 'var(--primary)';
  addTagSelectedBtn.style.color = 'white';
  addTagSelectedBtn.style.border = 'none';
  addTagSelectedBtn.style.padding = '8px 16px';
  addTagSelectedBtn.style.borderRadius = '8px';
  addTagSelectedBtn.style.cursor = 'pointer';

  batchToolbar.appendChild(deleteSelectedBtn);
  batchToolbar.appendChild(addTagSelectedBtn);

  linksDiv.appendChild(batchToolbar);

  const selectedIds = new Set();

  function updateButtonsState() {
    const hasSelection = selectedIds.size > 0;
    deleteSelectedBtn.disabled = !hasSelection;
    addTagSelectedBtn.disabled = !hasSelection;
  }

  // When checkbox toggled
  function onCheckboxChange(e, id) {
    if (e.target.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    updateButtonsState();
  }

  // Render each link card with checkbox
  links.forEach(link => {
    const card = document.createElement('div');
    card.className = 'link-card';

    // Checkbox container
    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.display = 'flex';
    checkboxContainer.style.alignItems = 'center';
    checkboxContainer.style.marginBottom = '8px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.marginRight = '8px';
    checkbox.onchange = e => onCheckboxChange(e, link.id);

    checkboxContainer.appendChild(checkbox);

    const h3 = document.createElement('h3');
    h3.textContent = link.title;
    h3.style.margin = 0;
    h3.style.fontSize = '1.2em';
    h3.style.whiteSpace = 'nowrap';
    h3.style.overflow = 'hidden';
    h3.style.textOverflow = 'ellipsis';

    checkboxContainer.appendChild(h3);

    card.appendChild(checkboxContainer);

    const a = document.createElement('a');
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.url;
    a.style.fontSize = '0.9em';
    a.style.color = '#0077cc';
    a.style.wordBreak = 'break-all';
    a.style.marginBottom = '8px';

    card.appendChild(a);

    const tagsContainer = document.createElement('div');
    if (link.tags) {
      link.tags.split(',').forEach(t => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = t.trim();
        tagsContainer.appendChild(tagEl);
      });
    }
    card.appendChild(tagsContainer);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => populateForm(link);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
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

  // Batch Delete handler
  deleteSelectedBtn.onclick = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected link(s)? This cannot be undone.`)) return;
    const user = auth.currentUser;
    if (!user) return alert("Login first!");

    const idsArray = Array.from(selectedIds);
    const { error } = await supabaseClient
      .from('links')
      .delete()
      .in('id', idsArray)
      .eq('user_id', user.uid);

    if (error) {
      alert('Batch delete failed: ' + error.message);
    } else {
      alert(`Deleted ${idsArray.length} link(s).`);
      selectedIds.clear();
      updateButtonsState();
      loadUserLinks(user);
    }
  };

  // Batch Add Tag handler
  addTagSelectedBtn.onclick = async () => {
    const newTag = prompt('Enter tag to add to selected links:').trim();
    if (!newTag) return;

    const user = auth.currentUser;
    if (!user) return alert("Login first!");

    for (const id of selectedIds) {
      // Fetch the existing tags of each link
      const existing = allLinks.find(l => l.id === id);
      let tags = existing?.tags ? existing.tags.split(',').map(t => t.trim()) : [];
      if (!tags.includes(newTag)) {
        tags.push(newTag);
        // Update in Supabase
        await supabaseClient
          .from('links')
          .update({ tags: tags.join(', ') })
          .eq('id', id)
          .eq('user_id', user.uid);
      }
    }
    alert(`Added tag "${newTag}" to ${selectedIds.size} link(s).`);
    selectedIds.clear();
    updateButtonsState();
    loadUserLinks(user);
  };
}

function populateForm(link) {
  document.getElementById('title').value = link.title;
  document.getElementById('url').value = link.url;
  document.getElementById('tags').value = link.tags || "";
  editLinkId = link.id;
  linkForm.querySelector('button').textContent = 'Update Link';
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

// --- Delete Modal Handlers ---
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

// --- CSV Export ---
function exportToCSV() {
  if (!allLinks.length) {
    alert("No links to export.");
    return;
  }

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

// --- CSV Import Helper ---
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim().toLowerCase());

  return lines.map(line => {
    // Basic CSV parsing for quoted fields
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] ? values[i].replace(/^"(.*)"$/, '$1') : "";
    });
    return obj;
  });
}

// --- CSV Import Handler ---
importCsvBtn.onclick = () => {
  const file = importCsvFileInput.files[0];
  if (!file) {
    alert("Please select a CSV file to import.");
    return;
  }

  const reader = new FileReader();

  reader.onload = async (e) => {
    const csvText = e.target.result;

    let linksToImport;
    try {
      linksToImport = parseCSV(csvText);
    } catch (error) {
      alert("Failed to parse CSV: " + error.message);
      return;
    }

    // Basic validation: each link must have title and url
    for (const link of linksToImport) {
      if (!link.title || !link.url) {
        alert("Each link must have a title and a url.");
        return;
      }
    }

    await bulkInsertLinks(linksToImport);
  };

  reader.readAsText(file);
};

// --- Bulk Insert ---
async function bulkInsertLinks(links) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in first.");
    return;
  }

  // Add user_id for each imported link
  const insertData = links.map(({ title, url, tags }) => ({
    user_id: user.uid,
    title,
    url,
    tags: tags || "",
  }));

  const { error } = await supabaseClient.from("links").insert(insertData);

  if (error) {
    console.error("Bulk insert error:", error);
    alert("Failed to import links: " + error.message);
  } else {
    alert(`Successfully imported ${insertData.length} links!`);
    loadUserLinks(user);
    importCsvFileInput.value = ""; // Clear file input
  }
}

