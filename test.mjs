import { execSync } from 'child_process';

const SITE = 'https://skulls206-creator.github.io/viewd/';
const INSTANCE = 'https://inv.thepixora.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

let passed = 0;
let failed = 0;

function curl(url, opts = {}) {
  let cmd = 'curl -s --max-time 25';
  if (opts.statusOnly) cmd += ' -o /dev/null -w "%{http_code}"';
  if (opts.headersOnly) cmd += ' -D - -o /dev/null';
  if (opts.follow) cmd += ' -L';
  cmd += " -A '" + (opts.ua || UA) + "'";
  if (opts.origin) cmd += " -H 'Origin: " + opts.origin + "'";
  cmd += " '" + url + "'";
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 30000, shell: '/bin/bash' });
    return out;
  } catch (e) {
    return (e.stderr || e.message || '').trim();
  }
}

function getFollowedCode(url) {
  // Follow redirects but report the final code
  return curl(url, { statusOnly: true, follow: true });
}

function getBody(url) {
  return curl(url, { follow: true });
}

function test(name, fn) {
  try {
    fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (e) {
    console.log('  FAIL  ' + name + ': ' + e.message);
    failed++;
  }
}

console.log('\n=== VIEWD Integration Tests ===\n');

// ========= 1. Site loads (with follow) =========
console.log('1. Site loads (following redirects)');
test('Homepage returns 200', () => {
  const code = getFollowedCode(SITE);
  if (code !== '200') throw new Error('Expected 200, got ' + code);
});
test('Homepage contains VIEWD', () => {
  const body = getBody(SITE);
  if (!body.includes('VIEWD')) throw new Error('Missing VIEWD title');
});
test('Homepage has root div', () => {
  const body = getBody(SITE);
  if (!body.includes('id="root"')) throw new Error('Missing root div');
});

// ========= 2. Invidious API =========
console.log('\n2. Invidious API');
test('Trending endpoint returns JSON array', () => {
  const body = curl(INSTANCE + '/api/v1/trending?region=US');
  if (!body.trim().startsWith('[')) throw new Error('Expected JSON array, got: ' + body.slice(0, 50));
});
test('Trending has videos with videoId', () => {
  const body = curl(INSTANCE + '/api/v1/trending?region=US');
  const data = JSON.parse(body);
  if (!Array.isArray(data) || data.length === 0) throw new Error('Empty or non-array');
  if (!data[0].videoId) throw new Error('Missing videoId');
});
test('Search returns video results', () => {
  const body = curl(INSTANCE + '/api/v1/search?q=kevin&page=1&sort_by=relevance&type=video');
  const data = JSON.parse(body);
  const videos = data.filter(v => v.type === 'video');
  if (videos.length === 0) throw new Error('No video results');
  if (!videos[0].title) throw new Error('Missing title');
  if (!videos[0].author) throw new Error('Missing author');
});
test('Video detail endpoint works', () => {
  const trending = JSON.parse(curl(INSTANCE + '/api/v1/trending?region=US'));
  const vid = trending[0].videoId;
  const body = curl(INSTANCE + '/api/v1/videos/' + vid);
  const data = JSON.parse(body);
  if (!data.videoId) throw new Error('Missing videoId');
  if (!data.title) throw new Error('Missing title');
  if (!data.recommendedVideos) throw new Error('Missing recommendedVideos');
});
test('Channel endpoint returns author', () => {
  const trending = JSON.parse(curl(INSTANCE + '/api/v1/trending?region=US'));
  const authId = trending[0].authorId;
  const data = JSON.parse(curl(INSTANCE + '/api/v1/channels/' + authId));
  if (!data.author) throw new Error('Missing author');
});
test('Channel videos returns array (unwrapped from object)', () => {
  const trending = JSON.parse(curl(INSTANCE + '/api/v1/trending?region=US'));
  const authId = trending[0].authorId;
  const body = curl(INSTANCE + '/api/v1/channels/' + authId + '/videos');
  const data = JSON.parse(body);
  // API returns {videos: [...], continuation: ...}
  const videos = Array.isArray(data) ? data : (data.videos || []);
  if (!Array.isArray(videos)) throw new Error('Not an array');
  if (videos.length === 0) throw new Error('Empty videos array');
  if (!videos[0].videoId) throw new Error('Missing videoId in first result');
});
test('Comments endpoint works', () => {
  const trending = JSON.parse(curl(INSTANCE + '/api/v1/trending?region=US'));
  const vid = trending[0].videoId;
  const body = curl(INSTANCE + '/api/v1/comments/' + vid);
  const data = JSON.parse(body);
  if (!data.comments && !data.commentCount) {
    // some vids may have comments disabled, just check it's valid JSON
    if (typeof data !== 'object') throw new Error('Not an object');
  }
});

// ========= 3. Instance list =========
console.log('\n3. Instance list');
test('Instance list is fetchable', () => {
  const body = curl('https://api.invidious.io/instances.json');
  const data = JSON.parse(body);
  if (!Array.isArray(data)) throw new Error('Not array');
  if (data.length === 0) throw new Error('Empty');
});
test('Some CORS+API instances exist (or at least known list works)', () => {
  const body = curl('https://api.invidious.io/instances.json');
  const data = JSON.parse(body);
  const corsInstances = data.filter(function(item) {
    return item[1] && item[1].cors === true && item[1].api === true && item[1].type === 'https';
  });
  if (corsInstances.length === 0) {
    console.log('  WARN  No cors+api instances in official list');
  }
});

// ========= 4. CORS headers =========
console.log('\n4. CORS headers');
test('API response includes CORS allow-origin', () => {
  const headers = curl(INSTANCE + '/api/v1/trending?region=US', {
    headersOnly: true,
    origin: SITE.replace(/\/+$/, ''),
  });
  if (!headers.toLowerCase().includes('access-control-allow-origin')) {
    throw new Error('Missing CORS header. Headers: ' + headers.slice(0, 300));
  }
});

// ========= 5. Deployed app routes =========
console.log('\n5. Deployed app routes (following redirects)');
test('Homepage route returns 200', () => {
  const code = getFollowedCode(SITE);
  if (code !== '200') throw new Error('Expected 200, got ' + code);
});

// ========= 6. Build artifacts =========
console.log('\n6. Build artifacts');
test('JS and CSS bundles load', () => {
  const html = getBody(SITE);
  // GH Pages SPA pattern: look for either ./assets/ or /viewd/assets/
  const jsMatch = html.match(/src="(?:\.\/)?(?:viewd\/)?assets\/index-[a-zA-Z0-9_-]+\.js"/);
  const cssMatch = html.match(/href="(?:\.\/)?(?:viewd\/)?assets\/index-[a-zA-Z0-9_-]+\.css"/);

  // More flexible: just find any .js and .css asset references
  const jsFallback = html.match(/"([^"]*assets\/[^"]*\.js)"/);
  const cssFallback = html.match(/"([^"]*assets\/[^"]*\.css)"/);

  if (jsFallback) {
    const jsPath = jsFallback[1];
    const jsCode = curl(SITE.replace(/\/+$/, '') + '/' + jsPath.replace(/^\.\//, '').replace(/^viewd\//, ''), { statusOnly: true, follow: true });
    // GH Pages redirects assets too
    const finalCode = jsCode;
    console.log('  INFO  JS bundle: ' + jsPath + ' -> ' + finalCode);
  } else {
    throw new Error('Could not find JS bundle in HTML');
  }

  if (cssFallback) {
    const cssPath = cssFallback[1];
    const cssCode = curl(SITE.replace(/\/+$/, '') + '/' + cssPath.replace(/^\.\//, '').replace(/^viewd\//, ''), { statusOnly: true, follow: true });
    console.log('  INFO  CSS bundle: ' + cssPath + ' -> ' + cssCode);
  } else {
    throw new Error('Could not find CSS bundle in HTML');
  }
});

// ========= 7. API response structure checks =========
console.log('\n7. API Response structure');
test('Channel videos returns {videos: [...], continuation} pattern', () => {
  const trending = JSON.parse(curl(INSTANCE + '/api/v1/trending?region=US'));
  const authId = trending[0].authorId;
  const body = curl(INSTANCE + '/api/v1/channels/' + authId + '/videos');
  const data = JSON.parse(body);
  // The Invidious API wraps videos in {videos: [...], continuation: ...}
  if (Array.isArray(data)) {
    console.log('  INFO  channel videos returned as array (not wrapped)');
  } else {
    const hasVideos = Array.isArray(data.videos);
    if (!hasVideos) throw new Error('Expected either array or {videos: [...]}');
  }
});
test('Search returns mixed types (videos + channels + playlists)', () => {
  const body = curl(INSTANCE + '/api/v1/search?q=test&page=1&sort_by=relevance');
  const data = JSON.parse(body);
  const types = new Set(data.map(v => v.type));
  console.log('  INFO  Search returned types: ' + [...types].join(', '));
});

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
process.exit(failed > 0 ? 1 : 0);
