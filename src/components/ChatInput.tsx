import React, { useState } from 'react';
import { Send, CornerDownLeft, Shield, Terminal } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (msg: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [input, setInput] = useState('');

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
    <div className="border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-md p-3 sm:p-4 sticky bottom-0 z-20">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Natural Language & Terminal Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              id="chat-input-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Digite uma mensagem em português ou comando bash direto para o Termux..."
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
            <span>Enviar</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Safety & Help Footer */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1 select-none">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>Tradução via <code className="text-cyan-400 font-mono">termux_exec</code> com confirmação prévia</span>
          </span>
          <span className="hidden sm:inline text-neutral-500">Enter envia • Shift+Enter nova linha</span>
        </div>
      </div>
    </div>
  );
};
