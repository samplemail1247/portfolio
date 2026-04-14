import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  off
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCar5tl_EGeRHhvQke8IJITDi_zAArlN8c",
  authDomain: "chat-project-c5409.firebaseapp.com",
  databaseURL: "https://chat-project-c5409-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-project-c5409"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let username = "";
let chatRef = null;

// Join
window.joinChat = function () {
  username = document.getElementById("usernameInput").value.trim();
  if (!username) return alert("Enter name!");

  chatRef = ref(db, "chats/" + username);

  document.getElementById("login").style.display = "none";
  document.getElementById("chat").style.display = "block";

  listenMessages();
};

// Send
window.sendMessage = function () {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  push(chatRef, {
    user: username,
    text: text,
    time: Date.now()
  });

  input.value = "";
};

// Listen
function listenMessages() {
  onChildAdded(chatRef, (snapshot) => {
    const msg = snapshot.val();

    const div = document.createElement("div");
    div.classList.add("message");

    if (msg.user === username) {
      div.classList.add("user");
    } else {
      div.classList.add("admin");
    }

    div.innerText = msg.text;

    const messages = document.getElementById("messages");
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  });
}
