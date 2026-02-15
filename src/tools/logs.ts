import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CodesphereClient } from "../api/client.js";

export function registerLogTools(
  server: McpServer,
  client: CodesphereClient
) {
  server.tool(
    "view_logs",
    "Get recent logs from a workspace's pipeline stage (prepare, test, or run). Returns log output for the specified stage and step.",
    {
      workspaceId: z.string().describe("The workspace ID"),
      stage: z
        .enum(["prepare", "test", "run"])
        .optional()
        .default("run")
        .describe("Pipeline stage to get logs from (default: run)"),
      step: z
        .number()
        .optional()
        .default(0)
        .describe("Step index within the stage (default: 0, the first step)"),
      lines: z
        .number()
        .optional()
        .default(50)
        .describe("Number of recent log lines to return (default: 50)"),
    },
    async ({ workspaceId, stage, step, lines }) => {
      try {
        const logs = await client.getLogs(workspaceId, stage, step);

        // Handle various log response formats
        let logText: string;
        if (!logs) {
          logText = "";
        } else if (typeof logs === "string") {
          logText = logs;
        } else if (logs.output) {
          logText = logs.output;
        } else if (logs.logs) {
          logText = logs.logs;
        } else {
          logText = JSON.stringify(logs, null, 2) ?? "";
        }

        // Truncate to requested number of lines
        const logLines = logText.split("\n");
        const truncated = logLines.slice(-lines).join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: truncated || `No logs available for ${stage} stage (step ${step}).`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching logs: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
