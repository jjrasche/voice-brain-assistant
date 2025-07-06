// Voice-Controlled Browser Assistant
(function() {
    'use strict';
    
    if (window.vbAssistant) return;
    
    const CONFIG = {
        ai: {
            endpoint: '',
            apiKey: '',
            model: 'gpt-4',
            enabled: false
        },
        aiInterval: 30000,
        accentColor: '#3b82f6'
    };
    
    window.vbAssistant = {
        recognition: null,
        isListening: false,
        elements: {},
        transcript: ''
    };
    
    const styles = `
        #vb-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: rgba(59, 130, 246, 0.1);
            border: 2px solid #3b82f6;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            z-index: 10000;
        }
        #vb-indicator.listening {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        #vb-feedback {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: system-ui, sans-serif;
            font-size: 16px;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s;
            z-index: 10001;
        }
        #vb-feedback.show {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    
    function createUI() {
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        
        const indicator = document.createElement('div');
        indicator.id = 'vb-indicator';
        indicator.textContent = 'ðŸŽ¤';
        indicator.onclick = toggleListening;
        document.body.appendChild(indicator);
        
        const feedback = document.createElement('div');
        feedback.id = 'vb-feedback';
        document.body.appendChild(feedback);
        
        window.vbAssistant.elements = { indicator, feedback };
    }
    
    function showFeedback(message) {
        const { feedback } = window.vbAssistant.elements;
        feedback.textContent = message;
        feedback.classList.add('show');
        setTimeout(() => feedback.classList.remove('show'), 2000);
    }
    
    function toggleListening() {
        if (window.vbAssistant.isListening) {
            stopListening();
        } else {
            startListening();
        }
    }
    
    function startListening() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showFeedback('Speech recognition not supported');
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            window.vbAssistant.isListening = true;
            window.vbAssistant.elements.indicator.classList.add('listening');
            showFeedback('Listening...');
        };
        
        recognition.onend = () => {
            window.vbAssistant.isListening = false;
            window.vbAssistant.elements.indicator.classList.remove('listening');
            setTimeout(() => {
                if (window.vbAssistant.isListening) recognition.start();
            }, 100);
        };
        
        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                processCommand(finalTranscript.trim());
                window.vbAssistant.transcript += finalTranscript + ' ';
            }
        };
        
        recognition.onerror = (event) => {
            if (event.error !== 'no-speech') {
                showFeedback('Error: ' + event.error);
            }
        };
        
        window.vbAssistant.recognition = recognition;
        recognition.start();
    }
    
    function stopListening() {
        if (window.vbAssistant.recognition) {
            window.vbAssistant.recognition.stop();
            window.vbAssistant.isListening = false;
        }
    }
    
    function processCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd.includes('scroll down')) {
            window.scrollBy(0, 500);
            showFeedback('Scrolling down');
        }
        else if (cmd.includes('scroll up')) {
            window.scrollBy(0, -500);
            showFeedback('Scrolling up');
        }
        else if (cmd.includes('go to top')) {
            window.scrollTo(0, 0);
            showFeedback('Top');
        }
        else if (cmd.includes('go back')) {
            window.history.back();
            showFeedback('Going back');
        }
        else if (cmd.includes('refresh')) {
            location.reload();
        }
        else if (cmd.includes('clear')) {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                active.value = '';
                showFeedback('Cleared');
            }
        }
        else if (cmd.includes('send')) {
            const sendBtn = document.querySelector('button[type="submit"]');
            if (sendBtn) {
                sendBtn.click();
                showFeedback('Sent');
            }
        }
        else if (cmd.includes('help')) {
            showFeedback('Commands: scroll, clear, send, help');
        }
        else {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                active.value += command + ' ';
                showFeedback('Typed: ' + command);
            }
        }
    }
    
    window.vbAssistantCleanup = function() {
        stopListening();
        document.getElementById('vb-indicator')?.remove();
        document.getElementById('vb-feedback')?.remove();
        delete window.vbAssistant;
        delete window.vbAssistantCleanup;
    };
    
    createUI();
    startListening();
    
    console.log('Voice Assistant loaded! Say "help" for commands.');
})();
