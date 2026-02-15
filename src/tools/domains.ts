import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CodesphereClient } from "../api/client.js";

export function registerDomainTools(
  server: McpServer,
  client: CodesphereClient,
  defaultTeamId?: string
) {
  server.tool(
    "switch_domain",
    "Switch a custom domain to point to a different workspace. Useful for zero-downtime releases by routing traffic to a new workspace. Routes the root path '/' to the specified workspace.",
    {
      teamId: z
        .string()
        .optional()
        .describe("Team ID (uses default if not provided)"),
      domainName: z
        .string()
        .describe("The custom domain name to update (e.g., myapp.example.com)"),
      workspaceId: z
        .string()
        .describe("Target workspace ID to route the domain to"),
      path: z
        .string()
        .optional()
        .default("/")
        .describe("URL path to route (default: /)"),
    },
    async ({ teamId, domainName, workspaceId, path }) => {
      const resolvedTeamId = teamId || defaultTeamId;
      if (!resolvedTeamId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No teamId provided and no default CS_TEAM_ID configured.",
            },
          ],
          isError: true,
        };
      }

      try {
        await client.updateDomainRouting(resolvedTeamId, domainName, {
          [path]: [parseInt(workspaceId, 10)],
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Domain ${domainName} (path: ${path}) now routes to workspace ${workspaceId}.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error switching domain: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
