import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StatusBanner } from './components/StatusBanner';
import { CommandConfirmationCard } from './components/CommandConfirmationCard';
import { ExecutionResultCard } from './components/ExecutionResultCard';
import { ChatInput } from './components/ChatInput';
import { SetupModal } from './components/SetupModal';
import { BridgeConfigStatus, ChatMessage, ToolCallProposal, TermuxExecResult } from './types';
import { Bot, User, Terminal, Info, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    role: 'assistant',
    content: `Olá! Sou seu assistente conectado à ponte MCP pessoal do Termux (**termux_pessoal**).

Posso verificar o estado do seu dispositivo e executar diagnósticos usando a ferramenta oficial **termux_exec**.

Por segurança, **nenhum comando é executado sem sua autorização explícita**. Você pode começar pelo teste mínimo recomendado clicando no botão **"Test HOME Directory"** acima ou enviando:
> *"Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada."*`,
    timestamp: Date.now(),
  },
];

export default function App() {
  const [status, setStatus] = useState<BridgeConfigStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [executingToolId, setExecutingToolId] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [executingTest, setExecutingTest] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, executingToolId]);

  // Check bridge status on load and periodically
  const fetchStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching bridge status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  // Send message to backend Gemini API
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build history for backend
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          message: text,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to process message`);
      }

      if (data.status === 'requires_confirmation' && data.toolCall) {
        const assistantMsg: ChatMessage = {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: data.text || 'Preparei o comando abaixo para verificar seu Termux. Por favor, confirme a execução:',
          timestamp: Date.now(),
          toolCall: data.toolCall,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const assistantMsg: ChatMessage = {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: data.text || 'Resposta concluída.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'system',
        content: `Error: ${err.message}`,
        timestamp: Date.now(),
        error: err.message,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // User confirms & approves tool execution
  const handleApproveTool = async (toolCall: ToolCallProposal) => {
    setExecutingToolId(toolCall.id);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolCall,
          history,
          userApproved: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute tool on Termux');
      }

      // Update the message containing the tool call with its execution result
      setMessages((prev) =>
        prev.map((m) => {
          if (m.toolCall?.id === toolCall.id) {
            return {
              ...m,
              toolCall: {
                ...m.toolCall,
                status: 'completed',
              },
              toolResult: data.toolResult,
            };
          }
          return m;
        })
      );

      // Append Gemini's synthesized explanation if available
      if (data.explanation) {
        setMessages((prev) => [
          ...prev,
          {
            id: `expl_${Date.now()}`,
            role: 'assistant',
            content: data.explanation,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.toolCall?.id === toolCall.id) {
            return {
              ...m,
              toolCall: {
                ...m.toolCall,
                status: 'failed',
              },
              toolResult: {
                command: toolCall.command,
                stdout: '',
                stderr: err.message,
                exit_code: 1,
                timed_out: false,
                durationMs: 0,
                error: err.message,
              },
            };
          }
          return m;
        })
      );
    } finally {
      setExecutingToolId(null);
      fetchStatus();
    }
  };

  // User rejects tool execution
  const handleRejectTool = (toolCall: ToolCallProposal) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.toolCall?.id === toolCall.id) {
          return {
            ...m,
            toolCall: {
              ...m.toolCall,
              status: 'rejected',
            },
          };
        }
        return m;
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        id: `reject_${Date.now()}`,
        role: 'assistant',
        content: `A execução do comando \`${toolCall.command}\` foi cancelada por você. Nenhum comando foi enviado ao Termux.`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Quick Test Action: "Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada."
  const handleQuickTest = () => {
    handleSendMessage('Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada.');
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <Header
        status={status}
        checking={checkingStatus}
        onRefreshStatus={fetchStatus}
        onOpenSetup={() => setSetupModalOpen(true)}
        onQuickTest={handleQuickTest}
        executingTest={isLoading || executingToolId !== null}
      />

      {/* Dynamic Status / Diagnostics Warning */}
      <StatusBanner status={status} onOpenSetup={() => setSetupModalOpen(true)} />

      {/* Main Conversation Stream */}
      <main id="chat-messages-container" className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className={`flex items-start gap-3 sm:gap-4 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* Avatar for assistant / system */}
            {msg.role !== 'user' && (
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  msg.role === 'system'
                    ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                    : 'bg-neutral-900 border-neutral-700 text-cyan-400'
                }`}
              >
                {msg.role === 'system' ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
            )}

            {/* Bubble Content */}
            <div
              className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none shadow-md'
                  : msg.role === 'system'
                  ? 'bg-rose-950/40 border border-rose-900 text-rose-200 rounded-tl-none'
                  : 'bg-neutral-900 border border-neutral-800/90 text-neutral-200 rounded-tl-none shadow-md'
              }`}
            >
              {/* Message text */}
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Pending or rejected tool confirmation */}
              {msg.toolCall && msg.toolCall.status === 'pending_confirmation' && (
                <CommandConfirmationCard
                  toolCall={msg.toolCall}
                  onApprove={handleApproveTool}
                  onReject={handleRejectTool}
                  isExecuting={executingToolId === msg.toolCall.id}
                />
              )}

              {/* Rejected notice */}
              {msg.toolCall && msg.toolCall.status === 'rejected' && (
                <div className="my-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neutral-600" />
                  <span>Comando cancelado pelo usuário: <code className="font-mono text-neutral-300">{msg.toolCall.command}</code></span>
                </div>
              )}

              {/* Completed tool result */}
              {msg.toolResult && (
                <ExecutionResultCard
                  result={msg.toolResult}
                  toolName={msg.toolCall?.name || 'termux_exec'}
                />
              )}

              {/* Timestamp */}
              <div
                className={`mt-2 text-[10px] ${
                  msg.role === 'user' ? 'text-cyan-200 text-right' : 'text-neutral-500'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* User Avatar */}
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-cyan-700 border border-cyan-500/60 flex items-center justify-center text-white shrink-0 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-cyan-400 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-none p-4 text-xs text-neutral-400 flex items-center gap-2.5 shadow-md">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>Gemini is evaluating command and safety policies...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Chat Input */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading || executingToolId !== null} />

      {/* Setup & Instructions Guide Modal */}
      <SetupModal isOpen={setupModalOpen} onClose={() => setSetupModalOpen(false)} />
    </div>
  );
}
