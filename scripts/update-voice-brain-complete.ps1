# Simple Voice Brain Update Script
param(
    [string]$RepoPath = "..\",
    [switch]$Deploy,
    [string]$CommitMessage = "Update Voice Brain with enhanced UI and Neo4j module"
)

Write-Host "Voice Brain Update Script" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Resolve path
$RepoPath = Resolve-Path $RepoPath -ErrorAction Stop

# Create modules directory
$modulesPath = Join-Path $RepoPath "modules"
if (!(Test-Path $modulesPath)) {
    New-Item -ItemType Directory -Path $modulesPath -Force | Out-Null
}

# Update bookmarklet.txt
Write-Host "`nUpdating bookmarklet.txt..." -ForegroundColor Green
$bookmarkletContent = 'javascript:(function(){const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);const baseUrl = ''https://jjrasche.github.io/voice-brain-assistant'';if (isMobile) {if (''standalone'' in navigator && navigator.standalone) {alert(''Voice Brain already active!'');} else {window.open(baseUrl + ''?install=true'', ''_blank'');}} else {if (window.vbCleanup) window.vbCleanup();const script = document.createElement(''script'');script.src = baseUrl + ''/desktop.js?v='' + Date.now();script.onerror = () => alert(''Failed to load Voice Brain'');script.onload = () => {console.log(''Voice Brain Desktop loaded'');if (window.initVoiceBrain) {window.initVoiceBrain({mode:''desktop'', keepAlive:true, ai:{endpoint:'''', key:''''}});}};document.head.appendChild(script);}})();'

Set-Content -Path (Join-Path $RepoPath "bookmarklet.txt") -Value $bookmarkletContent -Encoding UTF8

# Copy desktop.js from existing file if available
$desktopJsSource = Join-Path $RepoPath "desktop.js"
if (Test-Path $desktopJsSource) {
    Write-Host "desktop.js already exists, skipping..." -ForegroundColor Yellow
} else {
    Write-Host "Creating desktop.js..." -ForegroundColor Green
    Write-Host "Please manually copy desktop.js from the Claude artifacts" -ForegroundColor Yellow
}

# Copy Neo4j module
$neo4jSource = Join-Path $modulesPath "neo4j-second-brain.js"
if (Test-Path $neo4jSource) {
    Write-Host "Neo4j module already exists, skipping..." -ForegroundColor Yellow
} else {
    Write-Host "Creating basic Neo4j module..." -ForegroundColor Green
    
    # Create a simple Neo4j module
    $neo4jContent = @'
// Neo4j Second Brain Module - Mock Mode
(function() {
    'use strict';
    
    window.VoiceBrainModules = window.VoiceBrainModules || {};
    
    window.VoiceBrainModules.neo4j = {
        metadata: {
            name: 'neo4j-second-brain',
            version: '1.0.0',
            description: 'Mock Neo4j knowledge graph for testing'
        },
        
        config: { mockMode: true },
        
        async init(config) {
            this.config = Object.assign({}, this.config, config);
            return { success: true, mockMode: true };
        },
        
        async execute(request) {
            const mockNotes = [
                { n: { title: 'Voice Brain Architecture', content: 'Building voice-first AI' }},
                { n: { title: 'Machine Learning Notes', content: 'Neural networks and transformers' }},
                { n: { title: 'Project Ideas', content: 'Voice assistant improvements' }}
            ];
            
            return {
                success: true,
                result: mockNotes.slice(0, 3),
                timestamp: new Date().toISOString()
            };
        },
        
        async getSchema() {
            return {
                labels: { Note: ['title', 'content'], Person: ['name'], Project: ['name'] },
                relationships: ['KNOWS', 'MENTIONS', 'TAGGED_WITH']
            };
        }
    };
})();
'@
    
    Set-Content -Path $neo4jSource -Value $neo4jContent -Encoding UTF8
}

# Update README if not exists
$readmePath = Join-Path $RepoPath "README.md"
if (!(Test-Path $readmePath)) {
    Write-Host "Creating README.md..." -ForegroundColor Green
    
    $readmeContent = @'
# Voice Brain Assistant

Control any website with your voice. Works on desktop (bookmarklet) and mobile (PWA).

## Installation

### Desktop
1. Visit https://jjrasche.github.io/voice-brain-assistant/install.html
2. Drag the bookmarklet to your bookmarks bar
3. Click it on any website to activate

### Mobile
1. Visit https://jjrasche.github.io/voice-brain-assistant
2. Install as PWA when prompted

## Voice Commands

- Navigation: "scroll down", "go to top", "go back"
- Input: "type [text]", "clear", "submit"
- Second Brain: "search for [query]", "save note [text]"
- Control: "help", "hide"

## Features

- Voice control for any website
- Interactive chat interface
- Neo4j second brain integration
- Full command list in UI
- Modular architecture
'@
    
    Set-Content -Path $readmePath -Value $readmeContent -Encoding UTF8
}

Write-Host "`nFiles updated successfully!" -ForegroundColor Green

# Deploy if requested
if ($Deploy) {
    if (Test-Path (Join-Path $RepoPath ".git")) {
        Write-Host "`nDeploying to GitHub..." -ForegroundColor Yellow
        
        Push-Location $RepoPath
        
        try {
            # Git operations
            git add .
            git commit -m $CommitMessage
            git push
            
            Write-Host "`nDeployed successfully!" -ForegroundColor Green
            Write-Host "Your site: https://jjrasche.github.io/voice-brain-assistant/" -ForegroundColor Cyan
        }
        catch {
            Write-Host "Git operation failed: $_" -ForegroundColor Red
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host "`nNot a git repository!" -ForegroundColor Red
        Write-Host "Initialize git first in: $RepoPath" -ForegroundColor Yellow
    }
}
else {
    Write-Host "`nTo deploy: .\simple-update-voice-brain.ps1 -Deploy" -ForegroundColor Yellow
}

Write-Host "`nDone!" -ForegroundColor Green