import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CodesphereClient } from "../api/client.js";
import { pollUntil, PollTimeoutError } from "../utils/polling.js";

export function registerDeployTools(
  server: McpServer,
  client: CodesphereClient
) {
  server.tool(
    "deploy",
    "Deploy a workspace by pulling latest code and running the full CI pipeline. Chains: git pull → prepare (build) → wait for completion → start run. This is the main deployment tool.",
    {
      workspaceId: z.string().describe("The workspace ID to deploy"),
      remote: z
        .string()
        .optional()
        .default("origin")
        .describe("Git remote name (default: origin)"),
      skipPrepare: z
        .boolean()
        .optional()
        .default(false)
        .describe("Skip the prepare (build) stage — use when only restarting"),
      waitForPrepare: z
        .boolean()
        .optional()
        .default(true)
        .describe("Wait for prepare stage to complete before starting run (default: true)"),
    },
    async ({ workspaceId, remote, skipPrepare, waitForPrepare }) => {
      const steps: string[] = [];

      try {
        // Step 1: Git pull
        steps.push("git pull...");
        await client.gitPull(workspaceId, remote);
        steps.push("git pull complete");

        // Step 2: Prepare (build)
        if (!skipPrepare) {
          steps.push("starting prepare stage...");
          await client.startPipelineStage(workspaceId, "prepare");
          steps.push("prepare stage started");

          if (waitForPrepare) {
            steps.push("waiting for prepare to complete...");
            const finalStatuses = await pollUntil(
              () => client.getPipelineStatus(workspaceId, "prepare"),
              (statuses: any[]) => {
                if (!Array.isArray(statuses) || statuses.length === 0) return false;
                // Done when all replicas are no longer running/pending
                return statuses.every((s: any) => {
                  const state = s.state || "";
                  return state === "succeeded" || state === "failed" || state === "stopped";
                });
              },
              3000,
              600_000
            );

            const hasFailed = finalStatuses.some((s: any) => s.state === "failed");
            if (hasFailed) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Deployment failed at prepare stage.\n\nSteps:\n${steps.join("\n")}\n\nPrepare status:\n${JSON.stringify(finalStatuses, null, 2)}`,
                  },
                ],
                isError: true,
              };
            }

            steps.push("prepare complete");
          }
        } else {
          steps.push("(skipped prepare)");
        }

        // Step 3: Stop current run (ignore errors — might not be running)
        steps.push("stopping current run...");
        await client.stopPipelineStage(workspaceId, "run").catch(() => {});
        steps.push("run stopped");

        // Step 4: Start run
        steps.push("starting run stage...");
        await client.startPipelineStage(workspaceId, "run");
        steps.push("run stage started");

        // Get workspace info for URL
        const workspace = await client.getWorkspace(workspaceId);

        return {
          content: [
            {
              type: "text" as const,
              text: `Deployment successful!\n\nSteps:\n${steps.join("\n")}\n\nWorkspace ID: ${workspace.id}\nName: ${workspace.name}\nURL: https://${workspace.devDomain || `${workspace.id}-3000.codesphere.com`}`,
            },
          ],
        };
      } catch (error: any) {
        const errorMsg =
          error instanceof PollTimeoutError
            ? "Prepare stage timed out after 10 minutes"
            : error.message;

        return {
          content: [
            {
              type: "text" as const,
              text: `Deployment failed.\n\nSteps completed:\n${steps.join("\n")}\n\nError: ${errorMsg}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "stop_workspace",
    "Stop a running workspace by stopping its run stage pipeline",
    {
      workspaceId: z.string().describe("The workspace ID to stop"),
    },
    async ({ workspaceId }) => {
      try {
        await client.stopPipelineStage(workspaceId, "run");
        return {
          content: [
            {
              type: "text" as const,
              text: `Workspace ${workspaceId} stopped successfully.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error stopping workspace: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "restart_workspace",
    "Restart a workspace without rebuilding — stops the run stage and starts it again",
    {
      workspaceId: z.string().describe("The workspace ID to restart"),
    },
    async ({ workspaceId }) => {
      try {
        await client.stopPipelineStage(workspaceId, "run").catch(() => {});
        await client.startPipelineStage(workspaceId, "run");

        const workspace = await client.getWorkspace(workspaceId);

        return {
          content: [
            {
              type: "text" as const,
              text: `Workspace ${workspaceId} restarted successfully.\n\nURL: https://${workspace.devDomain || `${workspace.id}-3000.codesphere.com`}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error restarting workspace: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
