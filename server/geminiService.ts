import { GoogleGenAI, Type } from '@google/genai';
import { evaluateCommandSafety, SafetyEvaluation } from './safety.js';

let aiInstance: GoogleGenAI | null = null;

// Cascade of valid models from gemini-api skill
// Priority is given to high-availability flash models with active quotas
export const SUPPORTED_GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

const modelCooldowns = new Map<string, number>();
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown when quota is exhausted

export function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export function isQuotaOrRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || err?.error?.code;
  if (status === 429) return true;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate-limit') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  );
}

export async function callWithModelCascade<T>(
  action: (modelName: string) => Promise<T>
): Promise<{ result: T; usedModel: string }> {
  let lastError: any = null;
  const now = Date.now();

  // Prefer models that are not currently in quota cooldown
  const availableModels = SUPPORTED_GEMINI_MODELS.filter(
    (m) => (modelCooldowns.get(m) || 0) < now
  );
  const candidateModels = availableModels.length > 0 ? availableModels : SUPPORTED_GEMINI_MODELS;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];

    // Attempt model with retry for transient 503 spikes
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await action(model);
        // Clear cooldown if successful
        modelCooldowns.delete(model);
        return { result, usedModel: model };
      } catch (err: any) {
        lastError = err;
        const isQuota = isQuotaOrRateLimitError(err);
        const is503 = err?.status === 503 || err?.code === 503 || (err?.message && err.message.includes('503'));

        if (is503 && attempt === 0) {
          // Transient spike, brief backoff
          await new Promise((r) => setTimeout(r, 650));
          continue;
        }

        if (isQuota) {
          // Mark model in cooldown so subsequent requests don't waste time or trigger 429
          modelCooldowns.set(model, Date.now() + QUOTA_COOLDOWN_MS);
          break; // Move to next candidate model
        }

        if (is503) {
          break; // Move to next candidate model
        }

        // For fatal/syntax/auth errors, throw immediately
        throw err;
      }
    }
  }

  throw lastError;
}

