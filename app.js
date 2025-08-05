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
const searchBox = document.getElementById('searchBox');
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
    authBox.style.display = "none";
    userMenu.style.display = "flex";
    userEmailSpan.textContent = user.email;
    linkForm.style.display = "flex";
    searchBox.style.display = "block";
    loadUserLinks(user);
  } else {
    authBox.style.display = "flex";
    userMenu.style.display = "none";
    linkForm.style.display = "none";
    searchBox.style.display = "none";
    linksDiv.innerHTML = '';
  }
});

// --- Supabase CRUD ---
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
  allLinks = data;
  renderLinks(allLinks);
}

async function saveLink({ id, title, url, tags }) {
  const user = auth.currentUser;
  if (!user) return alert("Login first!");

  if (id) {
    await supabaseClient.from("links")
      .update({ title, url, tags })
      .eq("id", id).eq("user_id", user.uid);
  } else {
    await supabaseClient.from("links")
      .insert([{ user_id: user.uid, title, url, tags }]);
  }
  loadUserLinks(user);
}

async function deleteLink(id) {
  const user = auth.currentUser;
  if (!user) return;
  await supabaseClient.from("links")
    .delete()
    .eq("id", id).eq("user_id", user.uid);
  loadUserLinks(user);
}

// --- Search ---
document.getElementById("searchInput").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  const filtered = allLinks.filter(l =>
    l.title.toLowerCase().includes(q) ||
    (l.tags || "").toLowerCase().includes(q)
  );
  renderLinks(filtered);
});

// --- Render ---
function renderLinks(links) {
  linksDiv.innerHTML = '';
  if (!links.length) {
    linksDiv.textContent = "No links saved yet.";
    return;
  }
  links.forEach(link => {
    const card = document.createElement('div');
    card.className = 'link-card';

    const h3 = document.createElement('h3');
    h3.textContent = link.title;

    const a = document.createElement('a');
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.url;

    const tagsContainer = document.createElement('div');
    if (link.tags) {
      link.tags.split(',').forEach(t => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = t.trim();
        tagsContainer.appendChild(tagEl);
      });
    }

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => populateForm(link);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => deleteLink(link.id);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(h3);
    card.appendChild(a);
    card.appendChild(tagsContainer);
    card.appendChild(actions);

    linksDiv.appendChild(card);
  });
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
