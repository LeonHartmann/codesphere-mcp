# Codesphere MCP Server

The first MCP server for [Codesphere](https://codesphere.com). It connects Claude to the Codesphere platform, letting you deploy, manage, and monitor workspaces directly from a conversation. No API keys to configure, no self-hosting required — just connect and go.

## Quick Start

1. Open [claude.ai](https://claude.ai) → **Settings** → **Integrations**
2. Click **Add Integration**
3. Paste: `https://codesphere-mcp.therediyeteam.workers.dev/mcp`
4. Enter your Codesphere API key when prompted
5. Done — try asking Claude: *"List my Codesphere workspaces"*

Your API key is stored encrypted in your personal OAuth session. It is never shared with other users or stored in plaintext.

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
- **"Create a new workspace from github.com/user/repo and deploy it"** — creates and deploys a workspace.
- **"Show me the logs for workspace 12345"** — retrieves recent log output from the run stage.
- **"Switch my production domain to point to workspace 12346"** — re-routes a custom domain for zero-downtime releases.

## How It Works

The server runs on Cloudflare Workers with per-user OAuth 2.1 authentication:

```
Claude.ai ←→ OAuth 2.1 (PKCE) ←→ Cloudflare Worker
                                        │
                                   OAuthProvider
                                        │
                               ┌────────┴────────┐
                               │                  │
                          /authorize          /mcp (McpAgent)
                          (key form)          (tools)
                               │                  │
                          Validate key        Per-user token
                          via Codesphere API  → Codesphere API
```

Each user authenticates with their own API key. Keys are encrypted in individual OAuth sessions — never stored in plaintext, never shared between users.

## Deploy Your Own Instance

Want to run your own? It takes 5 minutes:

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- Node.js 18+

### Steps

```bash
git clone https://github.com/LeonHartmann/codesphere-mcp.git
cd codesphere-mcp
npm install

# Login to Cloudflare
npx wrangler login

# Create KV namespace for OAuth sessions
npx wrangler kv namespace create OAUTH_KV
# Say yes when it asks to update wrangler.jsonc

# Set the cookie encryption secret
openssl rand -hex 32 | npx wrangler secret put COOKIE_ENCRYPTION_KEY

# Deploy
npx wrangler deploy
```

Your server will be live at `https://codesphere-mcp.<your-subdomain>.workers.dev`.

### Local Development

```bash
npx wrangler dev
```

Starts on `http://localhost:8787`. Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test interactively.

## Companion Skill

If you use [Claude Code](https://docs.anthropic.com/en/docs/claude-code), check out the companion skill at [github.com/LeonHartmann/codesphere-skill](https://github.com/LeonHartmann/codesphere-skill) for direct CLI integration.

## License

MIT