export const SYSTEM_INSTRUCTION = `
You are the personal AI Assistant connected to the user's Android device via Termux and the remote "termux_pessoal" MCP Bridge.
Your sole tool to interact with Termux is "termux_exec".

CRITICAL ROLES & NATURAL LANGUAGE CONVERSION:
1. Speak and reason fluently in Portuguese (or English if the user communicates in English). Be natural, helpful, clear, and proactive.
2. Translate natural language requests into the most accurate, standard, and idiomatic Termux / Linux commands.
   Examples of natural language mapping:
   - "Como está a bateria?", "Nível de bateria":
     termux-battery-status 2>/dev/null || cat /sys/class/power_supply/battery/capacity 2>/dev/null || uptime
   - "Verifique memória e swap":
     free -h
   - "Espaço em disco / armazenamento":
     df -h
   - "Informações da CPU / dispositivo":
     cat /proc/cpuinfo | grep -E "Processor|model name|Hardware" | head -n 8 || uname -m
   - "Versão do kernel, SO e Android":
     uname -a && getprop ro.build.version.release 2>/dev/null
   - "Tempo de atividade / uptime":
     uptime
   - "Quais pacotes estão instalados no Termux?":
     pkg list-installed | head -n 40
   - "Verificar versões de ferramentas (Python, Node, Git, Bash)":
     python3 --version 2>&1; node -v 2>&1; git --version 2>&1; bash --version | head -n 1
   - "Qual o meu IP local / rede?":
     ip addr show 2>/dev/null || ifconfig 2>/dev/null
   - "Status do Wi-Fi":
     termux-wifi-connectioninfo 2>/dev/null || ip route
   - "Testar conexão / ping":
     ping -c 3 8.8.8.8
   - "Ver conexões ativas ou portas":
     netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null
   - "Ver arquivos de download do Android":
     ls -lh ~/storage/downloads 2>/dev/null || ls -la ~/downloads 2>/dev/null || ls -la
   - "Ver conteúdo da HOME":
     pwd && ls -la
   - "Buscar scripts .sh":
     ls -lat *.sh 2>/dev/null | head -n 20
   - "Processos ativos / consumo de CPU":
     ps aux | head -n 25 || ps -ef | head -n 25
   - "Vibrar celular":
     termux-vibrate -d 300
   - "Ligar / desligar lanterna":
     termux-torch on or termux-torch off
   - "Área de transferência / clipboard":
     termux-clipboard-get
   - "Notificação no Android":
     termux-notification --title "Termux Bridge" --content "Mensagem"

CRITICAL RULES:
1. ONLY call "termux_exec". Do NOT invent or call any other tools.
2. Prioritize non-destructive read-only commands for initial diagnostics and information requests.
3. If the user asks a general question or greeting ("olá", "o que você pode fazer?", "quais comandos você suporta?"), explain what you can do on Termux conversationally without immediately calling a tool, and offer suggested requests.
4. When calling "termux_exec", always provide a brief, friendly natural-language explanation of what command will be executed and why.
5. In every response (both direct answers and tool execution results), ALWAYS include a structured suggestions section at the very end:
   ### 💡 Sugestões de próximos passos:
   - [Sugestão 1 em linguagem natural direta, ex: "Verificar o uso de memória RAM com free -h"]
   - [Sugestão 2 em linguagem natural direta, ex: "Listar arquivos do diretório ~/storage/downloads"]
   - [Sugestão 3 em linguagem natural direta, ex: "Checar o status da bateria com termux-battery-status"]
6. Never display or expose private secrets, tokens, or private keys.
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

export function extractSuggestionsFromText(text: string, toolCommand?: string): string[] {
  const suggestions: string[] = [];
  if (text) {
    const lines = text.split('\n');
    let inSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/sugest[oõ]es|pr[oó]ximos passos|suggestions|next steps/i.test(trimmed)) {
        inSection = true;
        continue;
      }
      if (inSection) {
        const bulletMatch = trimmed.match(/^[-*•\d+.]\s*["'`]?([^"'`\n]+)["'`]?$/);
        if (bulletMatch && bulletMatch[1]) {
          const item = bulletMatch[1].trim().replace(/^["']|["']$/g, '');
          if (item.length >= 4 && item.length <= 100) {
            suggestions.push(item);
          }
        } else if (trimmed.startsWith('#') || (trimmed === '' && suggestions.length >= 2)) {
          if (suggestions.length > 0) break;
        }
      }
    }
  }

  if (suggestions.length > 0) {
    return suggestions.slice(0, 4);
  }

  // Contextual fallback suggestions if model didn't output structured bullets
  if (toolCommand) {
    const cmd = toolCommand.toLowerCase();
    if (cmd.includes('ls') || cmd.includes('pwd')) {
      return [
        'Verificar espaço em disco e memória livre',
        'Como está o nível da bateria do meu celular?',
        'Listar todos os scripts .sh na pasta HOME',
      ];
    }
    if (cmd.includes('battery')) {
      return [
        'Verificar memória RAM livre com free -h',
        'Verificar espaço em disco com df -h',
        'Verificar tempo de atividade e carga com uptime',
      ];
    }
    if (cmd.includes('df') || cmd.includes('free')) {
      return [
        'Quais são os processos ativos consumindo CPU?',
        'Verificar versão do kernel e sistema operacional',
        'Listar pacotes instalados no Termux',
      ];
    }
    if (cmd.includes('ip') || cmd.includes('ping') || cmd.includes('wifi')) {
      return [
        'Verificar portas abertas com netstat ou ss',
        'Testar ping no DNS do Google (8.8.8.8)',
        'Status do Wi-Fi com termux-wifi-connectioninfo',
      ];
    }
  }

  return [
    'Verifique meu diretório HOME do Termux',
    'Como está a bateria do meu celular?',
    'Verifique espaço em disco e memória livre',
  ];
}

