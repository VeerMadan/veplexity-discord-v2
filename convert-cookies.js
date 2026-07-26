import fs from 'fs';

const raw = fs.readFileSync('./cookies.txt', 'utf-8');
const lines = raw.split('\n').filter(l => l.trim() && !l.startsWith('#'));

const pairs = lines.map(line => {
    const cols = line.split('\t');
    if (cols.length < 7) return null;
    const domain = cols[0];
    if (!domain.includes('youtube.com') && !domain.includes('google.com')) return null;
    const name = cols[5];
    const value = cols[6];
    return `${name}=${value}`;
}).filter(Boolean);

fs.writeFileSync('./cookie-string.txt', pairs.join('; '));
console.log(`✅ Converted ${pairs.length} cookies → cookie-string.txt`);