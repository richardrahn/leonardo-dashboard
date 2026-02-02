// Chat functionality

let currentFile = null;

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

        // Scroll to bottom with extra offset
        setTimeout(() => {
            container.scrollTop = container.scrollHeight + 100;
        }, 10);
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

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = input.value.trim();

    if (!message && !currentFile) return;

    // Clear empty state if present
    const emptyState = document.querySelector('#chat-messages .empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // Disable input while sending
    input.disabled = true;
    sendBtn.disabled = true;

    let fullMessage = message;
    
    // Handle file upload if present
    if (currentFile) {
        try {
            appendMessage('user', `📎 Uploading ${currentFile.name}...`, new Date().toISOString());
            
            const filePath = await uploadFile(currentFile);
            fullMessage = `[File uploaded: ${currentFile.name} at ${filePath}]\n\n${message}`;
            
            // Clear the uploading message and show final message
            const messages = document.querySelectorAll('.chat-message');
            const lastMessage = messages[messages.length - 1];
            if (lastMessage) lastMessage.remove();
            
            clearFileUpload();
        } catch (error) {
            showToast('File upload failed: ' + error.message, 'error');
            input.disabled = false;
            sendBtn.disabled = false;
            return;
        }
    }

    // Append user message immediately
    appendMessage('user', fullMessage, new Date().toISOString());

    // Send to server via Socket.io
    socket.emit('chat:message', { message: fullMessage });

    // Clear input
    input.value = '';

    // Re-enable after a short delay (response will re-enable fully)
    setTimeout(() => {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }, 100);

    // Safety fallback - always re-enable after 30 seconds
    setTimeout(() => {
        input.disabled = false;
        sendBtn.disabled = false;
    }, 30000);
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

    // Add speaker button for assistant messages
    if (role === 'assistant' && window.speechManager) {
        const speakerBtn = window.speechManager.addSpeakerButton(messageDiv, content);
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center justify-between mb-1';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'text-xs font-semibold text-slate-400';
        labelSpan.textContent = 'Leonardo';
        
        headerDiv.appendChild(labelSpan);
        headerDiv.appendChild(speakerBtn);
        
        messageDiv.insertBefore(headerDiv, messageDiv.firstChild);
        
        // Auto-play if enabled
        if (window.speechManager.autoPlayTTS) {
            window.speechManager.speak(content, true);
        }
    }

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
        // Add extra offset to ensure bottom message isn't cut off
        setTimeout(() => {
            container.scrollTop = container.scrollHeight + 100;
        }, 10);
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

// File upload functionality
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    currentFile = file;
    
    // Show preview
    const preview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-preview-name');
    const fileSize = document.getElementById('file-preview-size');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    preview.classList.remove('hidden');
    
    // Focus on input
    document.getElementById('chat-input').focus();
}

function clearFileUpload() {
    currentFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').classList.add('hidden');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/chat/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        return data.path;
    } catch (error) {
        console.error('File upload error:', error);
        throw error;
    }
}
