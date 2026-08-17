import * as fs from 'fs';
import pc from 'picocolors';
import { input } from '@inquirer/prompts';
import { compareEnvs, parseEnvFile, serializeEnv } from '../utils/env-parser.js';
import { printBanner } from '../utils/display.js';

export interface SyncOptions {
  env: string;
  example: string;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  printBanner();

  const envPath = options.env;
  const examplePath = options.example;

  const exampleData = parseEnvFile(examplePath);
  if (!exampleData.exists) {
    console.error(pc.red(`❌ Template file "${examplePath}" not found.`));
    process.exit(1);
  }

  const envData = parseEnvFile(envPath);
  const comparison = compareEnvs(envData.entries, exampleData.entries);

  const keysToSync = [...comparison.missingKeys, ...comparison.emptyKeys];

  if (keysToSync.length === 0) {
    console.log(pc.green(`✨ Your ${envPath} file is fully synced with ${examplePath}! No missing variables.`));
    return;
  }

  console.log(
    pc.cyan(`🔄 Found ${keysToSync.length} key(s) to prompt for in ${envPath}:\n`)
  );

  const updatedEntries = new Map<string, string>();
  for (const [k, entry] of envData.entries.entries()) {
    updatedEntries.set(k, entry.value);
  }

  for (const key of keysToSync) {
    const exampleEntry = exampleData.entries.get(key);
    const defaultValue = exampleEntry?.value || '';
    const commentHint = exampleEntry?.comment ? ` (${exampleEntry.comment})` : '';

    const answer = await input({
      message: `Enter value for ${pc.bold(pc.yellow(key))}${commentHint}:`,
      default: defaultValue,
    });

    updatedEntries.set(key, answer.trim());
  }

  const newEnvContent = serializeEnv(updatedEntries);
  fs.writeFileSync(envPath, newEnvContent, 'utf-8');

  console.log(`\n${pc.bold(pc.green(`✅ Successfully updated ${envPath} with ${keysToSync.length} variable(s)!`))}\n`);
}
