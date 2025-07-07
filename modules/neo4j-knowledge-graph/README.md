# Neo4j Knowledge Graph Module

This module handles the graph database integration for Extended Cognition's knowledge management system.

## Deployment Pipeline

When you push changes to the GitHub repository, the following automated deployment process occurs:

1. **GitHub Actions CI/CD** - Automatically builds and tests the project
2. **Deployment to Production** - Code is deployed to the hosting service (GitHub Pages/Netlify/Vercel)
3. **Bookmarklet Updates** - The bookmarklet will automatically use the latest deployed version since it points to the production URL
4. **No Manual Steps Required** - Simply push to GitHub and your changes will be live

**Note**: Make sure your bookmarklet is pointing to the production URL (not localhost) for automatic updates to work.

## Setup

1. Create a Neo4j Aura account at https://neo4j.com/cloud/aura/
2. Set up a free instance
3. Copy your connection credentials
4. Add to your .env file:

```
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
```
