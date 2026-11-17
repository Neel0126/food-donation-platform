const { execSync } = require('child_process');

const patterns = [
  { name: 'MongoDB URI with password', regex: /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@/i },
  { name: 'JWT Secret assignment', regex: /JWT_SECRET\s*=\s*[^\s\r\n]+/i },
  { name: 'Cloudinary Secret assignment', regex: /CLOUDINARY_API_SECRET\s*=\s*[^\s\r\n]+/i },
  { name: 'Gmail Refresh Token', regex: /GMAIL_REFRESH_TOKEN\s*=\s*[^\s\r\n]+/i },
  { name: 'Resend API Key', regex: /RESEND_API_KEY\s*=\s*re_[^\s\r\n]+/i },
  { name: 'Google Client Secret', regex: /GMAIL_CLIENT_SECRET\s*=\s*[^\s\r\n]+/i }
];

try {
  const logDiff = execSync('git log -p', { maxBuffer: 50 * 1024 * 1024 }).toString();
  const commits = logDiff.split(/^commit\s+/m);
  console.log(`Scanned ${commits.length} commits in Git history.`);
  
  let foundAny = false;
  for (const commit of commits) {
    if (!commit.trim()) continue;
    const lines = commit.split('\n');
    const commitHash = lines[0].split(' ')[0].slice(0, 10);
    const dateLine = lines.find(l => l.startsWith('Date:')) || '';
    const subjectLine = lines.find((l, idx) => idx > 3 && l.trim().length > 0) || '';
    
    for (const pat of patterns) {
      if (pat.regex.test(commit)) {
        foundAny = true;
        console.log(`[ALERT] Matched '${pat.name}' in commit ${commitHash} | ${dateLine.trim()} | Subject: ${subjectLine.trim()}`);
      }
    }
  }

  if (!foundAny) {
    console.log('✅ No credentials found in git diffs.');
  }
} catch (err) {
  console.error('Scan error:', err.message);
}
