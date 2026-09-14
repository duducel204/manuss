import { GoogleGenAI, Type } from '@google/genai';
import { evaluateCommandSafety, SafetyEvaluation } from './safety.js';

let aiInstance: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

export const SYSTEM_INSTRUCTION = `
You are the AI assistant connected to the user's remote Android Termux environment via a personal MCP bridge (named "termux_pessoal").
Your only available tool for interacting with Termux is "termux_exec".
CRITICAL RULES:
1. ONLY use "termux_exec". NEVER assume or invent tools like "project.create", "file.modify", "git.commit", or "project.test".
2. When the user asks to check the HOME directory and list files without modifying anything ("Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada."), use "termux_exec" with: "pwd && ls -la".
3. Prioritize non-destructive read-only commands for initial diagnostics.
4. Always explain what command you are executing and interpret the stdout, stderr, and exit codes clearly for the user in the language they used (Portuguese or English).
5. Never access or output sensitive tokens, passwords, or secret keys.
`.trim();

export const termuxExecTool = {
  functionDeclarations: [
    {
      name: 'termux_exec',
      description: 'Execute one shell command in the user\'s Termux environment and return stdout, stderr, exit code and timed_out status.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          command: {
            type: Type.STRING,
            description: 'Bash command to execute inside Termux (~ directory).',
          },
          timeout_seconds: {
            type: Type.INTEGER,
            description: 'Optional execution timeout between 1 and 300 seconds (default 120).',
          },
        },
        required: ['command'],
      },
    },
  ],
};

export interface ChatInteractionResult {
  text?: string;
  toolCallProposal?: {
    name: string;
    command: string;
    timeout_seconds?: number;
    safety: SafetyEvaluation;
  };
}

export async function processUserMessage(
  history: Array<{ role: string; content: string }>,
  newMessage: string
): Promise<ChatInteractionResult> {
  const ai = getGemini();

  // Convert history to Gemini format
  const contents = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  contents.push({
    role: 'user',
    parts: [{ text: newMessage }],
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [termuxExecTool],
      temperature: 0.2,
    },
  });

  const functionCalls = response.functionCalls;
  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    const args = (call.args || {}) as { command?: string; timeout_seconds?: number };
    const command = args.command || 'pwd && ls -la';
    const timeout_seconds = args.timeout_seconds;
    const safety = evaluateCommandSafety(command);

    return {
      text: response.text || undefined,
      toolCallProposal: {
        name: call.name || 'termux_exec',
        command,
        timeout_seconds,
        safety,
      },
    };
  }

  return {
    text: response.text || 'No response generated.',
  };
}

export async function continueWithToolResult(
  history: Array<{ role: string; content: string }>,
  toolCall: { name: string; command: string; timeout_seconds?: number },
  toolResult: { command: string; stdout: string; stderr: string; exit_code: number; timed_out: boolean }
): Promise<string> {
  const ai = getGemini();

  const contents: any[] = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  // Model's function call turn
  contents.push({
    role: 'model',
    parts: [
      {
        functionCall: {
          name: toolCall.name,
          args: {
            command: toolCall.command,
            timeout_seconds: toolCall.timeout_seconds,
          },
        },
      },
    ],
  });

  // User's function response turn
  contents.push({
    role: 'user',
    parts: [
      {
        functionResponse: {
          name: toolCall.name,
          response: {
            output: toolResult,
          },
        },
      },
    ],
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });

  return response.text || 'Termux command completed.';
}
