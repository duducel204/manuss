#!/usr/bin/env python3
"""Personal MCP bridge for Termux.

Exposes one MCP tool, termux_exec, over Streamable HTTP at /mcp.
The server is intended to listen only on localhost; cloudflared publishes it
through an outbound tunnel.
"""
from __future__ import annotations

import asyncio
import os
import secrets
from pathlib import Path
from typing import Any

from mcp.server import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, PlainTextResponse
from starlette.routing import Route
import uvicorn

HOST = os.getenv("TERMUX_MCP_HOST", "127.0.0.1")
PORT = int(os.getenv("TERMUX_MCP_PORT", "8765"))
TOKEN_FILE = Path(os.getenv("TERMUX_MCP_TOKEN_FILE", "~/.config/termux-mcp/token")).expanduser()
MAX_OUTPUT = int(os.getenv("TERMUX_MCP_MAX_OUTPUT", "20000"))
DEFAULT_TIMEOUT = int(os.getenv("TERMUX_MCP_TIMEOUT", "120"))
ALLOWED_HOST = os.getenv("TERMUX_MCP_ALLOWED_HOST", "127.0.0.1")
SHELL = os.getenv("TERMUX_MCP_SHELL", "/data/data/com.termux/files/usr/bin/bash")


def load_token() -> str:
    token = os.getenv("TERMUX_MCP_TOKEN", "").strip()
    if token:
        return token
    try:
        return TOKEN_FILE.read_text(encoding="utf-8").strip()
    except FileNotFoundError as exc:
        raise RuntimeError(f"Token ausente: crie {TOKEN_FILE}") from exc


class BearerAuthMiddleware(BaseHTTPMiddleware):
    """Require the personal bearer token for MCP and health endpoints."""

    async def dispatch(self, request: Request, call_next):
        expected = load_token()
        supplied = request.headers.get("authorization", "")
        if not secrets.compare_digest(supplied, f"Bearer {expected}"):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        return await call_next(request)


mcp = MCPServer("Termux Personal Bridge")


@mcp.tool()
async def termux_exec(command: str, timeout_seconds: int = DEFAULT_TIMEOUT) -> dict[str, Any]:
    """Execute one shell command in the user's Termux and return stdout, stderr and exit code."""
    command = command.strip()
    if not command:
        raise ValueError("command não pode ser vazio")
    timeout_seconds = max(1, min(int(timeout_seconds), 300))

    process = await asyncio.create_subprocess_exec(
        SHELL,
        "-lc",
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=os.path.expanduser("~"),
    )
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout_seconds)
        timed_out = False
    except asyncio.TimeoutError:
        process.kill()
        stdout, stderr = await process.communicate()
        timed_out = True

    def clip(data: bytes) -> str:
        text = data.decode("utf-8", errors="replace")
        return text if len(text) <= MAX_OUTPUT else text[:MAX_OUTPUT] + "\n...[saída truncada]"

    return {
        "command": command,
        "exit_code": 124 if timed_out else process.returncode,
        "timed_out": timed_out,
        "stdout": clip(stdout),
        "stderr": clip(stderr),
    }


async def health(_: Request):
    return PlainTextResponse("ok")


security = TransportSecuritySettings(
    allowed_hosts=["127.0.0.1", "localhost", f"{ALLOWED_HOST}:*"],
)
app = mcp.streamable_http_app(transport_security=security)
app.add_middleware(BearerAuthMiddleware)
app.routes.insert(0, Route("/health", health, methods=["GET"]))


if __name__ == "__main__":
    print(f"Termux MCP ouvindo em http://{HOST}:{PORT}/mcp", flush=True)
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
