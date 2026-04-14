import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  onChildAdded,
  off
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCar5tl_EGeRHhvQke8IJITDi_zAArlN8c",
  databaseURL: "https://chat-project-c5409-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentUser = "";
let currentListener = null;

// Load users list
const usersRef = ref(db, "chats");

onValue(usersRef, (snapshot) => {
  const userList = document.getElementById("userList");
  userList.innerHTML = "";

  snapshot.forEach((child) => {
    const name = child.key;

    const div = document.createElement("div");
    div.classList.add("user-item");
    div.innerText = name;

    div.onclick = () => openChat(name);

    userList.appendChild(div);
  });
});

// Open chat safely (IMPORTANT FIX)
function openChat(user) {
  currentUser = user;

  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";

  const chatRef = ref(db, "chats/" + user);

  // Remove old listener (CRITICAL FIX)
  if (currentListener) {
    off(currentListener);
  }

  currentListener = chatRef;

  onChildAdded(chatRef, (snapshot) => {
    const msg = snapshot.val();

    const div = document.createElement("div");
    div.classList.add("message");

    if (msg.user === "ADMIN") {
      div.classList.add("user");
    } else {
      div.classList.add("admin");
    }

    div.innerText = msg.text;

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Send reply
window.sendMessage = function () {
  if (!currentUser) return alert("Select a user!");

  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  const chatRef = ref(db, "chats/" + currentUser);

  push(chatRef, {
    user: "ADMIN",
    text: text,
    time: Date.now()
  });

  input.value = "";
};