export function matchLocalTermuxIntent(message: string): {
  command?: string;
  explanation?: string;
  isDirectCommand?: boolean;
} {
  const clean = message.trim();
  const lower = clean.toLowerCase();

  // 1. Direct Bash / Terminal command detection
  const directCommandRegex = /^(pwd|ls(\s+-[a-zA-Z0-9]+)*|df(\s+-[a-zA-Z0-9]+)*|free(\s+-[a-zA-Z0-9]+)*|uptime|uname(\s+-[a-zA-Z0-9]+)*|top|ps(\s+-[a-zA-Z0-9]+)*|cat\s+[^\s]+|tail(\s+-[a-zA-Z0-9]+)*\s+[^\s]+|head(\s+-[a-zA-Z0-9]+)*\s+[^\s]+|ping\s+[^\s]+|pkg\s+[^\s]+|ip(\s+addr)?|ifconfig|netstat(\s+-[a-zA-Z0-9]+)*|ss(\s+-[a-zA-Z0-9]+)*|termux-[a-zA-Z0-9-]+(\s+[^\n]+)?|python3?\s+[^\n]+|node\s+[^\n]+|git\s+[^\n]+)/i;
  if (directCommandRegex.test(clean)) {
    return {
      command: clean,
      explanation: `Executar o comando no Termux: \`${clean}\``,
      isDirectCommand: true,
    };
  }

  // 2. Battery / Bateria
  if (/bater(ia|y)|carga|carregador|n[ií]vel de bater/i.test(lower)) {
    return {
      command: 'termux-battery-status 2>/dev/null || cat /sys/class/power_supply/battery/capacity 2>/dev/null || uptime',
      explanation: 'Verificar o nível e status da bateria do seu dispositivo Android.',
    };
  }

  // 3. HOME directory / Listar arquivos
  if (/home|diret[oó]rio home|listar arquivos|conte[uú]do da home|listar pasta/i.test(lower)) {
    return {
      command: 'pwd && ls -la',
      explanation: 'Verificar o diretório HOME e listar todos os arquivos e pastas sem modificar nada.',
    };
  }

  // 4. Disco / Armazenamento & Memória RAM
  if (/disco|armazenamento|espa[cç]o|mem[oó]ria|ram|swap/i.test(lower)) {
    return {
      command: 'df -h && free -h',
      explanation: 'Verificar o espaço disponível em disco (df -h) e memória RAM livre (free -h).',
    };
  }

  // 5. Hardware / CPU / Processador
  if (/cpu|processador|hardware|n[uú]cleos|modelo do celular/i.test(lower)) {
    return {
      command: 'cat /proc/cpuinfo | grep -E "Processor|model name|Hardware" | head -n 8 || uname -m',
      explanation: 'Consultar informações de arquitetura da CPU e hardware do dispositivo.',
    };
  }

  // 6. Kernel / Versão Android / Uptime
  if (/kernel|vers[aã]o.*android|uptime|tempo de atividade|tempo ativo/i.test(lower)) {
    return {
      command: 'uname -a && uptime && getprop ro.build.version.release 2>/dev/null',
      explanation: 'Verificar a versão do kernel Linux, tempo de atividade e versão do Android.',
    };
  }

  // 7. IP / Rede / Internet
  if (/meu ip|endere[cç]o ip|interfaces de rede|qual.*ip/i.test(lower)) {
    return {
      command: 'ip addr show 2>/dev/null || ifconfig 2>/dev/null',
      explanation: 'Verificar os endereços IP locais e interfaces de rede ativas.',
    };
  }

  // 8. Wi-Fi
  if (/wi-?fi|rede sem fio/i.test(lower)) {
    return {
      command: 'termux-wifi-connectioninfo 2>/dev/null || ip route',
      explanation: 'Verificar as informações da conexão Wi-Fi atual.',
    };
  }

  // 9. Ping / Teste de Conexão
  if (/ping|testar conex[aã]o|testar internet|lat[eê]ncia/i.test(lower)) {
    return {
      command: 'ping -c 3 8.8.8.8',
      explanation: 'Executar teste de ping para 8.8.8.8 para verificar a conectividade e latência.',
    };
  }

  // 10. Scripts .sh
  if (/scripts?(\s+\.sh)?|arquivos \.sh|buscar scripts/i.test(lower)) {
    return {
      command: 'ls -lat *.sh 2>/dev/null | head -n 20',
      explanation: 'Listar os scripts shell (.sh) existentes no diretório HOME.',
    };
  }

  // 11. Downloads do Android
  if (/downloads?|pasta.*download/i.test(lower)) {
    return {
      command: 'ls -lh ~/storage/downloads 2>/dev/null || ls -la ~/downloads 2>/dev/null || ls -la',
      explanation: 'Verificar os arquivos salvos no diretório de downloads do Android.',
    };
  }

  // 12. Processos ativos / Consumo
  if (/processos|consumo.*cpu|o que est[aá] rodando|tarefas ativas/i.test(lower)) {
    return {
      command: 'ps aux | head -n 25 || ps -ef | head -n 25',
      explanation: 'Listar os processos em execução e verificar o consumo de CPU.',
    };
  }

  // 13. Pacotes instalados / pkg
  if (/pacotes|quais pacotes|instalados.*termux|pkg list/i.test(lower)) {
    return {
      command: 'pkg list-installed | head -n 40',
      explanation: 'Listar os pacotes atualmente instalados no Termux.',
    };
  }

  // 14. Ferramentas de desenvolvimento (Python, Node, Git)
  if (/python|node|git|bash|vers[oõ]es.*ferramentas/i.test(lower)) {
    return {
      command: 'python3 --version 2>&1; node -v 2>&1; git --version 2>&1; bash --version | head -n 1',
      explanation: 'Verificar as versões das ferramentas de desenvolvimento instaladas no Termux.',
    };
  }

  // 15. Vibrar celular
  if (/vibrar|vibra[cç][aã]o/i.test(lower)) {
    return {
      command: 'termux-vibrate -d 300',
      explanation: 'Acionar vibração de teste de 300ms no celular via Termux:API.',
    };
  }

  // 16. Lanterna
  if (/lanterna|torch/i.test(lower)) {
    return {
      command: 'termux-torch on',
      explanation: 'Acionar a lanterna do celular via Termux:API.',
    };
  }

  // 17. Clipboard / Área de transferência
  if (/clipboard|[aá]rea de transfer[eê]ncia|copiado/i.test(lower)) {
    return {
      command: 'termux-clipboard-get',
      explanation: 'Ler o conteúdo da área de transferência do Android via Termux:API.',
    };
  }

  return {};
}

