
const http = require('http');

const baseURL = 'http://localhost:3002';

const pagesToTest = [
    '/',
    '/login',
    '/register',
    '/dashboard', // Likely protected -> expect redirect or 401/403 or HTML with auth prompt
    '/api/health', // Speculative
    '/api/auth/session' // Speculative standard Supabase/NextAuth route
];

async function checkUrl(path) {
    return new Promise((resolve) => {
        const req = http.get(`${baseURL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    path,
                    status: res.statusCode,
                    contentType: res.headers['content-type'],
                    size: data.length
                });
            });
        });

        req.on('error', (e) => {
            resolve({
                path,
                error: e.message
            });
        });
    });
}

async function run() {
    console.log(`Starting Page Verification on ${baseURL}...`);

    for (const page of pagesToTest) {
        const result = await checkUrl(page);
        if (result.error) {
            console.log(`❌ ${page}: FAILED (${result.error})`);
        } else {
            let statusIcon = '✅';
            if (result.status >= 400 && result.status < 500) statusIcon = '⚠️ '; // Client error (expected for protected or 404)
            if (result.status >= 500) statusIcon = '❌'; // Server error

            console.log(`${statusIcon} ${page}: Status ${result.status} (Type: ${result.contentType}, Size: ${result.size}b)`);

            if (result.status === 404) {
                console.log(`   -> Page not found.`);
            } else if (result.status === 200) {
                console.log(`   -> OK.`);
            } else if (result.status >= 300 && result.status < 400) {
                console.log(`   -> Redirect.`);
            }
        }
    }
}

run();
