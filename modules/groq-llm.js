// Groq LLM Module for Voice Brain
// This module provides LLM capabilities using Groq's API

(function() {
    'use strict';
    
    // Module definition
    const GroqLLMModule = {
        // Module metadata
        metadata: {
            name: 'groq-llm',
            version: '1.0.0',
            description: 'Groq LLM integration for intelligent voice commands',
            author: 'Voice Brain',
            lastUpdated: '2024-12-19 14:30:00 UTC',
            
            usage: {
                description: 'Send prompts to Groq LLM and get intelligent responses',
                
                methods: {
                    complete: {
                        description: 'Get LLM completion for a prompt',
                        parameters: {
                            prompt: 'string - The prompt to send',
                            context: 'object - Optional page context'
                        }
                    },
                    
                    analyzeDOM: {
                        description: 'Analyze current page and suggest actions',
                        parameters: {
                            userIntent: 'string - What the user wants to do'
                        }
                    },
                    
                    understandCommand: {
                        description: 'Convert natural language to executable command',
                        parameters: {
                            command: 'string - Natural language command',
                            pageContext: 'object - Current page state'
                        }
                    }
                }
            }
        },
        
        // Configuration
        config: {
            apiKey: '', // Set via init or window.GROQ_API_KEY
            apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'mixtral-8x7b-32768', // Fast and capable
            temperature: 0.7,
            maxTokens: 1000,
            
            // DOM analysis settings
            maxElementsToAnalyze: 20,
            includeContext: true
        },
        
        // Initialize the module
        async init(customConfig = {}) {
            // Merge configs
            this.config = { ...this.config, ...customConfig };
            
            // Get API key from various sources
            this.config.apiKey = this.config.apiKey || 
                                window.GROQ_API_KEY || 
                                localStorage.getItem('groq_api_key') || '';
            
            // Replace the hardcoded API key with environment variable
            this.config.apiKey = this.config.apiKey || process.env.GROQ_API_KEY || '';
            
            // Make sure to validate the API key is present
            if (!this.config.apiKey) {
                console.warn('Groq API key not set. Use window.GROQ_API_KEY or pass in config');
                return { success: false, error: 'No API key' };
            }
            
            console.log(`🤖 Groq LLM module v${this.metadata.version} initialized - Updated: ${this.metadata.lastUpdated}`);
            return { success: true };
        },
        
        // Set API key after init
        setApiKey(apiKey) {
            this.config.apiKey = apiKey;
            localStorage.setItem('groq_api_key', apiKey);
            console.log('Groq API key updated');
        },
        
        // Main execution method
        async execute(request) {
            const { method, params } = request;
            
            if (!this[method]) {
                return {
                    success: false,
                    error: `Unknown method: ${method}`
                };
            }
            
            try {
                const result = await this[method](params);
                return {
                    success: true,
                    result: result,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        },
        
        // Get completion from Groq
        async complete(params) {
            const { prompt, context = {} } = params;
            
            // Build system message with context
            let systemMessage = `You are an intelligent voice assistant embedded in a web browser. 
You help users interact with web pages through natural language.
Current page: ${window.location.href}
Page title: ${document.title}`;
            
            if (context.focusedElement) {
                systemMessage += `\nUser is focused on: ${context.focusedElement}`;
            }
            
            const messages = [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt }
            ];
            
            return await this.callGroqAPI(messages);
        },
        
        // Analyze DOM and suggest actions
        async analyzeDOM(params) {
            const { userIntent } = params;
            
            // Get page context
            const context = this.extractPageContext();
            
            const prompt = `User wants to: "${userIntent}"
            
Page Context:
${JSON.stringify(context, null, 2)}

Analyze this page and suggest:
1. What element the user likely wants to interact with
2. The specific action to take
3. Any relevant information to help complete the task

Respond in JSON format:
{
  "targetElement": "CSS selector or description",
  "suggestedAction": "click|type|scroll|etc",
  "actionDetails": "specific details",
  "explanation": "why this makes sense"
}`;
            
            const messages = [
                { 
                    role: 'system', 
                    content: 'You are a web automation expert. Analyze pages and suggest precise actions.' 
                },
                { role: 'user', content: prompt }
            ];
            
            const response = await this.callGroqAPI(messages);
            
            try {
                return JSON.parse(response);
            } catch (e) {
                return { explanation: response };
            }
        },
        
        // Convert natural language to command
        async understandCommand(params) {
            const { command, pageContext = {} } = params;
            
            const prompt = `Convert this natural language command into a structured action:
Command: "${command}"

Available actions:
- type: {action: "type", text: "content", target: "selector"}
- click: {action: "click", target: "selector"}
- scroll: {action: "scroll", direction: "up|down", amount: pixels}
- navigate: {action: "navigate", url: "url"}
- extract: {action: "extract", target: "selector", attribute: "text|href|value"}

Page has these interactive elements:
${pageContext.interactiveElements || 'Unknown'}

Return ONLY a JSON object with the structured command.`;
            
            const messages = [
                { 
                    role: 'system', 
                    content: 'You convert natural language to structured commands. Return only valid JSON.' 
                },
                { role: 'user', content: prompt }
            ];
            
            const response = await this.callGroqAPI(messages);
            
            try {
                return JSON.parse(response);
            } catch (e) {
                // Fallback to basic parsing
                return this.fallbackCommandParsing(command);
            }
        },
        
        // Call Groq API
        async callGroqAPI(messages, options = {}) {
            if (!this.config.apiKey) {
                throw new Error('Groq API key not set');
            }
            
            const requestBody = {
                model: options.model || this.config.model,
                messages: messages,
                temperature: options.temperature || this.config.temperature,
                max_tokens: options.maxTokens || this.config.maxTokens,
                top_p: 1,
                stream: false
            };
            
            try {
                const response = await fetch(this.config.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Groq API error: ${response.status} - ${error}`);
                }
                
                const data = await response.json();
                return data.choices[0].message.content;
                
            } catch (error) {
                console.error('Groq API call failed:', error);
                throw error;
            }
        },
        
        // Extract context from current page
        extractPageContext() {
            const context = {
                url: window.location.href,
                title: document.title,
                headings: [],
                links: [],
                inputs: [],
                buttons: [],
                activeElement: null
            };
            
            // Get headings
            document.querySelectorAll('h1, h2, h3').forEach((h, i) => {
                if (i < 10) {
                    context.headings.push({
                        level: h.tagName,
                        text: h.textContent.trim().substring(0, 100)
                    });
                }
            });
            
            // Get visible inputs
            document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((input, i) => {
                if (i < this.config.maxElementsToAnalyze && this.isElementVisible(input)) {
                    context.inputs.push({
                        type: input.type || input.tagName.toLowerCase(),
                        name: input.name || input.id || `input-${i}`,
                        placeholder: input.placeholder || '',
                        value: input.value ? '(has value)' : '(empty)',
                        id: input.id,
                        selector: this.generateSelector(input)
                    });
                }
            });
            
            // Get visible buttons
            document.querySelectorAll('button, input[type="submit"], a.button, a.btn').forEach((btn, i) => {
                if (i < 10 && this.isElementVisible(btn)) {
                    context.buttons.push({
                        text: btn.textContent.trim().substring(0, 50),
                        type: btn.tagName.toLowerCase(),
                        selector: this.generateSelector(btn)
                    });
                }
            });
            
            // Get active element
            if (document.activeElement && document.activeElement !== document.body) {
                context.activeElement = {
                    tag: document.activeElement.tagName.toLowerCase(),
                    type: document.activeElement.type || null,
                    id: document.activeElement.id || null,
                    selector: this.generateSelector(document.activeElement)
                };
            }
            
            return context;
        },
        
        // Check if element is visible
        isElementVisible(element) {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0'
            );
        },
        
        // Generate CSS selector for element
        generateSelector(element) {
            if (element.id) {
                return `#${element.id}`;
            }
            
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.trim().split(/\s+/).slice(0, 2);
                if (classes.length > 0 && classes[0]) {
                    return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
                }
            }
            
            // Fallback to tag name with index
            const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
            const index = siblings.indexOf(element);
            return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
        },
        
        // Fallback command parsing
        fallbackCommandParsing(command) {
            const lower = command.toLowerCase();
            
            if (lower.includes('type ')) {
                return {
                    action: 'type',
                    text: command.replace(/type /i, ''),
                    target: 'activeElement'
                };
            }
            
            if (lower.includes('click ')) {
                return {
                    action: 'click',
                    target: command.replace(/click /i, '')
                };
            }
            
            if (lower.includes('scroll')) {
                return {
                    action: 'scroll',
                    direction: lower.includes('up') ? 'up' : 'down',
                    amount: 300
                };
            }
            
            return {
                action: 'unknown',
                originalCommand: command
            };
        }
    };
    
    // Export for Voice Brain
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GroqLLMModule;
    } else {
        window.VoiceBrainModules = window.VoiceBrainModules || {};
        window.VoiceBrainModules.groq = GroqLLMModule;
    }
    
})();