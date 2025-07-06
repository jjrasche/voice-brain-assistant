# Voice Brain Assistant

Voice-controlled browser assistant via bookmarklet.

## Quick Start

Bookmark this code:
```javascript
javascript:(function(){if(window.vbAssistantCleanup)window.vbAssistantCleanup();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/jjrasche/voice-brain-assistant@main/dist/voice-assistant.js?v='+Date.now();document.head.appendChild(s);})();
```

## Commands
- scroll up/down
- go to top
- go back
- refresh
- clear
- send
- help

## Development
1. Edit src/voice-assistant.js
2. Run: npm run build
3. Push to GitHub
