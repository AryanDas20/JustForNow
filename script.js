const CATEGORIES = ["All","Electronics","Tools","Formal wear","Kitchen","Sports","Books & notes","Other"];

let posts = [
  {id:1, type:"need", item:"Scientific calculator", cat:"Electronics", time:"by 2:30pm today", note:"Stats exam and mine just died. Return right after.", name:"Priya", room:"LPU 214", resolved:false},
  {id:2, type:"lend", item:"Bike pump", cat:"Tools", time:"available all week", note:"Floor pump, works on both valve types.", name:"Pratik", room:"LPU 108", resolved:false},
  {id:3, type:"need", item:"HDMI cable", cat:"Electronics", time:"tonight, 7-9pm", note:"Hooking my laptop to the common room TV for a group watch.", name:"Sourik", room:"LPU 301", resolved:false},
  {id:4, type:"lend", item:"Travel iron", cat:"Formal wear", time:"available weekends", note:"Small travel one, good for a quick de-wrinkle before formals.", name:"Harshit", room:"LPU 219", resolved:false},
  {id:5, type:"lend", item:"Phone charger (USB-C, fast)", cat:"Electronics", time:"available now", note:"Extra one I never use, happy to lend for a day.", name:"Chandan", room:"LPU 112", resolved:false},
  {id:6, type:"need", item:"Badminton racket (x2)", cat:"Sports", time:"this Saturday afternoon", note:"Playing with my roommate, don't own our own set yet.", name:"Aryan", room:"LPU 227", resolved:false},
  {id:7, type:"lend", item:"Mini whisk + mixing bowl", cat:"Kitchen", time:"available anytime", note:"Baking supplies from a phase I'm past. Come grab 'em.", name:"Manas", room:"LPU 305", resolved:false},
  {id:8, type:"need", item:"Steam iron", cat:"Formal wear", time:"tomorrow morning", note:"Formal tonight and my shirt looks like I slept in it. (I did.)", name:"Priyam", room:"LPU 118", resolved:false},
];
let typeFilter = "all";
let catFilter = "All";
let currentUser = null;
let currentAuthMode = "login";

// Check session storage on page load
window.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("justfornow_user");
  if (savedUser) {
    currentUser = { name: savedUser };
    updateAuthUI();
  }
  renderCategoryChips();
  fetchPosts();
});

function openAuthModal(mode) {
  currentAuthMode = mode;
  document.getElementById("auth-title").textContent = mode === "login" ? "Log In" : "Sign Up";
  document.getElementById("auth-submit-btn").textContent = mode === "login" ? "Log In" : "Create Account";
  document.getElementById("auth-overlay").classList.add("open");
}

function closeAuthModal() {
  document.getElementById("auth-overlay").classList.remove("open");
}

async function handleAuthSubmit() {
  const username = document.getElementById("auth-username").value.trim();
  const password = document.getElementById("auth-password").value.trim();

  if (!username || !password) {
    showToast("Please enter both username and password.");
    return;
  }

  const endpoint = currentAuthMode === "login" ? "api.php?action=login" : "api.php?action=register";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();

    if (json.success) {
      if (currentAuthMode === "login") {
        currentUser = { name: json.username };
        localStorage.setItem("justfornow_user", json.username);
        updateAuthUI();
        closeAuthModal();
        showToast(`Welcome back, ${json.username}!`);
      } else {
        showToast("Account created! Logging you in...");
        openAuthModal("login");
      }
    } else {
      showToast(json.error || "Authentication failed.");
    }
  } catch (err) {
    showToast("Server connection error.");
  }
}

