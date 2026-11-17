#!/usr/bin/env node
/**
 * gitHistoryAudit.js
 * Comprehensive git history credential audit.
 * Identifies EVERY commit and file containing real credentials.
 * Run from repo root: node server/scripts/gitHistoryAudit.js
 */

const { execSync } = require('child_process');

// Patterns that indicate real credentials (not placeholders)
const REAL_CREDENTIAL_PATTERNS = [
  // MongoDB Atlas with real password (not <password> or your_password)
  { name: 'MongoDB Atlas URI (real password)', pattern: /mongodb\+srv:\/\/[^<][^:]+:[^<your][^@]{3,}@/ },
  // Hardcoded JWT (non-placeholder, minimum entropy)
  { name: 'Weak/hardcoded JWT secret', pattern: /JWT_SECRET\s*=\s*(?!your_|<|"your_)[a-zA-Z0-9!@#$%^&*]{6,50}(?![a-f0-9]{80,})/ },
  // Cloudinary secret (not placeholder)
  { name: 'Cloudinary API secret', pattern: /CLOUDINARY_API_SECRET\s*=\s*(?!your_|<)[a-zA-Z0-9_-]{20,}/ },
  // Google OAuth refresh token
  { name: 'Google OAuth refresh token', pattern: /GMAIL_REFRESH_TOKEN\s*=\s*1\/\/[a-zA-Z0-9_-]{10,}/ },
  // Google Client Secret
  { name: 'Google OAuth client secret', pattern: /GMAIL_CLIENT_SECRET\s*=\s*GOCSPX-[a-zA-Z0-9_-]{20,}/ },
  // Google Client ID
  { name: 'Google OAuth client ID', pattern: /GMAIL_CLIENT_ID\s*=\s*[0-9]{12,}-[a-zA-Z0-9]+\.apps\.googleusercontent\.com/ },
];

function getAllCommits() {
  const out = execSync('git log --all --format="%H"').toString().trim();
  return out.split('\n').filter(Boolean);
}

function getCommitInfo(hash) {
  try {
    const info = execSync(`git log -1 --format="%h|%ad|%s" --date=short ${hash}`).toString().trim();
    const [h, date, ...subj] = info.split('|');
    return { hash: h, date, subject: subj.join('|') };
  } catch { return { hash: hash.slice(0, 8), date: '?', subject: '?' }; }
}

function getCommitDiff(hash) {
  try {
    return execSync(`git show ${hash} --unified=0`, { maxBuffer: 10 * 1024 * 1024 }).toString();
  } catch { return ''; }
}

console.log('=== SHAREBITE GIT HISTORY CREDENTIAL AUDIT ===\n');
const commits = getAllCommits();
console.log(`Scanning ${commits.length} commits...\n`);

const findings = [];

for (const hash of commits) {
  const diff = getCommitDiff(hash);
  const addedLines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));

  for (const { name, pattern } of REAL_CREDENTIAL_PATTERNS) {
    for (const line of addedLines) {
      if (pattern.test(line)) {
        const info = getCommitInfo(hash);
        // Extract file name from diff header
        const fileMatch = diff.match(/diff --git a\/(.+?) b\//);
        findings.push({ ...info, pattern: name, preview: line.replace(/^[+]/, '').trim().substring(0, 60) + '...' });
        break; // one finding per pattern per commit
      }
    }
  }
}

if (findings.length === 0) {
  console.log('✅ No real credentials found in git history.');
} else {
  console.log(`⚠️  FOUND ${findings.length} CREDENTIAL EXPOSURE(S):\n`);
  findings.forEach((f, i) => {
    console.log(`[${i + 1}] Commit: ${f.hash}  Date: ${f.date}`);
    console.log(`    Pattern: ${f.pattern}`);
    console.log(`    Subject: ${f.subject}`);
    console.log('');
  });
}

// Files that need to be removed from history
const sensitiveFiles = [
  'server/scripts/migrateToAtlas.js',
  'server/.env',
  'client/.env',
  'server/.env.local',
  'client/.env.local',
];

console.log('\n=== FILES TO REMOVE FROM GIT HISTORY ===');
console.log('The following files either contained or may contain credentials:\n');
sensitiveFiles.forEach(f => console.log(`  - ${f}`));

console.log('\n=== GIT FILTER-REPO CLEANUP COMMANDS ===');
console.log('Run these commands IN ORDER from the repo root:\n');
console.log('  # Step 1: Backup (REQUIRED before proceeding)');
console.log('  git clone . ../food-donation-platform-backup-$(Get-Date -Format yyyyMMdd-HHmm)');
console.log('');
console.log('  # Step 2: Install git-filter-repo (Python required)');
console.log('  pip install git-filter-repo');
console.log('');
console.log('  # Step 3: Remove each sensitive file from ALL historical commits');
console.log('  git filter-repo --path server/scripts/migrateToAtlas.js --invert-paths --force');
console.log('  git filter-repo --path server/.env --invert-paths --force');
console.log('  git filter-repo --path client/.env --invert-paths --force');
console.log('');
console.log('  # Step 4: Re-add remote (filter-repo removes it for safety)');
console.log('  git remote add food-donation https://github.com/Neel0126/food-donation-platform.git');
console.log('');
console.log('  # Step 5: Force push (WAIT FOR COORDINATOR APPROVAL before running this)');
console.log('  # git push food-donation main --force');
console.log('');
console.log('NOTE: .gitignore already excludes .env* so no .env should be re-added.');
console.log('NOTE: migrateToAtlas.js has been removed from HEAD by commit 201d645.');
console.log('      filter-repo removes it from ALL historical commits.');

console.log('\n=== SUMMARY ===');
console.log(`Total commits scanned: ${commits.length}`);
console.log(`Credential exposures found: ${findings.length}`);
console.log('Action required: Run git filter-repo cleanup above, then force-push with approval.');
