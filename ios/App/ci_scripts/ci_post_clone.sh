#!/bin/zsh
set -e

# Xcode Cloud clones the repo but never runs npm install, and the Capacitor
# iOS packages (CapApp-SPM/Package.swift) are wired in as local SPM packages
# pointing at node_modules/@capacitor/*. Without this, package resolution
# fails before the archive step even starts.

# Find the cloned repo. This previously read `cd "$CI_WORKSPACE/reawarding"`,
# which can never succeed: package.json sits at the repository root and there
# is no `reawarding` subdirectory inside the repo. The name comes from the
# local layout (the checkout lives at .../Dev/Reawarding/reawarding, so the
# parent folder shares the repo's name) — on CI the clone directory is named
# after neither. With `set -e` above, that failed `cd` aborted this script in
# the post-clone phase, before the archive step, which is the most likely
# reason every Xcode Cloud build has failed.
#
# CI_PRIMARY_REPOSITORY_PATH is the current documented variable for the primary
# repository's checkout; CI_WORKSPACE is the older one it replaced. Try both
# rather than betting on either, then verify package.json is actually present
# so the next failure names its own cause instead of dying on a bare `cd`.
REPO="${CI_PRIMARY_REPOSITORY_PATH:-$CI_WORKSPACE}"
if [ -z "$REPO" ] || [ ! -f "$REPO/package.json" ]; then
  echo "ci_post_clone: no package.json found."
  echo "  CI_PRIMARY_REPOSITORY_PATH=${CI_PRIMARY_REPOSITORY_PATH:-<unset>}"
  echo "  CI_WORKSPACE=${CI_WORKSPACE:-<unset>}"
  echo "  resolved REPO=${REPO:-<empty>}"
  echo "  contents of ${REPO:-/}:"
  ls -la "${REPO:-/}" || true
  exit 1
fi
cd "$REPO"

# Xcode Cloud's macOS images do not ship Node.js, so `npm ci` below died with
# exit code 127 (command not found) — which cascaded into the real symptom in
# the build log: "Could not resolve package dependencies: the package at
# /Volumes/workspace/repository/node_modules/@capacitor/haptics ... doesn't
# exist in file system". node_modules was never created because npm was never
# available to create it.
#
# Homebrew IS preinstalled on Xcode Cloud, and on Apple Silicon runners it
# lives at /opt/homebrew, which isn't necessarily on PATH for this shell.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v npm >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "ci_post_clone: neither npm nor brew is available; cannot install Node."
    echo "  PATH=$PATH"
    exit 1
  fi
  echo "ci_post_clone: npm not found, installing Node via Homebrew..."
  # No version is pinned deliberately: the project has no `engines` field,
  # no .nvmrc, and no NODE_VERSION for Netlify, so it tracks current Node
  # (v26 locally). Pin here and in those places together, or not at all.
  brew install node
  # zsh caches command lookups; force it to see the new binary.
  rehash 2>/dev/null || true
fi

command -v npm >/dev/null 2>&1 || {
  echo "ci_post_clone: npm still missing after install attempt."
  echo "  PATH=$PATH"
  exit 1
}

echo "ci_post_clone: node $(node --version), npm $(npm --version)"

npm ci

# Capacitor copies `webDir` (public/, per capacitor.config.ts) into
# ios/App/App/public, which is gitignored (ios/.gitignore) and therefore absent
# from a fresh clone. Sync here so the archived app ships with that content
# present rather than missing. Note this is Next's static public/ folder, which
# IS tracked in git — not a build artifact — so no `npm run build` is needed
# ahead of it. This shell loads https://reawarding.com at runtime (server.url),
# so the bundled files only need to cover the offline fallback.
npx cap sync ios
