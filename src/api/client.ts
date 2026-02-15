export class CodesphereApiError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message: string
  ) {
    super(`Codesphere API error (${status}) on ${endpoint}: ${message}`);
    this.name = "CodesphereApiError";
  }
}

export class CodesphereClient {
  constructor(
    private token: string,
    private baseUrl: string = "https://codesphere.com/api"
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      const safeText = text
        .replace(/Bearer\s+[\w._-]+/gi, "Bearer [REDACTED]")
        .replace(/api[_-]?key[\s:=]+[\w._-]+/gi, "api_key [REDACTED]");
      throw new CodesphereApiError(res.status, `${method} ${path}`, safeText);
    }

    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }

    // Return plain text for non-JSON responses (e.g. logs)
    return res.text() as Promise<T>;
  }

  // Teams
  async listTeams(): Promise<any[]> {
    return this.request("GET", "/teams");
  }

  // Workspaces
  async listWorkspaces(teamId: string): Promise<any[]> {
    return this.request("GET", `/workspaces/team/${teamId}`);
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    return this.request("GET", `/workspaces/${workspaceId}`);
  }

  async getWorkspaceStatus(workspaceId: string): Promise<{ isRunning: boolean }> {
    return this.request("GET", `/workspaces/${workspaceId}/status`);
  }

  async createWorkspace(params: {
    teamId: number;
    name: string;
    planId: number;
    isPrivateRepo?: boolean;
    replicas?: number;
    gitUrl?: string;
    initialBranch?: string;
  }): Promise<any> {
    return this.request("POST", "/workspaces", {
      ...params,
      isPrivateRepo: params.isPrivateRepo ?? false,
      replicas: params.replicas ?? 1,
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    return this.request("DELETE", `/workspaces/${workspaceId}`);
  }

  async updateWorkspace(
    workspaceId: string,
    params: { replicas?: number }
  ): Promise<any> {
    return this.request("PUT", `/workspaces/${workspaceId}`, params);
  }

  // Execute
  async executeCommand(workspaceId: string, command: string): Promise<any> {
    return this.request("POST", `/workspaces/${workspaceId}/execute`, {
      command,
    });
  }

  // Environment variables
  async listEnvVars(workspaceId: string): Promise<any> {
    return this.request("GET", `/workspaces/${workspaceId}/env-vars`);
  }

  async setEnvVars(
    workspaceId: string,
    envVars: Record<string, string>
  ): Promise<any> {
    return this.request("POST", `/workspaces/${workspaceId}/env-vars`, envVars);
  }

  // Git
  async gitPull(workspaceId: string, remote: string = "origin"): Promise<any> {
    return this.request(
      "POST",
      `/workspaces/${workspaceId}/git/pull/${remote}`
    );
  }

  async gitHead(workspaceId: string): Promise<any> {
    return this.request("GET", `/workspaces/${workspaceId}/git/head`);
  }

  // Pipeline (generic stage: "prepare" | "test" | "run")
  async startPipelineStage(workspaceId: string, stage: string): Promise<any> {
    return this.request(
      "POST",
      `/workspaces/${workspaceId}/pipeline/${stage}/start`
    );
  }

  async stopPipelineStage(workspaceId: string, stage: string): Promise<any> {
    return this.request(
      "POST",
      `/workspaces/${workspaceId}/pipeline/${stage}/stop`
    );
  }

  async getPipelineStatus(workspaceId: string, stage: string): Promise<any[]> {
    return this.request(
      "GET",
      `/workspaces/${workspaceId}/pipeline/${stage}`
    );
  }

  // Logs
  async getLogs(workspaceId: string, stage: string, step: number = 0): Promise<any> {
    return this.request(
      "GET",
      `/workspaces/${workspaceId}/logs/${stage}/${step}`
    );
  }

  // Domains
  async listDomains(teamId: string): Promise<any[]> {
    return this.request("GET", `/domains/team/${teamId}`);
  }

  async updateDomainRouting(
    teamId: string,
    domainName: string,
    connections: Record<string, number[]>
  ): Promise<any> {
    return this.request(
      "PUT",
      `/domains/team/${teamId}/domain/${domainName}/workspace-connections`,
      connections
    );
  }

  async createDomain(teamId: string, domainName: string): Promise<any> {
    return this.request(
      "POST",
      `/domains/team/${teamId}/domain/${domainName}`
    );
  }

  async deleteDomain(teamId: string, domainName: string): Promise<void> {
    return this.request(
      "DELETE",
      `/domains/team/${teamId}/domain/${domainName}`
    );
  }

  async verifyDomain(teamId: string, domainName: string): Promise<any> {
    return this.request(
      "POST",
      `/domains/team/${teamId}/domain/${domainName}/verify`
    );
  }

  // Landscape
  async deployLandscape(workspaceId: string, profile?: string): Promise<any> {
    const path = profile
      ? `/workspaces/${workspaceId}/landscape/deploy/${profile}`
      : `/workspaces/${workspaceId}/landscape/deploy`;
    return this.request("POST", path);
  }

  async teardownLandscape(workspaceId: string): Promise<any> {
    return this.request(
      "POST",
      `/workspaces/${workspaceId}/landscape/teardown`
    );
  }
}
