# 🛡️ env-guard

> Prevent broken deployments, missing environment variables, live secret leaks, and type mismatches in Node.js & TypeScript projects.

`env-guard` is a fast CLI tool designed to audit `.env` files against `.env.example` templates, detect live credentials before they hit production, interactively prompt developers for missing values, and generate type-safe Zod validation schemas automatically.

---

## 🚀 Features

- **🔍 Automated `.env` Auditing**: Compares your local `.env` with `.env.example` and flags missing keys, empty values, and extra variables.
- **🚨 Secret Leak Scanner**: Built-in security patterns detect accidentally committed live credentials (AWS, Stripe, OpenAI, GitHub tokens, database URIs with passwords, etc.).
- **🔄 Interactive Sync**: Prompt developers for missing variables in `.env` based on `.env.example` and write them automatically.
- **📦 Schema & Type Generator**: Automatically generate Zod validation schemas or TypeScript interface definitions from your environment templates.
- **⚡ CI/CD Ready**: Supports `--strict` and `--json` modes for seamless integration with GitHub Actions, Git hooks, and pre-push scripts.

---

## 📁 Directory Structure

```
env-guard/
├── .github/
│   └── workflows/
│       └── ci.yml             # Automated tests & build pipeline
├── src/
│   ├── commands/
│   │   ├── audit.ts           # Audits .env against .env.example
│   │   ├── sync.ts            # Interactive sync wizard
│   │   └── generate.ts        # Exports TypeScript & Zod schema types
│   ├── utils/
│   │   ├── env-parser.ts      # Fast parser for key-value lines & quotes
│   │   ├── scanner.ts         # Regex scanner for leaked live keys
│   │   └── display.ts         # CLI tables & colorful formatting helpers
│   └── index.ts               # Commander.js entry point & CLI setup
├── tests/
│   └── parser.test.ts         # Unit tests (Vitest)
├── .gitignore
├── package.json
├── tsconfig.json
├── tsup.config.ts             # Bundles TS to dist/index.js
└── README.md
```

---

## 📦 Installation & Setup

```bash
# Clone and install dependencies
npm install

# Build CLI executable
npm run build

# Run unit tests
npm test
```

---

## 🛠️ Usage & Commands

### 1. Audit `.env` Files (`audit`)

Compare your local `.env` file against `.env.example`:

```bash
# Basic audit
npx env-guard audit

# Custom file paths
npx env-guard audit --env .env.local --example .env.example

# Strict mode for CI pipelines (exits code 1 on missing keys or secret leaks)
npx env-guard audit --strict

# JSON output
npx env-guard audit --json
```

### 2. Interactive Sync (`sync`)

Prompt developers for missing environment variables defined in `.env.example` and append them to `.env`:

```bash
npx env-guard sync
```

### 3. Generate Zod Schemas & TS Types (`generate`)

Infer variable types (number, boolean, url, email, string) and generate Zod schemas:

```bash
# Generate Zod schema file
npx env-guard generate --out src/env.schema.ts --format zod

# Generate TypeScript interface file
npx env-guard generate --out src/env.d.ts --format ts
```

---

## 🧪 Running Tests

`env-guard` uses [Vitest](https://vitest.dev) for unit testing:

```bash
npm test
```

---

## 📜 License

MIT
