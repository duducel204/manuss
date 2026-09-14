import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { checkMCPHealth, executeTermuxExec, getMCPConfig } from './server/mcpClient.js';
import { processUserMessage, continueWithToolResult } from './server/geminiService.js';
import { evaluateCommandSafety } from './server/safety.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Health & Configuration Status API
app.get('/api/status', async (req, res) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const mcpConfig = getMCPConfig();

  let mcpHealth: any = {
    status: 'misconfigured',
    message: 'TERMUX_MCP_URL or TERMUX_MCP_TOKEN not configured',
  };

  if (mcpConfig.isConfigured) {
    try {
      mcpHealth = await checkMCPHealth();
    } catch (err: any) {
      mcpHealth = {
        status: 'offline',
        message: err.message || 'Error checking MCP health',
      };
    }
  }

  // Safe preview of URL
  let urlPreview: string | undefined;
  if (mcpConfig.url) {
    try {
      const u = new URL(mcpConfig.url);
      urlPreview = `${u.protocol}//${u.host.slice(0, 4)}***${u.host.slice(-10)}${u.pathname}`;
    } catch {
      urlPreview = 'Invalid URL format';
    }
  }

  res.json({
    geminiConfigured,
    mcpUrlConfigured: Boolean(mcpConfig.url),
    mcpTokenConfigured: Boolean(mcpConfig.token),
    status: mcpHealth.status,
    message: mcpHealth.message,
    latencyMs: mcpHealth.latencyMs,
    urlPreview,
    toolsDiscovered: mcpHealth.toolsDiscovered || [],
    lastChecked: Date.now(),
  });
});

// 2. Chat Processing with Gemini (determines if tool execution is required)
app.post('/api/chat', async (req, res) => {
  try {
    const { history = [], message } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Field "message" is required and must be a string.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({
        error: 'GEMINI_API_KEY is not configured in server environment secrets.',
      });
      return;
    }

    const result = await processUserMessage(history, message);

    if (result.toolCallProposal) {
      res.json({
        status: 'requires_confirmation',
        text: result.text,
        toolCall: {
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          ...result.toolCallProposal,
          status: 'pending_confirmation',
        },
      });
      return;
    }

    res.json({
      status: 'completed',
      text: result.text || 'Message processed.',
    });
  } catch (err: any) {
    console.error('[API /api/chat error]', err);
    res.status(500).json({
      error: err.message || 'Internal error processing chat message with Gemini.',
    });
  }
});

// 3. Tool Execution via MCP (requires explicit client approval)
app.post('/api/mcp/execute', async (req, res) => {
  try {
    const { toolCall, history = [], userApproved } = req.body;

    if (!userApproved) {
      res.status(403).json({ error: 'Tool execution was not confirmed by user.' });
      return;
    }

    if (!toolCall || !toolCall.command) {
      res.status(400).json({ error: 'Invalid toolCall payload: command is missing.' });
      return;
    }

    const timeout = Math.min(Math.max(Number(toolCall.timeout_seconds) || 120, 1), 300);

    // Call remote MCP server via HTTP JSON-RPC
    const toolResult = await executeTermuxExec(toolCall.command, timeout);

    // Pass result back into Gemini for analytical synthesis
    let explanation = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        explanation = await continueWithToolResult(history, toolCall, toolResult);
      } catch (geminiErr: any) {
        console.warn('[Gemini continuation error]', geminiErr.message);
        explanation = `Command finished with exit code ${toolResult.exit_code}. Output:\n${toolResult.stdout || toolResult.stderr}`;
      }
    }

    res.json({
      toolResult,
      explanation,
    });
  } catch (err: any) {
    console.error('[API /api/mcp/execute error]', err);
    res.status(500).json({
      error: err.message || 'Failed to execute command on Termux MCP bridge.',
    });
  }
});

// 4. Quick Direct Read-only Inspection Test ("pwd && ls -la")
app.post('/api/mcp/test-home', async (req, res) => {
  try {
    const { userApproved = true } = req.body;
    const command = 'pwd && ls -la';
    const safety = evaluateCommandSafety(command);

    if (!userApproved) {
      res.json({
        requires_confirmation: true,
        toolCall: {
          id: `test_home_${Date.now()}`,
          name: 'termux_exec',
          command,
          timeout_seconds: 30,
          safety,
          status: 'pending_confirmation',
        },
      });
      return;
    }

    const toolResult = await executeTermuxExec(command, 30);
    res.json({
      toolResult,
      command,
      safety,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Error running HOME directory test.',
    });
  }
});

// Start server with Vite middleware or static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Termux MCP Bridge server running on http://0.0.0.0:${PORT}`);
  });
}

start();
