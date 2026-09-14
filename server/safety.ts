export interface SafetyEvaluation {
  isSensitive: boolean;
  reasons: string[];
}

export function evaluateCommandSafety(command: string): SafetyEvaluation {
  const normalized = command.trim();
  const reasons: string[] = [];

  const sensitiveRules: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\b(rm|rmdir)\b/i, label: 'File removal / deletion (rm/rmdir)' },
    { pattern: /\b(mv)\b/i, label: 'Moving or renaming files (mv)' },
    { pattern: /\b(chmod|chown)\b/i, label: 'Changing permissions or ownership (chmod/chown)' },
    { pattern: /\b(su|sudo)\b/i, label: 'Superuser / root privilege escalation (su/sudo)' },
    { pattern: /\b(passwd)\b/i, label: 'Modifying user passwords' },
    { pattern: /\b(token|secret|key)\b/i, label: 'References sensitive credentials or keys' },
    { pattern: /\.ssh\b/i, label: 'Accesses SSH configuration or identities' },
    { pattern: /\bgit\s+(commit|push|reset|rebase)\b/i, label: 'Modifies or publishes git history' },
    { pattern: /\b(pkg\s+install|apt\s+install|apt-get\s+install)\b/i, label: 'Installs package manager software' },
    { pattern: /\b(pip\s+install|pip3\s+install)\b/i, label: 'Installs Python packages' },
    { pattern: /\b(npm\s+install|yarn\s+add|pnpm\s+add)\b/i, label: 'Installs Node packages' },
    { pattern: /(>>|>)\s*[^&]/, label: 'File redirection / writing to disk (> or >>)' },
    { pattern: /\b(dd|mkfs|fdisk)\b/i, label: 'Direct block device or disk formatting' },
    { pattern: /\b(kill|killall|pkill)\b/i, label: 'Process termination command' },
  ];

  for (const rule of sensitiveRules) {
    if (rule.pattern.test(normalized)) {
      reasons.push(rule.label);
    }
  }

  return {
    isSensitive: reasons.length > 0,
    reasons,
  };
}
