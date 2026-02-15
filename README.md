# Codesphere MCP Server

The first MCP server for [Codesphere](https://codesphere.com). It connects Claude Chat, Claude Desktop, or any MCP-compatible client to the Codesphere platform, letting you deploy, manage, and monitor workspaces directly from a conversation. Ask Claude to list your workspaces, deploy the latest code, tail logs, switch domains, and more — all without leaving your chat.

## Quick Start

1. Open [claude.ai](https://claude.ai) and go to **Settings** > **Integrations**
2. Click **Add** to add a new MCP server
3. Paste the server URL: `https://codesphere-mcp.<account>.workers.dev/mcp`
4. Claude will redirect you to enter your Codesphere API key
5. That's it — Claude now has access to your Codesphere workspaces

Your API key is stored encrypted in your OAuth session. It is never shared with other users.

## Available Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `list_workspaces` | List all workspaces for a team with their status, URL, and git info | `teamId` (optional) |
| `get_workspace_status` | Get detailed status including pipeline state for all stages | `workspaceId` |
| `deploy` | Pull latest code and run full CI pipeline (git pull, prepare, run) | `workspaceId`, `skipPrepare`, `waitForPrepare` |
| `stop_workspace` | Stop a running workspace | `workspaceId` |
| `restart_workspace` | Restart without rebuilding (stop, start) | `workspaceId` |
| `create_workspace` | Create a new workspace from a git repository | `gitUrl`, `name`, `planId`, `branch` |
| `view_logs` | Get recent logs from a pipeline stage | `workspaceId`, `stage`, `lines` |
| `switch_domain` | Route a custom domain to a different workspace | `domainName`, `workspaceId`, `path` |

## Example Conversations

- **"List my Codesphere workspaces"** — shows all workspaces with their status, URLs, and git info.
- **"Deploy workspace 12345"** — pulls the latest code, builds, and starts the workspace.
- **"Create a new workspace from github.com/user/repo and deploy it"** — creates a workspace from a git repository and runs a full deployment.
- **"Show me the logs for workspace 12345"** — retrieves the most recent log output from the run stage.
- **"Switch my production domain to point to workspace 12346"** — re-routes a custom domain to a different workspace for zero-downtime releases.

## Self-Hosting

This server runs on Cloudflare Workers. To deploy your own instance:

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Deploy

```bash
# Clone the repository
git clone https://github.com/LeonHartmann/codesphere-mcp.git
cd codesphere-mcp

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Create KV namespace for OAuth sessions
npx wrangler kv namespace create OAUTH_KV
# Copy the ID from the output and update wrangler.jsonc

# Set the cookie encryption secret
openssl rand -hex 32 | npx wrangler secret put COOKIE_ENCRYPTION_KEY

# Deploy
npx wrangler deploy
```

### Local Development

```bash
npx wrangler dev
```

The server starts on `http://localhost:8787`.

### Testing with MCP Inspector

You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test and debug the server interactively:

```bash
npx @modelcontextprotocol/inspector
```

Connect to `http://localhost:8787/mcp` using the Streamable HTTP transport.

## Architecture

```
Claude.ai ←→ OAuth 2.1 (PKCE) ←→ Cloudflare Worker
                                        │
                                   OAuthProvider
                                   (workers-oauth-provider)
                                        │
                               ┌────────┴────────┐
                               │                  │
                          /authorize          /mcp (McpAgent)
                          (key form)          (tools)
                               │                  │
                          Validate key        this.props.csToken
                          via GET /teams      → Codesphere API
```

Each user's API key is stored encrypted in their OAuth session — never in plaintext, never shared.

## Companion Skill

If you use [Claude Code](https://docs.anthropic.com/en/docs/claude-code), check out the companion skill at [github.com/LeonHartmann/codesphere-skill](https://github.com/LeonHartmann/codesphere-skill) for direct CLI integration.

## License

MIT
