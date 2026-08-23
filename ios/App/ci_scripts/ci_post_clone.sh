#!/bin/zsh
set -e

# Xcode Cloud clones the repo but never runs npm install, and the Capacitor
# iOS packages (CapApp-SPM/Package.swift) are wired in as local SPM packages
# pointing at node_modules/@capacitor/*. Without this, package resolution
# fails before the archive step even starts.

cd "$CI_WORKSPACE/reawarding"

npm ci

# ios/App/App/public (the web build Capacitor bundles into the app) is
# gitignored and only ever produced locally — sync it here too so the
# archived app isn't shipped with stale or missing web content.
npx cap sync ios
