#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const BEGIN = '<!-- AUTO-GENERATED:BEGIN -->';
const END = '<!-- AUTO-GENERATED:END -->';

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.codex',
  'node_modules',
  'dist',
  'build',
  'coverage',
]);

function toPosix(p) {
  return p.replaceAll('\\', '/');
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function runGit(repoRootAbs, args) {
  return execFileSync('git', args, { cwd: repoRootAbs, encoding: 'utf8' }).trimEnd();
}

async function pathExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(rootDir, { maxDepth = 10, wantFile } = {}) {
  const out = [];
  async function rec(dir, depth) {
    if (depth > maxDepth) return;
    let ents;
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    ents.sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of ents) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        await rec(full, depth + 1);
        continue;
      }
      if (!ent.isFile()) continue;
      if (!wantFile || wantFile(full)) out.push(full);
    }
  }
  await rec(rootDir, 0);
  return out;
}

async function findAnalysisFiles(repoRootAbs) {
  const files = await walkFiles(repoRootAbs, {
    maxDepth: 20,
    wantFile: (p) => path.basename(p).toLowerCase() === 'analysis.md',
  });
  files.sort((a, b) => toPosix(a).localeCompare(toPosix(b)));
  return files;
}

function listGitAnalysisFiles(repoRootAbs) {
  const out = runGit(repoRootAbs, ['ls-files', '--', ':(glob)**/ANALYSIS.md']);
  if (!out) return [];
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function listGitFiles(repoRootAbs, prefixRel) {
  const prefix = prefixRel && prefixRel !== '.' ? prefixRel : '';
  const args = prefix ? ['ls-files', '--', prefix] : ['ls-files'];
  const out = runGit(repoRootAbs, args);
  if (!out) return [];
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function readGitFileFromIndex(repoRootAbs, relPath) {
  // relPath must be repository-relative (POSIX separators).
  return runGit(repoRootAbs, ['show', `:${relPath}`]) + '\n';
}

function normalizeRoutePath(p) {
  if (!p) return '';
  if (p.startsWith('/')) return p;
  return `/${p}`;
}

function joinRoute(base, sub) {
  const b = normalizeRoutePath(base);
  const s = normalizeRoutePath(sub);
  if (!b && !s) return '/';
  if (!b) return s || '/';
  if (!s || s === '/') return b;
  if (b.endsWith('/') && s.startsWith('/')) return b + s.slice(1);
  if (!b.endsWith('/') && !s.startsWith('/')) return `${b}/${s}`;
  return b + s;
}

function parseNestControllerRoutesFromContent(content) {
  const controllerMatch = content.match(/@Controller\(\s*(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\1\s*\)/);
  const controllerBaseRaw = controllerMatch ? controllerMatch[2] : '';
  const controllerBase = controllerBaseRaw.replaceAll('\\', '');

  const routes = [];
  const re = /@(Get|Post|Put|Patch|Delete|Options|Head|Sse)\(\s*(?:(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\2)?\s*\)/g;
  for (const m of content.matchAll(re)) {
    const decorator = m[1];
    const method = decorator === 'Sse' ? 'SSE' : decorator.toUpperCase();
    const raw = m[3] ?? '';
    const subPath = raw.replaceAll('\\', '');
    const fullPath = joinRoute(controllerBase, subPath);
    routes.push({ method, path: fullPath });
  }

  const seen = new Set();
  const deduped = [];
  for (const r of routes) {
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  return deduped;
}

async function detectNestRoutesFromWorktree(scopeDirAbs, repoRootAbs) {
  const controllerFiles = await walkFiles(scopeDirAbs, {
    maxDepth: 4,
    wantFile: (p) => p.endsWith('.controller.ts'),
  });
  if (controllerFiles.length === 0) return [];

  const all = [];
  for (const f of controllerFiles) {
    const content = await fs.readFile(f, 'utf8');
    const routes = parseNestControllerRoutesFromContent(content);
    const relFile = toPosix(path.relative(repoRootAbs, f));
    for (const r of routes) all.push({ ...r, file: relFile });
  }

  all.sort((a, b) => {
    const aKey = `${a.path} ${a.method} ${a.file}`;
    const bKey = `${b.path} ${b.method} ${b.file}`;
    return aKey.localeCompare(bKey);
  });
  return all;
}

function detectNestRoutesFromIndex(scopeRel, repoRootAbs) {
  const files = listGitFiles(repoRootAbs, scopeRel);
  const controllerFiles = files.filter((p) => p.endsWith('.controller.ts'));
  if (controllerFiles.length === 0) return [];

  const all = [];
  for (const f of controllerFiles) {
    const content = readGitFileFromIndex(repoRootAbs, f);
    const routes = parseNestControllerRoutesFromContent(content);
    for (const r of routes) all.push({ ...r, file: f });
  }

  all.sort((a, b) => {
    const aKey = `${a.path} ${a.method} ${a.file}`;
    const bKey = `${b.path} ${b.method} ${b.file}`;
    return aKey.localeCompare(bKey);
  });
  return all;
}

function isNextRouteGroupSegment(seg) {
  return seg.startsWith('(') && seg.endsWith(')');
}

function computeNextRouteFromPage(relPageFile) {
  // relPageFile like "notifications/page.tsx" or "page.tsx"
  const dir = path.posix.dirname(toPosix(relPageFile));
  if (dir === '.') return '/';
  const parts = dir.split('/').filter(Boolean).filter((seg) => !isNextRouteGroupSegment(seg));
  return '/' + parts.join('/');
}

async function detectNextPagesFromWorktree(appDirAbs, repoRootAbs) {
  if (!(await pathExists(appDirAbs))) return [];
  const pageFiles = await walkFiles(appDirAbs, {
    maxDepth: 8,
    wantFile: (p) => path.basename(p) === 'page.tsx',
  });

  const out = [];
  for (const f of pageFiles) {
    const relToApp = toPosix(path.relative(appDirAbs, f));
    const route = computeNextRouteFromPage(relToApp);
    out.push({
      route,
      file: toPosix(path.relative(repoRootAbs, f)),
    });
  }
  out.sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file));
  return out;
}

function detectNextPagesFromIndex(appDirRel, repoRootAbs) {
  const files = listGitFiles(repoRootAbs, appDirRel);
  const pageFiles = files.filter((p) => p.endsWith('/page.tsx'));

  const out = [];
  for (const f of pageFiles) {
    const relToApp = path.posix.relative(appDirRel, f);
    const route = computeNextRouteFromPage(relToApp);
    out.push({ route, file: f });
  }
  out.sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file));
  return out;
}

function renderGitFileTree(scopeRel, repoRootAbs, { maxDepth = 2, maxEntries = 200 } = {}) {
  const files = listGitFiles(repoRootAbs, scopeRel);
  const scope = scopeRel && scopeRel !== '.' ? scopeRel : '.';

  const dirs = new Set();
  const fileLines = [];

  for (const f of files) {
    const rel = scope === '.' ? f : path.posix.relative(scope, f);
    if (!rel || rel === '.') continue;
    const parts = rel.split('/').filter(Boolean);
    const dirDepth = Math.max(0, parts.length - 1);

    for (let d = 1; d <= Math.min(dirDepth, maxDepth); d++) {
      dirs.add(parts.slice(0, d).join('/') + '/');
    }
    if (dirDepth <= maxDepth) fileLines.push(rel);
  }

  const lines = [...dirs, ...fileLines]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const sliced = lines.slice(0, maxEntries);
  if (lines.length > maxEntries) sliced.push('... (truncated)');
  return sliced;
}

function updateLastUpdatedLine(markdown, newYmd) {
  const re = /^Last updated:\s*.*$/m;
  if (re.test(markdown)) return markdown.replace(re, `Last updated: ${newYmd}`);

  const lines = markdown.split(/\r?\n/);
  const h1Idx = lines.findIndex((l) => l.startsWith('# '));
  if (h1Idx !== -1) {
    lines.splice(h1Idx + 1, 0, '', `Last updated: ${newYmd}`);
    return lines.join('\n');
  }
  return `Last updated: ${newYmd}\n\n${markdown}`;
}

function replaceAutoBlock(markdown, newBlock) {
  const beginIdx = markdown.indexOf(BEGIN);
  const endIdx = markdown.indexOf(END);
  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    const before = markdown.slice(0, beginIdx).trimEnd();
    const after = markdown.slice(endIdx + END.length).trimStart();
    return `${before}\n\n${newBlock}\n\n${after}`.trimEnd() + '\n';
  }
  return markdown.trimEnd() + `\n\n${newBlock}\n`;
}

