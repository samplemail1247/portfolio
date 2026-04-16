// 🔒 Prevent double initialization
if (window.__appInitialized) {
  throw new Error("App already initialized");
}
window.__appInitialized = true;

// 🔗 Supabase setup
const SUPABASE_URL = "https://kymifcsiobnukgkreckd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bWlmY3Npb2JudWtna3JlY2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTQ1NjgsImV4cCI6MjA5MTg5MDU2OH0.UVLwpoHjo8X9ansWXrQhWyzEDuhhKJ4jvZdItbfW6ok";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// 📦 App State
const state = {
  profile: null,
  messages: [],
  channel: null,
};

// 🎯 DOM Elements
const elements = {
  authPanel: document.getElementById("authPanel"),
  chatLayout: document.getElementById("chatLayout"),
  authForm: document.getElementById("authForm"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  loginButton: document.getElementById("loginButton"),
  registerButton: document.getElementById("registerButton"),
  authStatus: document.getElementById("authStatus"),
  messages: document.getElementById("messages"),
  messageForm: document.getElementById("messageForm"),
  messageInput: document.getElementById("messageInput"),
  sendButton: document.getElementById("sendButton"),
  logoutButton: document.getElementById("logoutButton"),
  userEmailChip: document.getElementById("userEmailChip"),
};

// 🚀 Init
document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEvents();
  validateMessageInput();
  showAuth();
}

// 🔗 Events
function bindEvents() {
  elements.authForm.addEventListener("submit", handleLogin);
  elements.registerButton.addEventListener("click", handleRegister);
  elements.messageForm.addEventListener("submit", handleSendMessage);
  elements.messageInput.addEventListener("input", validateMessageInput);
  elements.logoutButton.addEventListener("click", handleLogout);
}

// 🔑 LOGIN
async function handleLogin(event) {
  event.preventDefault();

  const email = elements.email.value.trim().toLowerCase();
  const password = elements.password.value;

  const validationError = validateCredentials(email, password);
  if (validationError) {
    setAuthStatus(validationError, "error");
    return;
  }

  setAuthLoading(true, "Logging in...");

  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .maybeSingle();

  if (error || !data) {
    setAuthLoading(false);
    setAuthStatus("Invalid email or password", "error");
    return;
  }

  state.profile = data;

  setAuthLoading(false);
  setAuthStatus("Login successful", "success");

  await bootstrapChat(data);
}

// 🧾 REGISTER
async function handleRegister() {
  const email = elements.email.value.trim().toLowerCase();
  const password = elements.password.value;

  const validationError = validateCredentials(email, password);
  if (validationError) {
    setAuthStatus(validationError, "error");
    return;
  }

  setAuthLoading(true, "Creating account...");

  // check duplicate
  const { data: existing } = await supabaseClient
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    setAuthLoading(false);
    setAuthStatus("Email already exists", "error");
    return;
  }

  const { data, error } = await supabaseClient
    .from("users")
    .insert([{ email, password }])
    .select()
    .single();

  if (error) {
    setAuthLoading(false);
    setAuthStatus(error.message, "error");
    return;
  }

  state.profile = data;

  setAuthLoading(false);
  setAuthStatus("Account created!", "success");

  await bootstrapChat(data);
}

// 💬 CHAT START
async function bootstrapChat(user) {
  state.profile = user;
  elements.userEmailChip.textContent = user.email;

  showChat();
  setChatLoading(true);

  await loadMessages();
  subscribeToMessages(user.id);

  setChatLoading(false);
}

// 📥 LOAD MESSAGES
async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("user_id", state.profile.id)
    .order("created_at", { ascending: true });

  if (error) {
    handleError(error);
    return;
  }

  state.messages = data || [];
  renderMessages();
}

// 📤 SEND MESSAGE
async function handleSendMessage(event) {
  event.preventDefault();

  const text = elements.messageInput.value.trim();

  if (!text || !state.profile?.id) return;

  toggleSendButton(true);

  const { error } = await supabaseClient.from("messages").insert({
    user_id: state.profile.id,
    sender: "USER",
    text,
  });

  if (error) {
    toggleSendButton(false);
    setAuthStatus(error.message, "error");
    return;
  }

  elements.messageInput.value = "";
  toggleSendButton(false);
  validateMessageInput();
}

// 🔄 REALTIME
function subscribeToMessages(userId) {
  cleanupChannel();

  state.channel = supabaseClient
    .channel(`messages:user:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `user_id=eq.${userId}`,
      },
      ({ new: msg }) => {
        if (state.messages.some((m) => m.id === msg.id)) return;
        state.messages.push(msg);
        renderMessages();
      }
    )
    .subscribe();
}

// 🚪 LOGOUT
function handleLogout() {
  teardownChat();
}

// 🧹 CLEANUP
function teardownChat() {
  cleanupChannel();
  state.profile = null;
  state.messages = [];
  elements.messageInput.value = "";
  renderMessages();
  validateMessageInput();
  showAuth();
}

function cleanupChannel() {
  if (!state.channel) return;
  supabaseClient.removeChannel(state.channel);
  state.channel = null;
}

// 🎨 UI
function renderMessages() {
  elements.messages.innerHTML = "";

  if (!state.messages.length) {
    elements.messages.innerHTML = "<p>No messages yet</p>";
    return;
  }

  state.messages.forEach((msg) => {
    const div = document.createElement("div");
    div.textContent = `${msg.sender}: ${msg.text}`;
    elements.messages.appendChild(div);
  });

  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function showAuth() {
  elements.authPanel.classList.remove("hidden");
  elements.chatLayout.classList.add("hidden");
}

function showChat() {
  elements.authPanel.classList.add("hidden");
  elements.chatLayout.classList.remove("hidden");
}

// ⚙️ HELPERS
function setAuthLoading(isLoading, message = "") {
  elements.loginButton.disabled = isLoading;
  elements.registerButton.disabled = isLoading;
  elements.email.disabled = isLoading;
  elements.password.disabled = isLoading;
  setAuthStatus(message);
}

function setChatLoading(isLoading) {
  elements.messageInput.disabled = isLoading;
  elements.sendButton.disabled = isLoading;
}

function toggleSendButton(isBusy) {
  elements.messageInput.disabled = isBusy;
  elements.sendButton.disabled = isBusy;
}

function validateMessageInput() {
  elements.sendButton.disabled =
    !elements.messageInput.value.trim() || elements.messageInput.disabled;
}

function setAuthStatus(message, type = "") {
  elements.authStatus.textContent = message;
}

function validateCredentials(email, password) {
  if (!email.includes("@")) return "Invalid email";
  if (password.length < 6) return "Password must be at least 6 characters";
  return "";
}

function handleError(error) {
  console.error(error);
  setAuthStatus(error.message || "Error", "error");
}
