export interface MCPHealthResult {
  status: 'online' | 'offline' | 'unauthorized' | 'not_found' | 'misconfigured';
  message: string;
  latencyMs?: number;
  toolsDiscovered?: Array<{ name: string; description: string }>;
}

export interface MCPExecResult {
  command: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  durationMs: number;
  error?: string;
}

export function getMCPConfig() {
  const url = (process.env.TERMUX_MCP_URL || '').trim();
  const token = (process.env.TERMUX_MCP_TOKEN || '').trim();
  return {
    url,
    token,
    isConfigured: Boolean(url && token),
  };
}

export async function checkMCPHealth(): Promise<MCPHealthResult> {
  const { url, token } = getMCPConfig();

  if (!url) {
    return {
      status: 'misconfigured',
      message: 'TERMUX_MCP_URL is missing. Please set it in AI Studio settings or .env',
    };
  }

  if (!token) {
    return {
      status: 'misconfigured',
      message: 'TERMUX_MCP_TOKEN is missing. Please set it in AI Studio settings or .env',
    };
  }

  // Derive health check URL: try /health on the base host, or POST ping on /mcp
  let healthUrl = url;
  try {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/mcp') || parsed.pathname.endsWith('/mcp/')) {
      healthUrl = `${parsed.origin}/health`;
    }
  } catch (e) {
    return {
      status: 'misconfigured',
      message: `Invalid TERMUX_MCP_URL: ${(e as Error).message}`,
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    // Attempt 1: GET /health
    const resp = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (resp.status === 401) {
      return {
        status: 'unauthorized',
        message: 'HTTP 401 Unauthorized: Invalid or expired Bearer token.',
        latencyMs,
      };
    }

    if (resp.status === 404) {
      // Try fallback to POST /mcp with ping
      return await pingMCPViaJsonRpc(url, token);
    }

    if (!resp.ok) {
      return {
        status: 'offline',
        message: `HTTP ${resp.status} ${resp.statusText} from Termux bridge.`,
        latencyMs,
      };
    }

    // Also discover tools
    const tools = await listMCPTools(url, token).catch(() => []);

    return {
      status: 'online',
      message: 'Connected to Termux MCP server',
      latencyMs,
      toolsDiscovered: tools,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        status: 'offline',
        message: 'Connection timed out after 7s. Make sure Termux start.sh and Cloudflare Tunnel are active.',
      };
    }
    // Try fallback JSON-RPC ping
    try {
      return await pingMCPViaJsonRpc(url, token);
    } catch {
      return {
        status: 'offline',
        message: `Unable to reach Termux bridge: ${err.message || 'Connection failed'}`,
      };
    }
  }
}

async function pingMCPViaJsonRpc(url: string, token: string): Promise<MCPHealthResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'ping-1',
        method: 'ping',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (resp.status === 401) {
      return {
        status: 'unauthorized',
        message: 'HTTP 401 Unauthorized: Invalid Bearer token.',
        latencyMs,
      };
    }
    if (resp.status === 404) {
      return {
        status: 'not_found',
        message: 'HTTP 404 Not Found: Ensure the URL ends with /mcp and tunnel is active.',
        latencyMs,
      };
    }
    if (!resp.ok) {
      return {
        status: 'offline',
        message: `HTTP ${resp.status} ${resp.statusText}`,
        latencyMs,
      };
    }

    const tools = await listMCPTools(url, token).catch(() => []);
    return {
      status: 'online',
      message: 'Connected to Termux MCP server via JSON-RPC',
      latencyMs,
      toolsDiscovered: tools,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      status: 'offline',
      message: `Termux MCP unreachable: ${err.message}`,
    };
  }
}

export async function listMCPTools(url?: string, token?: string): Promise<Array<{ name: string; description: string }>> {
  const cfg = getMCPConfig();
  const targetUrl = url || cfg.url;
  const targetToken = token || cfg.token;

  if (!targetUrl || !targetToken) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${targetToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'tools-list',
        method: 'tools/list',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      return [];
    }

    const data = await resp.json();
    if (data?.result?.tools && Array.isArray(data.result.tools)) {
      return data.result.tools.map((t: any) => ({
        name: t.name,
        description: t.description || '',
      }));
    }
    return [];
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

export async function executeTermuxExec(command: string, timeoutSeconds: number = 120): Promise<MCPExecResult> {
  const { url, token } = getMCPConfig();

  if (!url || !token) {
    throw new Error('TERMUX_MCP_URL or TERMUX_MCP_TOKEN is not configured.');
  }

  const startTime = Date.now();
  const controller = new AbortController();
  // Add a safety buffer over the shell timeout
  const maxMs = (timeoutSeconds + 15) * 1000;
  const timeoutId = setTimeout(() => controller.abort(), maxMs);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `exec-${Date.now()}`,
        method: 'tools/call',
        params: {
          name: 'termux_exec',
          arguments: {
            command,
            timeout_seconds: timeoutSeconds,
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (resp.status === 401) {
      throw new Error('HTTP 401 Unauthorized: Bearer token rejected by Termux MCP bridge.');
    }
    if (resp.status === 404) {
      throw new Error('HTTP 404 Not Found: Check if TERMUX_MCP_URL is correct and has /mcp suffix.');
    }
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText} from Termux MCP bridge.`);
    }

    const json = await resp.json();

    if (json.error) {
      throw new Error(`MCP Error (${json.error.code}): ${json.error.message}`);
    }

    const result = json.result;
    if (!result) {
      throw new Error('Invalid response from MCP server: missing result.');
    }

    // Extract structuredContent if present or parse from content
    let structured = result.structuredContent;
    if (!structured && result.content && Array.isArray(result.content)) {
      const textItem = result.content.find((c: any) => c.type === 'text');
      if (textItem?.text) {
        try {
          structured = JSON.parse(textItem.text);
        } catch {
          // not JSON
        }
      }
    }

    return {
      command,
      stdout: structured?.stdout ?? (result.content?.[0]?.text || ''),
      stderr: structured?.stderr ?? '',
      exit_code: structured?.exit_code ?? (result.isError ? 1 : 0),
      timed_out: Boolean(structured?.timed_out),
      durationMs,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      return {
        command,
        stdout: '',
        stderr: 'Execution timed out waiting for Termux bridge response.',
        exit_code: 124,
        timed_out: true,
        durationMs,
        error: 'Execution timed out',
      };
    }
    return {
      command,
      stdout: '',
      stderr: err.message || 'Unknown error during MCP execution',
      exit_code: 1,
      timed_out: false,
      durationMs,
      error: err.message,
    };
  }
}
