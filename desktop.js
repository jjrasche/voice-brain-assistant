﻿// desktop.js - Desktop voice assistant (injected by bookmarklet)
(function() {
    'use strict';
    
    // Version info
    const VERSION = '1.2.0';
    const LAST_UPDATED = '2024-12-19 14:30:00 UTC';
    
    // Prevent multiple instances
    if (window.vbDesktop) return;
    
    // Log version info
    console.log(`🧠 Voice Brain Desktop v${VERSION} - Updated: ${LAST_UPDATED}`);
    
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
            this.isRestarting = false;
            this.restartAttempts = 0;
            this.maxRestartAttempts = 3;
            this.silentAudio = null;
            this.elements = {};
            
            this.init();
        }
        
        init() {
            try {
                console.log(`🔥 Voice Brain Desktop v${VERSION} initializing...`);
                this.debugLog('🔥 Voice Brain Desktop v' + VERSION + ' initializing...');
                this.injectStyles();
                this.createUI();
                this.setupRecognition();
                this.bindEvents();
                this.loadModules();
                
                // Show version notification
                this.showVersionNotification();
                
                // Auto-start with delay
                setTimeout(() => {
                    try {
                        this.debugLog('🎯 Auto-starting voice recognition...');
                        this.start();
                    } catch (error) {
                        this.debugLog('❌ Error in auto-start: ' + error.message);
                    }
                }, 1000);
            } catch (error) {
                console.error('❌ Fatal error in init:', error);
                this.debugLog('❌ Fatal error in init: ' + error.message);
            }
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
                    width: 400px;
                    height: 500px;
                    background: rgba(10, 10, 10, 0.95);
                    border-radius: 12px;
                    color: white;
                    display: none;
                    overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                }
                
                #vb-desktop-panel.show {
                    display: flex;
                    flex-direction: column;
                }
                
                .vb-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .vb-close {
                    font-size: 24px;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: opacity 0.2s;
                }
                
                .vb-close:hover {
                    opacity: 1;
                }
                
                .vb-tabs {
                    display: flex;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 5px;
                    gap: 5px;
                }
                
                .vb-tab {
                    flex: 1;
                    padding: 8px;
                    background: transparent;
                    border: none;
                    color: white;
                    cursor: pointer;
                    border-radius: 6px;
                    transition: all 0.2s;
                    font-size: 12px;
                }
                
                .vb-tab:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .vb-tab.active {
                    background: rgba(74, 144, 226, 0.3);
                }
                
                .vb-content {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }
                
                .vb-tab-content {
                    display: none;
                    height: 100%;
                    overflow-y: auto;
                    padding: 15px;
                }
                
                .vb-tab-content.active {
                    display: block;
                }
                
                .vb-chat-messages {
                    height: calc(100% - 50px);
                    overflow-y: auto;
                    padding-bottom: 10px;
                }
                
                .vb-chat-message {
                    margin-bottom: 10px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    max-width: 80%;
                }
                
                .vb-chat-message.user {
                    background: rgba(74, 144, 226, 0.2);
                    margin-left: auto;
                    text-align: right;
                }
                
                .vb-chat-message.ai {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .vb-chat-input-container {
                    display: flex;
                    gap: 10px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .vb-chat-input {
                    flex: 1;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    outline: none;
                }
                
                .vb-chat-input:focus {
                    border-color: rgba(74, 144, 226, 0.5);
                }
                
                .vb-command-section {
                    margin-bottom: 20px;
                }
                
                .vb-command-section h4 {
                    margin: 0 0 10px 0;
                    color: #4a90e2;
                }
                
                .vb-command-item {
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    margin-bottom: 5px;
                    font-size: 13px;
                }
                
                .vb-command-item strong {
                    color: #4a90e2;
                }
                
                .vb-status-bar {
                    padding: 10px 15px;
                    background: rgba(255, 255, 255, 0.05);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    font-size: 12px;
                }
                
                .vb-status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: #4a90e2;
                    border-radius: 50%;
                    margin-right: 8px;
                }
                
                .vb-modules-list {
                    display: grid;
                    gap: 10px;
                }
                
                .vb-module-item {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .vb-module-item h5 {
                    margin: 0 0 5px 0;
                    color: #4a90e2;
                }
                
                .vb-module-status {
                    font-size: 11px;
                    opacity: 0.7;
                }
                
                .vb-command-history {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .vb-command-entry {
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    font-size: 12px;
                    display: flex;
                    justify-content: space-between;
                }
                
                #vb-transcript-overlay {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    width: 500px;
                    height: 200px;
                    background: rgba(0, 0, 0, 1);
                    color: white;
                    padding: 10px;
                    border-radius: 8px;
                    border: 2px solid #4a90e2;
                    font-family: -apple-system, system-ui, sans-serif;
                    font-size: 11px;
                    line-height: 1.3;
                    z-index: 999998;
                    overflow-y: auto;
                    opacity: 1;
                    transform: translateY(0);
                    transition: all 0.3s ease;
                    pointer-events: all;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.8);
                }
                
                #vb-transcript-overlay.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                #vb-transcript-overlay.listening {
                    border-color: #4a90e2;
                    box-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
                }
                
                .vb-transcript-text {
                    margin-bottom: 8px;
                    padding: 4px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    word-wrap: break-word;
                }
                
                .vb-transcript-text:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                
                .vb-transcript-interim {
                    color: #999;
                    font-style: italic;
                    opacity: 0.8;
                }
                
                .vb-transcript-final {
                    color: #fff;
                    font-weight: normal;
                }
                
                .vb-transcript-command {
                    color: #4a90e2;
                    font-weight: bold;
                }
                
                .vb-transcript-timestamp {
                    font-size: 9px;
                    color: #666;
                    float: right;
                    margin-left: 10px;
                }
                
                .vb-transcript-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .vb-transcript-title {
                    font-size: 12px;
                    font-weight: bold;
                    color: #4a90e2;
                }
                
                .vb-transcript-controls {
                    display: flex;
                    gap: 5px;
                }
                
                .vb-transcript-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 9px;
                    transition: all 0.2s;
                }
                
                .vb-transcript-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .vb-debug-text {
                    color: #666;
                    font-size: 9px;
                    margin-bottom: 3px;
                    font-family: monospace;
                }
                
                .vb-debug-text span {
                    color: #999;
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
            
            // Extended panel with tabs
            const panel = document.createElement('div');
            panel.id = 'vb-desktop-panel';
            panel.innerHTML = `
                <div class="vb-header">
                    <h3 style="margin: 0;">🧠 Voice Brain Assistant</h3>
                    <span class="vb-close" onclick="this.closest('#vb-desktop-panel').classList.remove('show')">×</span>
                </div>
                
                <div class="vb-tabs">
                    <button class="vb-tab active" onclick="window.vbDesktop.switchTab('chat')">💬 Chat</button>
                    <button class="vb-tab" onclick="window.vbDesktop.switchTab('commands')">📋 Commands</button>
                    <button class="vb-tab" onclick="window.vbDesktop.switchTab('modules')">🔧 Modules</button>
                    <button class="vb-tab" onclick="window.vbDesktop.switchTab('history')">📜 History</button>
                </div>
                
                <div class="vb-content">
                    <div id="vb-chat-tab" class="vb-tab-content active">
                        <div class="vb-chat-messages"></div>
                        <div class="vb-chat-input-container">
                            <input type="text" class="vb-chat-input" placeholder="Type or speak..." 
                                onkeypress="if(event.key==='Enter'){window.vbDesktop.sendChat(this.value);this.value=''}">
                            <button onclick="window.vbDesktop.toggleListening()">🎤</button>
                        </div>
                    </div>
                    
                    <div id="vb-commands-tab" class="vb-tab-content">
                        <div class="vb-command-section">
                            <h4>🔍 Navigation</h4>
                            <div class="vb-command-list">
                                <div class="vb-command-item">
                                    <strong>"scroll down/up"</strong> - Scroll the page
                                </div>
                                <div class="vb-command-item">
                                    <strong>"go to top/bottom"</strong> - Jump to page edges
                                </div>
                                <div class="vb-command-item">
                                    <strong>"go back/forward"</strong> - Browser navigation
                                </div>
                                <div class="vb-command-item">
                                    <strong>"refresh"</strong> - Reload the page
                                </div>
                            </div>
                        </div>
                        
                        <div class="vb-command-section">
                            <h4>✏️ Input</h4>
                            <div class="vb-command-list">
                                <div class="vb-command-item">
                                    <strong>"type [text]"</strong> - Type text in active field
                                </div>
                                <div class="vb-command-item">
                                    <strong>"clear"</strong> - Clear current input
                                </div>
                                <div class="vb-command-item">
                                    <strong>"submit"</strong> - Submit form or click submit
                                </div>
                            </div>
                        </div>
                        
                        <div class="vb-command-section">
                            <h4>🧠 Second Brain</h4>
                            <div class="vb-command-list">
                                <div class="vb-command-item">
                                    <strong>"search for [query]"</strong> - Search knowledge base
                                </div>
                                <div class="vb-command-item">
                                    <strong>"save note [content]"</strong> - Save to Neo4j
                                </div>
                                <div class="vb-command-item">
                                    <strong>"find notes about [topic]"</strong> - Topic search
                                </div>
                                <div class="vb-command-item">
                                    <strong>"show schema"</strong> - Display database structure
                                </div>
                            </div>
                        </div>
                        
                        <div class="vb-command-section">
                            <h4>🎤 Transcript</h4>
                            <div class="vb-command-list">
                                <div class="vb-command-item">
                                    <strong>"show transcript"</strong> - Show transcript overlay
                                </div>
                                <div class="vb-command-item">
                                    <strong>"hide transcript"</strong> - Hide transcript overlay
                                </div>
                                <div class="vb-command-item">
                                    <strong>"clear transcript"</strong> - Clear transcript history
                                </div>
                                <div class="vb-command-item">
                                    <strong>Ctrl+Shift+T</strong> - Toggle transcript overlay
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="vb-modules-tab" class="vb-tab-content">
                        <div class="vb-modules-list"></div>
                    </div>
                    
                    <div id="vb-history-tab" class="vb-tab-content">
                        <div class="vb-command-history"></div>
                    </div>
                </div>
                
                <div class="vb-status-bar">
                    <span class="vb-status-indicator">●</span>
                    <span class="vb-status-text">Ready</span>
                    <span class="vb-ai-indicator" style="float: right;">🤖 AI: <span class="vb-ai-status">Idle</span></span>
                </div>
            `;
            
            widget.appendChild(orb);
            widget.appendChild(feedback);
            widget.appendChild(panel);
            document.body.appendChild(widget);
            
            // Create transcript overlay
            const transcriptOverlay = document.createElement('div');
            transcriptOverlay.id = 'vb-transcript-overlay';
            transcriptOverlay.innerHTML = `
                <div class="vb-transcript-header">
                    <div class="vb-transcript-title">🎤 Voice Transcript</div>
                    <div class="vb-transcript-controls">
                        <button class="vb-transcript-btn" onclick="window.vbDesktop.clearTranscript()">Clear</button>
                        <button class="vb-transcript-btn" onclick="window.vbDesktop.toggleTranscriptOverlay()">Hide</button>
                    </div>
                </div>
                <div id="vb-transcript-content"></div>
            `;
            document.body.appendChild(transcriptOverlay);
            
            this.elements = { widget, orb, feedback, panel, transcriptOverlay };
            
            // Start AI ping interval
            this.startAIPing();
        }
        
        setupRecognition() {
            try {
                this.debugLog('🔧 Setting up speech recognition...');
                
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                
                if (!SpeechRecognition) {
                    this.debugLog('❌ Speech recognition not supported');
                    this.showFeedback('❌ Speech recognition not supported');
                    return;
                }
                
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = 'en-US';
                
                this.debugLog('✅ Speech recognition configured');
                
                this.recognition.onstart = () => {
                    try {
                        this.debugLog('🎤 Recognition started');
                        this.isListening = true;
                        this.isRestarting = false;
                        this.restartAttempts = 0;
                        this.elements.orb.classList.add('listening');
                        this.elements.transcriptOverlay.classList.add('listening');
                        this.showTranscriptOverlay();
                        this.showFeedback('🎤 Listening...');
                        this.startKeepAlive();
                    } catch (error) {
                        this.debugLog('❌ Error in onstart: ' + error.message);
                    }
                };
                
                this.recognition.onend = () => {
                    try {
                        this.debugLog('🔴 Recognition ended');
                        this.isListening = false;
                        this.elements.orb.classList.remove('listening');
                        this.elements.transcriptOverlay.classList.remove('listening');
                        this.stopKeepAlive();
                        
                        // Auto-restart with backoff if configured
                        if (this.config.keepAlive && !this.isRestarting && this.restartAttempts < this.maxRestartAttempts) {
                            this.isRestarting = true;
                            this.restartAttempts++;
                            const delay = Math.min(1000 * this.restartAttempts, 5000);
                            this.debugLog(`🔄 Auto-restarting in ${delay}ms... (attempt ${this.restartAttempts}/${this.maxRestartAttempts})`);
                            
                            setTimeout(() => {
                                try {
                                    if (document.hasFocus() && !this.isListening && this.isRestarting) {
                                        this.debugLog('🔄 Attempting restart...');
                                        this.start();
                                    }
                                } catch (error) {
                                    this.debugLog('❌ Error in restart attempt: ' + error.message);
                                    this.isRestarting = false;
                                }
                            }, delay);
                        } else if (this.restartAttempts >= this.maxRestartAttempts) {
                            this.debugLog('❌ Max restart attempts reached, stopping auto-restart');
                            this.isRestarting = false;
                            this.showFeedback('❌ Voice recognition stopped after multiple attempts');
                        }
                    } catch (error) {
                        this.debugLog('❌ Error in onend: ' + error.message);
                    }
                };
                
                this.recognition.onresult = (event) => {
                    try {
                        let finalTranscript = '';
                        let interimTranscript = '';
                        
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const transcript = event.results[i][0].transcript;
                            if (event.results[i].isFinal) {
                                finalTranscript += transcript;
                            } else {
                                interimTranscript += transcript;
                            }
                        }
                        
                        // Update transcript overlay
                        this.updateTranscriptOverlay(finalTranscript, interimTranscript);
                        
                        if (finalTranscript) {
                            this.debugLog('📝 Final transcript: ' + finalTranscript);
                            this.processCommand(finalTranscript.trim());
                            this.addToHistory(finalTranscript);
                        }
                    } catch (error) {
                        this.debugLog('❌ Error in onresult: ' + error.message);
                    }
                };
                
                this.recognition.onerror = (event) => {
                    try {
                        this.debugLog('❌ Recognition error: ' + event.error);
                        
                        // Handle specific error types
                        if (event.error === 'aborted') {
                            this.debugLog('🛑 Recognition was aborted - stopping restart attempts');
                            this.isRestarting = false;
                            this.restartAttempts = this.maxRestartAttempts; // Prevent further restarts
                            this.showFeedback('❌ Voice recognition aborted');
                        } else if (event.error === 'not-allowed') {
                            this.debugLog('🚫 Microphone permission denied');
                            this.isRestarting = false;
                            this.showFeedback('❌ Microphone permission denied');
                        } else if (event.error === 'no-speech') {
                            this.debugLog('🔇 No speech detected');
                            // Don't show feedback for no-speech errors
                        } else {
                            this.debugLog('❌ Other recognition error: ' + event.error);
                            this.showFeedback('❌ ' + event.error);
                        }
                    } catch (error) {
                        this.debugLog('❌ Error in onerror: ' + error.message);
                    }
                };
                
            } catch (error) {
                this.debugLog('❌ Fatal error setting up recognition: ' + error.message);
                this.showFeedback('❌ Failed to setup voice recognition');
            }
        }
        
        bindEvents() {
            // Orb click
            this.elements.orb.addEventListener('click', () => {
                this.toggle();
            });
            
            // Right-click or double-click for panel
            this.elements.orb.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.togglePanel();
            });
            
            this.elements.orb.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.togglePanel();
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ctrl+Shift+V to toggle
                if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                    e.preventDefault();
                    this.toggle();
                }
                
                // Ctrl+Shift+B to toggle panel
                if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                    e.preventDefault();
                    this.togglePanel();
                }
                
                // Ctrl+Shift+T to toggle transcript overlay
                if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                    e.preventDefault();
                    this.toggleTranscriptOverlay();
                }
                
                // Escape to stop or hide transcript
                if (e.key === 'Escape') {
                    if (this.isListening) {
                        this.stop();
                    } else if (this.elements.transcriptOverlay.classList.contains('show')) {
                        this.hideTranscriptOverlay();
                    }
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
                this.silentAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBShyw/Pedi4GI2ua59KwYRUKOZnY8tBwLQYjcMTy230yBSuEzvXfkU0KFWzA7OGdTg0PYqzn77ptHAU');
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
            
            // Add to chat
            this.addChatMessage(command, true);
            
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
            
            // Neo4j commands
            else if (cmd.startsWith('search for ')) {
                const query = command.substring(11);
                this.searchSecondBrain(query);
            } else if (cmd.startsWith('save note ')) {
                const content = command.substring(10);
                this.saveToSecondBrain(content);
            } else if (cmd.startsWith('find notes about ')) {
                const topic = command.substring(17);
                this.findNotesAbout(topic);
            } else if (cmd === 'show schema' || cmd === 'database schema') {
                this.showDatabaseSchema();
            }
            
            // Special commands
            else if (cmd.includes('help')) {
                this.showHelp();
            } else if (cmd.includes('hide')) {
                this.elements.widget.style.display = 'none';
                setTimeout(() => {
                    this.elements.widget.style.display = '';
                }, 5000);
            } else if (cmd.includes('show transcript') || cmd.includes('transcript')) {
                this.showTranscriptOverlay();
                this.showFeedback('Transcript overlay shown');
            } else if (cmd.includes('hide transcript')) {
                this.hideTranscriptOverlay();
                this.showFeedback('Transcript overlay hidden');
            } else if (cmd.includes('clear transcript')) {
                this.clearTranscript();
                this.showFeedback('Transcript cleared');
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
                'search for [query]', 'save note [text]',
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
            entry.innerHTML = `
                <span>${new Date().toLocaleTimeString()}</span>
                <span>${command}</span>
            `;
            history.insertBefore(entry, history.firstChild);
            
            // Keep only last 20
            while (history.children.length > 20) {
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
            try {
                this.debugLog('🚀 Starting voice recognition...');
                
                // Prevent multiple instances
                if (this.isListening) {
                    this.debugLog('⚠️ Already listening, skipping start');
                    return;
                }
                
                if (this.isRestarting && this.restartAttempts >= this.maxRestartAttempts) {
                    this.debugLog('⚠️ Max restart attempts reached, skipping start');
                    return;
                }
                
                if (!this.recognition) {
                    this.debugLog('❌ No recognition object available');
                    return;
                }
                
                this.debugLog('🎯 Calling recognition.start()');
                this.recognition.start();
                
            } catch (error) {
                this.debugLog('❌ Error starting recognition: ' + error.message);
                this.showFeedback('❌ Failed to start listening');
                
                // Reset restart flag on error
                this.isRestarting = false;
            }
        }
        
        stop() {
            try {
                this.debugLog('🛑 Stopping voice recognition...');
                
                // Stop any restart attempts
                this.isRestarting = false;
                this.restartAttempts = 0;
                
                if (this.recognition && this.isListening) {
                    this.debugLog('🎯 Calling recognition.stop()');
                    this.recognition.stop();
                    this.isListening = false;
                    this.debugLog('✅ Recognition stopped');
                } else if (!this.isListening) {
                    this.debugLog('⚠️ Not listening, skipping stop');
                } else {
                    this.debugLog('❌ No recognition object available');
                }
            } catch (error) {
                this.debugLog('❌ Error stopping recognition: ' + error.message);
                this.showFeedback('❌ Failed to stop listening');
            }
        }
        
        destroy() {
            this.stop();
            this.stopKeepAlive();
            this.stopAIPing();
            this.elements.widget.remove();
            
            // Clean up events
            document.removeEventListener('keydown', this.keyHandler);
            document.removeEventListener('visibilitychange', this.visibilityHandler);
        }
        
        // Add debug logging function
        debugLog(message) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[VB Debug ${timestamp}] ${message}`);
            
            // Also add to transcript overlay for visual debugging
            if (this.elements?.transcriptOverlay) {
                try {
                    const content = document.getElementById('vb-transcript-content');
                    if (content) {
                        const debugDiv = document.createElement('div');
                        debugDiv.className = 'vb-debug-text';
                        debugDiv.style.cssText = 'color: #666; font-size: 10px; margin-bottom: 5px; font-family: monospace;';
                        debugDiv.innerHTML = `<span style="color: #999">${timestamp}</span> ${message}`;
                        content.appendChild(debugDiv);
                        content.scrollTop = content.scrollHeight;
                        
                        // Limit debug entries
                        const debugEntries = content.querySelectorAll('.vb-debug-text');
                        if (debugEntries.length > 30) {
                            debugEntries[0].remove();
                        }
                    }
                } catch (error) {
                    console.error('Error adding debug message to transcript:', error);
                }
            }
        }
        
        // New methods for enhanced UI
        togglePanel() {
            this.elements.panel.classList.toggle('show');
            if (this.elements.panel.classList.contains('show')) {
                this.updateModulesStatus();
            }
        }
        
        switchTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.vb-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.vb-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`vb-${tabName}-tab`).classList.add('active');
        }
        
        addChatMessage(message, isUser = false) {
            const chatMessages = this.elements.panel.querySelector('.vb-chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `vb-chat-message ${isUser ? 'user' : 'ai'}`;
            messageDiv.textContent = message;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        sendChat(text) {
            if (!text.trim()) return;
            
            this.addChatMessage(text, true);
            this.processCommand(text);
        }
        
        async startAIPing() {
            // Check AI every 30 seconds
            this.aiPingInterval = setInterval(async () => {
                if (this.config.aiEndpoint) {
                    this.updateAIStatus('Pinging...');
                    try {
                        const response = await fetch(this.config.aiEndpoint + '/health', {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${this.config.aiKey}`
                            }
                        });
                        
                        if (response.ok) {
                            this.updateAIStatus('Connected');
                            const data = await response.json();
                            if (data.message) {
                                this.addChatMessage(`AI: ${data.message}`);
                            }
                        } else {
                            this.updateAIStatus('Error');
                        }
                    } catch (error) {
                        this.updateAIStatus('Offline');
                    }
                } else {
                    this.updateAIStatus('Not configured');
                }
            }, 30000);
            
            // Initial check
            this.updateAIStatus('Checking...');
        }
        
        stopAIPing() {
            if (this.aiPingInterval) {
                clearInterval(this.aiPingInterval);
            }
        }
        
        updateAIStatus(status) {
            const statusEl = this.elements.panel.querySelector('.vb-ai-status');
            if (statusEl) {
                statusEl.textContent = status;
            }
        }
        
        updateModulesStatus() {
            const modulesList = this.elements.panel.querySelector('.vb-modules-list');
            modulesList.innerHTML = '';
            
            // Built-in modules
            const builtInModules = [
                {
                    name: 'Voice Recognition',
                    status: this.recognition ? 'Active' : 'Not supported',
                    description: 'Speech-to-text using browser API'
                },
                {
                    name: 'Browser Control',
                    status: 'Active',
                    description: 'Navigate and control web pages'
                },
                {
                    name: 'Text Input',
                    status: 'Active',
                    description: 'Type and fill forms with voice'
                }
            ];
            
            // Check for loaded modules
            if (window.VoiceBrainModules) {
                for (const [key, module] of Object.entries(window.VoiceBrainModules)) {
                    builtInModules.push({
                        name: module.metadata?.name || key,
                        status: module.config?.mockMode ? 'Mock Mode' : 'Connected',
                        description: module.metadata?.description || 'Custom module'
                    });
                }
            }
            
            // Display modules
            builtInModules.forEach(module => {
                const moduleDiv = document.createElement('div');
                moduleDiv.className = 'vb-module-item';
                moduleDiv.innerHTML = `
                    <h5>${module.name}</h5>
                    <div>${module.description}</div>
                    <div class="vb-module-status">Status: ${module.status}</div>
                `;
                modulesList.appendChild(moduleDiv);
            });
        }
        
        toggleListening() {
            this.toggle();
        }
        
        // Transcript overlay methods
        showTranscriptOverlay() {
            this.debugLog('📺 Showing transcript overlay');
            this.elements.transcriptOverlay.classList.add('show');
        }
        
        hideTranscriptOverlay() {
            this.debugLog('🙈 Hiding transcript overlay');
            this.elements.transcriptOverlay.classList.remove('show');
        }
        
        toggleTranscriptOverlay() {
            if (this.elements.transcriptOverlay.classList.contains('show')) {
                this.hideTranscriptOverlay();
            } else {
                this.showTranscriptOverlay();
            }
        }
        
        updateTranscriptOverlay(finalTranscript, interimTranscript) {
            try {
                this.debugLog('📝 Updating transcript overlay...');
                const content = document.getElementById('vb-transcript-content');
                if (!content) {
                    this.debugLog('❌ Transcript content element not found');
                    return;
                }
                
                // Clear existing interim text
                const existingInterim = content.querySelector('.vb-transcript-interim');
                if (existingInterim) {
                    existingInterim.remove();
                }
                
                // Add final transcript if we have it
                if (finalTranscript) {
                    this.debugLog('📝 Adding final transcript: ' + finalTranscript);
                    const finalDiv = document.createElement('div');
                    finalDiv.className = 'vb-transcript-text';
                    finalDiv.innerHTML = `
                        <span class="vb-transcript-final">${finalTranscript}</span>
                        <span class="vb-transcript-timestamp">${new Date().toLocaleTimeString()}</span>
                    `;
                    content.appendChild(finalDiv);
                    
                    // Check if this looks like a command
                    const isCommand = this.isCommandLike(finalTranscript);
                    if (isCommand) {
                        finalDiv.querySelector('.vb-transcript-final').className = 'vb-transcript-command';
                    }
                }
                
                // Add interim transcript if we have it
                if (interimTranscript) {
                    this.debugLog('💭 Adding interim transcript: ' + interimTranscript);
                    const interimDiv = document.createElement('div');
                    interimDiv.className = 'vb-transcript-text vb-transcript-interim';
                    interimDiv.innerHTML = `<span class="vb-transcript-interim">${interimTranscript}</span>`;
                    content.appendChild(interimDiv);
                }
                
                // Auto-scroll to bottom
                content.scrollTop = content.scrollHeight;
                
                // Limit the number of transcript entries
                const transcriptEntries = content.querySelectorAll('.vb-transcript-text:not(.vb-transcript-interim)');
                if (transcriptEntries.length > 10) {
                    transcriptEntries[0].remove();
                }
            } catch (error) {
                this.debugLog('❌ Error updating transcript overlay: ' + error.message);
            }
        }
        
        isCommandLike(text) {
            const commands = [
                'scroll', 'click', 'type', 'clear', 'submit', 'back', 'forward', 
                'refresh', 'search', 'save', 'find', 'ask', 'analyze', 'explain',
                'help', 'hide', 'show', 'go to', 'new tab'
            ];
            return commands.some(cmd => text.toLowerCase().includes(cmd));
        }
        
        clearTranscript() {
            const content = document.getElementById('vb-transcript-content');
            if (content) {
                content.innerHTML = '';
            }
        }
        
        // Neo4j integration methods
        async loadModules() {
            // Load Neo4j module
            const script = document.createElement('script');
            script.src = 'https://jjrasche.github.io/voice-brain-assistant/modules/neo4j-second-brain.js';
            script.onload = async () => {
                console.log('Neo4j module loaded');
                // Initialize with mock mode for now
                const result = await window.VoiceBrainModules.neo4j.init({
                    mockMode: true
                });
                console.log('Neo4j initialized:', result);
                this.addChatMessage('Neo4j module loaded in mock mode');
            };
            document.head.appendChild(script);
        }
        
        async searchSecondBrain(query) {
            if (!window.VoiceBrainModules?.neo4j) {
                this.showFeedback('Neo4j module not loaded');
                return;
            }
            
            this.showFeedback('Searching...');
            const result = await window.VoiceBrainModules.neo4j.execute({
                method: 'search',
                params: { query: query }
            });
            
            if (result.success && result.result.length > 0) {
                const items = result.result.slice(0, 3).map(item => 
                    item.n.title || item.n.name || 'Untitled'
                );
                this.addChatMessage(`Found ${result.result.length} results:\n• ${items.join('\n• ')}`);
                this.showFeedback(`Found ${result.result.length} results`, 3000);
            } else {
                this.addChatMessage('No results found for: ' + query);
                this.showFeedback('No results found');
            }
        }
        
        async saveToSecondBrain(content) {
            if (!window.VoiceBrainModules?.neo4j) {
                this.showFeedback('Neo4j module not loaded');
                return;
            }
            
            const result = await window.VoiceBrainModules.neo4j.execute({
                method: 'write',
                params: {
                    cypher: 'CREATE (n:Note {id: randomUUID(), title: $title, content: $content, created: timestamp()}) RETURN n',
                    parameters: {
                        title: content.split(' ').slice(0, 5).join(' '),
                        content: content
                    }
                }
            });
            
            if (result.success) {
                this.addChatMessage('Note saved: ' + content);
                this.showFeedback('✅ Saved to second brain');
            } else {
                this.showFeedback('❌ Failed to save');
            }
        }
        
        async findNotesAbout(topic) {
            if (!window.VoiceBrainModules?.neo4j) {
                this.showFeedback('Neo4j module not loaded');
                return;
            }
            
            const result = await window.VoiceBrainModules.neo4j.execute({
                method: 'query',
                params: {
                    cypher: `
                        MATCH (n:Note)
                        WHERE toLower(n.content) CONTAINS toLower($topic)
                           OR toLower(n.title) CONTAINS toLower($topic)
                        RETURN n.title as title, n.content as content
                        ORDER BY n.created DESC
                        LIMIT 5
                    `,
                    parameters: { topic: topic }
                }
            });
            
            if (result.success && result.result.length > 0) {
                const notes = result.result.map(n => n.title).join('\n• ');
                this.addChatMessage(`Notes about "${topic}":\n• ${notes}`);
                this.showFeedback(`Found ${result.result.length} notes`, 3000);
            } else {
                this.addChatMessage(`No notes found about "${topic}"`);
                this.showFeedback('No notes found');
            }
        }
        
        async showDatabaseSchema() {
            if (!window.VoiceBrainModules?.neo4j) {
                this.showFeedback('Neo4j module not loaded');
                return;
            }
            
            const result = await window.VoiceBrainModules.neo4j.execute({
                method: 'getSchema',
                params: {}
            });
            
            if (result.success) {
                const labels = Object.keys(result.result.labels || {}).join(', ');
                const relationships = (result.result.relationships || []).join(', ');
                this.addChatMessage(
                    `Database Schema:\nNode types: ${labels}\nRelationships: ${relationships}`
                );
                this.showFeedback('Schema loaded', 3000);
            }
        }
        
        showVersionNotification() {
            // Show version in console
            console.log(`📦 Voice Brain Desktop v${VERSION} - Last updated: ${LAST_UPDATED}`);
            
            // Show temporary notification
            this.showFeedback(`Voice Brain v${VERSION} loaded - Updated: ${LAST_UPDATED.split(' ')[0]}`, 4000);
            
            // Always show transcript overlay on startup
            this.showTranscriptOverlay();
            
            // Update status bar if available
            setTimeout(() => {
                const statusText = this.elements.panel?.querySelector('.vb-status-text');
                if (statusText) {
                    statusText.textContent = `v${VERSION} - Ready`;
                }
            }, 1000);
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
    
    // Initialize when loaded
    if (typeof window.initVoiceBrain === 'undefined') {
        window.initVoiceBrain = function(config) {
            window.vbDesktop = new VoiceBrainDesktop(config);
        };
    }
    
})();
