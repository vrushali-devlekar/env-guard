import { Command } from 'commander';
import { auditCommand } from './commands/audit.js';
import { syncCommand } from './commands/sync.js';
import { generateCommand } from './commands/generate.js';

const program = new Command();

program
  .name('env-guard')
  .description('CLI tool to audit .env files, scan live secret leaks, sync variables interactively, and generate Zod schemas')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit .env file against .env.example template for missing keys and secret leaks')
  .option('-e, --env <path>', 'Path to target .env file', '.env')
  .option('-x, --example <path>', 'Path to template .env.example file', '.env.example')
  .option('-s, --strict', 'Exit with status code 1 on missing keys, empty values, or secret leaks', false)
  .option('--json', 'Output audit result as JSON format', false)
  .action((options) => {
    auditCommand(options);
  });

program
  .command('sync')
  .description('Interactively sync missing environment variables into .env')
  .option('-e, --env <path>', 'Path to target .env file', '.env')
  .option('-x, --example <path>', 'Path to template .env.example file', '.env.example')
  .action(async (options) => {
    await syncCommand(options);
  });

program
  .command('generate')
  .description('Generate TypeScript type definitions or Zod validation schemas from environment template')
  .option('-e, --env <path>', 'Path to .env file')
  .option('-x, --example <path>', 'Path to template .env.example file', '.env.example')
  .option('-o, --out <path>', 'Output file path (e.g., src/env.schema.ts)')
  .option('-f, --format <type>', 'Output format: "zod" or "ts"', 'zod')
  .action((options) => {
    generateCommand(options);
  });

program.parse(process.argv);