export interface ChatInteractionResult {
  text?: string;
  toolCallProposal?: {
    name: string;
    command: string;
    timeout_seconds?: number;
    safety: SafetyEvaluation;
    modelTurnParts?: any[];
  };
  suggestions: string[];
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

  try {
    const { result: response } = await callWithModelCascade((model) =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [termuxExecTool],
          temperature: 0.2,
        },
      })
    );

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const args = (call.args || {}) as { command?: string; timeout_seconds?: number };
      const command = args.command || 'pwd && ls -la';
      const timeout_seconds = args.timeout_seconds;
      const safety = evaluateCommandSafety(command);
      const candidateParts = response.candidates?.[0]?.content?.parts || [];
      const text = response.text || undefined;
      const suggestions = extractSuggestionsFromText(text || '', command);

      return {
        text,
        suggestions,
        toolCallProposal: {
          name: call.name || 'termux_exec',
          command,
          timeout_seconds,
          safety,
          modelTurnParts: candidateParts,
        },
      };
    }

    const text = response.text || 'Olá! Como posso ajudar você a interagir com seu Termux hoje?';
    const suggestions = extractSuggestionsFromText(text);

    return {
      text,
      suggestions,
    };
  } catch (err: any) {
    console.warn('[Gemini processUserMessage encountered error, testing local fallback]:', err.message);

    // Fallback: If AI quota is exhausted or API is unreachable, handle via local natural language intent matcher
    const localMatch = matchLocalTermuxIntent(newMessage);
    if (localMatch.command) {
      const safety = evaluateCommandSafety(localMatch.command);
      return {
        text: `Identifiquei sua solicitação para o Termux: **${localMatch.explanation}**\n\n*(Executando via mapeador local inteligente de contingência)*`,
        suggestions: extractSuggestionsFromText('', localMatch.command),
        toolCallProposal: {
          name: 'termux_exec',
          command: localMatch.command,
          safety,
        },
      };
    }

    if (isQuotaOrRateLimitError(err)) {
      return {
        text: `A cota diária gratuita da API de IA foi temporariamente atingida pela Google, mas você pode continuar utilizando o sistema normalmente através dos comandos sugeridos abaixo ou digitando solicitações como *"Como está a bateria?"*, *"Verifique espaço em disco"* ou qualquer comando direto do terminal.`,
        suggestions: [
          'Verifique meu diretório HOME do Termux e liste os arquivos e diretórios que estão nele, sem modificar nada.',
          'Como está a bateria do meu celular?',
          'Verifique espaço em disco (df -h) e memória RAM livre (free -h)',
          'Quais pacotes estão instalados no Termux?',
        ],
      };
    }

    throw err;
  }
}

