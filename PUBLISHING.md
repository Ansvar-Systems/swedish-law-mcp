# Publishing Guide

> Complete guide for publishing your MCP server to npm, Docker Hub, and registries

---

## Prerequisites

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] README.md is complete with examples
- [ ] COVERAGE.md documents all sources
- [ ] LICENSE file present (Apache 2.0)

---

## 1. npm Publishing

### First-Time Setup

1. **Create npm account** at https://npmjs.com

2. **Join @ansvar organization** (or create your own scope)

3. **Create granular access token**:
   - Go to npmjs.com → Account → Access Tokens
   - Generate New Token → Granular Access Token
   - Permissions: Read and Write
   - Packages: Select your packages or All packages
   - **Important**: This bypasses 2FA for CI/CD

4. **Add token to GitHub**:
   - Repo → Settings → Secrets → Actions
   - Add `NPM_TOKEN` with your token

### Publishing

The GitHub Action handles publishing automatically on version tags:

```bash
# Bump version
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

# Push with tag (triggers publish)
git push origin main --tags
```

### Manual Publishing (if needed)

```bash
npm login
npm publish --access public
```

### Verify

```bash
# Test installation
npx -y @ansvar/your-mcp-server

# Check npm page
open https://npmjs.com/package/@ansvar/your-mcp-server
```

---

## 2. Docker Hub (Optional)

### First-Time Setup

1. Create Docker Hub account at https://hub.docker.com
2. Create repository: `ansvar/your-mcp-server`
3. Add secrets to GitHub:
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`

### Building and Pushing

```bash
# Build
docker build -t ansvar/your-mcp-server:0.1.0 .

# Tag latest
docker tag ansvar/your-mcp-server:0.1.0 ansvar/your-mcp-server:latest

# Push
docker push ansvar/your-mcp-server:0.1.0
docker push ansvar/your-mcp-server:latest
```

### Verify

```bash
# Test
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | docker run -i ansvar/your-mcp-server
```

---

## 3. Smithery Registry

Smithery is a directory of MCP servers at https://smithery.ai

### Submission

1. Go to https://smithery.ai
2. Sign in with GitHub
3. Click "Add Server" or "Submit"
4. Enter your GitHub repo URL: `https://github.com/ansvar-systems/your-mcp-server`
5. **Skip OAuth card setup** — stdio servers don't need parameters
6. **Skip scanning** — stdio servers can't be scanned remotely (they run locally)

The `smithery.yaml` in your repo provides all necessary information.

### smithery.yaml Template

```yaml
name: your-mcp-server
title: Your MCP Server
description: |
  Brief description of what your server does.
  Can be multiple lines.

author: Ansvar Systems
authorUrl: https://ansvar.ai
repository: https://github.com/ansvar-systems/your-mcp-server
license: Apache-2.0

categories:
  - legal-and-compliance  # or: productivity, development, data, etc.

tags:
  - your-tag-1
  - your-tag-2

startCommand:
  type: stdio
  configSchema:
    type: object
    properties: {}
  commandFunction: |-
    (config) => ({
      command: 'npx',
      args: ['-y', '@ansvar/your-mcp-server']
    })

tools:
  - name: search_content
    description: Search across all content
  - name: get_item
    description: Get a specific item
  # ... list all tools
```

---

## 4. Docker MCP Registry

Docker's official MCP catalog at https://hub.docker.com/mcp

### Submission Process

1. **Fork the registry**:
   ```bash
   gh repo fork docker/mcp-registry --clone
   cd mcp-registry
   ```

2. **Create server directory**:
   ```bash
   mkdir -p servers/your-mcp-server
   ```

3. **Create server.yaml**:
   ```yaml
   name: your-mcp-server
   image: mcp/your-mcp-server
   type: server
   meta:
     category: legal
     tags:
       - compliance
       - your-tag
   about:
     title: Your MCP Server
     description: "Brief description of your server"
     icon: https://avatars.githubusercontent.com/u/YOUR_ORG_ID?v=4
   source:
     project: https://github.com/ansvar-systems/your-mcp-server
     commit: <your-latest-commit-sha>
   ```

4. **Create tools.json**:
   ```json
   [
     {
       "name": "search_content",
       "description": "Search across all content",
       "arguments": [
         {
           "name": "query",
           "type": "string",
           "desc": "Search query"
         },
         {
           "name": "sources",
           "type": "array",
           "desc": "Optional: filter to specific sources"
         },
         {
           "name": "limit",
           "type": "number",
           "desc": "Maximum results (default: 10)"
         }
       ]
     },
     {
       "name": "get_item",
       "description": "Get a specific item by identifier",
       "arguments": [
         {
           "name": "source",
           "type": "string",
           "desc": "Source identifier"
         },
         {
           "name": "item_id",
           "type": "string",
           "desc": "Item identifier"
         }
       ]
     }
   ]
   ```

5. **Commit and push**:
   ```bash
   git checkout -b add-your-mcp-server
   git add servers/your-mcp-server/
   git commit -m "Add Your MCP Server"
   git push -u origin add-your-mcp-server
   ```

6. **Create PR**:
   ```bash
   gh pr create --repo docker/mcp-registry \
     --title "Add Your MCP Server" \
     --body "## Summary

   Adds Your MCP Server to the registry.

   ### What it does
   Brief description.

   ### Tools provided
   - \`search_content\` - Search across all content
   - \`get_item\` - Get specific items

   ### Links
   - Source: https://github.com/ansvar-systems/your-mcp-server
   - npm: https://npmjs.com/package/@ansvar/your-mcp-server
   - License: Apache-2.0"
   ```

---

## 5. Other Registries

### Glama

Submit at https://glama.ai/mcp/servers

### awesome-mcp-servers

Open PR to https://github.com/punkpeye/awesome-mcp-servers

Add entry to appropriate category in README.md:

```markdown
- [your-mcp-server](https://github.com/ansvar-systems/your-mcp-server) - Brief description
```

---

## 6. Promotion

After publishing, promote your server:

### Immediate

- [ ] **Hacker News** - "Show HN" post
- [ ] **LinkedIn** - Company and personal posts
- [ ] **Twitter/X** - Tag @AnthropicAI, use #MCP #ClaudeAI
- [ ] **Reddit** - r/ClaudeAI, domain-specific subreddits

### This Week

- [ ] **Dev.to / Medium** - Tutorial or announcement post
- [ ] **MCP Discord/Community** - Share in appropriate channels

### This Month

- [ ] **Product Hunt** - Schedule launch
- [ ] **Newsletters** - Reach out to relevant newsletters

---

## Checklist Summary

```
□ npm
  □ Token configured
  □ Package published
  □ Installation verified

□ Docker Hub (optional)
  □ Image built
  □ Image pushed
  □ Run verified

□ Smithery
  □ Submitted
  □ smithery.yaml present

□ Docker MCP Registry
  □ server.yaml created
  □ tools.json created
  □ PR submitted

□ Other
  □ Glama submitted
  □ awesome-mcp-servers PR
  □ Promotion started
```

---

<p align="center">
<strong>Ansvar Systems AB</strong><br>
ansvar.ai
</p>
