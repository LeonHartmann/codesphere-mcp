import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";

import { CodesphereClient } from "./api/client.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";
import { registerDeployTools } from "./tools/deploy.js";
import { registerLogTools } from "./tools/logs.js";
import { registerDomainTools } from "./tools/domains.js";

const CS_TOKEN = process.env.CS_TOKEN;
const CS_API_BASE = process.env.CS_API_BASE || "https://codesphere.com/api";
const CS_TEAM_ID = process.env.CS_TEAM_ID;

if (!CS_TOKEN) {
  console.error("CS_TOKEN environment variable is required");
  process.exit(1);
}

function createMcpServer(): McpServer {
  const client = new CodesphereClient(CS_TOKEN!, CS_API_BASE);

  const server = new McpServer({
    name: "codesphere-mcp",
    version: "1.0.0",
  });

  registerWorkspaceTools(server, client, CS_TEAM_ID);
  registerDeployTools(server, client);
  registerLogTools(server, client);
  registerDomainTools(server, client, CS_TEAM_ID);

  server.server.onerror = console.error.bind(console);

  return server;
}

const app = new Hono();

// Health check
app.get("/", (c) => {
  return c.json({
    name: "codesphere-mcp",
    version: "1.0.0",
    status: "ok",
    mcp: "/mcp",
  });
});

// MCP Streamable HTTP endpoint
app.post("/mcp", async (c) => {
  const { req, res } = toReqRes(c.req.raw);
  const server = createMcpServer();

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless
    });

    transport.onerror = console.error.bind(console);

    await server.connect(transport);
    await transport.handleRequest(req, res, await c.req.json());

    res.on("close", () => {
      transport.close();
      server.close();
    });

    return toFetchResponse(res);
  } catch (e) {
    console.error(e);
    return c.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      },
      { status: 500 }
    );
  }
});

// Stateless server — GET and DELETE not supported
app.get("/mcp", (c) => {
  return c.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    },
    { status: 405 }
  );
});

app.delete("/mcp", (c) => {
  return c.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    },
    { status: 405 }
  );
});

const port = 3000;
console.log(`Codesphere MCP server listening on http://0.0.0.0:${port}`);
serve({ fetch: app.fetch, hostname: "0.0.0.0", port });
