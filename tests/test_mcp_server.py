#!/usr/bin/env python3
import asyncio
import os
import shutil
import sys
import tempfile
from pathlib import Path


def test_termux_exec():
    with tempfile.TemporaryDirectory() as directory:
        token_file = Path(directory) / "token"
        token_file.write_text("test-token\n", encoding="utf-8")
        os.environ["TERMUX_MCP_TOKEN_FILE"] = str(token_file)
        os.environ["TERMUX_MCP_SHELL"] = shutil.which("bash") or "/bin/sh"
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "termux"))
        from mcp_server import termux_exec

        result = asyncio.run(termux_exec("printf 'bridge-ok'"))
        assert result["exit_code"] == 0
        assert result["stdout"] == "bridge-ok"


if __name__ == "__main__":
    test_termux_exec()
    print("OK — teste MCP passou.")
