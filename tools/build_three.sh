#!/usr/bin/env bash
# Rebuild src/vendor/three.min.js: a tree-shaken ESM bundle of exactly the three.js classes the studio uses.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
names=$(grep -oh "THREE\.[A-Za-z0-9]*" src/studio3d.js src/fly-model.js src/brain3d.js | sort -u | sed 's/THREE\.//' | paste -sd, -)
(cd "$tmp" && npm i --silent three@0.186.1 esbuild >/dev/null && echo "export { $names } from 'three';" > entry.js &&
  npx esbuild entry.js --bundle --format=esm --minify --legal-comments=inline --outfile=out.js)
mkdir -p src/vendor
{ echo "/* three.js r186 (MIT, see three.LICENSE) — tree-shaken bundle of the classes used by src/studio3d.js, src/fly-model.js, src/brain3d.js; rebuild: tools/build_three.sh */"; cat "$tmp/out.js"; } > src/vendor/three.min.js
cp "$tmp/node_modules/three/LICENSE" src/vendor/three.LICENSE
