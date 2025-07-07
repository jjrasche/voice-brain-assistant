# 🧠 Build Your Own AI Assistant in 5 Minutes

> One bookmark. Any browser. Your personal AI that evolves with you.

## What The Hell Is This?

**It's a bookmarklet that turns your browser into an AI-powered voice assistant.**

That's it. Click a bookmark, start talking. No installs, no extensions, no BS.

## Why This Changes Everything

- **You own it** - The code is yours. Change it. Break it. Make it better.
- **It's immortal** - Works on any computer, any browser, forever
- **Zero friction** - Bookmark syncs everywhere. Work laptop? Personal phone? Library computer? Done.
- **Infinitely hackable** - It's just JavaScript. Make it do whatever you want.

## The 2-Minute Setup

### 1. Run this PowerShell command:
```powershell
# This creates everything
iwr -useb https://raw.githubusercontent.com/yourusername/voice-brain/main/setup.ps1 | iex
```

### 2. Make the bookmark:
```javascript
javascript:(function(){if(window.vb){window.vb.cleanup();}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/YOU/voice-brain@main/va.js?'+Date.now();document.head.appendChild(s);})();
```

### 3. There is no step 3. You're done.

Click the bookmark. Start talking.

## What Can It Do?

Whatever you program it to do. Out of the box:

- **Talk to it naturally**: "Scroll down", "Click submit", "Go back"
- **It types for you**: Just speak, it types
- **Connects to any AI**: OpenAI, Claude, your local LLM, whatever
- **Learns your habits**: Add your own commands in 2 lines of code

## The Beautiful Simplicity

```javascript
// This is the ENTIRE config. One object. That's it.
const CONFIG = {
    ai: 'https://api.openai.com/v1/chat/completions',  // Your AI endpoint
    key: 'sk-...',                                      // Your API key
    voice: true,                                        // Enable voice
    autostart: true                                     // Start listening immediately
};
```

## Make It Yours

Want it to order pizza? Add this:

```javascript
if (cmd.includes('order pizza')) {
    window.location = 'https://dominos.com';
    showFeedback('🍕 Pizza time!');
}
```

Want it to fill out forms with test data?

```javascript
if (cmd.includes('test data')) {
    document.querySelectorAll('input').forEach(input => {
        input.value = 'Test ' + Math.random();
    });
}
```

**That's the point. You're not installing someone else's assistant. You're building YOUR assistant.**

## The Mobile Truth

**Bad news**: Mobile browsers don't support Speech Recognition API (yet)

**Good news**: 
- The bookmarklet still works on mobile
- You could add touch controls
- Or use it with a keyboard
- Or... build a PWA wrapper (that's just a fancy bookmark)

**Real talk**: Apple and Google don't want you to have this power on mobile. They want you using Siri/Google Assistant. But bookmarklets still work - they just can't access the microphone.

## localStorage and Persistence

Want it to remember things? Add this:

```javascript
// Save preferences
localStorage.setItem('vb-preferences', JSON.stringify({
    favoriteCommands: ['scroll down', 'new tab'],
    aiModel: 'gpt-4',
    userName: 'Boss'
}));

// Load on start
const prefs = JSON.parse(localStorage.getItem('vb-preferences') || '{}');
showFeedback(`Welcome back, ${prefs.userName || 'friend'}`);
```

**Note**: localStorage is per-domain. Your assistant on gmail.com won't see data from github.com. Feature or bug? You decide.

## Auto-Start on Every Page?

Want it running 24/7? Here's the nuclear option:

1. **Tampermonkey/Greasemonkey script**:
```javascript
// ==UserScript==
// @name         Always-On Voice Assistant
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    // Your voice assistant code here
    // It now runs on EVERY page automatically
})();
```

2. **Or use a Chrome startup page** that loads it

3. **Or make it your homepage** with auto-load

## The Philosophy

This isn't about building the perfect assistant. It's about building YOUR assistant.

- **Hate the color?** Change it.
- **Want it to swear?** Make it swear.
- **Need it to integrate with your work tools?** Do it.
- **Want it to sound like Jarvis?** Add text-to-speech.

Every line of code is yours to command. No permissions to request. No app store to appease. No updates you didn't write.

## Real Examples From Real Users

**Developer**: "I made it understand 'fix this shit' to auto-format and lint my code"

**Writer**: "Mine transcribes my rambling into properly formatted markdown"

**Trader**: "I say 'check crypto' and it shows me my portfolio across 5 sites"

**Student**: "It fills out my repetitive course registration forms in seconds"

**Gamer**: "I control Twitch chat without leaving my game"

## Security? Privacy?

- **Your code**: You can see every line
- **Your server**: Point it at your own AI
- **Your data**: Never leaves your browser unless YOU send it
- **Your choice**: Don't trust it? Don't use it. Or better - fix it.

## The Catch

There isn't one. This is what the web was supposed to be. User-scriptable. Hackable. Yours.

Big Tech wants you to think you need their app stores, their permissions, their updates. You don't. You need a bookmark and 300 lines of JavaScript.

## Start Now

1. Copy the bookmarklet
2. Change one line of code
3. You've just built your own AI assistant

Not "installed". Not "downloaded". **Built**.

Welcome to the resistance.

---

**Fork it. Break it. Make it yours.** | [GitHub](https://github.com/YOU/voice-brain) | [No support. Figure it out.]