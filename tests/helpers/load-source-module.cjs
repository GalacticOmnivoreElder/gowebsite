const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..", "..");

function loadSourceModule(relativePath, exportNames, options = {}) {
  const absolutePath = path.join(repoRoot, relativePath);
  let source = fs.readFileSync(absolutePath, "utf8");

  if (options.transform) {
    source = options.transform(source);
  }

  source = source
    .replace(/import\s+crypto\s+from\s+["']crypto["'];?/g, 'const crypto = require("node:crypto");')
    .replace(/export\s+default\s+class\s+(\w+)/g, "class $1")
    .replace(/export\s+async\s+function\s+(\w+)/g, "async function $1")
    .replace(/export\s+function\s+(\w+)/g, "function $1")
    .replace(/export\s+const\s+(\w+)\s*=/g, "const $1 =")
    .replace(/export\s+\{[\s\S]*?\};?/g, "")
    .replace(/export\s+default\s+\w+;?/g, "");

  if (options.stripImports) {
    source = source.replace(/\s*import[\s\S]*?from\s+["'][^"']+["'];\s*/g, "\n");
  }

  source += `\nmodule.exports = { ${exportNames.join(", ")} };\n`;

  const sandbox = {
    Buffer,
    Date,
    URL,
    clearTimeout,
    console,
    fetch: (...args) => global.fetch(...args),
    module: { exports: {} },
    process,
    require,
    setTimeout,
    ...(options.sandbox || {}),
  };
  sandbox.exports = sandbox.module.exports;

  vm.runInNewContext(source, sandbox, { filename: absolutePath });
  return sandbox.module.exports;
}

module.exports = { loadSourceModule };
