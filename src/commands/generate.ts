import * as fs from 'fs';
import pc from 'picocolors';
import { parseEnvFile } from '../utils/env-parser.js';
import { printBanner } from '../utils/display.js';

export interface GenerateOptions {
  env?: string;
  example?: string;
  out?: string;
  format?: 'zod' | 'ts';
}

export function inferType(key: string, value: string): 'number' | 'boolean' | 'url' | 'email' | 'string' {
  const upperKey = key.toUpperCase();
  const val = value.trim();
  const lowerVal = val.toLowerCase();

  // 1. Direct value-based detection
  if (lowerVal === 'true' || lowerVal === 'false') {
    return 'boolean';
  }

  if (/^\d+(\.\d+)?$/.test(val)) {
    return 'number';
  }

  if (lowerVal.startsWith('http://') || lowerVal.startsWith('https://')) {
    return 'url';
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    return 'email';
  }

  // 2. Key-name heuristic detection with word boundary checks
  if (/(^|_)(IS|HAS|ENABLE|ENABLED|DEBUG|VERBOSE)($|_)/.test(upperKey)) {
    return 'boolean';
  }

  if (/(^|_)(PORT|TIMEOUT|TTL|COUNT|LIMIT|RATE)($|_)/.test(upperKey)) {
    return 'number';
  }

  if (/(^|_)(URL|URI|ENDPOINT)($|_)/.test(upperKey)) {
    return 'url';
  }

  if (/(^|_)(EMAIL)($|_)/.test(upperKey)) {
    return 'email';
  }

  return 'string';
}

export function generateZodSchema(keysWithTypes: Array<{ key: string; type: string; comment?: string }>): string {
  const fields = keysWithTypes.map(({ key, type, comment }) => {
    let schemaStr = 'z.string()';
    if (type === 'number') {
      schemaStr = 'z.coerce.number()';
    } else if (type === 'boolean') {
      schemaStr = 'z.coerce.boolean()';
    } else if (type === 'url') {
      schemaStr = 'z.string().url()';
    } else if (type === 'email') {
      schemaStr = 'z.string().email()';
    }

    const commentStr = comment ? ` // ${comment}` : '';
    return `  ${key}: ${schemaStr},${commentStr}`;
  });

  return `import { z } from 'zod';

export const envSchema = z.object({
${fields.join('\n')}
});

export type Env = z.infer<typeof envSchema>;
`;
}

export function generateTSInterface(keysWithTypes: Array<{ key: string; type: string; comment?: string }>): string {
  const fields = keysWithTypes.map(({ key, type, comment }) => {
    let tsType = 'string';
    if (type === 'number') tsType = 'number';
    if (type === 'boolean') tsType = 'boolean';

    const commentStr = comment ? ` // ${comment}` : '';
    return `    ${key}: ${tsType};${commentStr}`;
  });

  return `declare global {
  namespace NodeJS {
    interface ProcessEnv {
${fields.join('\n')}
    }
  }
}

export {};
`;
}

export function generateCommand(options: GenerateOptions): void {
  const targetFile = options.example || options.env || '.env.example';
  const format = options.format || 'zod';

  const envData = parseEnvFile(targetFile);
  if (!envData.exists) {
    console.error(pc.red(`❌ Template/env file "${targetFile}" not found.`));
    process.exit(1);
  }

  const keysWithTypes = Array.from(envData.entries.values()).map((entry) => ({
    key: entry.key,
    type: inferType(entry.key, entry.value),
    comment: entry.comment,
  }));

  const generatedCode =
    format === 'ts' ? generateTSInterface(keysWithTypes) : generateZodSchema(keysWithTypes);

  if (options.out) {
    fs.writeFileSync(options.out, generatedCode, 'utf-8');
    printBanner();
    console.log(pc.green(`✅ Successfully generated ${format.toUpperCase()} schema at ${pc.bold(options.out)}`));
  } else {
    console.log(generatedCode);
  }
}
