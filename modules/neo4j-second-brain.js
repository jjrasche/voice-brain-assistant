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
