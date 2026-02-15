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

  server.tool(
    "list_domains",
    "List all custom domains for a team with their routing configuration",
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
        const domains = await client.listDomains(resolvedTeamId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(domains, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing domains: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "create_domain",
    "Register a new custom domain for a team. After creating, you'll need to set up DNS records and verify it.",
    {
      teamId: z
        .string()
        .optional()
        .describe("Team ID (uses default if not provided)"),
      domainName: z
        .string()
        .describe("The domain name to register (e.g., myapp.example.com)"),
    },
    async ({ teamId, domainName }) => {
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
        const result = await client.createDomain(resolvedTeamId, domainName);
        return {
          content: [
            {
              type: "text" as const,
              text: `Domain ${domainName} created.\n\n${JSON.stringify(result, null, 2)}\n\nNext: configure your DNS records to point to Codesphere, then use verify_domain to verify.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error creating domain: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "delete_domain",
    "Remove a custom domain from a team. This cannot be undone.",
    {
      teamId: z
        .string()
        .optional()
        .describe("Team ID (uses default if not provided)"),
      domainName: z
        .string()
        .describe("The domain name to delete"),
    },
    async ({ teamId, domainName }) => {
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
        await client.deleteDomain(resolvedTeamId, domainName);
        return {
          content: [
            {
              type: "text" as const,
              text: `Domain ${domainName} deleted successfully.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error deleting domain: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "verify_domain",
    "Verify DNS configuration for a custom domain. Run this after setting up your DNS records.",
    {
      teamId: z
        .string()
        .optional()
        .describe("Team ID (uses default if not provided)"),
      domainName: z
        .string()
        .describe("The domain name to verify"),
    },
    async ({ teamId, domainName }) => {
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
        const result = await client.verifyDomain(resolvedTeamId, domainName);
        return {
          content: [
            {
              type: "text" as const,
              text: `Domain verification result for ${domainName}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text" as const, text: `Error verifying domain: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
