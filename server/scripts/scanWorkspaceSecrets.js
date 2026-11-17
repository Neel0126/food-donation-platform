const fs = require('fs');
const path = require('path');

const patterns = [
  { name: 'MongoDB Connection String with Password', regex: /mongodb(\+srv)?:\/\/[^:\s'"]+:[^@\s'"]+@[^/\s'"]+/i },
  { name: 'AWS / Cloudinary / Generic API Key / Secret', regex: /(?:api_secret|cloudinary_api_secret|aws_secret|secret_key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i },
  { name: 'Hardcoded JWT Secret', regex: /jwt_secret\s*[:=]\s*['"][a-zA-Z0-9_\-]{6,}['"]/i },
  { name: 'Private Key block', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ },
  { name: 'Resend API Key', regex: /re_[a-zA-Z0-9]{20,}/ },
  { name: 'Google OAuth Client Secret', regex: /GOCSPX-[a-zA-Z0-9_\-]{20,}/ },
  { name: 'Google OAuth Refresh Token', regex: /1\/\/[a-zA-Z0-9_\-]{30,}/ }
];

const ignoredDirs = new Set(['node_modules', '.git', 'dist', '.agents']);

function scanDir(dir, findings) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, findings);
    } else if (entry.isFile()) {
      // Skip binary files and package-lock.json
      if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg') || entry.name.endsWith('.lock') || entry.name === 'package-lock.json') continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      patterns.forEach(p => {
        if (p.regex.test(content)) {
          findings.push({ file: fullPath, pattern: p.name });
        }
      });
    }
  }
}

const findings = [];
scanDir(process.cwd(), findings);

console.log('=== WORKSPACE HARDCODED SECRET SCAN RESULTS ===');
console.log(`Scanned directory: ${process.cwd()}`);
console.log(`Findings count: ${findings.length}`);
findings.forEach(f => {
  // Redact actual file path slightly for neatness
  const relPath = path.relative(process.cwd(), f.file);
  console.log(`[FOUND] ${f.pattern} in: ${relPath}`);
});