export interface ContinuationResult {
  text: string;
  suggestions: string[];
}

export async function continueWithToolResult(
  history: Array<{ role: string; content: string }>,
  toolCall: { name: string; command: string; timeout_seconds?: number; modelTurnParts?: any[] },
  toolResult: { command: string; stdout: string; stderr: string; exit_code: number; timed_out: boolean }
): Promise<ContinuationResult> {
  const ai = getGemini();

  // 1. Primary path: If modelTurnParts is available (contains thoughtSignature from Gemini 3),
  // pass the exact model parts and functionResponse turn back into Gemini across the cascade.
  if (Array.isArray(toolCall.modelTurnParts) && toolCall.modelTurnParts.length > 0) {
    try {
      const contents: any[] = history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Append model turn with exact thoughtSignature and functionCall
      contents.push({
        role: 'model',
        parts: toolCall.modelTurnParts,
      });

      // Append function response turn
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

      const { result: response } = await callWithModelCascade((model) =>
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [termuxExecTool],
            temperature: 0.2,
          },
        })
      );

      if (response.text) {
        return {
          text: response.text,
          suggestions: extractSuggestionsFromText(response.text, toolCall.command),
        };
      }
    } catch (err: any) {
      console.warn('[Gemini function continuation failed, falling back to analytical prompt]:', err.message);
    }
  }

  // 2. Resilient analytical prompt path: Formulate a clean diagnostic prompt for Gemini with the command results
  const fallbackContents: any[] = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const outputSection = toolResult.stdout
    ? `Saída Padrão (stdout):\n\`\`\`\n${toolResult.stdout}\n\`\`\``
    : '(nenhuma saída no stdout)';
  const errorSection = toolResult.stderr
    ? `Erro Padrão (stderr):\n\`\`\`\n${toolResult.stderr}\n\`\`\``
    : '(nenhum erro no stderr)';

  fallbackContents.push({
    role: 'user',
    parts: [
      {
        text: `O comando \`${toolCall.command}\` foi executado no Termux do usuário com o seguinte resultado:
- Código de saída (exit code): ${toolResult.exit_code}
- Timeout: ${toolResult.timed_out ? 'Sim' : 'Não'}

${outputSection}

${errorSection}

Por favor, analise a saída detalhadamente e responda ao usuário de forma clara e objetiva no mesmo idioma da conversa (ex: português). Lembre-se de incluir a seção '### 💡 Sugestões de próximos passos:' com 3 sugestões úteis.`,
      },
    ],
  });

  try {
    const { result: response } = await callWithModelCascade((model) =>
      ai.models.generateContent({
        model,
        contents: fallbackContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
        },
      })
    );

    const fallbackText = response.text || `Comando concluído com exit code ${toolResult.exit_code}.`;
    return {
      text: fallbackText,
      suggestions: extractSuggestionsFromText(fallbackText, toolCall.command),
    };
  } catch (err: any) {
    console.warn('[All Gemini models exhausted or failed during continuation, generating local synthesis]:', err.message);

    // 3. Local formatted analytical synthesis if all AI calls fail (e.g. quota exhausted)
    const isSuccess = toolResult.exit_code === 0;
    const cleanOutput = (toolResult.stdout || toolResult.stderr || '(nenhuma saída gerada)').trim();

    const localExplanation = `### 📋 Resultado da Execução no Termux:
- **Comando executado:** \`${toolCall.command}\`
- **Código de saída (exit code):** \`${toolResult.exit_code}\` ${isSuccess ? '✅ (Sucesso)' : '⚠️ (Erro/Aviso)'}
- **Tempo limite excedido:** ${toolResult.timed_out ? 'Sim' : 'Não'}

#### 📄 Saída do Terminal:
\`\`\`
${cleanOutput}
\`\`\`

${!isSuccess && toolResult.stderr ? `> ⚠️ **Aviso/Erro:** ${toolResult.stderr.split('\n')[0]}\n\n` : ''}*(Análise estruturada pelo motor de contingência)*`;

    return {
      text: localExplanation,
      suggestions: extractSuggestionsFromText(cleanOutput, toolCall.command),
    };
  }
}
