/**
 * Voicely Chat Widget Embed Script
 *
 * Usage: Add this to your website:
 * <script src="https://your-domain.com/chat-embed.js" data-supabase-url="YOUR_SUPABASE_URL"></script>
 *
 * Or with options:
 * <script
 *   src="https://your-domain.com/chat-embed.js"
 *   data-supabase-url="YOUR_SUPABASE_URL"
 *   data-position="bottom-right"
 *   data-color="#8B5CF6"
 *   data-title="Voicely"
 * ></script>
 */

(function() {
  'use strict';

  // Get configuration from script tag
  const scriptTag = document.currentScript;
  const config = {
    supabaseUrl: scriptTag?.getAttribute('data-supabase-url') || 'https://jldfxkbczzxawdqsznze.supabase.co',
    position: scriptTag?.getAttribute('data-position') || 'bottom-right',
    color: scriptTag?.getAttribute('data-color') || '#8B5CF6',
    title: scriptTag?.getAttribute('data-title') || 'Voicely',
    subtitle: scriptTag?.getAttribute('data-subtitle') || 'פיתוח קול והעצמה רגשית',
  };

  // Styles
  const styles = `
    #voicely-chat-widget {
      font-family: 'Assistant', 'Segoe UI', sans-serif;
      direction: rtl;
    }
    #voicely-chat-button {
      position: fixed;
      bottom: 20px;
      ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${config.color};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    #voicely-chat-button:hover {
      transform: scale(1.1);
    }
    #voicely-chat-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    #voicely-chat-window {
      position: fixed;
      bottom: 90px;
      ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 550px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    #voicely-chat-window.open {
      display: flex;
    }
    #voicely-chat-header {
      background: ${config.color};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #voicely-chat-header-icon {
      width: 44px;
      height: 44px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    #voicely-chat-header-text h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
    }
    #voicely-chat-header-text p {
      margin: 2px 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    #voicely-chat-close {
      margin-right: auto;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
    }
    #voicely-chat-close:hover {
      background: rgba(255,255,255,0.2);
    }
    #voicely-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8f9fa;
    }
    .voicely-message {
      margin-bottom: 12px;
      display: flex;
    }
    .voicely-message.user {
      justify-content: flex-start;
    }
    .voicely-message.assistant {
      justify-content: flex-end;
    }
    .voicely-message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .voicely-message.user .voicely-message-bubble {
      background: #e9ecef;
      color: #333;
      border-top-right-radius: 4px;
    }
    .voicely-message.assistant .voicely-message-bubble {
      background: ${config.color};
      color: white;
      border-top-left-radius: 4px;
    }
    #voicely-chat-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .voicely-suggestion {
      padding: 8px 14px;
      border: 2px solid ${config.color};
      border-radius: 20px;
      background: white;
      color: ${config.color};
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .voicely-suggestion:hover {
      background: ${config.color}11;
    }
    #voicely-chat-input-container {
      padding: 12px 16px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
    }
    #voicely-chat-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
    }
    #voicely-chat-input:focus {
      border-color: ${config.color};
    }
    #voicely-chat-send {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${config.color};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #voicely-chat-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #voicely-chat-send svg {
      width: 20px;
      height: 20px;
      fill: white;
    }
    .voicely-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }
    .voicely-typing span {
      width: 8px;
      height: 8px;
      background: rgba(255,255,255,0.7);
      border-radius: 50%;
      animation: voicelyBounce 1.4s infinite both;
    }
    .voicely-typing span:nth-child(2) { animation-delay: 0.2s; }
    .voicely-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes voicelyBounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .voicely-lead-form {
      background: white;
      padding: 16px;
      border-radius: 12px;
      margin: 8px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .voicely-lead-form input {
      width: 100%;
      padding: 10px 12px;
      margin-bottom: 8px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      box-sizing: border-box;
    }
    .voicely-lead-form button {
      width: 100%;
      padding: 12px;
      background: ${config.color};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }
    .voicely-booking-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 8px 0;
    }
    .voicely-booking-option {
      display: block;
      padding: 12px 16px;
      background: ${config.color};
      color: white;
      text-decoration: none;
      border-radius: 8px;
      text-align: center;
      font-size: 14px;
    }
    .voicely-booking-option:hover {
      opacity: 0.9;
    }
  `;

  // Add styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Add Google Font
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  // Create widget HTML
  const widgetHTML = `
    <div id="voicely-chat-widget">
      <button id="voicely-chat-button" aria-label="פתח צ'אט">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 1 4.35L2 22l5.65-1C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.35 0-2.65-.3-3.85-.85l-.35-.15-3.3.85.85-3.3-.2-.35C4.3 14.65 4 13.35 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
      </button>
      <div id="voicely-chat-window">
        <div id="voicely-chat-header">
          <div id="voicely-chat-header-icon">🎤</div>
          <div id="voicely-chat-header-text">
            <h3>${config.title}</h3>
            <p>${config.subtitle}</p>
          </div>
          <button id="voicely-chat-close" aria-label="סגור צ'אט">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div id="voicely-chat-messages"></div>
        <div id="voicely-chat-input-container">
          <input type="text" id="voicely-chat-input" placeholder="כתוב הודעה..." />
          <button id="voicely-chat-send" aria-label="שלח">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Add widget to page
  const container = document.createElement('div');
  container.innerHTML = widgetHTML;
  document.body.appendChild(container.firstElementChild);

  // Widget state
  let messages = [];
  let sessionId = null;
  let visitorInfo = {};
  let isLoading = false;

  // DOM elements
  const chatButton = document.getElementById('voicely-chat-button');
  const chatWindow = document.getElementById('voicely-chat-window');
  const chatClose = document.getElementById('voicely-chat-close');
  const messagesContainer = document.getElementById('voicely-chat-messages');
  const chatInput = document.getElementById('voicely-chat-input');
  const chatSend = document.getElementById('voicely-chat-send');

  // Initial message
  addMessage('assistant', 'שלום! 🎤 איך אוכל לעזור לך היום?');
  showSuggestions();

  // Event listeners
  chatButton.addEventListener('click', () => {
    chatWindow.classList.add('open');
    chatButton.style.display = 'none';
    chatInput.focus();
  });

  chatClose.addEventListener('click', () => {
    chatWindow.classList.remove('open');
    chatButton.style.display = 'flex';
  });

  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  function addMessage(role, content) {
    messages.push({ role, content, timestamp: new Date() });
    const messageEl = document.createElement('div');
    messageEl.className = `voicely-message ${role}`;
    messageEl.innerHTML = `<div class="voicely-message-bubble">${escapeHtml(content)}</div>`;
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showSuggestions() {
    const suggestions = [
      'שיעור ניסיון 20 דק (חינם)',
      'Voicely Juniors - בני נוער שרים בקבוצה',
      'לקבוע שיעור בתשלום'
    ];

    const suggestionsEl = document.createElement('div');
    suggestionsEl.id = 'voicely-chat-suggestions';
    suggestionsEl.innerHTML = suggestions.map(s =>
      `<button class="voicely-suggestion">${escapeHtml(s)}</button>`
    ).join('');
    messagesContainer.appendChild(suggestionsEl);

    suggestionsEl.querySelectorAll('.voicely-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        suggestionsEl.remove();
        chatInput.value = btn.textContent;
        sendMessage();
      });
    });
  }

  function showTyping() {
    const typingEl = document.createElement('div');
    typingEl.className = 'voicely-message assistant';
    typingEl.id = 'voicely-typing';
    typingEl.innerHTML = `<div class="voicely-message-bubble"><div class="voicely-typing"><span></span><span></span><span></span></div></div>`;
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    const typingEl = document.getElementById('voicely-typing');
    if (typingEl) typingEl.remove();
  }

  function showLeadForm() {
    const formEl = document.createElement('div');
    formEl.className = 'voicely-message assistant';
    formEl.innerHTML = `
      <div class="voicely-lead-form">
        <p style="margin: 0 0 12px; font-weight: 600;">השאר פרטים ונחזור אליך:</p>
        <input type="text" id="voicely-lead-name" placeholder="שם מלא *" required />
        <input type="tel" id="voicely-lead-phone" placeholder="טלפון *" required />
        <input type="email" id="voicely-lead-email" placeholder="אימייל" />
        <button id="voicely-lead-submit">שלח פרטים</button>
      </div>
    `;
    messagesContainer.appendChild(formEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    document.getElementById('voicely-lead-submit').addEventListener('click', () => {
      const name = document.getElementById('voicely-lead-name').value;
      const phone = document.getElementById('voicely-lead-phone').value;
      const email = document.getElementById('voicely-lead-email').value;

      if (!name || !phone) {
        alert('אנא מלא שם וטלפון');
        return;
      }

      visitorInfo = { name, phone, email };
      formEl.remove();
      addMessage('assistant', `תודה ${name}! 🙏 קיבלנו את הפרטים שלך ונחזור אליך בהקדם.`);

      // Save lead
      fetch(`${config.supabaseUrl}/functions/v1/save-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...visitorInfo, sessionId, source: 'chat_embed' })
      }).catch(() => {});
    });
  }

  function showBookingOptions(options) {
    const optionsEl = document.createElement('div');
    optionsEl.className = 'voicely-message assistant';
    optionsEl.innerHTML = `
      <div class="voicely-booking-options">
        ${options.map(opt =>
          `<a href="${escapeHtml(opt.url)}" target="_blank" class="voicely-booking-option">${escapeHtml(opt.label)}</a>`
        ).join('')}
      </div>
    `;
    messagesContainer.appendChild(optionsEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function sendMessage() {
    const content = chatInput.value.trim();
    if (!content || isLoading) return;

    // Remove suggestions if present
    const suggestionsEl = document.getElementById('voicely-chat-suggestions');
    if (suggestionsEl) suggestionsEl.remove();

    addMessage('user', content);
    chatInput.value = '';
    isLoading = true;
    chatSend.disabled = true;
    showTyping();

    try {
      const response = await fetch(`${config.supabaseUrl}/functions/v1/website-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          visitorInfo,
          sessionId
        })
      });

      const data = await response.json();
      hideTyping();

      if (data.sessionId) sessionId = data.sessionId;
      addMessage('assistant', data.message || 'מצטער, משהו השתבש.');

      // Handle actions
      if (data.action?.type === 'show_lead_form') {
        showLeadForm();
      } else if (data.action?.type === 'show_booking_options' && data.action.data?.options) {
        showBookingOptions(data.action.data.options);
      }
    } catch (error) {
      hideTyping();
      addMessage('assistant', 'אופס, משהו השתבש. נסה שוב בבקשה 🙏');
    } finally {
      isLoading = false;
      chatSend.disabled = false;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
