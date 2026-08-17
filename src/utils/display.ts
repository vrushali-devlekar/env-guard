import Table from 'cli-table3';
import pc from 'picocolors';
import { AuditComparison, EnvEntry } from './env-parser.js';
import { SecretLeak } from './scanner.js';

export function printBanner(): void {
  console.log();
  console.log(pc.bold(pc.cyan('🛡️  env-guard')) + pc.gray(' v1.0.0 — Environment Security & Audit Tool'));
  console.log(pc.gray('------------------------------------------------------------'));
}

export function printAuditReport(
  actualPath: string,
  examplePath: string,
  actualEntries: Map<string, EnvEntry>,
  exampleEntries: Map<string, EnvEntry>,
  comparison: AuditComparison,
  leaks: SecretLeak[]
): void {
  console.log(`\n📄 Auditing ${pc.bold(actualPath)} against template ${pc.bold(examplePath)}\n`);

  const table = new Table({
    head: [
      pc.bold(pc.white('Variable Key')),
      pc.bold(pc.white('Status')),
      pc.bold(pc.white('Line')),
      pc.bold(pc.white('Note / Details')),
    ],
    colWidths: [30, 14, 8, 32],
    wordWrap: true,
  });

  // 1. Missing keys
  for (const key of comparison.missingKeys) {
    const exampleEntry = exampleEntries.get(key);
    table.push([
      pc.red(key),
      pc.bgRed(pc.black(' MISSING ')),
      pc.gray('-'),
      pc.red('Missing from .env (required by .env.example)'),
    ]);
  }

  // 2. Empty keys
  for (const key of comparison.emptyKeys) {
    const entry = actualEntries.get(key);
    table.push([
      pc.yellow(key),
      pc.bgYellow(pc.black(' EMPTY ')),
      pc.gray(String(entry?.line ?? '-')),
      pc.yellow('Defined in .env but value is empty'),
    ]);
  }

  // 3. Extra keys
  for (const key of comparison.extraKeys) {
    const entry = actualEntries.get(key);
    table.push([
      pc.cyan(key),
      pc.bgCyan(pc.black(' EXTRA ')),
      pc.gray(String(entry?.line ?? '-')),
      pc.cyan('Not documented in .env.example'),
    ]);
  }

  // 4. Matching OK keys
  for (const key of comparison.matchingKeys) {
    const entry = actualEntries.get(key);
    const hasLeak = leaks.some((l) => l.key === key);
    if (!hasLeak) {
      table.push([
        pc.green(key),
        pc.bgGreen(pc.black(' OK ')),
        pc.gray(String(entry?.line ?? '-')),
        pc.green('Valid'),
      ]);
    }
  }

  // 5. Secret Leaks (override status if leaked)
  for (const leak of leaks) {
    const entry = actualEntries.get(leak.key);
    table.push([
      pc.bold(pc.red(leak.key)),
      pc.bgRed(pc.white(' LEAK ')),
      pc.gray(String(entry?.line ?? '-')),
      pc.red(`[${leak.severity}] ${leak.description}`),
    ]);
  }

  console.log(table.toString());

  // Leak detail alerts
  if (leaks.length > 0) {
    console.log(`\n${pc.bgRed(pc.white(pc.bold(' 🚨 CRITICAL SECURITY WARNING: SECRET LEAKS DETECTED ')))}\n`);
    for (const leak of leaks) {
      console.log(
        `  • ${pc.bold(leak.key)} (Line ${leak.line}): ${pc.yellow(leak.ruleName)} — ${pc.gray(leak.maskedValue)}`
      );
    }
  }

  // Summary box
  console.log('\n' + pc.bold('📊 Summary:'));
  console.log(`  • Missing Keys: ${comparison.missingKeys.length > 0 ? pc.red(String(comparison.missingKeys.length)) : pc.green('0')}`);
  console.log(`  • Empty Keys:   ${comparison.emptyKeys.length > 0 ? pc.yellow(String(comparison.emptyKeys.length)) : pc.green('0')}`);
  console.log(`  • Extra Keys:   ${comparison.extraKeys.length > 0 ? pc.cyan(String(comparison.extraKeys.length)) : pc.green('0')}`);
  console.log(`  • Secret Leaks: ${leaks.length > 0 ? pc.red(String(leaks.length)) : pc.green('0')}`);
  console.log();
}
