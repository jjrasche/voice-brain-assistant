// Neo4j Second Brain Module for Voice Brain
// This module allows the LLM to query your knowledge graph on a remote server

(function() {
    'use strict';
    
    // Module definition
    const Neo4jModule = {
        // Module metadata for LLM
        metadata: {
            name: 'neo4j-second-brain',
            version: '1.0.0',
            description: 'Query and update your Neo4j second brain knowledge graph',
            author: 'Voice Brain',
            lastUpdated: '2024-12-19 14:30:00 UTC',
            
            // Tell the LLM how to use this module
            usage: {
                description: 'Execute Cypher queries against the Neo4j database to retrieve or update knowledge',
                
                // Available methods
                methods: {
                    query: {
                        description: 'Execute a read-only Cypher query',
                        parameters: {
                            cypher: 'string - The Cypher query to execute',
                            parameters: 'object - Optional query parameters'
                        },
                        examples: [
                            {
                                input: {
                                    cypher: "MATCH (n:Note) WHERE n.title CONTAINS $keyword RETURN n LIMIT 10",
                                    parameters: { keyword: "AI" }
                                },
                                description: "Find notes containing 'AI'"
                            }
                        ]
                    },
                    
                    write: {
                        description: 'Execute a write Cypher query (create, update, delete)',
                        parameters: {
                            cypher: 'string - The Cypher query to execute',
                            parameters: 'object - Optional query parameters'
                        },
                        examples: [
                            {
                                input: {
                                    cypher: "CREATE (n:Note {title: $title, content: $content, created: timestamp()}) RETURN n",
                                    parameters: { title: "Meeting Notes", content: "Discussed project timeline..." }
                                },
                                description: "Create a new note"
                            }
                        ]
                    },
                    
                    search: {
                        description: 'Natural language search that converts to Cypher',
                        parameters: {
                            query: 'string - Natural language search query',
                            type: 'string - Optional node type to search (Note, Person, Project, etc)'
                        },
                        examples: [
                            {
                                input: {
                                    query: "notes about machine learning from last week",
                                    type: "Note"
                                },
                                description: "Search for recent ML notes"
                            }
                        ]
                    },
                    
                    getSchema: {
                        description: 'Get the database schema (node labels and relationship types)',
                        parameters: {},
                        examples: [
                            {
                                input: {},
                                description: "Retrieve all node labels and relationship types"
                            }
                        ]
                    }
                }
            }
        },
        
        // Configuration - Updated for server deployment
        config: {
            // HTTP endpoint for browser compatibility
            httpEndpoint: 'https://your-server.com:7474',  // Replace with your server
            username: 'neo4j',
            password: '',  // Will be set via init
            database: 'neo4j',
            
            // CORS proxy endpoint (optional - if you set up a proxy)
            proxyEndpoint: '',  // e.g., 'https://your-api.com/neo4j-proxy'
            
            // Query limits for safety
            maxResults: 100,
            queryTimeout: 30000,  // 30 seconds
            
            // Mock mode for testing without server
            mockMode: true
        },
        
        // Initialize the module
        async init(customConfig = {}) {
            // Merge custom config
            this.config = { ...this.config, ...customConfig };
            
            // Load config from window if available
            if (window.NEO4J_CONFIG) {
                this.config = { ...this.config, ...window.NEO4J_CONFIG };
            }
            
            console.log(`📊 Neo4j Second Brain v${this.metadata.version} initializing - Updated: ${this.metadata.lastUpdated}`);
            
            // Test connection
            try {
                if (this.config.mockMode) {
                    console.log('Neo4j running in mock mode');
                    return { success: true, mockMode: true };
                }
                
                // Try a simple query
                const result = await this.httpQuery('RETURN 1 as test', {});
                console.log('Neo4j Second Brain connected successfully');
                return { success: true };
            } catch (error) {
                console.error('Neo4j connection failed:', error);
                console.log('Falling back to mock mode');
                this.config.mockMode = true;
                return { success: true, mockMode: true, error: error.message };
            }
        },
        
        // Main entry point - handles all method calls
        async execute(request) {
            const { method, params } = request;
            
            // Validate method exists
            if (!this[method]) {
                return {
                    success: false,
                    error: `Unknown method: ${method}. Available methods: ${Object.keys(this.metadata.usage.methods).join(', ')}`
                };
            }
            
            try {
                // Call the requested method
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
        
        // Execute a read-only Cypher query
        async query(params) {
            const { cypher, parameters = {} } = params;
            
            // Add safety limit if not present
            let safeCypher = cypher;
            if (!cypher.toLowerCase().includes('limit')) {
                safeCypher += ` LIMIT ${this.config.maxResults}`;
            }
            
            if (this.config.mockMode) {
                return this.getMockData(cypher, parameters);
            }
            
            return await this.httpQuery(safeCypher, parameters);
        },
        
        // Execute a write Cypher query
        async write(params) {
            const { cypher, parameters = {} } = params;
            
            if (this.config.mockMode) {
                return [{ message: 'Mock mode: Write successful', id: Date.now() }];
            }
            
            return await this.httpQuery(cypher, parameters, true);
        },
        
        // Natural language search
        async search(params) {
            const { query, type = null } = params;
            
            // Convert natural language to Cypher
            let cypher = this.buildSearchQuery(query, type);
            
            return await this.query({ cypher });
        },
        
        // Get database schema
        async getSchema() {
            if (this.config.mockMode) {
                return {
                    labels: {
                        Note: ['id', 'title', 'content', 'created'],
                        Person: ['name', 'email', 'role'],
                        Project: ['name', 'description', 'status'],
                        Tag: ['name', 'color']
                    },
                    relationships: ['KNOWS', 'MENTIONS', 'TAGGED_WITH', 'RELATES_TO', 'PART_OF']
                };
            }
            
            const schema = {};
            
            // Get all node labels
            const labels = await this.query({
                cypher: "CALL db.labels() YIELD label RETURN collect(label) as labels"
            });
            
            // Get all relationship types
            const relationships = await this.query({
                cypher: "CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as types"
            });
            
            return { labels: labels[0]?.labels || [], relationships: relationships[0]?.types || [] };
        },
        
        // Helper: Build search query from natural language
        buildSearchQuery(searchText, nodeType) {
            const words = searchText.toLowerCase().split(' ');
            
            // Time-based filters
            let timeFilter = '';
            if (words.includes('today')) {
                timeFilter = 'AND n.created > timestamp() - 86400000';
            } else if (words.includes('yesterday')) {
                timeFilter = 'AND n.created > timestamp() - 172800000 AND n.created < timestamp() - 86400000';
            } else if (words.includes('week')) {
                timeFilter = 'AND n.created > timestamp() - 604800000';
            } else if (words.includes('month')) {
                timeFilter = 'AND n.created > timestamp() - 2592000000';
            }
            
            // Build the query
            const labelFilter = nodeType ? `:${nodeType}` : '';
            const searchTerms = words
                .filter(w => !['the', 'a', 'an', 'and', 'or', 'from', 'about', 'last', 'this'].includes(w))
                .join(' OR ');
            
            return `
                MATCH (n${labelFilter})
                WHERE (
                    ANY(prop IN keys(n) WHERE 
                        prop IN ['title', 'name', 'content', 'description'] AND
                        toLower(toString(n[prop])) CONTAINS '${searchTerms}'
                    )
                ) ${timeFilter}
                RETURN n
                ORDER BY CASE WHEN n.created IS NOT NULL THEN n.created ELSE 0 END DESC
                LIMIT 20
            `;
        },
        
        // HTTP API for browser environments
        async httpQuery(cypher, parameters = {}, write = false) {
            // Use proxy if configured
            const endpoint = this.config.proxyEndpoint || 
                           `${this.config.httpEndpoint}/db/${this.config.database}/tx/commit`;
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add auth if not using proxy
            if (!this.config.proxyEndpoint && this.config.username && this.config.password) {
                headers['Authorization'] = 'Basic ' + btoa(`${this.config.username}:${this.config.password}`);
            }
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        statements: [{
                            statement: cypher,
                            parameters: parameters
                        }]
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.errors && data.errors.length > 0) {
                    throw new Error(data.errors[0].message);
                }
                
                if (data.results && data.results[0]) {
                    return this.formatHttpResults(data.results[0]);
                }
                
                return [];
            } catch (error) {
                console.error('Neo4j query error:', error);
                throw error;
            }
        },
        
        // Format HTTP API results
        formatHttpResults(result) {
            return result.data.map(row => {
                const item = {};
                result.columns.forEach((col, idx) => {
                    item[col] = row.row[idx];
                });
                return item;
            });
        },
        
        // Mock data for testing
        getMockData(cypher, parameters) {
            const mockNotes = [
                {
                    id: '1',
                    title: 'Voice Brain Architecture',
                    content: 'Building a voice-first interface with Neo4j backend',
                    created: Date.now() - 86400000
                },
                {
                    id: '2',
                    title: 'Machine Learning Notes',
                    content: 'Exploring neural networks and transformers',
                    created: Date.now() - 172800000
                },
                {
                    id: '3',
                    title: 'Project Ideas',
                    content: 'Ideas for improving the voice assistant',
                    created: Date.now() - 259200000
                }
            ];
            
            // Simple mock search
            if (cypher.includes('WHERE')) {
                const searchTerm = parameters.keyword || 
                                 Object.values(parameters)[0] || 
                                 '';
                
                return mockNotes.filter(note => 
                    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    note.content.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(note => ({ n: note }));
            }
            
            return mockNotes.slice(0, 3).map(note => ({ n: note }));
        }
    };
    
    // Export for use in Voice Brain
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Neo4jModule;
    } else {
        window.VoiceBrainModules = window.VoiceBrainModules || {};
        window.VoiceBrainModules.neo4j = Neo4jModule;
    }
    
})();