function fmtCodeBlock(lines) {
  return ['```text', ...lines, '```'].join('\n');
}

async function buildAutoSection({ analysisFileAbs, repoRootAbs, source }) {
  const scopeDirAbs = path.dirname(analysisFileAbs);
  const scopeRel = toPosix(path.relative(repoRootAbs, scopeDirAbs)) || '.';

  const nestRoutes = source === 'worktree'
    ? await detectNestRoutesFromWorktree(scopeDirAbs, repoRootAbs)
    : detectNestRoutesFromIndex(scopeRel, repoRootAbs);

  let nextPages = [];
  if (scopeRel === 'frontend') {
    const appRel = 'frontend/src/app';
    nextPages = source === 'worktree'
      ? await detectNextPagesFromWorktree(path.join(repoRootAbs, 'frontend', 'src', 'app'), repoRootAbs)
      : detectNextPagesFromIndex(appRel, repoRootAbs);
  } else if (scopeRel === 'frontend/src/app') {
    nextPages = source === 'worktree'
      ? await detectNextPagesFromWorktree(scopeDirAbs, repoRootAbs)
      : detectNextPagesFromIndex(scopeRel, repoRootAbs);
  }

  const treeDepth = scopeRel === '.' ? 2 : 3;
  const tree = renderGitFileTree(scopeRel, repoRootAbs, { maxDepth: treeDepth, maxEntries: 220 });

  const parts = [];
  parts.push('## Auto-Generated Snapshot');
  parts.push('');
  parts.push('This section is generated by `scripts/gen-analysis-md.mjs`. Manual edits inside this block will be overwritten.');
  parts.push('');
  parts.push('### Scope');
  parts.push(`- Directory: \`${scopeRel}\``);

  if (nestRoutes.length > 0) {
    parts.push('');
    parts.push('### Detected Routes (NestJS)');
    for (const r of nestRoutes) {
      parts.push(`- \`${r.method.padEnd(4)} ${r.path}\` (${r.file})`);
    }
  }

  if (nextPages.length > 0) {
    parts.push('');
    parts.push('### Detected Pages (Next.js App Router)');
    for (const p of nextPages) {
      parts.push(`- \`${p.route}\` (${p.file})`);
    }
  }

  parts.push('');
  parts.push(`### File Tree (depth <= ${treeDepth})`);
  parts.push(fmtCodeBlock(tree));

  const inner = parts.join('\n');
  return `${BEGIN}\n${inner}\n${END}`;
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const verbose = args.includes('--verbose');
  const source = args.includes('--worktree') ? 'worktree' : 'index';

  const __filename = fileURLToPath(import.meta.url);
  const repoRootAbs = path.resolve(path.dirname(__filename), '..');

  const analysisFiles = source === 'worktree'
    ? await findAnalysisFiles(repoRootAbs)
    : listGitAnalysisFiles(repoRootAbs).map((p) => path.join(repoRootAbs, ...p.split('/')));

  if (analysisFiles.length === 0) {
    if (verbose) console.log('No ANALYSIS.md files found.');
    process.exit(0);
  }

  const changed = [];

  for (const f of analysisFiles) {
    const oldMd = await fs.readFile(f, 'utf8');
    const newAuto = await buildAutoSection({ analysisFileAbs: f, repoRootAbs, source });
    const withAuto = replaceAutoBlock(oldMd, newAuto);

    if (withAuto !== oldMd) {
      const updated = updateLastUpdatedLine(withAuto, todayYmd());
      if (check) {
        changed.push(toPosix(path.relative(repoRootAbs, f)));
      } else {
        await fs.writeFile(f, updated, 'utf8');
        changed.push(toPosix(path.relative(repoRootAbs, f)));
      }
    }
  }

  if (check) {
    if (changed.length > 0) {
      console.error('ANALYSIS.md files are out of date:');
      for (const p of changed) console.error(`- ${p}`);
      console.error('');
      console.error('Run: node scripts/gen-analysis-md.mjs');
      process.exit(1);
    }
    if (verbose) console.log('ANALYSIS.md files are up to date.');
    process.exit(0);
  }

  if (changed.length > 0) {
    console.log('Updated ANALYSIS.md files:');
    for (const p of changed) console.log(`- ${p}`);
  } else if (verbose) {
    console.log('No ANALYSIS.md updates needed.');
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
