// Sample Neo4j Schema for Second Brain
// Run these in Neo4j Browser to set up your knowledge graph

// Create constraints for better performance
CREATE CONSTRAINT note_id IF NOT EXISTS ON (n:Note) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT person_name IF NOT EXISTS ON (p:Person) ASSERT p.name IS UNIQUE;
CREATE CONSTRAINT project_name IF NOT EXISTS ON (p:Project) ASSERT p.name IS UNIQUE;
CREATE CONSTRAINT tag_name IF NOT EXISTS ON (t:Tag) ASSERT t.name IS UNIQUE;

// Create indexes
CREATE INDEX note_title IF NOT EXISTS FOR (n:Note) ON (n.title);
CREATE INDEX note_created IF NOT EXISTS FOR (n:Note) ON (n.created);
CREATE INDEX note_content IF NOT EXISTS FOR (n:Note) ON (n.content);

// Sample data to get started
MERGE (ai:Tag {name: 'AI'})
MERGE (coding:Tag {name: 'Coding'})
MERGE (ideas:Tag {name: 'Ideas'})

CREATE (note1:Note {
    id: randomUUID(),
    title: 'Voice Brain Architecture',
    content: 'Building a voice-first interface with Neo4j as the knowledge backend',
    created: timestamp()
})

CREATE (note2:Note {
    id: randomUUID(),
    title: 'Neo4j Module Design',
    content: 'The module exposes Cypher queries through a simple JSON interface',
    created: timestamp()
})

CREATE (john:Person {name: 'John Doe', role: 'Developer'})
CREATE (project:Project {name: 'Extended Cognition', description: 'Voice-first AI assistant'})

// Create relationships
CREATE (note1)-[:TAGGED_WITH]->(ai)
CREATE (note1)-[:TAGGED_WITH]->(coding)
CREATE (note1)-[:PART_OF]->(project)
CREATE (note2)-[:RELATES_TO]->(note1)
CREATE (note1)-[:MENTIONS]->(john);
