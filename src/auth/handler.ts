import { Hono } from "hono";
import type { Env } from "../types.js";

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get("/", (c) => {
  return c.json({
    name: "codesphere-mcp",
    version: "2.0.0",
    status: "ok",
    mcp: "/mcp",
  });
});

// GET /authorize — render API key form
app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  if (!oauthReqInfo?.clientId) {
    return c.text("Invalid OAuth request", 400);
  }

  const oauthState = btoa(JSON.stringify(oauthReqInfo));
  return c.html(renderForm({ oauthState }));
});

// POST /authorize — validate key and complete OAuth
app.post("/authorize", async (c) => {
  const body = await c.req.parseBody();
  const apiKey = (body["apiKey"] as string || "").trim();
  const oauthState = body["oauthState"] as string;

  if (!apiKey) {
    return c.html(renderForm({ oauthState, error: "API key is required." }));
  }

  if (!oauthState) {
    return c.text("Missing OAuth state. Please start the connection again from Claude.", 400);
  }

  // Validate the API key by calling GET /teams
  let teams: any[];
  try {
    const res = await fetch("https://codesphere.com/api/teams", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    teams = (await res.json()) as any[];
  } catch (err: any) {
    return c.html(
      renderForm({
        oauthState,
        error: `Invalid API key. Could not authenticate with Codesphere. (${err.message})`,
      })
    );
  }

  // Deserialize the OAuth request info
  let oauthReqInfo: any;
  try {
    oauthReqInfo = JSON.parse(atob(oauthState));
  } catch {
    return c.text("Corrupted OAuth state. Please start over.", 400);
  }

  // Complete the OAuth authorization — stores csToken in encrypted props
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: teams[0]?.id ? `cs-team-${teams[0].id}` : "cs-user",
    metadata: {
      label: teams[0]?.name
        ? `Codesphere (${teams[0].name})`
        : "Codesphere",
    },
    scope: oauthReqInfo.scope,
    props: {
      csToken: apiKey,
      csTeamId: teams[0]?.id?.toString(),
    },
  });

  return c.redirect(redirectTo);
});

function renderForm(opts: { oauthState: string; error?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to Codesphere</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 40px; max-width: 440px; width: 100%; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    p { color: #64748b; margin-bottom: 24px; line-height: 1.5; }
    label { display: block; font-weight: 500; margin-bottom: 6px; font-size: 0.9rem; }
    input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; margin-bottom: 20px; }
    input[type="password"]:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 1rem; cursor: pointer; width: 100%; font-weight: 500; }
    button:hover { background: #1d4ed8; }
    .error { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 0.9rem; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Connect to Codesphere</h1>
    <p>Enter your Codesphere API key to give Claude access to your workspaces. <a href="https://codesphere.com/ide/settings?tab=apiKeys" target="_blank">Create an API key</a></p>
    ${opts.error ? `<div class="error">${opts.error}</div>` : ""}
    <form method="POST" action="/authorize">
      <input type="hidden" name="oauthState" value="${opts.oauthState}" />
      <label for="apiKey">API Key</label>
      <input type="password" id="apiKey" name="apiKey" placeholder="Your Codesphere API key" required autofocus />
      <button type="submit">Connect</button>
    </form>
  </div>
</body>
</html>`;
}

export default app;
