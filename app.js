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
const linkForm = document.getElementById('linkForm');
const linksDiv = document.getElementById('links');
let editLinkId = null;

// --- Firebase Auth Functions ---
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
    authStatus.textContent = `Hello, ${user.email}`;
    logoutBtn.style.display = "block";
    signupBtn.style.display = "none";
    loginBtn.style.display = "none";
    document.getElementById('email').style.display = "none";
    document.getElementById('password').style.display = "none";
    linkForm.style.display = "flex";
    loadUserLinks(user);
  } else {
    authStatus.textContent = "Please log in or sign up.";
    logoutBtn.style.display = "none";
    signupBtn.style.display = "inline-block";
    loginBtn.style.display = "inline-block";
    document.getElementById('email').style.display = "inline-block";
    document.getElementById('password').style.display = "inline-block";
    linkForm.style.display = "none";
    linksDiv.innerHTML = '';
  }
});

// --- Supabase CRUD Functions ---
async function loadUserLinks(user) {
  const { data, error } = await supabaseClient
    .from("links")
    .select("*")
    .eq("user_id", user.uid) // only fetch this user's links
    .order("created_at", { ascending: false });

  if (error) {
    authStatus.textContent = `Error loading links: ${error.message}`;
    return;
  }
  renderLinks(data);
}

async function saveLink({ id, title, url, tags }) {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in.");
    return;
  }

  if (id) {
    // --- Update existing link ---
    const { error } = await supabaseClient
      .from("links")
      .update({ title, url, tags })
      .eq("id", id)
      .eq("user_id", user.uid); // security: only update own links
    if (error) {
      alert("Update failed: " + error.message);
    }
  } else {
    // --- Insert new link ---
    const { error } = await supabaseClient
      .from("links")
      .insert([{
        user_id: user.uid, // REQUIRED for RLS to pass
        title,
        url,
        tags
      }]);
    if (error) {
      alert("Insert failed: " + error.message);
    }
  }

  loadUserLinks(user);
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
  loadUserLinks(user);
}

let allLinks = []; // store all loaded links

async function loadUserLinks(user) {
  const { data, error } = await supabaseClient
    .from("links")
    .select("*")
    .eq("user_id", user.uid)
    .order("created_at", { ascending: false });

  if (error) {
    authStatus.textContent = `Error loading links: ${error.message}`;
    return;
  }

  allLinks = data; // store all links globally
  renderLinks(allLinks);
}

// Search function
document.getElementById("searchInput").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allLinks.filter(link => {
    const titleMatch = link.title.toLowerCase().includes(query);
    const tagsMatch = (link.tags || "").toLowerCase().includes(query);
    return titleMatch || tagsMatch;
  });
  renderLinks(filtered);
});

// Render links with tags as chips
function renderLinks(links) {
  linksDiv.innerHTML = '';
  if (!links.length) {
    linksDiv.textContent = "No links found.";
    return;
  }
  links.forEach(link => {
    const card = document.createElement('div');
    card.className = 'link-card';

    const h3 = document.createElement('h3');
    h3.textContent = link.title;

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => populateForm(link);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => deleteLink(link.id);

    h3.appendChild(editBtn);
    h3.appendChild(delBtn);

    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.url;

    // Tags as chips
    const tagsContainer = document.createElement('div');
    if (link.tags) {
      link.tags.split(',').forEach(t => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = t.trim();
        tagsContainer.appendChild(tagEl);
      });
    }

    card.appendChild(h3);
    card.appendChild(a);
    card.appendChild(tagsContainer);

    linksDiv.appendChild(card);
  });
}

// --- UI Functions ---
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

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => populateForm(link);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => deleteLink(link.id);

    h3.appendChild(editBtn);
    h3.appendChild(delBtn);

    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.url;

    const tags = document.createElement('p');
    tags.textContent = link.tags || "";

    card.appendChild(h3);
    card.appendChild(a);
    card.appendChild(tags);

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
linkForm.onsubmit = (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const url = document.getElementById('url').value.trim();
  const tagsInput = document.getElementById('tags').value.trim();

  // Convert comma-separated string into tags (or just save as string)
  const tags = tagsInput;

  if (!title || !url) {
    alert('Please fill title and url.');
    return;
  }

  saveLink({ id: editLinkId, title, url, tags });
  editLinkId = null;
  linkForm.reset();
  linkForm.querySelector('button').textContent = 'Add / Update Link';
};

