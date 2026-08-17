import { LEAK_RULES, maskSecret, scanForLeaks } from "../src/utils/scanner.js";
import {
  compareEnvs,
  parseEnvContent,
  serializeEnv,
} from "../src/utils/env-parser.js";
import { describe, expect, it } from "vitest";
import { generateZodSchema, inferType } from "../src/commands/generate.js";

describe("env-parser", () => {
  it("parses standard key=value lines, quotes, and comments", () => {
    const raw = `
# Server Config
export PORT=3000
DATABASE_URL="postgres://user:pass@localhost:5432/db" # inline comment
DEBUG='true'
EMPTY_VAL=
    `;

    const entries = parseEnvContent(raw);

    expect(entries.size).toBe(4);
    expect(entries.get("PORT")).toEqual({
      key: "PORT",
      value: "3000",
      comment: undefined,
      line: 3,
      raw: "export PORT=3000",
    });
    expect(entries.get("DATABASE_URL")?.value).toBe(
      "postgres://user:pass@localhost:5432/db",
    );
    expect(entries.get("DATABASE_URL")?.comment).toBe("inline comment");
    expect(entries.get("DEBUG")?.value).toBe("true");
    expect(entries.get("EMPTY_VAL")?.value).toBe("");
  });

  it("compares actual env against example template", () => {
    const example = parseEnvContent(`
PORT=3000
DATABASE_URL=
SECRET_KEY=
EXTRA_TEMPLATE=
    `);

    const actual = parseEnvContent(`
PORT=8080
DATABASE_URL=
UNTRACKED_KEY=value
    `);

    const comparison = compareEnvs(actual, example);

    expect(comparison.missingKeys).toEqual(["SECRET_KEY", "EXTRA_TEMPLATE"]);
    expect(comparison.emptyKeys).toEqual(["DATABASE_URL"]);
    expect(comparison.extraKeys).toEqual(["UNTRACKED_KEY"]);
    expect(comparison.matchingKeys).toEqual(["PORT"]);
  });

  it("serializes entries back to env file format", () => {
    const map = new Map<string, string>([
      ["PORT", "3000"],
      ["MESSAGE", "Hello World"],
    ]);

    const result = serializeEnv(map);
    expect(result).toContain("PORT=3000");
    expect(result).toContain('MESSAGE="Hello World"');
  });
});

describe("scanner (secret leaks)", () => {
  it("masks secret keys correctly", () => {
    expect(maskSecret("AKIA1234567890ABCDEF")).toBe("AKI...DEF");
    expect(maskSecret("short")).toBe("***masked***");
  });

  it("detects AWS Access Keys and Stripe secrets", () => {
    const mockStripeKey = ["sk", "live", "000000000000000000000000"].join("_");
    const entries = parseEnvContent(`
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
STRIPE_KEY=${mockStripeKey}
NORMAL_VAR=hello
    `);

    const leaks = scanForLeaks(entries);
    expect(leaks.length).toBe(2);
    expect(leaks[0].key).toBe("AWS_ACCESS_KEY_ID");
    expect(leaks[0].severity).toBe("CRITICAL");
    expect(leaks[1].key).toBe("STRIPE_KEY");
  });
  it("detects GitHub Personal Access Tokens", () => {
    const githubToken = `ghp_${"a".repeat(36)}`;

    const entries = parseEnvContent(`
GITHUB_TOKEN=${githubToken}
NORMAL_VAR=hello
  `);

    const leaks = scanForLeaks(entries);

    expect(leaks.length).toBe(1);
    expect(leaks[0].key).toBe("GITHUB_TOKEN");
    expect(leaks[0].ruleName).toBe("GitHub Token");
    expect(leaks[0].severity).toBe("CRITICAL");
  });
  it("detects Slack Bot Tokens", () => {
    const slackToken = `xoxb-${"1".repeat(11)}-${"2".repeat(11)}-${"a".repeat(24)}`;

    const entries = parseEnvContent(`
SLACK_BOT_TOKEN=${slackToken}
NORMAL_VAR=hello
  `);

    const leaks = scanForLeaks(entries);

    expect(leaks.length).toBe(1);
    expect(leaks[0].key).toBe("SLACK_BOT_TOKEN");
    expect(leaks[0].ruleName).toBe("Slack Bot Token");
    expect(leaks[0].severity).toBe("CRITICAL");
  });
  it("detects OpenAI project API keys", () => {
    const openAIKey = `sk-proj-${"a".repeat(32)}`;

    const entries = parseEnvContent(`
OPENAI_API_KEY=${openAIKey}
NORMAL_VAR=hello
  `);

    const leaks = scanForLeaks(entries);

    expect(leaks.length).toBe(1);
    expect(leaks[0].key).toBe("OPENAI_API_KEY");
    expect(leaks[0].ruleName).toBe("OpenAI API Key");
    expect(leaks[0].severity).toBe("CRITICAL");
  });

  it("skips placeholder strings when scanning example files", () => {
    const entries = parseEnvContent(`
AWS_KEY=AKIA_your_aws_key_here
    `);

    const leaks = scanForLeaks(entries, { isExampleFile: true });
    expect(leaks.length).toBe(0);
  });
});

describe("schema generator", () => {
  it("infers data types from key names and values", () => {
    expect(inferType("PORT", "3000")).toBe("number");
    expect(inferType("ENABLE_LOGS", "true")).toBe("boolean");
    expect(inferType("DATABASE_URL", "postgres://localhost:5432")).toBe("url");
    expect(inferType("ADMIN_EMAIL", "admin@example.com")).toBe("email");
    expect(inferType("APP_NAME", "env-guard")).toBe("string");
  });

  it("generates valid Zod schema code string", () => {
    const schema = generateZodSchema([
      { key: "PORT", type: "number" },
      { key: "DEBUG", type: "boolean" },
    ]);

    expect(schema).toContain("import { z } from 'zod';");
    expect(schema).toContain("PORT: z.coerce.number()");
    expect(schema).toContain("DEBUG: z.coerce.boolean()");
  });
});
