/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');
const path = require('path');

const pkg = require('./package.json');

function tryGit(repoRoot, args) {
  const safeDir = repoRoot.replace(/\\/g, '/');
  try {
    return execSync(`git -c safe.directory="${safeDir}" ${args}`, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return '';
  }
}

function computeAppVersion() {
  const repoRoot = path.resolve(__dirname, '..');
  const baseVersion = typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version.trim() : '0.0.0';

  const commitCountRaw = tryGit(repoRoot, 'rev-list --count HEAD');
  const commitCount = commitCountRaw && /^\d+$/.test(commitCountRaw) ? commitCountRaw : '0';
  const shortSha = tryGit(repoRoot, 'rev-parse --short HEAD') || 'nogit';
  const dirty = tryGit(repoRoot, 'status --porcelain') ? '-dirty' : '';

  const [major, minor] = baseVersion.split('.');
  if (major && minor) {
    return `v${major}.${minor}.${commitCount}${dirty}`;
  }

  return `v${baseVersion}+${commitCount}.${shortSha}${dirty}`;
}

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: computeAppVersion(),
  },
};
module.exports = nextConfig;
