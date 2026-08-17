import pc from 'picocolors';
import { printAuditReport, printBanner } from '../utils/display.js';
import { compareEnvs, parseEnvFile } from '../utils/env-parser.js';
import { scanForLeaks } from '../utils/scanner.js';

export interface AuditOptions {
  env: string;
  example: string;
  strict?: boolean;
  json?: boolean;
}

export function auditCommand(options: AuditOptions): void {
  const envPath = options.env;
  const examplePath = options.example;

  const envData = parseEnvFile(envPath);
  const exampleData = parseEnvFile(examplePath);

  if (!exampleData.exists) {
    console.error(pc.red(`❌ Template file "${examplePath}" not found.`));
    console.error(pc.gray(`Please create a template file (e.g. .env.example) to compare against.`));
    process.exit(1);
  }

  if (!envData.exists) {
    console.error(pc.yellow(`⚠️ Target environment file "${envPath}" does not exist.`));
  }

  const comparison = compareEnvs(envData.entries, exampleData.entries);
  const leaks = scanForLeaks(envData.entries);

  if (options.json) {
    const jsonOutput = {
      targetFile: envPath,
      exampleFile: examplePath,
      fileExists: envData.exists,
      missingKeys: comparison.missingKeys,
      emptyKeys: comparison.emptyKeys,
      extraKeys: comparison.extraKeys,
      matchingKeys: comparison.matchingKeys,
      leaks: leaks.map((l) => ({
        key: l.key,
        line: l.line,
        ruleName: l.ruleName,
        severity: l.severity,
        description: l.description,
      })),
      passed: comparison.missingKeys.length === 0 && leaks.length === 0,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    if (options.strict && (!jsonOutput.passed || comparison.emptyKeys.length > 0)) {
      process.exit(1);
    }
    return;
  }

  printBanner();
  printAuditReport(
    envPath,
    examplePath,
    envData.entries,
    exampleData.entries,
    comparison,
    leaks
  );

  const hasIssues = comparison.missingKeys.length > 0 || leaks.length > 0;
  if (options.strict && hasIssues) {
    console.error(pc.red(pc.bold('❌ Audit failed due to strict mode violations (missing keys or secret leaks).')));
    process.exit(1);
  }
}
