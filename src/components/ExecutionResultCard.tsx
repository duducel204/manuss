import React, { useState } from 'react';
import { Terminal, CheckCircle2, XCircle, AlertTriangle, Clock, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { TermuxExecResult } from '../types';

interface ExecutionResultCardProps {
  result: TermuxExecResult;
  toolName?: string;
}

export const ExecutionResultCard: React.FC<ExecutionResultCardProps> = ({
  result,
  toolName = 'termux_exec',
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const isSuccess = result.exit_code === 0 && !result.timed_out;

  const handleCopy = () => {
    const textToCopy = `Command: ${result.command}\nExit Code: ${result.exit_code}\nTimed Out: ${result.timed_out}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="execution-result-card"
      className="my-3 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-lg"
    >
      {/* Result Header Bar */}
      <div className="bg-neutral-900/80 px-4 py-2.5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-neutral-800 text-cyan-400">
            <Terminal className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-mono text-neutral-300 font-semibold">
            Tool Result: <span className="text-cyan-400">{toolName}</span>
          </span>

          {/* Exit code badge */}
          {isSuccess ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              exit_code: 0
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-950 text-rose-400 border border-rose-800">
              <XCircle className="w-3 h-3" />
              exit_code: {result.exit_code}
            </span>
          )}

          {/* Timeout badge */}
          {result.timed_out && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-950 text-amber-400 border border-amber-800">
              <AlertTriangle className="w-3 h-3" />
              timed_out: true
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {result.durationMs !== undefined && (
            <span className="text-[11px] text-neutral-500 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {result.durationMs}ms
            </span>
          )}

          <button
            onClick={handleCopy}
            title="Copy command and outputs"
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 font-mono text-xs">
          {/* Command Executed */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">
              Command Sent:
            </div>
            <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-neutral-800 text-cyan-300 font-medium whitespace-pre-wrap">
              $ {result.command}
            </div>
          </div>

          {/* stdout */}
          {result.stdout ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1 flex items-center justify-between">
                <span>STDOUT:</span>
                <span className="text-neutral-500 font-normal">{result.stdout.length} chars</span>
              </div>
              <pre className="bg-neutral-900/90 rounded-lg p-3 border border-neutral-800 text-neutral-200 overflow-x-auto whitespace-pre-wrap max-h-72 leading-relaxed">
                {result.stdout}
              </pre>
            </div>
          ) : (
            <div className="text-neutral-600 italic text-[11px]">[STDOUT is empty]</div>
          )}

          {/* stderr */}
          {result.stderr && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold mb-1">
                STDERR:
              </div>
              <pre className="bg-rose-950/20 rounded-lg p-3 border border-rose-900/50 text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
                {result.stderr}
              </pre>
            </div>
          )}

          {/* Error explanation if present */}
          {result.error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{result.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
