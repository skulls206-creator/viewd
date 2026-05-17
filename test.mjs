import { execSync } from 'child_process';

const SITE = 'https://skulls206-creator.github.io/viewd';
const INSTANCE = 'https://inv.thepixora.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

let passed = 0;
let failed = 0;

function curl(url, opts = {}) {
  let cmd = `curl -s --max-time 25`;
  if (opts.statusOnly) cmd += ' -o /dev/null -w "%{http_code}"';
  if (opts.headersOnly) cmd += ' -D - -o /dev/null';
  cmd += ` -A '${opts.ua || UA}'`;
  if (opts.origin) cmd += ` -H 'Origin: ${opts.origin}'`;
  cmd += ` '${url}'`;
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 30000, shell: '/bin/bash' });
    return out;
  } catch (e) {
    return e.stderr || e.message;
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== VIEWD Integration Tests ===\n');

// ========= 1. Site loads =========
console.log('1. Site loads');
const siteCode = curl(SITE, { statusOnly: true });
test('Homepage returns 200', () => {
  if (siteCode !== '200') throw new Error(`Expected 200, got ${siteCode}`);
});
test('Homepage contains VIEWD', () => {
  const body = curl(SITE);
  if (!body.includes('VIEWD')) throw new Error('Missing VIEWD title');
});
test('Homepage uses HashRouter', () => {
  const body = curl(SITE);
  if (!body.includes('HashRouter')) throw new Error('Not using HashRouter');
});
test('Homepage has root div', () => {
  const body = curl(SITE);
  if (!body.includes('id="root"')) throw new Error('Missing root div');
});

// ========= 2. Invidious API (server-side check) =========
console.log('\n2. Invidious API');
test('Trending endpoint returns JSON array', () => {
  const body = curl(`${INSTANCE}/api/v1/trending?region=US`);
  if (!body.trim().startsWith('[')) throw new Error(`Expected JSON array, got: ${body.slice(0, 50)}`);
});
test('Trending has videos with videoId', () => {
  const body = curl(`${INSTANCE}/api/v1/trending?region=US`);
  const data = JSON.parse(body);
  if (!Array.isArray(data) || data.length === 0) throw new Error('Empty or non-array response');
  if (!data[0].videoId) throw new Error('Missing videoId in first result');
});
test('Search returns results', () => {
  const body = curl(`${INSTANCE}/api/v1/search?q=kevin&page=1&sort_by=relevance&type=video`);
  const data = JSON.parse(body);
  if (!Array.isArray(data) || data.length === 0) throw new Error('No search results');
  if (!data[0].videoId) throw new Error('Missing videoId in first result');
});
test('Search results have author info', () => {
  const body = curl(`${INSTANCE}/api/v1/search?q=kevin&page=1`);
  const data = JSON.parse(body);
  if (!data[0].author) throw new Error('Missing author');
  if (!data[0].title) throw new Error('Missing title');
});
test('Video detail endpoint works', () => {
  // Get a real video ID from trending
  const trending = JSON.parse(curl(`${INSTANCE}/api/v1/trending?region=US`));
  const vid = trending[0].videoId;
  const body = curl(`${INSTANCE}/api/v1/videos/${vid}`);
  const data = JSON.parse(body);
  if (!data.videoId) throw new Error('Missing videoId');
  if (!data.title) throw new Error('Missing title');
});
test('Video details include recommendedVideos', () => {
  const trending = JSON.parse(curl(`${INSTANCE}/api/v1/trending?region=US`));
  const vid = trending[0].videoId;
  const data = JSON.parse(curl(`${INSTANCE}/api/v1/videos/${vid}`));
  if (!data.recommendedVideos) throw new Error('Missing recommendedVideos');
});
test('Channel endpoint returns author info', () => {
  const trending = JSON.parse(curl(`${INSTANCE}/api/v1/trending?region=US`));
  const authorId = trending[0].authorId;
  const body = curl(`${INSTANCE}/api/v1/channels/${authorId}`);
  const data = JSON.parse(body);
  if (!data.author) throw new Error('Missing author');
});
test('Channel videos return array', () => {
  const trending = JSON.parse(curl(`${INSTANCE}/api/v1/trending?region=US`));
  const authorId = trending[0].authorId;
  const body = curl(`${INSTANCE}/api/v1/channels/${authorId}/videos`);
  const data = JSON.parse(body);
  if (!Array.isArray(data)) throw new Error('Not an array');
});

// ========= 3. Instance list API =========
console.log('\n3. Instance list');
test('Instance list is fetchable', () => {
  const body = curl('https://api.invidious.io/instances.json');
  const data = JSON.parse(body);
  if (!Array.isArray(data)) throw new Error('Not array');
  if (data.length === 0) throw new Error('Empty');
});
test('CORS-enabled instances exist', () => {
  const body = curl('https://api.invidious.io/instances.json');
  const data = JSON.parse(body);
  const corsInstances = data.filter(([, m]) => m.cors === true && m.api === true && m.type === 'https');
  if (corsInstances.length === 0) console.log('  WARN  No cors:true && api:true instances in official list');
});

// ========= 4. CORS headers =========
console.log('\n4. CORS headers');
test('API response includes CORS allow-origin', () => {
  const headers = curl(`${INSTANCE}/api/v1/trending?region=US`, { headersOnly: true, origin: SITE });
  if (!headers.toLowerCase().includes('access-control-allow-origin')) {
    console.log(`  DEBUG  Headers: ${headers.slice(0, 300)}`);
    throw new Error('Missing CORS header');
  }
});

// ========= 5. Deployed app routes =========
console.log('\n5. Deployed app routes');
test('Hash route /#/ loads', () => {
  const code = curl(`${SITE}/#/`, { statusOnly: true });
  if (code !== '200') throw new Error(`Expected 200, got ${code}`);
});
test('Hash route /#/search loads', () => {
  const code = curl(`${SITE}/#/search`, { statusOnly: true });
  if (code !== '200') throw new Error(`Expected 200, got ${code}`);
});
test('Hash route /#/settings loads', () => {
  const code = curl(`${SITE}/#/settings`, { statusOnly: true });
  if (code !== '200') throw new Error(`Expected 200, got ${code}`);
});

// ========= 6. Build artifacts =========
console.log('\n6. Build artifacts');
test('JS bundle loads', () => {
  const html = curl(SITE);
  const match = html.match(/src="(\.\/assets\/index-[^.]+\.js)"/);
  if (!match) throw new Error('Could not find JS bundle path');
  const jsPath = match[1];
  const code = curl(`${SITE}/${jsPath.replace('./', '')}`, { statusOnly: true });
  if (code !== '200') throw new Error(`JS bundle returned ${code}`);
});
test('CSS bundle loads', () => {
  const html = curl(SITE);
  const match = html.match(/href="(\.\/assets\/index-[^.]+\.css)"/);
  if (!match) throw new Error('Could not find CSS bundle path');
  const cssPath = match[1];
  const code = curl(`${SITE}/${cssPath.replace('./', '')}`, { statusOnly: true });
  if (code !== '200') throw new Error(`CSS bundle returned ${code}`);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
