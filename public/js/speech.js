// Speech-to-Text and Text-to-Speech Module

class SpeechManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.isListening = false;
        this.autoPlayTTS = false;
        this.selectedVoice = null;
        
        this.initSpeechRecognition();
        this.loadVoices();
        this.loadPreferences();
    }

    // Speech-to-Text (STT) Setup
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            this.updateMicButtonDisabled();
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        console.log('Speech recognition initialized successfully');

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicButton(true);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateMicButton(false);
        };

        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            const input = document.getElementById('chat-input');
            if (input) {
                input.value = transcript;
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.updateMicButton(false);
        };
    }

    // Text-to-Speech (TTS) Setup
    loadVoices() {
        const loadVoiceList = () => {
            this.voices = this.synthesis.getVoices();
            
            // Prefer English voices
            const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
            
            // Set default voice (prefer Google or natural sounding ones)
            if (!this.selectedVoice && englishVoices.length > 0) {
                const preferred = englishVoices.find(v => 
                    v.name.includes('Google') || 
                    v.name.includes('Natural') ||
                    v.name.includes('Premium')
                );
                this.selectedVoice = preferred || englishVoices[0];
            }
            
            this.populateVoiceSelect();
        };

        // Voices may not be loaded immediately
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = loadVoiceList;
        }
        loadVoiceList();
    }

    populateVoiceSelect() {
        const select = document.getElementById('voice-select');
        if (!select || this.voices.length === 0) return;

        const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
        
        select.innerHTML = '<option value="">Default Voice</option>';
        englishVoices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (this.selectedVoice && voice.name === this.selectedVoice.name) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    // STT Controls
    toggleListening() {
        if (!this.recognition) {
            alert('Speech recognition not supported in this browser.\n\nSupported browsers:\n• Chrome/Edge (recommended)\n• Safari on macOS/iOS\n\nNot supported:\n• Firefox (limited support)\n• Older browsers');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Failed to start speech recognition:', error);
                if (error.name === 'NotAllowedError') {
                    alert('Microphone access denied.\n\nPlease:\n1. Click the 🔒 lock icon in your browser address bar\n2. Allow microphone access\n3. Reload the page and try again');
                } else {
                    alert('Could not start microphone: ' + error.message);
                }
            }
        }
    }

    updateMicButton(isActive) {
        const micBtn = document.getElementById('mic-btn');
        if (!micBtn) return;

        if (isActive) {
            micBtn.innerHTML = '🔴';
            micBtn.classList.add('bg-red-600', 'animate-pulse');
            micBtn.classList.remove('bg-slate-700');
            micBtn.title = 'Listening... (Click to stop)';
        } else {
            micBtn.innerHTML = '🎤';
            micBtn.classList.remove('bg-red-600', 'animate-pulse');
            micBtn.classList.add('bg-slate-700');
            micBtn.title = 'Click to speak (Speech-to-text)';
        }
    }

    updateMicButtonDisabled() {
        const micBtn = document.getElementById('mic-btn');
        if (!micBtn) return;

        micBtn.innerHTML = '🎤';
        micBtn.classList.add('opacity-50', 'cursor-not-allowed');
        micBtn.title = 'Speech recognition not supported in this browser. Try Chrome or Edge.';
        micBtn.disabled = true;
    }

    // TTS Controls
    speak(text, autoPlay = false) {
        if (!autoPlay && !this.autoPlayTTS) return;

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        this.synthesis.speak(utterance);
    }

    stopSpeaking() {
        this.synthesis.cancel();
    }

    setVoice(voiceName) {
        this.selectedVoice = this.voices.find(v => v.name === voiceName);
        this.savePreferences();
    }

    toggleAutoPlay() {
        this.autoPlayTTS = !this.autoPlayTTS;
        this.savePreferences();
        this.updateAutoPlayButton();
    }

    updateAutoPlayButton() {
        const btn = document.getElementById('autoplay-btn');
        if (!btn) return;

        if (this.autoPlayTTS) {
            btn.classList.add('bg-primary');
            btn.classList.remove('bg-slate-700');
            btn.title = 'Auto-play enabled';
        } else {
            btn.classList.remove('bg-primary');
            btn.classList.add('bg-slate-700');
            btn.title = 'Auto-play disabled';
        }
    }

    // Preferences
    savePreferences() {
        const prefs = {
            autoPlayTTS: this.autoPlayTTS,
            selectedVoice: this.selectedVoice?.name
        };
        localStorage.setItem('leonardo-speech-prefs', JSON.stringify(prefs));
    }

    loadPreferences() {
        const saved = localStorage.getItem('leonardo-speech-prefs');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.autoPlayTTS = prefs.autoPlayTTS || false;
                if (prefs.selectedVoice) {
                    setTimeout(() => {
                        this.setVoice(prefs.selectedVoice);
                    }, 500);
                }
            } catch (e) {
                console.error('Failed to load speech preferences:', e);
            }
        }
    }

    // Add speaker button to a message
    addSpeakerButton(messageElement, text) {
        const speakerBtn = document.createElement('button');
        speakerBtn.className = 'ml-2 p-1 text-slate-400 hover:text-white transition text-sm';
        speakerBtn.innerHTML = '🔊';
        speakerBtn.title = 'Read aloud';
        speakerBtn.onclick = (e) => {
            e.stopPropagation();
            this.speak(text, true);
        };
        
        return speakerBtn;
    }
}

// Initialize global speech manager
window.speechManager = null;

// Diagnostic function
function checkSpeechSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    
    console.log('=== Speech Support Diagnostic ===');
    console.log('Speech Recognition:', SpeechRecognition ? '✅ Supported' : '❌ Not supported');
    console.log('Speech Synthesis (TTS):', hasSpeechSynthesis ? '✅ Supported' : '❌ Not supported');
    console.log('Browser:', navigator.userAgent);
    console.log('HTTPS:', window.location.protocol === 'https:' ? '✅ Yes' : '⚠️ No (required for microphone)');
    console.log('================================');
    
    return {
        recognitionSupported: !!SpeechRecognition,
        synthesisSupported: hasSpeechSynthesis,
        isSecure: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const support = checkSpeechSupport();
    window.speechManager = new SpeechManager();
    
    // Show warning if not on HTTPS (except localhost)
    if (!support.isSecure && support.recognitionSupported) {
        console.warn('⚠️ Microphone access requires HTTPS or localhost');
    }
});
