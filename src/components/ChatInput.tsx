import React, { useState } from 'react';
import { Send, Sparkles, Shield, CornerDownLeft } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (msg: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [input, setInput] = useState('');

  const quickPrompts = [
    {
      label: 'Read-only HOME inspection',
      prompt: 'Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada.',
    },
    {
      label: 'Echo connection & pwd',
      prompt: 'Execute no meu Termux: echo MCP conectado && pwd',
    },
    {
      label: 'System & uptime info',
      prompt: 'Verifique informações do sistema com uname -a e tempo ativo com uptime no Termux.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-neutral-800 bg-neutral-900/90 backdrop-blur-md p-4 sticky bottom-0 z-20">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] text-neutral-500 font-medium shrink-0 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Quick Prompts:
          </span>
          {quickPrompts.map((item, idx) => (
            <button
              key={idx}
              id={`quick-prompt-${idx}`}
              type="button"
              disabled={disabled}
              onClick={() => {
                setInput(item.prompt);
              }}
              className="shrink-0 px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 border border-neutral-700/80 transition-colors text-[11px] disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              id="chat-input-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Ask Gemini to run a check on Termux (e.g., list files in HOME directory)..."
              rows={2}
              className="w-full resize-none rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 disabled:opacity-50 transition-colors"
            />
          </div>

          <button
            id="chat-send-btn"
            type="submit"
            disabled={!input.trim() || disabled}
            className="shrink-0 h-11 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-40 disabled:hover:bg-cyan-600 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Send</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Safety footer disclaimer */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1 select-none">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" />
            Zero Arbitrary Code: Gemini decides tool calls, and every command requires your explicit approval.
          </span>
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
};
