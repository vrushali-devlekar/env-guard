import express from "express";
import open from "open";
import path from "path";
import fs from "fs";
import { parseEnvFile } from "../utils/env-parser.js";

export async function launchUI(port = 4321) {
  const app = express();
  app.use(express.json());

  // Resolve static path across dev and built contexts
  const cwd = process.cwd();
  const possiblePaths = [
    path.join(__dirname, "../src/server/static"),
    path.join(__dirname, "../server/static"),
    path.join(cwd, "src/server/static"),
    path.join(cwd, "server/static"),
  ];

  let staticPath = possiblePaths[0];
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      staticPath = p;
      break;
    }
  }

  app.use(express.static(staticPath));

  // API 1: Fetch current .env & .env.example status
  app.get("/api/status", (req, res) => {
    const envPath = path.join(cwd, ".env");
    const examplePath = path.join(cwd, ".env.example");

    const envParsed = fs.existsSync(envPath) ? parseEnvFile(envPath) : null;
    const exampleParsed = fs.existsSync(examplePath) ? parseEnvFile(examplePath) : null;

    const envEntries = envParsed ? Object.fromEntries(envParsed.entries) : {};
    const exampleEntries = exampleParsed ? Object.fromEntries(exampleParsed.entries) : {};

    res.json({
      envExists: fs.existsSync(envPath),
      exampleExists: fs.existsSync(examplePath),
      env: envEntries,
      example: exampleEntries,
      workingDir: cwd,
    });
  });

  // API 2: Update/Sync .env from the Web UI
  app.post("/api/save", (req, res) => {
    const { keys } = req.body; // e.g. { DATABASE_URL: "...", PORT: "3000" }
    const envPath = path.join(cwd, ".env");

    const content = Object.entries(keys)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    fs.writeFileSync(envPath, content, "utf-8");
    res.json({ success: true, message: ".env updated successfully!" });
  });

  // Fallback to index.html for SPA
  app.use((req, res) => {
    const indexPath = path.join(staticPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`index.html not found at: ${indexPath}`);
    }
  });

  const server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  🛡️  env-guard UI running at: \x1b[36m${url}\x1b[0m`);
    console.log(`  Press \x1b[33mCtrl + C\x1b[0m to close the server.\n`);
    open(url);
  });
}