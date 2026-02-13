document.addEventListener('DOMContentLoaded', function () {
  // Elementos DOM
  const elements = {
    modelSelect: document.getElementById('modelSelect'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    messages: document.getElementById('messages'),
    composer: document.getElementById('composer'),
    prompt: document.getElementById('prompt'),
    sendBtn: document.getElementById('sendBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    sessionsList: document.getElementById('sessionsList'),
    openSidebarBtn: document.getElementById('openSidebar'),
    closeSidebarBtn: document.getElementById('closeSidebar'),
    appContainer: document.getElementById('appContainer'),
  };

  // Variables globales
  let conversation = [];

  // Chats guardados en localStorage con estructura [{id, name, date, conversation}]
  let chats = JSON.parse(localStorage.getItem('chats') || '[]');
  let activeSessionId = localStorage.getItem('activeSessionId') || null;

  // Funciones para guardar y cargar chats
  function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('activeSessionId', activeSessionId);
  }

  function renderSessions() {
    elements.sessionsList.innerHTML = '';
    chats.forEach(({ id, name, date }) => {
      const div = document.createElement('div');
      div.className = 'session-item';
      if (id === activeSessionId) div.classList.add('active');
      div.dataset.id = id;

      div.innerHTML = `
        <div>${name}</div>
        <small>${new Date(date).toLocaleString()}</small>
        <span class="delete-btn" title="Eliminar chat">×</span>
      `;

      elements.sessionsList.appendChild(div);
    });
  }

  function loadConversation(id) {
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    conversation = chat.conversation || [];
    renderMessages();
  }

  function saveConversation() {
    const chat = chats.find((c) => c.id === activeSessionId);
    if (!chat) return;
    chat.conversation = conversation;
    chat.date = Date.now();
    saveChats();
    renderSessions();
  }

  // Crear nuevo chat con numeración automática
  function createNewChat() {
    // Obtener el mayor número en nombres de chats actuales
    const maxNum = chats.reduce((max, c) => {
      const match = c.name.match(/chat (\d+)/i);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const newNum = maxNum + 1;

    const newId = crypto.randomUUID();
    const newChat = {
      id: newId,
      name: `Chat ${newNum}`,
      date: Date.now(),
      conversation: [],
    };
    chats.push(newChat);
    activeSessionId = newId;
    saveChats();
    renderSessions();
    loadConversation(newId);
  }

  // Inicialización al cargar página
  if (chats.length === 0) {
    createNewChat();
  } else if (activeSessionId) {
    loadConversation(activeSessionId);
  } else {
    createNewChat();
  }

  // Eventos

  // Toggle sidebar
  elements.openSidebarBtn.addEventListener('click', () => {
    elements.appContainer.classList.remove('sidebar-collapsed');
  });

  elements.closeSidebarBtn.addEventListener('click', () => {
    elements.appContainer.classList.add('sidebar-collapsed');
  });

  // Nuevo chat
  elements.newChatBtn.addEventListener('click', () => {
    createNewChat();
  });

  // Selección y borrado de chats
  elements.sessionsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      // Borrar chat
      const idToDelete = e.target.parentElement.dataset.id;
      chats = chats.filter((c) => c.id !== idToDelete);

      if (idToDelete === activeSessionId) {
        if (chats.length > 0) {
          activeSessionId = chats[0].id;
          loadConversation(activeSessionId);
        } else {
          createNewChat();
        }
      }
      saveChats();
      renderSessions();
      return;
    }

    // Cambiar chat activo
    const sessionDiv = e.target.closest('.session-item');
    if (
      sessionDiv &&
      sessionDiv.dataset.id &&
      sessionDiv.dataset.id !== activeSessionId
    ) {
      activeSessionId = sessionDiv.dataset.id;
      loadConversation(activeSessionId);
      saveChats();
    }
  });

  // Ajusta altura textarea al escribir
  elements.prompt.addEventListener('input', function () {
    elements.prompt.style.height = 'auto';
    let newHeight = elements.prompt.scrollHeight;
    if (newHeight > 200) {
      newHeight = 200;
    }
    elements.prompt.style.height = newHeight + 'px';
  });

  // Enviar mensaje y actualizar conversación
  elements.composer.addEventListener('submit', async function (e) {
    e.preventDefault();

    let text = elements.prompt.value?.trim();
    if (!text) return;

    appendMessage('user', text, false);
    elements.prompt.value = '';
    elements.prompt.style.height = 'auto';
    setSendingState(true);

    try {
      // Aquí debes adaptar sessionId si usas uno distinto
      const sessionId = activeSessionId || crypto.randomUUID();

      const res = await fetch(
        'https://multiplicatively-stumpless-wes.ngrok-free.dev/webhook/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId: sessionId }),
        }
      );

      const data = await res.json();

      if (data.output) {
        appendMessage('model', data.output, false);
      } else {
        appendMessage('model', 'No se recibió respuesta del servidor.', true);
      }
    } catch (err) {
      appendMessage('model', 'Error de conexión con el backend.', true);
    }

    setSendingState(false);
  });

  // Guardar la conversación y mostrarla
  function appendMessage(role, text, isError) {
    conversation.push({ role: role, parts: [{ text: text }] });
    renderMessages(isError ? conversation.length - 1 : null, isError);
    scrollToBottom();
    saveConversation();
  }

  // Renderiza mensajes
  function renderMessages(errorIndex, isError) {
    elements.messages.innerHTML = '';
    conversation.forEach((msg, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'message ' + (msg.role === 'user' ? 'user' : 'model');

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = msg.role === 'user' ? 'Tú' : 'G';

      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      if (isError && i === errorIndex) {
        bubble.classList.add('error');
      }

      let bubbleText = '';
      if (msg && msg.parts && msg.parts[0] && msg.parts[0].text) {
        bubbleText = msg.parts[0].text;
      }
      bubble.textContent = bubbleText;

      wrapper.appendChild(avatar);
      wrapper.appendChild(bubble);
      elements.messages.appendChild(wrapper);
    });
  }

  // Desplaza scroll hacia abajo
  function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  // Estados de envío
  function setSendingState(isSending) {
    elements.sendBtn.disabled = isSending;
    elements.prompt.disabled = isSending;
  }

  // Borrar conversación actual
  elements.clearChatBtn.addEventListener('click', function () {
    let confirmDelete = confirm('¿Borrar toda la conversación?');
    if (!confirmDelete) return;
    conversation = [];
    renderMessages();
    saveConversation();
  });
});
