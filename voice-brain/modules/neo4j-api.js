// Neo4j Knowledge Graph API Functions for Extended Cognition
// These functions wrap HTTP calls to Neo4j for LLM inference operations

class KnowledgeGraphAPI {
  constructor(config) {
    this.baseUrl = config.neo4jUrl || 'http://localhost:7474/db/neo4j/tx';
    this.auth = {
      username: config.username,
      password: config.password
    };
  }

  // Helper to execute Cypher queries via HTTP API
  async executeCypher(query, parameters = {}) {
    const response = await fetch(`${this.baseUrl}/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Basic ' + btoa(`${this.auth.username}:${this.auth.password}`)
      },
      body: JSON.stringify({
        statements: [{
          statement: query,
          parameters: parameters
        }]
      })
    });

    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }
    
    return result.results[0].data;
  }

  // ============= IDEA CREATION & MANAGEMENT =============

  // Create a new atomic idea
  async createIdea(content, metadata = {}) {
    const query = `
      CREATE (i:Idea {
        id: randomUUID(),
        content: $content,
        created: timestamp(),
        lastModified: timestamp(),
        wordCount: size(split($content, ' ')),
        source: $source,
        confidence: $confidence,
        sessionId: $sessionId
      })
      RETURN i
    `;
    
    return await this.executeCypher(query, {
      content,
      source: metadata.source || 'voice',
      confidence: metadata.confidence || 1.0,
      sessionId: metadata.sessionId || null
    });
  }

  // Find or create an idea (deduplication)
  async findOrCreateIdea(content, similarity_threshold = 0.85) {
    const query = `
      // First try exact match
      OPTIONAL MATCH (existing:Idea {content: $content})
      WITH existing
      WHERE existing IS NOT NULL
      RETURN existing AS idea, 'exact' AS matchType
      
      UNION
      
      // If no exact match, create new
      WITH $content AS content
      WHERE NOT EXISTS((i:Idea {content: content}))
      CREATE (new:Idea {
        id: randomUUID(),
        content: content,
        created: timestamp(),
        lastModified: timestamp(),
        wordCount: size(split(content, ' '))
      })
      RETURN new AS idea, 'created' AS matchType
    `;
    
    return await this.executeCypher(query, { content });
  }

  // ============= RELATIONSHIP CREATION =============

  // Create a weighted relationship between ideas
  async createRelationship(fromId, toId, type, weights = {}) {
    const query = `
      MATCH (from:Idea {id: $fromId})
      MATCH (to:Idea {id: $toId})
      CREATE (from)-[r:${type} {
        created: timestamp(),
        semanticWeight: $semanticWeight,
        aiWeight: $aiWeight,
        humanWeight: $humanWeight,
        totalWeight: ($semanticWeight + $aiWeight + $humanWeight) / 3.0
      }]->(to)
      RETURN from, r, to
    `;
    
    return await this.executeCypher(query, {
      fromId,
      toId,
      semanticWeight: weights.semantic || 0.0,
      aiWeight: weights.ai || 0.0,
      humanWeight: weights.human || 0.0
    });
  }

  // ============= CONTEXT RETRIEVAL FOR LLM =============

  // Get related ideas for context (most important for LLM inference)
  async getRelatedContext(ideaContent, maxDepth = 2, limit = 20) {
    const query = `
      // Find the starting idea
      MATCH (start:Idea)
      WHERE start.content CONTAINS $searchTerm 
         OR toLower(start.content) CONTAINS toLower($searchTerm)
      
      // Get connected ideas up to maxDepth
      MATCH path = (start)-[*1..${maxDepth}]-(related:Idea)
      
      // Calculate relevance score
      WITH related, 
           min(length(path)) as distance,
           count(path) as pathCount,
           avg(reduce(w = 0, r in relationships(path) | w + r.totalWeight)) as avgWeight
      
      // Score by distance, connection count, and relationship strength
      WITH related,
           (1.0 / distance) * pathCount * coalesce(avgWeight, 0.5) as relevanceScore
      
      RETURN related.content as content,
             related.id as id,
             relevanceScore,
             collect(labels(related)) as labels
      ORDER BY relevanceScore DESC
      LIMIT $limit
    `;
    
    return await this.executeCypher(query, { 
      searchTerm: ideaContent, 
      limit 
    });
  }

  // Get temporally relevant context (ideas from same time period)
  async getTemporalContext(timestamp, windowHours = 24) {
    const query = `
      WITH $timestamp - ($windowHours * 3600 * 1000) as startTime,
           $timestamp + ($windowHours * 3600 * 1000) as endTime
      
      MATCH (i:Idea)
      WHERE i.created >= startTime AND i.created <= endTime
      
      RETURN i.content as content,
             i.id as id,
             i.created as created,
             abs(i.created - $timestamp) / 3600000.0 as hoursAway
      ORDER BY hoursAway
      LIMIT 50
    `;
    
    return await this.executeCypher(query, { 
      timestamp, 
      windowHours 
    });
  }

  // ============= KNOWLEDGE SYNTHESIS =============

  // Find paths between two concepts (for LLM to understand connections)
  async findConnectionPaths(concept1, concept2, maxPaths = 5) {
    const query = `
      MATCH (start:Idea), (end:Idea)
      WHERE (start.content CONTAINS $concept1 OR toLower(start.content) CONTAINS toLower($concept1))
        AND (end.content CONTAINS $concept2 OR toLower(end.content) CONTAINS toLower($concept2))
      
      MATCH path = shortestPath((start)-[*..6]-(end))
      
      WITH path, 
           [n in nodes(path) | n.content] as ideas,
           [r in relationships(path) | type(r)] as relationships,
           reduce(w = 0, r in relationships(path) | w + r.totalWeight) as totalWeight
      
      RETURN ideas, 
             relationships,
             length(path) as pathLength,
             totalWeight / length(path) as avgWeight
      ORDER BY avgWeight DESC
      LIMIT $maxPaths
    `;
    
    return await this.executeCypher(query, { 
      concept1, 
      concept2, 
      maxPaths 
    });
  }

  // ============= CONTRADICTION DETECTION =============

  // Find contradicting ideas (important for coherent responses)
  async findContradictions(ideaContent) {
    const query = `
      MATCH (idea:Idea)
      WHERE idea.content CONTAINS $searchTerm
      
      MATCH (idea)-[:CONTRADICTS]-(contradiction:Idea)
      
      RETURN contradiction.content as contradictingIdea,
             contradiction.id as id,
             contradiction.confidence as confidence,
             contradiction.source as source
      ORDER BY contradiction.created DESC
    `;
    
    return await this.executeCypher(query, { 
      searchTerm: ideaContent 
    });
  }

  // ============= PERSON/ENTITY CONTEXT =============

  // Get all ideas related to a person (for personalized responses)
  async getPersonContext(personName) {
    const query = `
      MATCH (p:Person {name: $personName})
      OPTIONAL MATCH (p)-[:MENTIONED_IN]-(idea:Idea)
      OPTIONAL MATCH (p)-[:PARTICIPATED_IN]-(event:Event)-[:DISCUSSED]-(eventIdea:Idea)
      
      WITH collect(DISTINCT idea) + collect(DISTINCT eventIdea) as allIdeas
      UNWIND allIdeas as i
      
      WHERE i IS NOT NULL
      
      RETURN i.content as content,
             i.id as id,
             i.created as created
      ORDER BY i.created DESC
      LIMIT 50
    `;
    
    return await this.executeCypher(query, { personName });
  }

  // ============= PATTERN DETECTION =============

  // Find recurring themes (for identifying user interests/patterns)
  async findRecurringThemes(minOccurrences = 3) {
    const query = `
      MATCH (i:Idea)
      WITH split(toLower(i.content), ' ') as words, i
      UNWIND words as word
      
      WITH word, collect(DISTINCT i) as ideas
      WHERE size(ideas) >= $minOccurrences
        AND size(word) > 4  // Skip short words
      
      RETURN word as theme,
             size(ideas) as occurrences,
             [i in ideas[..5] | i.content] as exampleIdeas
      ORDER BY occurrences DESC
      LIMIT 20
    `;
    
    return await this.executeCypher(query, { minOccurrences });
  }

  // ============= KNOWLEDGE EVOLUTION =============

  // Track how ideas evolve over time
  async getIdeaEvolution(conceptSearch) {
    const query = `
      MATCH (i:Idea)
      WHERE i.content CONTAINS $conceptSearch
      
      WITH i
      ORDER BY i.created
      
      WITH collect(i) as ideas,
           min(i.created) as firstMention,
           max(i.created) as lastMention
      
      RETURN [i in ideas | {
        content: i.content,
        created: i.created,
        daysSinceFirst: (i.created - firstMention) / 86400000.0
      }] as evolution,
      size(ideas) as totalMentions,
      (lastMention - firstMention) / 86400000.0 as daysSpanned
    `;
    
    return await this.executeCypher(query, { conceptSearch });
  }

  // ============= BATCH OPERATIONS FOR CONVERSATION PROCESSING =============

  // Process a batch of ideas from a conversation
  async processConversationIdeas(ideas, sessionId) {
    const query = `
      UNWIND $ideas as ideaData
      
      MERGE (i:Idea {content: ideaData.content})
      ON CREATE SET 
        i.id = randomUUID(),
        i.created = timestamp(),
        i.sessionId = $sessionId,
        i.confidence = ideaData.confidence,
        i.source = 'voice'
      ON MATCH SET
        i.lastModified = timestamp(),
        i.occurrences = coalesce(i.occurrences, 0) + 1
      
      WITH i, ideaData
      
      // Create session node if needed
      MERGE (s:Session {id: $sessionId})
      ON CREATE SET s.created = timestamp()
      
      MERGE (s)-[:CONTAINS]->(i)
      
      RETURN collect(i) as processedIdeas
    `;
    
    return await this.executeCypher(query, { ideas, sessionId });
  }

  // ============= UTILITY FUNCTIONS =============

  // Get graph statistics for monitoring
  async getGraphStats() {
    const query = `
      MATCH (i:Idea)
      WITH count(i) as totalIdeas
      
      MATCH ()-[r]->()
      WITH totalIdeas, count(r) as totalRelationships
      
      MATCH (p:Person)
      WITH totalIdeas, totalRelationships, count(p) as totalPeople
      
      MATCH (e:Event)
      
      RETURN {
        ideas: totalIdeas,
        relationships: totalRelationships,
        people: totalPeople,
        events: count(e),
        avgRelationshipsPerIdea: totalRelationships * 1.0 / totalIdeas
      } as stats
    `;
    
    return await this.executeCypher(query);
  }
}

// Example usage for Extended Cognition LLM Service
export class ExtendedCognitionKnowledgeService {
  constructor(neo4jConfig) {
    this.kg = new KnowledgeGraphAPI(neo4jConfig);
  }

  // Main method called by LLM service to get context
  async getContextForQuery(query, sessionId) {
    try {
      // Get directly related ideas
      const related = await this.kg.getRelatedContext(query, 2, 10);
      
      // Check for contradictions
      const contradictions = await this.kg.findContradictions(query);
      
      // Get temporal context (recent ideas)
      const temporal = await this.kg.getTemporalContext(Date.now(), 24);
      
      // Extract person names and get their context
      const personNames = this.extractPersonNames(query);
      const personContexts = await Promise.all(
        personNames.map(name => this.kg.getPersonContext(name))
      );
      
      return {
        relatedIdeas: related,
        contradictions: contradictions,
        recentContext: temporal.slice(0, 5),
        personContext: personContexts.flat(),
        metadata: {
          timestamp: Date.now(),
          sessionId: sessionId
        }
      };
    } catch (error) {
      console.error('Failed to get context:', error);
      return null;
    }
  }

  // Store new ideas extracted from conversation
  async storeConversationIdeas(atomicIdeas, sessionId) {
    return await this.kg.processConversationIdeas(atomicIdeas, sessionId);
  }

  // Helper to extract person names (would use NER in production)
  extractPersonNames(text) {
    // Simple regex for capitalized words (replace with proper NER)
    const matches = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
    return [...new Set(matches)];
  }
}

export default KnowledgeGraphAPI;