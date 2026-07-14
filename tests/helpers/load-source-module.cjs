const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..", "..");

function loadSourceModule(relativePath, exportNames) {
  const absolutePath = path.join(repoRoot, relativePath);
  let source = fs.readFileSync(absolutePath, "utf8");

  source = source
    .replace(/import\s+crypto\s+from\s+["']crypto["'];?/g, 'const crypto = require("node:crypto");')
    .replace(/export\s+async\s+function\s+(\w+)/g, "async function $1")
    .replace(/export\s+function\s+(\w+)/g, "function $1")
    .replace(/export\s+const\s+(\w+)\s*=/g, "const $1 =");

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
  };
  sandbox.exports = sandbox.module.exports;

  vm.runInNewContext(source, sandbox, { filename: absolutePath });
  return sandbox.module.exports;
}

module.exports = { loadSourceModule };
