import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Terminal, Play, X, AlertTriangle, Clock } from 'lucide-react';
import { ToolCallProposal } from '../types';

interface CommandConfirmationCardProps {
  toolCall: ToolCallProposal;
  onApprove: (toolCall: ToolCallProposal) => void;
  onReject: (toolCall: ToolCallProposal) => void;
  isExecuting: boolean;
}

export const CommandConfirmationCard: React.FC<CommandConfirmationCardProps> = ({
  toolCall,
  onApprove,
  onReject,
  isExecuting,
}) => {
  const [acknowledgedRisk, setAcknowledgedRisk] = useState(false);
  const isSensitive = toolCall.safety?.isSensitive;

  const canApprove = !isSensitive || acknowledgedRisk;

  return (
    <div
      id={`tool-confirmation-${toolCall.id}`}
      className={`my-3 p-4 rounded-xl border transition-all ${
        isSensitive
          ? 'bg-amber-950/30 border-amber-800/80 shadow-lg shadow-amber-950/20'
          : 'bg-neutral-900/90 border-cyan-800/60 shadow-lg shadow-cyan-950/10'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-neutral-800 text-cyan-400 border border-neutral-700">
            <Terminal className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono">
            Execution Request: <span className="text-cyan-400 lowercase">{toolCall.name}</span>
          </span>
        </div>

        {/* Safety Badge */}
        {isSensitive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Modifying / Sensitive
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Read-Only / Non-Destructive
          </span>
        )}
      </div>

      {/* Command Code Box */}
      <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800 font-mono text-xs overflow-x-auto text-neutral-200 mb-3 selection:bg-neutral-800">
        <div className="flex items-center justify-between text-neutral-500 text-[10px] mb-1 select-none">
          <span>TARGET: Termux bash shell (~/)</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Timeout: {toolCall.timeout_seconds || 120}s
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-cyan-500 select-none font-bold">$</span>
          <span className="text-emerald-400 whitespace-pre-wrap font-semibold">{toolCall.command}</span>
        </div>
      </div>

      {/* Sensitive Warnings */}
      {isSensitive && (
        <div className="mb-3 p-3 rounded-lg bg-rose-950/40 border border-rose-900/80 text-rose-200 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-rose-300 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Policy Warning: High-risk operation detected
          </div>
          <p className="text-rose-300/80 text-[11px] mb-2">
            This command contains modifiers, deletion, permissions changes, package installation, or sensitive paths:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-rose-200 text-[11px]">
            {toolCall.safety.reasons.map((reason, idx) => (
              <li key={idx} className="font-mono">{reason}</li>
            ))}
          </ul>

          {/* Reinforced Confirmation Checkbox */}
          <label className="mt-3 pt-2 border-t border-rose-900/60 flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id={`ack-risk-${toolCall.id}`}
              checked={acknowledgedRisk}
              onChange={(e) => setAcknowledgedRisk(e.target.checked)}
              className="rounded border-rose-700 bg-neutral-900 text-rose-500 focus:ring-rose-400 focus:ring-offset-neutral-950"
            />
            <span className="text-xs text-rose-200 font-medium">
              I authorize running this modifying command directly on my device.
            </span>
          </label>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          id={`btn-reject-${toolCall.id}`}
          onClick={() => onReject(toolCall)}
          disabled={isExecuting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-neutral-100 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          Reject
        </button>

        <button
          id={`btn-approve-${toolCall.id}`}
          onClick={() => onApprove(toolCall)}
          disabled={!canApprove || isExecuting}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
            !canApprove || isExecuting
              ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
              : isSensitive
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
          {isExecuting ? 'Executing in Termux...' : 'Approve & Execute'}
        </button>
      </div>
    </div>
  );
};
