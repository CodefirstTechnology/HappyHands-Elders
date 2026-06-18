#!/usr/bin/env node
/**
 * Blocks git commits that include real API keys or local .env files.
 */
const { execSync, spawnSync } = require("child_process");

const BLOCKED_FILE = /\.env$/i;
const ALLOWED_ENV = /\.env(\..*)?\.example$/i;

const SECRET_PATTERNS = [
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: "OpenAI-style key", re: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "GitHub token", re: /ghp_[a-zA-Z0-9]{20,}/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
];

const PLACEHOLDER_VALUES =
  /^(|your_[a-z0-9_]+|change_me_[a-z0-9_]+|#.*)$/i;

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
}

function getStagedFiles() {
  const out = run("git diff --cached --name-only --diff-filter=ACM");
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

function getAddedLines(file) {
  const result = spawnSync(
    "git",
    ["diff", "--cached", "-U0", "--no-color", "--", file],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  if (result.error) throw result.error;
  return (result.stdout || "")
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
}

function checkEnvFiles(files) {
  const errors = [];
  for (const file of files) {
    if (ALLOWED_ENV.test(file)) continue;
    if (BLOCKED_FILE.test(file)) {
      errors.push(`${file}: .env files must not be committed (use .env.example only)`);
    }
  }
  return errors;
}

function checkAddedSecrets(files) {
  const errors = [];
  for (const file of files) {
    for (const content of getAddedLines(file)) {
      for (const { name, re } of SECRET_PATTERNS) {
        if (re.test(content)) {
          errors.push(`${file}: possible ${name}`);
          break;
        }
      }

      const kv = content.match(
        /^(?:EXPO_PUBLIC_)?(?:GOOGLE_MAPS_API_KEY|MSG91_AUTH_KEY|JWT_SECRET|JWT_REFRESH_SECRET|FCM_SERVER_KEY|SMTP_PASS)\s*=\s*(.+)$/i
      );
      if (kv && !PLACEHOLDER_VALUES.test(kv[1].trim())) {
        errors.push(`${file}: non-placeholder secret value (${content.trim()})`);
      }
    }
  }
  return errors;
}

function main() {
  const files = getStagedFiles();
  if (files.length === 0) process.exit(0);

  const errors = [...checkEnvFiles(files), ...checkAddedSecrets(files)];

  if (errors.length === 0) {
    console.log("Secret check passed.");
    process.exit(0);
  }

  console.error("\nCommit blocked — possible secrets detected:\n");
  for (const err of errors) console.error(`  • ${err}`);
  console.error("\nKeep keys in local .env files only (already gitignored).\n");
  process.exit(1);
}

main();
