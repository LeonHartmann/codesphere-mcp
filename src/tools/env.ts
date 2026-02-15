import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CodesphereClient } from "../api/client.js";

export function registerEnvTools(
  server: McpServer,
  client: CodesphereClient
) {
  server.tool(
    "list_env_vars",
    "List all environment variables configured on a workspace",
    {
      workspaceId: z.string().describe("The workspace ID"),
    },
    async ({ workspaceId }) => {
      try {
        const envVars = await client.listEnvVars(workspaceId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(envVars, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error listing env vars: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "set_env_vars",
    "Set environment variables on a workspace. Provide key-value pairs. Existing vars with the same keys will be overwritten.",
    {
      workspaceId: z.string().describe("The workspace ID"),
      envVars: z
        .record(z.string())
        .describe('Key-value pairs of environment variables, e.g. {"NODE_ENV": "production", "PORT": "3000"}'),
    },
    async ({ workspaceId, envVars }) => {
      try {
        await client.setEnvVars(workspaceId, envVars);
        const keys = Object.keys(envVars);
        return {
          content: [
            {
              type: "text" as const,
              text: `Set ${keys.length} env var${keys.length > 1 ? "s" : ""} on workspace ${workspaceId}: ${keys.join(", ")}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error setting env vars: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
