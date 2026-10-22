'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = require('../extension/manifest.json'), version = manifest.version;
if (require('../package.json').version !== version) throw Error('Package and manifest versions differ.');
const base = path.join(root, 'artifacts');
const names = {source: `YouTube-Dual-Subtitles-${version}-candidate-source`, extension: `YouTube-Dual-Subtitles-${version}-candidate-extension`};
const targets = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, path.join(base, name)]));
if (Object.values(targets).some(dir => fs.existsSync(dir))) throw Error('Candidate staging already exists; inspect it before choosing a new output directory.');
function walk(relative) {
  return fs.readdirSync(path.join(root, relative), {withFileTypes: true}).flatMap(entry => {
    if (entry.isSymbolicLink()) throw Error('Symlinks are not packaged: ' + relative + '/' + entry.name);
    const file = relative + '/' + entry.name;
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const sources = [
  'package.json', 'README.md', 'README.zh-CN.md', 'CHANGELOG.md', 'CHANGELOG.zh-CN.md',
  'RELEASE_NOTES.md', 'RELEASE_NOTES.zh-CN.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', '.gitignore',
  ...walk('extension'), ...walk('docs').filter(file => file.endsWith('.md') && !file.endsWith('/ROUTING.md')),
  ...walk('tests').filter(file => /(?:\.test\.cjs|\/fixture\.html|\/dictionary(?:-bilingual|-language)?-live\.cjs)$/.test(file)),
  'scripts/build-candidate.cjs', 'scripts/build-release.cjs', 'evidence/validation-summary.json'
].sort();
const forbidden = [/C:[\\/]Users[\\/]/i, /(?:file_|libfile_)[a-f0-9]{24,}/i, /(?:ghp_|github_pat_)[A-Za-z0-9_]{12,}/, /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/];
for (const file of sources) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (forbidden.some(rule => rule.test(text))) throw Error('Private-path or credential check rejected ' + file);
}
const extensionFiles = sources.filter(file => file.startsWith('extension/') ||
  ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'README.zh-CN.md', 'CHANGELOG.md', 'CHANGELOG.zh-CN.md', 'RELEASE_NOTES.md', 'RELEASE_NOTES.zh-CN.md'].includes(file) || file.startsWith('docs/'));
for (const [kind, files] of [['source', sources], ['extension', extensionFiles]]) {
  const records = [];
  for (const file of files) {
    const destination = path.join(targets[kind], file), bytes = fs.readFileSync(path.join(root, file));
    fs.mkdirSync(path.dirname(destination), {recursive: true}); fs.writeFileSync(destination, bytes, {flag: 'wx'});
    records.push({file, sha256: crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  fs.writeFileSync(path.join(targets[kind], 'FILES.sha256.json'), JSON.stringify(records, null, 2) + '\n', {flag: 'wx'});
}
console.log(JSON.stringify({version, status: 'experimental pre-release candidate; packaging does not install or publish', ...targets, privacyScan: 'PASS', screenshotsIncluded: false, userDataIncluded: false}));
