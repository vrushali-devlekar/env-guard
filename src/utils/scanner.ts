import { EnvEntry } from './env-parser.js';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface SecretLeak {
  key: string;
  line: number;
  ruleName: string;
  severity: Severity;
  description: string;
  maskedValue: string;
}

export interface LeakRule {
  name: string;
  severity: Severity;
  description: string;
  test: (key: string, value: string) => boolean;
}

export const LEAK_RULES: LeakRule[] = [
  {
    name: 'AWS Access Key',
    severity: 'CRITICAL',
    description: 'Live AWS Access Key ID detected',
    test: (_key, val) => /^AKIA[0-9A-Z]{16}$/.test(val),
  },
  {
    name: 'AWS Secret Key',
    severity: 'CRITICAL',
    description: 'Potential live AWS Secret Access Key detected',
    test: (key, val) => /AWS/i.test(key) && /^[A-Za-z0-9/+=]{40}$/.test(val),
  },
  {
    name: 'Stripe Secret Key',
    severity: 'CRITICAL',
    description: 'Live Stripe Secret API key detected',
    test: (_key, val) => /^sk_live_[0-9a-zA-Z]{24,}/.test(val) || /^rk_live_[0-9a-zA-Z]{24,}/.test(val),
  },
  {
    name: 'Stripe Restricted Key',
    severity: 'HIGH',
    description: 'Live Stripe Restricted API key detected',
    test: (_key, val) => /^rk_live_[0-9a-zA-Z]{24,}/.test(val),
  },
  {
    name: 'OpenAI API Key',
    severity: 'CRITICAL',
    description: 'Live OpenAI Secret API key detected',
    test: (_key, val) => /^sk-(proj-)?[a-zA-Z0-9_-]{32,}$/.test(val),
  },
  {
    name: 'GitHub Token',
    severity: 'CRITICAL',
    description: 'GitHub Personal Access Token or OAuth token detected',
    test: (_key, val) => /^ghp_[a-zA-Z0-9]{36}$/.test(val) || /^github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}$/.test(val),
  },
  {
    name: 'Slack Token',
    severity: 'CRITICAL',
    description: 'Slack Bot or User OAuth Access Token detected',
    test: (_key, val) => /^xox[baprs]-[0-9a-zA-Z]{10,48}$/.test(val),
  },
  {
    name: 'RSA/PEM Private Key',
    severity: 'CRITICAL',
    description: 'Unencrypted RSA or PEM Private Key detected',
    test: (_key, val) => /-----BEGIN (RSA|EC|OPENSSH|DSA|PRIVATE)? KEY-----/.test(val),
  },
  {
    name: 'Database URL with Password',
    severity: 'HIGH',
    description: 'Database connection URI contains raw password',
    test: (_key, val) =>
      /^(postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[^:]+:[^@]+@/i.test(val),
  },
  {
    name: 'JWT Token',
    severity: 'MEDIUM',
    description: 'Hardcoded JSON Web Token detected',
    test: (_key, val) => /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(val),
  },
];

/**
 * Masks a secret string showing only first 3 and last 3 characters.
 */
export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 8) {
    return '***masked***';
  }
  return `${value.substring(0, 3)}...${value.substring(value.length - 3)}`;
}

/**
 * Scans environment entries against defined secret rules.
 */
export function scanForLeaks(
  entries: Map<string, EnvEntry>,
  options: { isExampleFile?: boolean } = {}
): SecretLeak[] {
  const leaks: SecretLeak[] = [];

  for (const entry of entries.values()) {
    // Skip placeholder strings in example files like "your_aws_key_here" or "change_me"
    if (options.isExampleFile && /placeholder|your_|change_me|example|xxx/i.test(entry.value)) {
      continue;
    }

    for (const rule of LEAK_RULES) {
      if (rule.test(entry.key, entry.value)) {
        leaks.push({
          key: entry.key,
          line: entry.line,
          ruleName: rule.name,
          severity: rule.severity,
          description: rule.description,
          maskedValue: maskSecret(entry.value),
        });
        break; // Count top matching rule per entry
      }
    }
  }

  return leaks;
}
