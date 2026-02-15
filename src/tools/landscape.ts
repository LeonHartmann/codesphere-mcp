import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CodesphereClient } from "../api/client.js";

export function registerLandscapeTools(
  server: McpServer,
  client: CodesphereClient
) {
  server.tool(
    "deploy_landscape",
    "Deploy a multi-service landscape for a workspace. Landscapes allow running multiple interconnected services. Optionally specify a deployment profile.",
    {
      workspaceId: z.string().describe("The workspace ID"),
      profile: z
        .string()
        .optional()
        .describe("Deployment profile name (uses default if not provided)"),
    },
    async ({ workspaceId, profile }) => {
      try {
        const result = await client.deployLandscape(workspaceId, profile);
        return {
          content: [
            {
              type: "text" as const,
              text: `Landscape deployment started for workspace ${workspaceId}${profile ? ` (profile: ${profile})` : ""}.\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error deploying landscape: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "teardown_landscape",
    "Tear down a running landscape deployment for a workspace. Stops all landscape services.",
    {
      workspaceId: z.string().describe("The workspace ID"),
    },
    async ({ workspaceId }) => {
      try {
        await client.teardownLandscape(workspaceId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Landscape torn down for workspace ${workspaceId}.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error tearing down landscape: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
