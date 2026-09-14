import React from 'react';
import { AlertTriangle, Key, WifiOff, ExternalLink, ShieldCheck } from 'lucide-react';
import { BridgeConfigStatus } from '../types';

interface StatusBannerProps {
  status: BridgeConfigStatus | null;
  onOpenSetup: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status, onOpenSetup }) => {
  if (!status) return null;

  const missingSecrets: string[] = [];
  if (!status.geminiConfigured) missingSecrets.push('GEMINI_API_KEY');
  if (!status.mcpUrlConfigured) missingSecrets.push('TERMUX_MCP_URL');
  if (!status.mcpTokenConfigured) missingSecrets.push('TERMUX_MCP_TOKEN');

  if (missingSecrets.length > 0) {
    return (
      <div
        id="status-banner-missing-secrets"
        className="mx-4 mt-4 max-w-6xl sm:mx-auto bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
      >
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-100">
              Required Environment Secrets Missing
            </p>
            <p className="text-amber-300/80 text-xs mt-0.5">
              Please declare: {missingSecrets.map((s) => (
                <code key={s} className="bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-amber-200 text-[11px] mx-1">
                  {s}
                </code>
              ))} in AI Studio Settings.
            </p>
          </div>
        </div>
        <button
          id="btn-banner-open-guide"
          onClick={onOpenSetup}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 font-medium text-xs border border-amber-700/60 transition-colors"
        >
          View Secret Setup Guide
        </button>
      </div>
    );
  }

  if (status.status === 'offline') {
    return (
      <div
        id="status-banner-bridge-offline"
        className="mx-4 mt-4 max-w-6xl sm:mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-neutral-300 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
      >
        <div className="flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-neutral-100">Termux MCP Bridge Unreachable</p>
            <p className="text-neutral-400 text-xs mt-0.5">
              Ensure you started the bridge in Termux (<code className="text-neutral-300 font-mono">~/tradutor-local/mcp/start.sh</code>) and kept the terminal open.
            </p>
          </div>
        </div>
        <button
          id="btn-banner-offline-guide"
          onClick={onOpenSetup}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs border border-neutral-700 transition-colors"
        >
          Check Instructions
        </button>
      </div>
    );
  }

  if (status.status === 'unauthorized') {
    return (
      <div
        id="status-banner-unauthorized"
        className="mx-4 mt-4 max-w-6xl sm:mx-auto bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 text-rose-200 text-xs sm:text-sm flex items-start gap-3"
      >
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-rose-100">HTTP 401 Unauthorized</p>
          <p className="text-rose-300/80 text-xs mt-0.5">
            The MCP server rejected your <code className="bg-rose-900/60 px-1 py-0.5 rounded font-mono">TERMUX_MCP_TOKEN</code>. Copy the exact Bearer token output from <code className="font-mono">start.sh</code> on Termux.
          </p>
        </div>
      </div>
    );
  }

  return null;
};
