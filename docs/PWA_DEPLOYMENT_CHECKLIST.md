# PWA Deployment Checklist

## Pre-Deployment

### Icons & Assets
- [ ] All PWA icons generated (72x72 to 512x512)
- [ ] All iOS Apple Touch icons generated (57x57 to 180x180)
- [ ] iOS splash screens generated for all device sizes
- [ ] Favicon.ico present
- [ ] OG image for social sharing
- [ ] Screenshots for app store (if applicable)

### Configuration
- [ ] `manifest.json` configured correctly
  - [ ] Name and short_name set
  - [ ] Theme and background colors match brand
  - [ ] Start URL points to correct route
  - [ ] Display mode set to `standalone`
  - [ ] All icons referenced with correct paths
  - [ ] Shortcuts configured (optional)
- [ ] `next.config.js` has PWA configuration
- [ ] Service worker registered properly
- [ ] Push notification VAPID keys set in `.env`
- [ ] All meta tags in layout.tsx

### iOS Specific
- [ ] `apple-mobile-web-app-capable` meta tag
- [ ] `apple-mobile-web-app-status-bar-style` meta tag
- [ ] `apple-mobile-web-app-title` meta tag
- [ ] All apple-touch-icon links
- [ ] All apple-touch-startup-image links
- [ ] Viewport meta tag with `viewport-fit=cover`
- [ ] iOS install prompt component

### Android Specific
- [ ] `mobile-web-app-capable` meta tag
- [ ] Theme color meta tag
- [ ] Maskable icons in manifest
- [ ] Install prompt component

---

## Testing

### Cross-Browser Testing
- [ ] Chrome (Desktop)
- [ ] Chrome (Android)
- [ ] Firefox (Desktop)
- [ ] Firefox (Android)
- [ ] Safari (Desktop)
- [ ] Safari (iOS)
- [ ] Edge (Desktop)
- [ ] Samsung Internet (Android)

### Installation Testing
- [ ] Install from Chrome (Android) - A2HS prompt
- [ ] Install from Safari (iOS) - Share > Add to Home Screen
- [ ] Install from Chrome (Desktop) - Install button
- [ ] Verify app icon appears correctly on home screen
- [ ] Verify splash screen displays on iOS
- [ ] Verify app opens in standalone mode

### Offline Functionality
- [ ] App loads when offline (cached shell)
- [ ] Offline indicator appears
- [ ] Critical assets cached (HTML, CSS, JS)
- [ ] API responses handled gracefully when offline
- [ ] Data syncs when back online
- [ ] Offline fallback page displays for uncached routes

### Push Notifications
- [ ] Permission prompt displays correctly
- [ ] Notifications received when app is open
- [ ] Notifications received when app is closed
- [ ] Notification click opens correct route
- [ ] Badge count updates (if implemented)
- [ ] Test on multiple devices

### Device Features
- [ ] Camera access (if applicable)
- [ ] GPS location (if applicable)
- [ ] File uploads work on mobile
- [ ] Background sync functions
- [ ] Share API works (if implemented)

---

## Performance

### Lighthouse Audit
- [ ] PWA score > 90
- [ ] Performance score > 80
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90

### Core Web Vitals
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1

### Optimization
- [ ] Images optimized and properly sized
- [ ] Code splitting enabled
- [ ] Lazy loading implemented for below-fold content
- [ ] Service worker caching strategies configured
- [ ] API responses cached appropriately
- [ ] Bundle size analyzed and optimized

---

## Launch

### Deployment
- [ ] Deploy to production (Vercel)
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Custom domain configured (if applicable)
- [ ] DNS records updated
- [ ] SSL certificate valid

### Verification
- [ ] Test production PWA install
- [ ] Verify service worker registered in production
- [ ] Test push notifications in production
- [ ] Verify all icons load from correct paths
- [ ] Test offline functionality in production

### Monitoring
- [ ] Analytics tracking PWA installs
- [ ] Error monitoring configured (Sentry, etc.)
- [ ] Performance monitoring enabled
- [ ] Service worker update notifications

---

## Post-Launch

### User Feedback
- [ ] Gather feedback on install process
- [ ] Monitor for offline-related issues
- [ ] Track push notification engagement
- [ ] Identify UX pain points on mobile

### Metrics to Track
- [ ] PWA install rate
- [ ] Return user engagement
- [ ] Notification opt-in rate
- [ ] Notification click-through rate
- [ ] Offline usage patterns
- [ ] Session duration (PWA vs browser)

### Maintenance
- [ ] Update service worker cache version with deploys
- [ ] Test new features in PWA mode
- [ ] Keep icons and splash screens updated
- [ ] Monitor service worker size and performance
- [ ] Review and update caching strategies

---

## Commands Reference

```bash
# Generate iOS assets
npx tsx scripts/generate-ios-assets.ts

# Generate PWA icons (if separate script exists)
npm run pwa:icons

# Generate VAPID keys for push notifications
node scripts/generate-vapid-keys.js

# Build production
npm run build

# Test locally with HTTPS (ngrok)
npx ngrok http 3000

# Start production server
npm run start

# Deploy to Vercel
vercel --prod
```

---

## Lighthouse PWA Requirements

To achieve 100% PWA score in Lighthouse:

1. ✅ Has a valid manifest
2. ✅ Registers a service worker
3. ✅ Responds with 200 when offline
4. ✅ User can be prompted to install
5. ✅ Configured for custom splash screen
6. ✅ Sets theme color
7. ✅ Content is sized correctly for viewport
8. ✅ Provides valid apple-touch-icon
9. ✅ Maskable icon is provided

---

## Troubleshooting

### Common Issues

**PWA not installable:**
- Ensure HTTPS is enabled
- Check manifest.json is valid JSON
- Verify start_url is accessible
- Confirm service worker is registered

**iOS splash screen not showing:**
- Verify media queries match device exactly
- Check image paths are correct
- Ensure images are generated at correct dimensions

**Push notifications not working:**
- Verify VAPID keys are set
- Check notification permission is granted
- Ensure service worker handles push events
- Verify API endpoints are accessible

**Offline not working:**
- Check service worker is registered
- Verify caching strategies are configured
- Test with DevTools > Application > Service Workers > Offline
