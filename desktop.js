// desktop.js - Desktop voice assistant (injected by bookmarklet)
(function() {
    'use strict';
    
    // Prevent multiple instances
    if (window.vbDesktop) return;
    
    // Configuration
    const CONFIG = {
        keepAlive: true,
        position: 'bottom-right',
        aiEndpoint: '',
        aiKey: ''
    };
    
    // Global cleanup
    window.vbCleanup = function() {
        if (window.vbDesktop) {
            window.vbDesktop.destroy();
            delete window.vbDesktop;
            delete window.vbCleanup;
        }
    };
    
    // Main class
    class VoiceBrainDesktop {
        constructor(config) {
            this.config = { ...CONFIG, ...config };
            this.recognition = null;
            this.isListening = false;
            this.silentAudio = null;
            this.elements = {};
            
            this.init();
        }
        
        init() {
            this.injectStyles();
            this.createUI();
            this.setupRecognition();
            this.bindEvents();
            
            // Auto-start
            setTimeout(() => this.start(), 500);
        }
        
        injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #vb-desktop-widget {
                    position: fixed;
                    ${this.config.position.includes('bottom') ? 'bottom: 20px' : 'top: 20px'};
                    ${this.config.position.includes('right') ? 'right: 20px' : 'left: 20px'};
                    z-index: 999999;
                    font-family: -apple-system, system-ui, sans-serif;
                }
                
                #vb-desktop-orb {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #4a90e2, #357abd);
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    transition: all 0.3s;
                    position: relative;
                }
                
                #vb-desktop-orb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 30px rgba(74, 144, 226, 0.5);
                }
                
                #vb-desktop-orb.listening {
                    animation: vb-pulse 2s infinite;
                }
                
                #vb-desktop-orb.listening::after {
                    content: '';
                    position: absolute;
                    inset: -10px;
                    border-radius: 50%;
                    border: 2px solid rgba(74, 144, 226, 0.5);
                    animation: vb-ripple 2s infinite;
                }
                
                @keyframes vb-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                @keyframes vb-ripple {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                
                #vb-desktop-feedback {
                    position: absolute;
                    bottom: 70px;
                    right: 0;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 10px 15px;
                    border-radius: 8px;
                    white-space: nowrap;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.3s;
                    pointer-events: none;
                }
                
                #vb-desktop-feedback.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                #vb-desktop-panel {
                    position: absolute;
                    bottom: 70px;
                    right: 0;
                    width: 300px;
                    max-height: 400px;
                    background: rgba(0, 0, 0, 0.95);
                    border-radius: 12px;
                    padding: 15px;
                    color: white;
                    display: none;
                    overflow-y: auto;
                }
                
                #vb-desktop-panel.show {
                    display: block;
                }
                
                .vb-command-history {
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .vb-command-entry {
                    margin-bottom: 8px;
                    padding: 5px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    font-size: 12px;
                }
            `;
            document.head.appendChild(style);
        }
        
        createUI() {
            // Main widget container
            const widget = document.createElement('div');
            widget.id = 'vb-desktop-widget';
            
            // Voice orb
            const orb = document.createElement('div');
            orb.id = 'vb-desktop-orb';
            orb.innerHTML = '🎤';
            orb.title = 'Click to toggle voice input';
            
            // Feedback tooltip
            const feedback = document.createElement('div');
            feedback.id = 'vb-desktop-feedback';
            
            // Extended panel
            const panel = document.createElement('div');
            panel.id = 'vb-desktop-panel';
            panel.innerHTML = `
                <h3 style="margin: 0 0 10px 0;">Voice Brain</h3>
                <div class="vb-status">Ready</div>
                <div class="vb-command-history"></div>
            `;
            
            widget.appendChild(orb);
            widget.appendChild(feedback);
            widget.appendChild(panel);
            document.body.appendChild(widget);
            
            this.elements = { widget, orb, feedback, panel };
        }
        
        setupRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                this.showFeedback('❌ Speech recognition not supported');
                return;
            }
            
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.elements.orb.classList.add('listening');
                this.showFeedback('Listening...');
                this.startKeepAlive();
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.elements.orb.classList.remove('listening');
                this.stopKeepAlive();
                
                // Auto-restart if configured
                if (this.config.keepAlive) {
                    setTimeout(() => {
                        if (document.hasFocus()) {
                            this.start();
                        }
                    }, 100);
                }
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript) {
                    this.processCommand(finalTranscript.trim());
                    this.addToHistory(finalTranscript);
                }
            };
            
            this.recognition.onerror = (event) => {
                if (event.error !== 'no-speech') {
                    this.showFeedback('❌ ' + event.error);
                }
            };
        }
        
        bindEvents() {
            // Orb click
            this.elements.orb.addEventListener('click', () => {
                this.toggle();
            });
            
            // Right-click for panel
            this.elements.orb.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.elements.panel.classList.toggle('show');
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ctrl+Shift+V to toggle
                if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                    e.preventDefault();
                    this.toggle();
                }
                
                // Escape to stop
                if (e.key === 'Escape' && this.isListening) {
                    this.stop();
                }
            });
            
            // Page visibility
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.isListening) {
                    this.stop();
                }
            });
        }
        
        startKeepAlive() {
            if (!this.config.keepAlive) return;
            
            // Silent audio trick
            if (!this.silentAudio) {
                this.silentAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBShyw/Pedi4GI2ua59KwYRUKOZnY8tBwLQYjcMTy230yBSuEzvXfkU0KFWzA7OGdTg0PYqzn77ptHAUweM/03GwkBS+Gz/DbizEGHWq+8+mhVBAOX6/p8a1eGAg+l9n03GwkBSmDzPXgjEkIF2vE6+WdTg0PYqzn77ptHAU');
                this.silentAudio.loop = true;
                this.silentAudio.volume = 0.01;
            }
            
            this.silentAudio.play().catch(() => {});
        }
        
        stopKeepAlive() {
            if (this.silentAudio) {
                this.silentAudio.pause();
            }
        }
        
        processCommand(command) {
            const cmd = command.toLowerCase();
            
            // Page navigation
            if (cmd.includes('scroll down')) {
                window.scrollBy(0, 300);
                this.showFeedback('⬇️ Scrolled down');
            } else if (cmd.includes('scroll up')) {
                window.scrollBy(0, -300);
                this.showFeedback('⬆️ Scrolled up');
            } else if (cmd.includes('top')) {
                window.scrollTo(0, 0);
                this.showFeedback('⬆️ Top');
            } else if (cmd.includes('bottom')) {
                window.scrollTo(0, document.body.scrollHeight);
                this.showFeedback('⬇️ Bottom');
            }
            
            // Browser control
            else if (cmd.includes('back')) {
                history.back();
                this.showFeedback('⬅️ Back');
            } else if (cmd.includes('forward')) {
                history.forward();
                this.showFeedback('➡️ Forward');
            } else if (cmd.includes('refresh')) {
                location.reload();
            } else if (cmd.includes('new tab')) {
                window.open('', '_blank');
                this.showFeedback('📑 New tab');
            }
            
            // Text input
            else if (cmd.includes('type')) {
                const text = cmd.replace(/type\s+/i, '');
                this.typeText(text);
            } else if (cmd.includes('clear')) {
                this.clearInput();
            } else if (cmd.includes('submit') || cmd.includes('send')) {
                this.submitForm();
            }
            
            // Special commands
            else if (cmd.includes('help')) {
                this.showHelp();
            } else if (cmd.includes('hide')) {
                this.elements.widget.style.display = 'none';
                setTimeout(() => {
                    this.elements.widget.style.display = '';
                }, 5000);
            }
            
            // Default: type the command
            else {
                this.typeText(command);
            }
        }
        
        typeText(text) {
            const active = document.activeElement;
            
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.contentEditable === 'true')) {
                // Smart punctuation
                if (['what', 'when', 'where', 'who', 'why', 'how', 'is', 'are', 'can', 'could', 'would', 'should'].some(q => text.toLowerCase().startsWith(q))) {
                    text += '?';
                }
                
                // Insert text
                const event = new InputEvent('input', {
                    data: text,
                    inputType: 'insertText',
                    bubbles: true
                });
                
                if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
                    const start = active.selectionStart;
                    const end = active.selectionEnd;
                    const value = active.value;
                    active.value = value.slice(0, start) + text + ' ' + value.slice(end);
                    active.selectionStart = active.selectionEnd = start + text.length + 1;
                } else {
                    document.execCommand('insertText', false, text + ' ');
                }
                
                active.dispatchEvent(event);
                this.showFeedback('✏️ Typed');
            } else {
                this.showFeedback('❌ No input focused');
            }
        }
        
        clearInput() {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                active.value = '';
                active.dispatchEvent(new Event('input', { bubbles: true }));
                this.showFeedback('🧹 Cleared');
            }
        }
        
        submitForm() {
            const active = document.activeElement;
            const form = active ? active.closest('form') : null;
            
            if (form) {
                form.submit();
                this.showFeedback('📤 Submitted');
            } else {
                // Try to find a submit button
                const button = document.querySelector('button[type="submit"], input[type="submit"], button[class*="submit"]');
                if (button) {
                    button.click();
                    this.showFeedback('📤 Clicked submit');
                }
            }
        }
        
        showHelp() {
            const commands = [
                'scroll up/down', 'top/bottom',
                'back/forward', 'refresh', 'new tab',
                'type [text]', 'clear', 'submit',
                'help', 'hide'
            ];
            this.showFeedback('Commands: ' + commands.join(', '), 5000);
        }
        
        showFeedback(text, duration = 2000) {
            this.elements.feedback.textContent = text;
            this.elements.feedback.classList.add('show');
            
            clearTimeout(this.feedbackTimeout);
            this.feedbackTimeout = setTimeout(() => {
                this.elements.feedback.classList.remove('show');
            }, duration);
        }
        
        addToHistory(command) {
            const history = this.elements.panel.querySelector('.vb-command-history');
            const entry = document.createElement('div');
            entry.className = 'vb-command-entry';
            entry.textContent = new Date().toLocaleTimeString() + ' - ' + command;
            history.insertBefore(entry, history.firstChild);
            
            // Keep only last 10
            while (history.children.length > 10) {
                history.removeChild(history.lastChild);
            }
        }
        
        toggle() {
            if (this.isListening) {
                this.stop();
            } else {
                this.start();
            }
        }
        
        start() {
            if (this.recognition && !this.isListening) {
                this.recognition.start();
            }
        }
        
        stop() {
            if (this.recognition && this.isListening) {
                this.recognition.stop();
                this.isListening = false;
            }
        }
        
        destroy() {
            this.stop();
            this.stopKeepAlive();
            this.elements.widget.remove();
            
            // Clean up events
            document.removeEventListener('keydown', this.keyHandler);
            document.removeEventListener('visibilitychange', this.visibilityHandler);
        }
    }
    
    // Initialize
    window.vbDesktop = new VoiceBrainDesktop(window.vbConfig || {});
    
    // Public init function
    window.initVoiceBrain = function(config) {
        if (window.vbDesktop) {
            window.vbDesktop.destroy();
        }
        window.vbDesktop = new VoiceBrainDesktop(config);
    };
    
})();
