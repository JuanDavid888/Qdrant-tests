document.addEventListener('DOMContentLoaded', function () {

  const elements = {
    messages: document.getElementById('messages'),
    composer: document.getElementById('composer'),
    prompt: document.getElementById('prompt'),
    sendBtn: document.getElementById('sendBtn'),
    sessionsList: document.getElementById('sessionsList'),
    newChatBtn: document.getElementById('newChatBtn'),
    modelSelect: document.getElementById('modelSelect')
  };

  function getSessions() {
    return JSON.parse(localStorage.getItem("chatSessions")) || [];
  }

  function saveSessions(sessions) {
    localStorage.setItem("chatSessions", JSON.stringify(sessions));
  }

  function getActiveSessionId() {
    return localStorage.getItem("activeSessionId");
  }

  function setActiveSessionId(id) {
    localStorage.setItem("activeSessionId", id);
  }

  function createNewSession() {
    const id = crypto.randomUUID();

    const newSession = {
      id,
      title: "Nuevo chat",
      date: new Date().toISOString(),
      model: elements.modelSelect.value,
      conversation: []
    };

    const sessions = getSessions();
    sessions.unshift(newSession);
    saveSessions(sessions);
    setActiveSessionId(id);

    loadSession(id);
    renderSessions();
  }

  function loadSession(id) {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    setActiveSessionId(id);
    conversation = session.conversation || [];
    elements.modelSelect.value = session.model || "gemini-2.5-flash";

    renderMessages();
    renderSessions();
  }

  function deleteSession(id) {
    let sessions = getSessions();
    sessions = sessions.filter(s => s.id !== id);
    saveSessions(sessions);

    if (getActiveSessionId() === id) {
      if (sessions.length > 0) {
        loadSession(sessions[0].id);
      } else {
        createNewSession();
      }
    }

    renderSessions();
  }

  function updateActiveSession() {
    const sessions = getSessions();
    const id = getActiveSessionId();
    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) return;

    sessions[index].conversation = conversation;
    sessions[index].model = elements.modelSelect.value;

    if (conversation.length === 1) {
      sessions[index].title = conversation[0].parts[0].text.slice(0, 30);
    }

    saveSessions(sessions);
    renderSessions();
  }

  function renderSessions() {
    const sessions = getSessions();
    const activeId = getActiveSessionId();

    elements.sessionsList.innerHTML = "";

    sessions.forEach(session => {
      const div = document.createElement("div");
      div.className = "session-item" + (session.id === activeId ? " active" : "");

      div.innerHTML = `
        ${session.title}
        <span class="delete-btn">✕</span>
        <small>${new Date(session.date).toLocaleString()}</small>
      `;

      div.onclick = () => loadSession(session.id);

      div.querySelector(".delete-btn").onclick = (e) => {
        e.stopPropagation();
        deleteSession(session.id);
      };

      elements.sessionsList.appendChild(div);
    });
  }

  function renderMessages() {
    elements.messages.innerHTML = "";

    conversation.forEach(msg => {
      const wrapper = document.createElement("div");
      wrapper.className = "message " + msg.role;

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = msg.role === "user" ? "Tú" : "G";

      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = msg.parts[0].text;

      wrapper.appendChild(avatar);
      wrapper.appendChild(bubble);
      elements.messages.appendChild(wrapper);
    });

    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  let conversation = [];

  function appendMessage(role, text) {
    conversation.push({ role, parts: [{ text }] });
    updateActiveSession();
    renderMessages();
  }

  elements.composer.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = elements.prompt.value.trim();
    if (!text) return;

    appendMessage("user", text);
    elements.prompt.value = "";

    try {
      const res = await fetch("https://multiplicatively-stumpless-wes.ngrok-free.dev/webhook/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: getActiveSessionId(),
          model: elements.modelSelect.value
        })
      });

      const data = await res.json();
      appendMessage("model", data.output || "Sin respuesta.");

    } catch {
      appendMessage("model", "Error de conexión.");
    }
  });

  elements.newChatBtn.addEventListener("click", createNewSession);

  if (!getActiveSessionId()) {
    createNewSession();
  } else {
    loadSession(getActiveSessionId());
  }

  renderSessions();

});
