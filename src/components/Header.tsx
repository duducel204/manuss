import React from 'react';
import { Terminal, Shield, RefreshCw, HelpCircle, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { BridgeConfigStatus } from '../types';

interface HeaderProps {
  status: BridgeConfigStatus | null;
  checking: boolean;
  onRefreshStatus: () => void;
  onOpenSetup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  checking,
  onRefreshStatus,
  onOpenSetup,
}) => {
  const getStatusBadge = () => {
    if (!status || checking) {
      return (
        <span
          id="mcp-status-badge-checking"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700"
        >
          <RefreshCw className="w-3 h-3 animate-spin text-neutral-400" />
          Checking Bridge...
        </span>
      );
    }

    switch (status.status) {
      case 'online':
        return (
          <span
            id="mcp-status-badge-online"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Bridge Online
            {status.latencyMs !== undefined && (
              <span className="text-emerald-500/80 text-[10px] ml-0.5">({status.latencyMs}ms)</span>
            )}
          </span>
        );
      case 'unauthorized':
        return (
          <span
            id="mcp-status-badge-unauthorized"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/80"
          >
            <AlertCircle className="w-3 h-3 text-amber-400" />
            401 Token Invalid
          </span>
        );
      case 'not_found':
        return (
          <span
            id="mcp-status-badge-not-found"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800/80"
          >
            <AlertCircle className="w-3 h-3 text-rose-400" />
            404 URL Not Found
          </span>
        );
      case 'misconfigured':
        return (
          <span
            id="mcp-status-badge-misconfigured"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60"
          >
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Missing Secrets
          </span>
        );
      default:
        return (
          <span
            id="mcp-status-badge-offline"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-900 text-neutral-400 border border-neutral-800"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Bridge Offline
          </span>
        );
    }
  };

  return (
    <header
      id="app-header"
      className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:px-6"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow-sm">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-neutral-100 tracking-tight">
                Termux MCP Bridge
              </h1>
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                Gemini 3.8
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Personal Streamable HTTP bridge • Tool: <code className="text-cyan-400 font-mono">termux_exec</code>
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {getStatusBadge()}

          {/* Refresh Connection Button */}
          <button
            id="btn-refresh-status"
            onClick={onRefreshStatus}
            disabled={checking}
            title="Refresh bridge connection status"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          </button>

          {/* Setup / Instructions Button */}
          <button
            id="btn-open-setup-modal"
            onClick={onOpenSetup}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
            Setup Guide
          </button>
        </div>
      </div>
    </header>
  );
};
