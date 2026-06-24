import fs from 'fs';
import https from 'https';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
});

const url = new URL(env.VITE_SUPABASE_URL + '/rest/v1/profiles?select=id,email,is_admin&is_admin=eq.true');

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'apikey': env.VITE_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + env.VITE_SUPABASE_ANON_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const profiles = JSON.parse(data);
      console.log('--- ADMIN USERS ---');
      profiles.forEach(p => console.log(`- ${p.email}`));
    } catch (e) {
      console.error('Error parsing response:', data);
    }
  });
});

req.on('error', (e) => console.error(e));
req.end();
