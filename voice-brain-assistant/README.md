# 🧠 Voice Brain Assistant

Control any website with your voice. Works on desktop (bookmarklet) and mobile (PWA).

## Features

- 🎤 Voice control for any website
- 💬 Interactive chat interface
- 🧠 Neo4j second brain integration
- 📋 Full command list in UI
- 🔧 Modular architecture
- 🤖 AI assistant ready (30-second ping)

## Installation

### Desktop
1. Visit https://jjrasche.github.io/voice-brain-assistant/install.html
2. Drag the bookmarklet to your bookmarks bar
3. Click it on any website to activate

### Mobile
1. Visit https://jjrasche.github.io/voice-brain-assistant
2. Install as PWA when prompted
3. Launch from home screen

## Voice Commands

### Navigation
- "scroll down/up" - Scroll the page
- "go to top/bottom" - Jump to page edges
- "go back/forward" - Browser navigation
- "refresh" - Reload the page

### Input
- "type [text]" - Type text in active field
- "clear" - Clear current input
- "submit" - Submit form

### Second Brain (Neo4j)
- "search for [query]" - Search your knowledge base
- "save note [content]" - Save to Neo4j
- "find notes about [topic]" - Topic search
- "show schema" - Display database structure

### Control
- "help" - Show available commands
- "hide" - Temporarily hide the assistant

## UI Features

- **Double-click** or **right-click** the microphone orb to open the panel
- **Ctrl+Shift+V** - Toggle voice recognition
- **Ctrl+Shift+B** - Toggle panel
- **Escape** - Stop listening

## Neo4j Integration

The assistant includes a Neo4j module for second brain functionality. By default, it runs in mock mode for testing. To connect to your Neo4j server:

1. Edit `modules/neo4j-config.js`
2. Set your server URL and credentials
3. Set `mockMode: false`

## Development

Edit files locally and push to GitHub. The bookmarklet always loads the latest version.

```bash
# Deploy updates
git add .
git commit -m "Update Voice Brain"
git push
```

## Architecture

- `desktop.js` - Main voice assistant for desktop browsers
- `index.html` - PWA for mobile devices
- `modules/neo4j-second-brain.js` - Neo4j integration
- `bookmarklet.txt` - The bookmarklet code

## License

MIT - Do whatever you want with it
