export interface SafetyEvaluation {
  isSensitive: boolean;
  reasons: string[];
}

export interface ToolCallProposal {
  id: string;
  name: string;
  command: string;
  timeout_seconds?: number;
  approvalSignature?: string;
  safety: SafetyEvaluation;
  status: 'pending_confirmation' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
}

export interface TermuxExecResult {
  command: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  durationMs?: number;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCall?: ToolCallProposal;
  toolResult?: TermuxExecResult;
  error?: string;
}

export interface BridgeConfigStatus {
  geminiConfigured: boolean;
  mcpUrlConfigured: boolean;
  mcpTokenConfigured: boolean;
  status: 'online' | 'offline' | 'unauthorized' | 'not_found' | 'misconfigured' | 'checking';
  message: string;
  latencyMs?: number;
  urlPreview?: string;
  toolsDiscovered?: Array<{ name: string; description: string }>;
  lastChecked?: number;
}
