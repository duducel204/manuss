import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Terminal, Shield, Key, BookOpen } from 'lucide-react';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div
      id="setup-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="setup-modal-container"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 text-neutral-200 shadow-2xl space-y-5 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                Termux MCP Setup & Diagnostics Guide
              </h2>
              <p className="text-xs text-neutral-400">
                Step-by-step instructions from <code className="text-cyan-400">docs/AI_STUDIO_BUILD_MODE.md</code>
              </p>
            </div>
          </div>
          <button
            id="btn-close-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs sm:text-sm leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
          {/* Section 1: Secrets */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              <Key className="w-4 h-4" />
              1. AI Studio Secrets Configuration
            </div>
            <p className="text-neutral-400 text-xs">
              Configure these three environment variables in the AI Studio Settings menu (kept securely server-side, never exposed to browser):
            </p>
            <div className="space-y-1.5 font-mono text-xs text-neutral-300">
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="text-cyan-400 font-semibold">GEMINI_API_KEY</span> = your Google Gemini API key
              </div>
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="text-cyan-400 font-semibold">TERMUX_MCP_URL</span> = <span className="text-neutral-400">https://xxxx.trycloudflare.com/mcp</span>
              </div>
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="text-cyan-400 font-semibold">TERMUX_MCP_TOKEN</span> = token displayed by Termux
              </div>
            </div>
          </div>

          {/* Section 2: Termux Bridge Startup */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
                <Terminal className="w-4 h-4" />
                2. Install & Start Bridge on Termux
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    'pkg update -y && pkg install -y curl && curl -fsSL --retry 3 https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap_mcp.sh | bash\n~/tradutor-local/mcp/start.sh',
                    'start_cmd'
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-cyan-400 transition-colors"
              >
                {copiedSection === 'start_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy commands
              </button>
            </div>
            <p className="text-neutral-400 text-xs">
              Run this one-liner in your Android Termux app to install and launch the MCP server with Cloudflare tunnel:
            </p>
            <pre className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`pkg update -y && pkg install -y curl && \\
curl -fsSL --retry 3 \\
  https://raw.githubusercontent.com/duducel204/manuss/main/termux/bootstrap_mcp.sh \\
  | bash

# Then start the bridge:
~/tradutor-local/mcp/start.sh`}
            </pre>
            <p className="text-neutral-400 text-[11px]">
              Keep the Termux session open. It will print the temporary <code className="text-cyan-300 font-mono">https://*.trycloudflare.com/mcp</code> and the Bearer token.
            </p>
          </div>

          {/* Section 3: Diagnostic test on device */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                3. Direct Termux Health Check
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    'TOKEN="$(cat ~/.config/termux-mcp/token)"\ncurl -i http://127.0.0.1:8765/health -H "Authorization: Bearer $TOKEN"',
                    'curl_health'
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-cyan-400 transition-colors"
              >
                {copiedSection === 'curl_health' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy test
              </button>
            </div>
            <p className="text-neutral-400 text-xs">
              In a second Termux tab, you can test the server directly with curl:
            </p>
            <pre className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`TOKEN="$(cat ~/.config/termux-mcp/token)"
curl -i http://127.0.0.1:8765/health \\
  -H "Authorization: Bearer $TOKEN"`}
            </pre>
            <p className="text-emerald-400 text-[11px]">
              Expected response: HTTP 200 OK with <code className="font-mono">{`{"status":"ok"}`}</code>
            </p>
          </div>

          {/* Section 4: Minimum Verification Test */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              4. The Minimum Verification Test
            </div>
            <p className="text-neutral-300 text-xs">
              To test the bridge without altering your device, use the button in the top bar or send this exact prompt:
            </p>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-cyan-200 text-xs font-medium italic">
              "Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada."
            </div>
            <p className="text-neutral-400 text-[11px]">
              Gemini will propose executing <code className="text-cyan-300 font-mono">pwd && ls -la</code> via <code className="text-cyan-300 font-mono">termux_exec</code>. Review and click "Approve & Execute" to see the live output from your Termux!
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-neutral-800 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
          >
            Got it, return to chat
          </button>
        </div>
      </div>
    </div>
  );
};
