#!/usr/bin/env python3
"""Minimal personal MCP Streamable HTTP server for Termux.

Uses only Python's standard library so it works on Termux/aarch64 without
compiling Rust extensions. It implements the MCP methods needed by a host:
initialize, notifications/initialized, ping, tools/list and tools/call.
"""
from __future__ import annotations

import asyncio
import json
import os
import secrets
import subprocess
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = os.getenv("TERMUX_MCP_HOST", "127.0.0.1")
PORT = int(os.getenv("TERMUX_MCP_PORT", "8765"))
MAX_OUTPUT = int(os.getenv("TERMUX_MCP_MAX_OUTPUT", "20000"))
DEFAULT_TIMEOUT = int(os.getenv("TERMUX_MCP_TIMEOUT", "120"))
if os.name == "nt":
    DEFAULT_SHELL = os.getenv("COMSPEC", "powershell.exe")
    DEFAULT_TOKEN_FILE = Path(os.getenv("APPDATA", Path.home())) / "termux-mcp" / "token"
else:
    DEFAULT_SHELL = "/data/data/com.termux/files/usr/bin/bash"
    DEFAULT_TOKEN_FILE = Path("~/.config/termux-mcp/token").expanduser()
SHELL = os.getenv("TERMUX_MCP_SHELL", DEFAULT_SHELL)
SHELL_MODE = os.getenv("TERMUX_MCP_SHELL_MODE", "powershell" if os.name == "nt" else "posix").lower()
TOKEN_FILE = Path(os.getenv("TERMUX_MCP_TOKEN_FILE", str(DEFAULT_TOKEN_FILE))).expanduser()
RUNTIME_NAME = "Windows PowerShell" if os.name == "nt" else "Termux Bash"
PROTOCOL_VERSION = "2025-06-18"


def load_token() -> str:
    token = os.getenv("TERMUX_MCP_TOKEN", "").strip()
    if token:
        return token
    return TOKEN_FILE.read_text(encoding="utf-8").strip()


def clip(data: bytes) -> str:
    text = data.decode("utf-8", errors="replace")
    return text if len(text) <= MAX_OUTPUT else text[:MAX_OUTPUT] + "\n...[saída truncada]"


async def termux_exec(command: str, timeout_seconds: int = DEFAULT_TIMEOUT) -> dict[str, Any]:
    """Execute a command in the configured local shell and return its result."""
    command = command.strip()
    if not command:
        raise ValueError("command não pode ser vazio")
    timeout_seconds = max(1, min(int(timeout_seconds), 300))
    shell_args = [SHELL, "-NoProfile", "-NonInteractive", "-Command", command]
    if SHELL_MODE in {"posix", "bash", "sh"}:
        shell_args = [SHELL, "-lc", command]
    process = await asyncio.create_subprocess_exec(
        *shell_args,
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
    return {
        "command": command,
        "exit_code": 124 if timed_out else process.returncode,
        "timed_out": timed_out,
        "stdout": clip(stdout),
        "stderr": clip(stderr),
    }


def jsonrpc_error(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def handle_message(message: dict[str, Any]) -> dict[str, Any] | None:
    request_id = message.get("id")
    method = message.get("method")
    params = message.get("params") or {}

    if not method:
        return jsonrpc_error(request_id, -32600, "Invalid Request")
    if method.startswith("notifications/"):
        return None
    if method == "initialize":
        return {
            "jsonrpc": "2.0", "id": request_id,
            "result": {
                "protocolVersion": params.get("protocolVersion", PROTOCOL_VERSION),
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "termux-personal-bridge", "version": "1.0.0"},
                "instructions": f"Use termux_exec only when explicitly requested by the user. Commands run in {RUNTIME_NAME}.",
            },
        }
    if method == "ping":
        return {"jsonrpc": "2.0", "id": request_id, "result": {}}
    if method == "tools/list":
        return {
            "jsonrpc": "2.0", "id": request_id,
            "result": {"tools": [{
                "name": "termux_exec",
                "description": f"Execute one command in the user's local {RUNTIME_NAME} and return stdout, stderr and exit code.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "command": {"type": "string", "description": "Bash command to execute in Termux."},
                        "timeout_seconds": {"type": "integer", "minimum": 1, "maximum": 300, "default": DEFAULT_TIMEOUT},
                    },
                    "required": ["command"],
                },
            }]},
        }
    if method == "tools/call":
        if params.get("name") != "termux_exec":
            return jsonrpc_error(request_id, -32601, "Unknown tool")
        arguments = params.get("arguments") or {}
        try:
            result = asyncio.run(termux_exec(arguments.get("command", ""), arguments.get("timeout_seconds", DEFAULT_TIMEOUT)))
            is_error = result["exit_code"] != 0
            return {
                "jsonrpc": "2.0", "id": request_id,
                "result": {
                    "isError": is_error,
                    "content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}],
                    "structuredContent": result,
                },
            }
        except Exception as exc:
            return jsonrpc_error(request_id, -32000, str(exc))
    return jsonrpc_error(request_id, -32601, f"Method not found: {method}")


class MCPHandler(BaseHTTPRequestHandler):
    server_version = "TermuxMCP/1.0"

    def _authorized(self) -> bool:
        supplied = self.headers.get("Authorization", "")
        expected = f"Bearer {load_token()}"
        return secrets.compare_digest(supplied, expected)

    def _send_json(self, payload: dict[str, Any], status: int = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Mcp-Protocol-Version", PROTOCOL_VERSION)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            if not self._authorized():
                self._send_json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
            else:
                self._send_json({"status": "ok"})
            return
        self.send_error(HTTPStatus.METHOD_NOT_ALLOWED, "MCP uses POST")

    def do_POST(self) -> None:
        if self.path.rstrip("/") != "/mcp":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            if not self._authorized():
                self._send_json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
                return
            length = int(self.headers.get("Content-Length", "0"))
            message = json.loads(self.rfile.read(length))
            response = handle_message(message)
            if response is None:
                self.send_response(HTTPStatus.ACCEPTED)
                self.end_headers()
            else:
                self._send_json(response)
        except json.JSONDecodeError:
            self._send_json(jsonrpc_error(None, -32700, "Parse error"), HTTPStatus.BAD_REQUEST)
        except Exception as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[termux-mcp] {format % args}", flush=True)


def main() -> None:
    if os.path.isabs(SHELL) and not Path(SHELL).exists():
        raise SystemExit(f"Shell não encontrado: {SHELL}")
    load_token()
    server = ThreadingHTTPServer((HOST, PORT), MCPHandler)
    print(f"Termux MCP ouvindo em http://{HOST}:{PORT}/mcp", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nTermux MCP encerrado.", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
