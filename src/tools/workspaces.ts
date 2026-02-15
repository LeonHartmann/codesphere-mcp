import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CodesphereClient } from "../api/client.js";

export function registerWorkspaceTools(
  server: McpServer,
  client: CodesphereClient,
  defaultTeamId?: string
) {
  server.tool(
    "list_workspaces",
    "List all workspaces for a team with their status, URL, and git info",
    {
      teamId: z
        .string()
        .optional()
        .describe("Team ID (uses default if not provided)"),
    },
    async ({ teamId }) => {
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
        const workspaces = await client.listWorkspaces(resolvedTeamId);
        const summary = workspaces.map((ws: any) => ({
          id: ws.id,
          name: ws.name,
          planId: ws.planId,
          replicas: ws.replicas,
          gitUrl: ws.gitUrl,
          branch: ws.initialBranch,
          devDomain: ws.devDomain,
          createdAt: ws.createdAt,
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error listing workspaces: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_workspace_status",
    "Get detailed status of a workspace including pipeline state for all stages (prepare, test, run), git info, and access URL",
    {
      workspaceId: z.string().describe("The workspace ID"),
    },
    async ({ workspaceId }) => {
      try {
        const [workspace, wsStatus, prepare, test, run] = await Promise.all([
          client.getWorkspace(workspaceId),
          client.getWorkspaceStatus(workspaceId).catch(() => null),
          client.getPipelineStatus(workspaceId, "prepare").catch(() => null),
          client.getPipelineStatus(workspaceId, "test").catch(() => null),
          client.getPipelineStatus(workspaceId, "run").catch(() => null),
        ]);

        const status = {
          workspace,
          isRunning: wsStatus?.isRunning ?? null,
          pipeline: { prepare, test, run },
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting workspace status: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "create_workspace",
    "Create a new Codesphere workspace from a git repository. Returns the new workspace details once created.",
    {
      teamId: z
        .string()
        .optional()
        .describe("Team ID (uses default if not provided)"),
      gitUrl: z
        .string()
        .describe("Git repository URL (e.g., https://github.com/user/repo.git)"),
      name: z.string().describe("Workspace name"),
      planId: z
        .number()
        .describe("Compute plan ID"),
      branch: z.string().optional().default("main").describe("Git branch (default: main)"),
      isPrivateRepo: z.boolean().optional().default(false).describe("Whether the repo is private"),
    },
    async ({ teamId, gitUrl, name, planId, branch, isPrivateRepo }) => {
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
        const result = await client.createWorkspace({
          teamId: parseInt(resolvedTeamId, 10),
          name,
          planId,
          isPrivateRepo,
          gitUrl,
          initialBranch: branch,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating workspace: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "delete_workspace",
    "Permanently delete a workspace. This cannot be undone.",
    {
      workspaceId: z.string().describe("The workspace ID to delete"),
    },
    async ({ workspaceId }) => {
      try {
        await client.deleteWorkspace(workspaceId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Workspace ${workspaceId} deleted successfully.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error deleting workspace: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "scale_workspace",
    "Scale a workspace by changing the number of replicas for horizontal scaling",
    {
      workspaceId: z.string().describe("The workspace ID to scale"),
      replicas: z.number().min(1).describe("Number of replicas"),
    },
    async ({ workspaceId, replicas }) => {
      try {
        await client.updateWorkspace(workspaceId, { replicas });
        return {
          content: [
            {
              type: "text" as const,
              text: `Workspace ${workspaceId} scaled to ${replicas} replica${replicas > 1 ? "s" : ""}.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error scaling workspace: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "git_info",
    "Get the current git HEAD info (branch, commit) for a workspace",
    {
      workspaceId: z.string().describe("The workspace ID"),
    },
    async ({ workspaceId }) => {
      try {
        const head = await client.gitHead(workspaceId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(head, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error getting git info: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
