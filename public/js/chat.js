// Chat functionality

async function loadChatHistory() {
    try {
        const messages = await apiCall('/api/chat/history?limit=100');
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <p>No messages yet</p>
                    <p class="text-sm mt-2">Start a conversation with Leonardo</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            appendMessage(msg.role, msg.content, msg.timestamp, false);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Failed to load chat history:', error);
    }
}

function handleChatKeypress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = input.value.trim();

    if (!message) return;

    // Clear empty state if present
    const emptyState = document.querySelector('#chat-messages .empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // Append user message immediately
    appendMessage('user', message, new Date().toISOString());

    // Disable input while sending
    input.disabled = true;
    sendBtn.disabled = true;

    // Send to server via Socket.io
    socket.emit('chat:message', { message });

    // Clear input
    input.value = '';

    // Re-enable after a short delay (response will re-enable fully)
    setTimeout(() => {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }, 100);
}

function appendMessage(role, content, timestamp, scroll = true) {
    const container = document.getElementById('chat-messages');

    const messageWrapper = document.createElement('div');
    messageWrapper.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    // Configure marked for safe rendering
    marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false
    });

    // Render markdown content
    messageDiv.innerHTML = marked.parse(content);

    // Add timestamp
    if (timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'chat-timestamp';
        timeDiv.textContent = formatTimestamp(timestamp);
        messageDiv.appendChild(timeDiv);
    }

    messageWrapper.appendChild(messageDiv);
    container.appendChild(messageWrapper);

    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}

async function clearChat() {
    if (!confirm('Clear all chat history? This cannot be undone.')) return;

    try {
        await apiCall('/api/chat/clear', { method: 'DELETE' });
        const container = document.getElementById('chat-messages');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <p>No messages yet</p>
                <p class="text-sm mt-2">Start a conversation with Leonardo</p>
            </div>
        `;
    } catch (error) {
        console.error('Failed to clear chat:', error);
        alert('Failed to clear chat');
    }
}