function updateAuthUI() {
  if (currentUser) {
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("user-profile").style.display = "block";
    document.getElementById("whoami").textContent = currentUser.name;
    document.getElementById("f-name").value = currentUser.name;
  } else {
    document.getElementById("auth-container").style.display = "block";
    document.getElementById("user-profile").style.display = "none";
    document.getElementById("whoami").textContent = "Guest";
    document.getElementById("f-name").value = "";
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("justfornow_user");
  updateAuthUI();
  showToast("Logged out successfully.");
}

function checkAuthAndOpenModal() {
  if (!currentUser) {
    showToast("Please log in or sign up before posting.");
    openAuthModal("login");
    return;
  }
  openModal();
}

async function fetchPosts() {
  try {
    const res = await fetch("api.php?action=fetch");
    const json = await res.json();
    if (json.success) {
      posts = json.data;
      renderBoard();
    } else {
      showToast("Error loading board.");
    }
  } catch (err) {
    showToast("Server connection error.");
  }
}

function renderCategoryChips(){
  const wrap = document.getElementById("category-chips");
  wrap.innerHTML = "";
  CATEGORIES.forEach(cat => {
    const b = document.createElement("button");
    b.className = "chip" + (cat === catFilter ? " active" : "");
    b.textContent = cat;
    b.onclick = () => { catFilter = cat; renderCategoryChips(); renderBoard(); };
    wrap.appendChild(b);
  });
}

function setTypeFilter(t){
  typeFilter = t;
  document.querySelectorAll(".type-toggle .chip").forEach(c => {
    c.classList.toggle("active", c.dataset.type === t);
  });
  renderBoard();
}

function renderBoard(){
  const board = document.getElementById("board");
  const q = document.getElementById("search").value.trim().toLowerCase();

  let visible = posts.filter(p => {
    if(typeFilter !== "all" && p.type !== typeFilter) return false;
    if(catFilter !== "All" && p.cat !== catFilter) return false;
    if(q && !(p.item.toLowerCase().includes(q) || p.note.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q))) return false;
    return true;
  });

  document.getElementById("board-meta").textContent =
    visible.length ? `${visible.length} note${visible.length === 1 ? "" : "s"} pinned right now` : "";

  board.innerHTML = "";

  if(visible.length === 0){
    board.innerHTML = `<div class="empty-state">
      <h3>Nothing pinned here yet</h3>
      <p>Try a different filter, or be the first to post something.</p>
    </div>`;
    return;
  }

  visible.forEach(p => {
    const rotations = [-3, -1.5, 0, 1.5, 3, -2.5, 2];
    const rot = rotations[p.id % rotations.length];
    const el = document.createElement("div");
    el.className = `note ${p.type}` + (p.resolved ? " resolved" : "");
    el.style.transform = `rotate(${rot}deg)`;

    const badgeLabel = p.type === "need" ? "Needed" : "Up for lending";
    const actionLabel = p.type === "need" ? "I can help" : "I need this";

    el.innerHTML = `
      <div class="pin"></div>
      <button class="close-x" title="Remove note" aria-label="Remove note" onclick="removePost(${p.id})">✕</button>
      <div class="note-top">
        <span class="badge ${p.type}">${badgeLabel}</span>
      </div>
      <div>
        <p class="note-title">${escapeHtml(p.item)}</p>
        <p class="note-cat">${escapeHtml(p.cat)} &middot; ${escapeHtml(p.time || "flexible timing")}</p>
      </div>
      <p class="note-msg">${escapeHtml(p.note || "")}</p>
      <div class="note-foot">
        <span class="note-who">Posted by <strong>${escapeHtml(p.name)}</strong> &middot; ${escapeHtml(p.room)}</span>
        ${p.resolved
          ? `<span class="resolved-flag">✓ All set</span>`
          : `<button class="help-btn" onclick="claimPost(${p.id})">${actionLabel}</button>`}
      </div>
    `;
    board.appendChild(el);
  });
}

function escapeHtml(s){
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

async function claimPost(id){
  const p = posts.find(x => x.id === id);
  if(!p) return;

  try {
    const res = await fetch("api.php?action=claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const json = await res.json();
    if(json.success){
      await fetchPosts();
      showToast(p.type === "need"
        ? `Nice! Go find ${p.name} in ${p.room} — you're covered.`
        : `Sent! Head to ${p.room} to grab it from ${p.name}.`);
    }
  } catch (err) {
    showToast("Action failed.");
  }
}

async function removePost(id){
  const pin = prompt("Enter the PIN password set when creating this note:");
  if(!pin) return;

  try {
    const res = await fetch("api.php?action=delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pin })
    });
    const json = await res.json();
    if(json.success){
      await fetchPosts();
      showToast("Note removed successfully.");
    } else {
      showToast(json.error || "Incorrect PIN.");
    }
  } catch (err) {
    showToast("Deletion error.");
  }
}

let toastTimer;
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function scrollToBoard(){
  document.getElementById("board-section").scrollIntoView({ behavior: "smooth" });
}

function openModal(){
  document.getElementById("overlay").classList.add("open");
  document.getElementById("f-item").focus();
}
function closeModal(){
  document.getElementById("overlay").classList.remove("open");
}

async function submitPost(){
  if (!currentUser) {
    showToast("Please log in first.");
    return;
  }

  const item = document.getElementById("f-item").value.trim();
  const room = document.getElementById("f-room").value.trim();
  const cat = document.getElementById("f-cat").value;
  const time = document.getElementById("f-time").value.trim();
  const note = document.getElementById("f-note").value.trim();
  const pin = document.getElementById("f-pin").value.trim();
  const type = document.querySelector('input[name="ptype"]:checked').value;

  if(!item || !room || !pin){
    showToast("Fill in item, room, and deletion PIN.");
    return;
  }

  try {
    const res = await fetch("api.php?action=create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        item,
        cat,
        time,
        note,
        name: currentUser.name,
        room,
        pin
      })
    });
    const json = await res.json();
    if(json.success){
      document.getElementById("f-item").value = "";
      document.getElementById("f-room").value = "";
      document.getElementById("f-time").value = "";
      document.getElementById("f-note").value = "";
      document.getElementById("f-pin").value = "";

      closeModal();
      typeFilter = "all";
      catFilter = "All";
      setTypeFilter("all");
      renderCategoryChips();
      await fetchPosts();
      scrollToBoard();
      showToast("Pinned to the board!");
    } else {
      showToast("Failed to pin note.");
    }
  } catch (err) {
    showToast("Submission error.");
  }
}

// Modal closing helpers
document.getElementById("overlay").addEventListener("click", (e) => {
  if(e.target.id === "overlay") closeModal();
});
document.getElementById("auth-overlay").addEventListener("click", (e) => {
  if(e.target.id === "auth-overlay") closeAuthModal();
});
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") { closeModal(); closeAuthModal(); }
});
