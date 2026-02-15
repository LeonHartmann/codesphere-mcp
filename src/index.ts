import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";

import { CodesphereClient } from "./api/client.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";
import { registerDeployTools } from "./tools/deploy.js";
import { registerLogTools } from "./tools/logs.js";
import { registerDomainTools } from "./tools/domains.js";
import { registerEnvTools } from "./tools/env.js";
import { registerExecuteTools } from "./tools/execute.js";
import { registerLandscapeTools } from "./tools/landscape.js";
import type { Env, Props } from "./types.js";

// McpAgent Durable Object — one instance per authenticated user session
export class CodesphereAgent extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "codesphere-mcp",
    version: "2.0.0",
  });

  async init() {
    const client = new CodesphereClient(this.props.csToken);
    const defaultTeamId = this.props.csTeamId;

    registerWorkspaceTools(this.server, client, defaultTeamId);
    registerDeployTools(this.server, client);
    registerLogTools(this.server, client);
    registerDomainTools(this.server, client, defaultTeamId);
    registerEnvTools(this.server, client);
    registerExecuteTools(this.server, client);
    registerLandscapeTools(this.server, client);
  }
}

// Auth handler (Hono app for /authorize form)
import authHandler from "./auth/handler.js";

// OAuthProvider — wires OAuth 2.1 + PKCE around the McpAgent
export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: CodesphereAgent.mount("/mcp") as any,
  defaultHandler: authHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
