const fs = require("fs");
const path = require("path");

const transcripts = [
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/d-Desktop-StaffEra/agent-transcripts/948d4085-578e-4c4d-879a-3391fe9551e9/948d4085-578e-4c4d-879a-3391fe9551e9.jsonl"
  ),
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/d-Desktop-StaffEra/agent-transcripts/8c0568fc-1e75-468b-be94-c4d0c8dabb92/8c0568fc-1e75-468b-be94-c4d0c8dabb92.jsonl"
  )
];

const repoRoot = path.resolve(__dirname, "..");
const files = new Map();
const ops = [];

const normalizePath = (p) => {
  const fixed = p.replace(/\\/g, "/");
  const idx = fixed.toLowerCase().indexOf("/staffera/");
  if (idx >= 0) return path.join(repoRoot, fixed.slice(idx + "/staffera/".length));
  if (fixed.includes("Servant/servant-app")) {
    const i = fixed.indexOf("Servant/servant-app");
    return path.join(repoRoot, fixed.slice(i));
  }
  if (fixed.includes("House Owner App/house-owner-app")) {
    const i = fixed.indexOf("House Owner App/house-owner-app");
    return path.join(repoRoot, fixed.slice(i));
  }
  return null;
};

for (const transcript of transcripts) {
  if (!fs.existsSync(transcript)) {
    console.warn("Missing transcript:", transcript);
    continue;
  }
  const lines = fs.readFileSync(transcript, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const content = row.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== "tool_use") continue;
      const { name, input = {} } = block;
      const target = normalizePath(input.path || "");
      if (!target) continue;
      if (!target.includes("servant-app") && !target.includes("house-owner-app")) continue;

      if (name === "Write" && input.contents) {
        ops.push({ type: "write", target, contents: input.contents });
      } else if (name === "StrReplace" && input.old_string !== undefined) {
        ops.push({
          type: "replace",
          target,
          old_string: input.old_string,
          new_string: input.new_string
        });
      }
    }
  }
}

for (const op of ops) {
  if (op.type === "write") {
    files.set(op.target, op.contents);
  } else if (op.type === "replace" && files.has(op.target)) {
    const cur = files.get(op.target);
    if (cur.includes(op.old_string)) {
      files.set(op.target, cur.replace(op.old_string, op.new_string));
    }
  }
}

let written = 0;
for (const [filePath, contents] of files) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
  written++;
  console.log("restored:", path.relative(repoRoot, filePath));
}

// .env files (not in transcript — recreate)
const envContent = "EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1\n";
for (const app of [
  "Servant/servant-app/.env",
  "House Owner App/house-owner-app/.env"
]) {
  const p = path.join(repoRoot, app);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, envContent);
    console.log("created:", app);
  }
}

console.log(`\nDone. Restored ${written} files from transcripts.`);
