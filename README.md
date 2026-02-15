# Codesphere MCP Server

The first MCP server for [Codesphere](https://codesphere.com). It connects Claude Chat, Claude Desktop, or any MCP-compatible client to the Codesphere platform, letting you deploy, manage, and monitor workspaces directly from a conversation. Ask Claude to list your workspaces, deploy the latest code, tail logs, switch domains, and more -- all without leaving your chat.

## Quick Start

### Prerequisites

- Node.js 18+
- A Codesphere API token

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CS_TOKEN` | Yes | -- | Codesphere API token |
| `CS_API_BASE` | No | `https://codesphere.com/api` | Codesphere API base URL |
| `CS_TEAM_ID` | No | -- | Default team ID (avoids passing it with every request) |

### Install and Run

```bash
# Clone the repository
git clone https://github.com/LeonHartmann/codesphere-mcp.git
cd codesphere-mcp

# Install dependencies
npm install

# Set your Codesphere API token
export CS_TOKEN="your-token-here"

# Start in development mode (with hot reload)
npm run dev
```

The server starts on `http://0.0.0.0:3000` with the MCP endpoint at `/mcp`.

## Connecting to Claude

### Claude.ai (Remote MCP Server)

1. Open [claude.ai](https://claude.ai) and go to **Settings** > **Integrations**
2. Click **Add** to add a new MCP server
3. Paste your server URL (e.g., `https://your-workspace.codesphere.com/mcp`)
4. Claude will discover the available tools automatically

### Claude Desktop

Add the following to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "codesphere": {
      "url": "https://your-workspace.codesphere.com/mcp"
    }
  }
}
```

### Other MCP Clients

Any client that supports the MCP Streamable HTTP transport can connect by pointing to the `/mcp` endpoint of this server.

## Hosting on Codesphere

This server is designed to host itself on Codesphere:

1. Create a new workspace from this repository
2. Set the `CS_TOKEN` environment variable in the workspace
3. Deploy the workspace

The included `ci.yml` handles the full pipeline:

- **Prepare** -- installs dependencies (`npm ci`) and compiles TypeScript (`npm run build`)
- **Test** -- runs the type checker (`npx tsc --noEmit`)
- **Run** -- starts the server (`npm start`)

The server binds to `0.0.0.0:3000`, which Codesphere exposes automatically.

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

Here are some things you can ask Claude once the server is connected:

- **"List my Codesphere workspaces"** -- shows all workspaces with their status, URLs, and git info.
- **"Deploy workspace 12345"** -- pulls the latest code, builds, and starts the workspace.
- **"Create a new workspace from github.com/user/repo and deploy it"** -- creates a workspace from a git repository and runs a full deployment.
- **"Show me the logs for workspace 12345"** -- retrieves the most recent log output from the run stage.
- **"Switch my production domain to point to workspace 12346"** -- re-routes a custom domain to a different workspace for zero-downtime releases.

## Development

```bash
# Local development with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type check without emitting
npx tsc --noEmit
```

### Testing with MCP Inspector

You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test and debug the server interactively:

```bash
npx @modelcontextprotocol/inspector
```

Then connect to `http://localhost:3000/mcp` using the Streamable HTTP transport.

## Companion Skill

If you use [Claude Code](https://docs.anthropic.com/en/docs/claude-code), check out the companion skill at [github.com/LeonHartmann/codesphere-skill](https://github.com/LeonHartmann/codesphere-skill) for direct CLI integration.

## License

MIT
