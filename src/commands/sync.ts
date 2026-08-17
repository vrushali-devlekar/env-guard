import * as fs from 'fs';
import pc from 'picocolors';
import { input } from '@inquirer/prompts';
import { compareEnvs, parseEnvFile, serializeEnv } from '../utils/env-parser.js';
import { printBanner } from '../utils/display.js';
import { cancel, isCancel, outro, select, text } from '@clack/prompts';

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

  const mode = await select({
    message: "How would you like to handle missing keys?",
    options: [
      { value: "interactive", label: "1. Fill values interactively one-by-one" },
      { value: "blank", label: "2. Append all keys as blank placeholders" },
      { value: "skip", label: "3. Skip specific keys" },
    ]
  })
  if (isCancel(mode)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  if (mode === "interactive") {
    for (const key of keysToSync) {
      const exampleEntry = exampleData.entries.get(key);
      const defaultValue = exampleEntry?.value || '';
      const commentHint = exampleEntry?.comment ? ` (${exampleEntry.comment})` : '';

      const answer = await text({
        message: `Enter value for ${pc.bold(pc.yellow(key))}${commentHint}:`,
        placeholder: defaultValue,
        defaultValue,
      });

      if (isCancel(answer)) {
        cancel("Operation cancelled.");
        process.exit(0);
      }

      updatedEntries.set(key, answer.trim());
    }
  }
  else if (mode === "blank") {
    for (const key of keysToSync) {
      updatedEntries.set(key, '');
    }
  }
  else if (mode === "skip") {
    for (const key of keysToSync) {
      const exampleEntry = exampleData.entries.get(key);
      const defaultValue = exampleEntry?.value || '';

      const action = await select({
        message: `Key: ${pc.bold(pc.yellow(key))}`,
        options: [
          { value: "fill", label: "Fill value" },
          { value: "blank", label: "Leave blank" },
          { value: "skip", label: "Skip key" },
        ],
      });

      if (isCancel(action)) {
        cancel("Operation cancelled.");
        process.exit(0);
      }
      if (action === "fill") {
        const val = await text({
          message: `Enter value for ${pc.bold(pc.yellow(key))}:`,
          placeholder: defaultValue,
          defaultValue,
        });
        if (isCancel(val)) {
          cancel("Operation cancelled.");
          process.exit(0);
        }
        updatedEntries.set(key, val.trim());
      } else if (action === "blank") {
        updatedEntries.set(key, '');
      }
      // If action === "skip", do nothing; key won't be added to updatedEntries
    }
  }

  /*
    existing code for handling the sync operation having only interactive mode using direct prompts
  */
  // for (const key of keysToSync) {
  //   const exampleEntry = exampleData.entries.get(key);
  //   const defaultValue = exampleEntry?.value || '';
  //   const commentHint = exampleEntry?.comment ? ` (${exampleEntry.comment})` : '';

  //   const answer = await input({
  //     message: `Enter value for ${pc.bold(pc.yellow(key))}${commentHint}:`,
  //     default: defaultValue,
  //   });

  //   updatedEntries.set(key, answer.trim());
  // }

  const newEnvContent = serializeEnv(updatedEntries);
  fs.writeFileSync(envPath, newEnvContent, 'utf-8');

  // original outro (without @clack/prompts) message
  // console.log(`\n${pc.bold(pc.green(`✅ Successfully updated ${envPath} with ${keysToSync.length} variable(s)!`))}\n`);

  // outro message using @clack/prompts
  outro(pc.bold(pc.green(`✅ Successfully updated ${envPath}!`)));
}
