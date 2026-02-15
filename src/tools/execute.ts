import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CodesphereClient } from "../api/client.js";

export function registerExecuteTools(
  server: McpServer,
  client: CodesphereClient
) {
  server.tool(
    "execute_command",
    "Execute a shell command in a workspace. Returns the command output. Useful for debugging, checking files, running scripts, etc.",
    {
      workspaceId: z.string().describe("The workspace ID"),
      command: z.string().describe("The shell command to execute"),
    },
    async ({ workspaceId, command }) => {
      try {
        const result = await client.executeCommand(workspaceId, command);

        let output: string;
        if (typeof result === "string") {
          output = result;
        } else if (result?.output) {
          output = result.output;
        } else if (result?.stdout) {
          output = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : "");
        } else {
          output = JSON.stringify(result, null, 2);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: output || "(no output)",
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error executing command: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
