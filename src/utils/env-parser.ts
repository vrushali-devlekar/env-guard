import * as fs from 'fs';

export interface EnvEntry {
  key: string;
  value: string;
  comment?: string;
  line: number;
  raw: string;
}

export interface ParsedEnv {
  entries: Map<string, EnvEntry>;
  rawLines: string[];
  exists: boolean;
  filePath: string;
}

export interface AuditComparison {
  missingKeys: string[];
  extraKeys: string[];
  emptyKeys: string[];
  matchingKeys: string[];
}

/**
 * Parses raw text content into a key-value Map of EnvEntry objects.
 * Handles export prefixes, quoted values (double & single), comments, and inline comments.
 */
export function parseEnvContent(content: string): Map<string, EnvEntry> {
  const entries = new Map<string, EnvEntry>();
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;
    const trimmed = rawLine.trim();

    // Skip empty lines or full comment lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Strip optional "export " prefix
    let lineContent = trimmed;
    if (lineContent.startsWith('export ')) {
      lineContent = lineContent.substring(7).trim();
    }

    const equalIndex = lineContent.indexOf('=');
    if (equalIndex === -1) {
      continue; // Not a valid key=value pair
    }

    const key = lineContent.substring(0, equalIndex).trim();
    if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue; // Invalid environment key format
    }

    let valAndComment = lineContent.substring(equalIndex + 1).trim();
    let value = '';
    let comment: string | undefined = undefined;

    if (valAndComment.startsWith('"')) {
      // Double quoted
      const closeQuote = valAndComment.indexOf('"', 1);
      if (closeQuote !== -1) {
        value = valAndComment.substring(1, closeQuote);
        const remainder = valAndComment.substring(closeQuote + 1).trim();
        if (remainder.startsWith('#')) {
          comment = remainder.substring(1).trim();
        }
      } else {
        value = valAndComment.substring(1);
      }
    } else if (valAndComment.startsWith("'")) {
      // Single quoted
      const closeQuote = valAndComment.indexOf("'", 1);
      if (closeQuote !== -1) {
        value = valAndComment.substring(1, closeQuote);
        const remainder = valAndComment.substring(closeQuote + 1).trim();
        if (remainder.startsWith('#')) {
          comment = remainder.substring(1).trim();
        }
      } else {
        value = valAndComment.substring(1);
      }
    } else {
      // Unquoted, check for inline comment
      const commentIdx = valAndComment.indexOf('#');
      if (commentIdx !== -1) {
        value = valAndComment.substring(0, commentIdx).trim();
        comment = valAndComment.substring(commentIdx + 1).trim();
      } else {
        value = valAndComment.trim();
      }
    }

    entries.set(key, {
      key,
      value,
      comment,
      line: lineNum,
      raw: rawLine,
    });
  }

  return entries;
}

/**
 * Synchronously reads and parses an environment file.
 */
export function parseEnvFile(filePath: string): ParsedEnv {
  if (!fs.existsSync(filePath)) {
    return {
      entries: new Map(),
      rawLines: [],
      exists: false,
      filePath,
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const rawLines = content.split(/\r?\n/);
  const entries = parseEnvContent(content);

  return {
    entries,
    rawLines,
    exists: true,
    filePath,
  };
}

/**
 * Compares an actual env map with an example env map.
 */
export function compareEnvs(
  actual: Map<string, EnvEntry>,
  example: Map<string, EnvEntry>
): AuditComparison {
  const missingKeys: string[] = [];
  const extraKeys: string[] = [];
  const emptyKeys: string[] = [];
  const matchingKeys: string[] = [];

  for (const exampleKey of example.keys()) {
    if (!actual.has(exampleKey)) {
      missingKeys.push(exampleKey);
    } else {
      const entry = actual.get(exampleKey)!;
      if (entry.value === '') {
        emptyKeys.push(exampleKey);
      } else {
        matchingKeys.push(exampleKey);
      }
    }
  }

  for (const actualKey of actual.keys()) {
    if (!example.has(actualKey)) {
      extraKeys.push(actualKey);
    }
  }

  return {
    missingKeys,
    extraKeys,
    emptyKeys,
    matchingKeys,
  };
}

/**
 * Serializes entries back into .env format.
 */
export function serializeEnv(entries: Map<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of entries.entries()) {
    const needsQuotes = value.includes(' ') || value.includes('#') || value.includes('\n');
    const formattedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
    lines.push(`${key}=${formattedValue}`);
  }
  return lines.join('\n') + '\n';
}
