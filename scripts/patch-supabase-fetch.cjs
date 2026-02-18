#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();

const files = [
  path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'main', 'lib', 'fetch.js'),
  path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'module', 'lib', 'fetch.js'),
  path.join(root, 'node_modules', '@supabase', 'postgrest-js', 'dist', 'cjs', 'PostgrestBuilder.js'),
];

function replaceOrThrow(source, from, to, filePath) {
  if (!source.includes(from)) {
    throw new Error(`Expected snippet not found in ${filePath}`);
  }
  return source.replace(from, to);
}

function patchMain(filePath, source) {
  if (source.includes('codex-supabase-fetch-patch')) {
    return source;
  }

  let next = source;
  next = replaceOrThrow(
    next,
    'const node_fetch_1 = __importStar(require("@supabase/node-fetch"));',
    [
      '// codex-supabase-fetch-patch',
      "const missingFetch = () => {",
      "    throw new Error('Global fetch is unavailable. Use Node.js 18+ or pass customFetch.');",
      '};',
      "const MissingHeadersConstructor = function () {",
      "    throw new Error('Global Headers is unavailable. Use Node.js 18+ runtime APIs.');",
      '};',
    ].join('\n'),
    filePath
  );

  next = replaceOrThrow(next, '_fetch = node_fetch_1.default;', '_fetch = missingFetch;', filePath);
  next = replaceOrThrow(next, 'return node_fetch_1.Headers;', 'return MissingHeadersConstructor;', filePath);

  return next;
}

function patchModule(filePath, source) {
  if (source.includes('codex-supabase-fetch-patch')) {
    return source;
  }

  let next = source;
  next = replaceOrThrow(
    next,
    "import nodeFetch, { Headers as NodeFetchHeaders } from '@supabase/node-fetch';",
    [
      '// codex-supabase-fetch-patch',
      "const missingFetch = () => {",
      "    throw new Error('Global fetch is unavailable. Use Node.js 18+ or pass customFetch.');",
      '};',
      "const MissingHeadersConstructor = function () {",
      "    throw new Error('Global Headers is unavailable. Use Node.js 18+ runtime APIs.');",
      '};',
    ].join('\n'),
    filePath
  );

  next = replaceOrThrow(next, '_fetch = nodeFetch;', '_fetch = missingFetch;', filePath);
  next = replaceOrThrow(next, 'return NodeFetchHeaders;', 'return MissingHeadersConstructor;', filePath);

  return next;
}

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing expected file: ${filePath}`);
  }
  const original = fs.readFileSync(filePath, 'utf8');
  let patched;
  if (filePath.includes(path.join('supabase-js', 'dist', 'main'))) {
    patched = patchMain(filePath, original);
  } else if (filePath.includes(path.join('supabase-js', 'dist', 'module'))) {
    patched = patchModule(filePath, original);
  } else {
    patched = patchPostgrestBuilder(filePath, original);
  }

  if (patched !== original) {
    fs.writeFileSync(filePath, patched, 'utf8');
    console.log(`patched ${path.relative(root, filePath)}`);
  } else {
    console.log(`ok ${path.relative(root, filePath)}`);
  }
}

function patchPostgrestBuilder(filePath, source) {
  if (source.includes('codex-supabase-fetch-patch')) {
    return source;
  }

  let next = source;
  next = replaceOrThrow(
    next,
    'const node_fetch_1 = __importDefault(require("@supabase/node-fetch"));',
    [
      '// codex-supabase-fetch-patch',
      "const missingFetch = () => {",
      "    throw new Error('Global fetch is unavailable. Use Node.js 18+ or pass builder.fetch.');",
      '};',
    ].join('\n'),
    filePath
  );
  next = replaceOrThrow(next, 'this.fetch = node_fetch_1.default;', 'this.fetch = missingFetch;', filePath);
  return next;
}

for (const filePath of files) {
  patchFile(filePath);
}
