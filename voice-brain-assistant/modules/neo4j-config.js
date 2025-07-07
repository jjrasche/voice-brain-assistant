// Neo4j Configuration for Voice Brain
window.NEO4J_CONFIG = {
    // Option 1: Direct connection to Neo4j server (requires CORS enabled)
    httpEndpoint: 'https://your-neo4j-server.com:7474',
    username: 'neo4j',
    password: 'your-password',
    database: 'neo4j',
    
    // Option 2: Use a proxy endpoint (recommended for production)
    // proxyEndpoint: 'https://your-api.com/neo4j-proxy',
    
    // Option 3: Mock mode for testing without a server
    mockMode: true  // Set to false when you have a real server
};
