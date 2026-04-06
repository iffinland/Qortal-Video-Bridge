#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/release/output"
KIT_DIR="$OUTPUT_DIR/tester-kit"
ZIP_PATH="$OUTPUT_DIR/videobox-bridge-tester-kit.zip"

if [[ ! -d "$ROOT_DIR/dist" ]]; then
  echo "Missing dist/. Run 'npm run build' first."
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
rm -rf "$KIT_DIR"
mkdir -p \
  "$KIT_DIR/app" \
  "$KIT_DIR/website" \
  "$KIT_DIR/helper" \
  "$KIT_DIR/docs" \
  "$KIT_DIR/helper/src/types"

cp -R "$ROOT_DIR/dist" "$KIT_DIR/app/dist"
cp -R "$ROOT_DIR/website" "$KIT_DIR/website/website"

cp "$ROOT_DIR/package.json" "$KIT_DIR/helper/package.json"
cp "$ROOT_DIR/package-lock.json" "$KIT_DIR/helper/package-lock.json"
cp "$ROOT_DIR/tsconfig.json" "$KIT_DIR/helper/tsconfig.json"
cp "$ROOT_DIR/tsconfig.server.json" "$KIT_DIR/helper/tsconfig.server.json"
cp "$ROOT_DIR/.env.example" "$KIT_DIR/helper/.env.example"
cp -R "$ROOT_DIR/server" "$KIT_DIR/helper/server"
cp "$ROOT_DIR/src/types/video.ts" "$KIT_DIR/helper/src/types/video.ts"
cp "$ROOT_DIR/src/types/helper.ts" "$KIT_DIR/helper/src/types/helper.ts"

rm -f "$KIT_DIR/helper/server/.env"
find "$KIT_DIR/website/website" -maxdepth 1 -type f -name '*.zip' -delete

cp "$ROOT_DIR/release/tester-kit/QUICK-START.md" "$KIT_DIR/docs/QUICK-START.md"
cp "$ROOT_DIR/release/tester-kit/FULL-MANUAL.md" "$KIT_DIR/docs/FULL-MANUAL.md"
cp "$ROOT_DIR/release/tester-kit/TEST-CHECKLIST.md" "$KIT_DIR/docs/TEST-CHECKLIST.md"
cp "$ROOT_DIR/release/tester-kit/PACKAGING-PLAN.md" "$KIT_DIR/docs/PACKAGING-PLAN.md"

cat > "$KIT_DIR/helper/start-helper.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
npm install
npm run server
EOF
chmod +x "$KIT_DIR/helper/start-helper.sh"

cat > "$KIT_DIR/start-helper.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/helper"
./start-helper.sh
EOF
chmod +x "$KIT_DIR/start-helper.sh"

cat > "$KIT_DIR/README.txt" <<'EOF'
VideoBox Bridge Tester Kit

Contents:
- app/dist
- website/website
- helper
- docs

Recommended reading order:
1. docs/QUICK-START.md
2. docs/FULL-MANUAL.md
3. docs/TEST-CHECKLIST.md

Important paths:
- Start the helper from: ./start-helper.sh
- Or manually from: helper/
- Publish the q-app from: app/dist/
- Open the website files from: website/website/
- Read the guides from: docs/

Recommended first helper mode:
- TRANSCODE_PROFILE=workflow-test
- DEFAULT_TRANSCODE_PRESET=balanced
EOF

rm -f "$ZIP_PATH"
(
  cd "$OUTPUT_DIR"
  zip -qr "$(basename "$ZIP_PATH")" tester-kit
)

echo "Tester kit created:"
echo "  Folder: $KIT_DIR"
echo "  Zip:    $ZIP_PATH"
