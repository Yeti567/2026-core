/**
 * VAPID Key Generator for Push Notifications
 * 
 * Run once to generate keys, then add to .env.local
 * 
 * Usage: node scripts/generate-vapid-keys.js
 */

const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           VAPID Keys Generated Successfully!                    ║');
console.log('╠════════════════════════════════════════════════════════════════╣');
console.log('║  Add these to your .env.local file:                            ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:admin@corpathways.com`);
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log('⚠️  IMPORTANT: Keep VAPID_PRIVATE_KEY secret! Never commit to git.');
console.log('');
