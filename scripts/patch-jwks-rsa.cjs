const fs = require("node:fs");
const path = require("node:path");

// jwks-rsa 4.x synchronously requires jose 6, which is ESM-only. Vercel runs
// Node with require(ESM) disabled, so importing firebase-admin/auth otherwise
// crashes every Firebase-backed route with ERR_REQUIRE_ESM. This applies the
// lazy dynamic-import fix from upstream auth0/node-jwks-rsa PR #508.
const packagePath = require.resolve("jwks-rsa/package.json");
const srcDir = path.join(path.dirname(packagePath), "src");
const josePath = path.join(srcDir, "jose.js");
const utilsPath = path.join(srcDir, "utils.js");
const passportPath = path.join(srcDir, "integrations", "passport.js");

fs.writeFileSync(
  josePath,
  `let jose;
const dynamicImport = new Function('specifier', 'return import(specifier)');

function getJose() {
  if (!jose) {
    jose = dynamicImport('jose');
  }

  return jose;
}

module.exports = {
  getJose
};
`
);

let utils = fs.readFileSync(utilsPath, "utf8");
if (utils.startsWith("const jose = require('jose');")) {
  utils = utils.replace(
    "const jose = require('jose');",
    "const { getJose } = require('./jose');"
  );
} else if (!utils.includes("require('./jose')")) {
  utils = `const { getJose } = require('./jose');\n${utils}`;
}
utils = utils.replace(
  "  const jose = await import('jose');",
  "  const jose = await getJose();"
);
if (!utils.includes("  const jose = await getJose();")) {
  utils = utils.replace(
    "async function retrieveSigningKeys(jwks) {",
    "async function retrieveSigningKeys(jwks) {\n  const jose = await getJose();"
  );
}
fs.writeFileSync(utilsPath, utils);

let passport = fs.readFileSync(passportPath, "utf8");
passport = passport.replace(
  "const jose = require('jose');",
  "const { getJose } = require('../jose');"
);

const oldProvider = `  return function secretProvider(req, rawJwtToken, cb) {
    let decoded;
    try {
      decoded = {
        payload: jose.decodeJwt(rawJwtToken),
        header: jose.decodeProtectedHeader(rawJwtToken)
      };
    } catch (err) {
      decoded = null;
    }

    if (!decoded || !supportedAlg.includes(decoded.header.alg)) {
      return cb(null, null);
    }

    client.getSigningKey(decoded.header.kid)
      .then(key => {
        cb(null, key.publicKey || key.rsaPublicKey);
      }).catch(err => {
        onError(err, (newError) => cb(newError, null));
      });
  };`;

const newProvider = `  return function secretProvider(req, rawJwtToken, cb) {
    getJose()
      .then(jose => {
        let decoded;
        try {
          decoded = {
            payload: jose.decodeJwt(rawJwtToken),
            header: jose.decodeProtectedHeader(rawJwtToken)
          };
        } catch (err) {
          decoded = null;
        }

        if (!decoded || !supportedAlg.includes(decoded.header.alg)) {
          return cb(null, null);
        }

        client.getSigningKey(decoded.header.kid)
          .then(key => {
            cb(null, key.publicKey || key.rsaPublicKey);
          }).catch(err => {
            onError(err, (newError) => cb(newError, null));
          });
      }).catch(err => {
        cb(err, null);
      });
  };`;

if (passport.includes(oldProvider)) {
  passport = passport.replace(oldProvider, newProvider);
} else if (!passport.includes("getJose()")) {
  throw new Error(
    "jwks-rsa changed upstream; remove or update scripts/patch-jwks-rsa.cjs"
  );
}
fs.writeFileSync(passportPath, passport);

console.log("Applied jwks-rsa jose ESM compatibility patch");
