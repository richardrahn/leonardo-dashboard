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
            console.warn('Speech recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

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
            alert('Speech recognition not supported in this browser. Try Chrome or Edge.');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateMicButton(isActive) {
        const micBtn = document.getElementById('mic-btn');
        if (!micBtn) return;

        if (isActive) {
            micBtn.innerHTML = '🔴';
            micBtn.classList.add('bg-red-600', 'animate-pulse');
            micBtn.classList.remove('bg-slate-700');
        } else {
            micBtn.innerHTML = '🎤';
            micBtn.classList.remove('bg-red-600', 'animate-pulse');
            micBtn.classList.add('bg-slate-700');
        }
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.speechManager = new SpeechManager();
});
