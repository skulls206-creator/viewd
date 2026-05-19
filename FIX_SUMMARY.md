# Fix Summary — viewd

## CSP Added
- Added `Content-Security-Policy` meta tag to `index.html`
- Restricts scripts to same-origin only, styles to same-origin (+ inline for Tailwind), media/connect-src to HTTPS

## Resource Security  
- Moved favicon from inline data URI to `/public/favicon.svg`
- Moved manifest from inline base64 to `/public/manifest.json`  
- This reduces inline injection surface and improves maintainability

## .gitignore already existed — no changes needed
