# Demo Videos

This folder contains scripts and assets for recording demo videos.

## Available Scripts

| Video | Script | Duration |
|-------|--------|----------|
| Registration Flow | [registration-flow-script.md](./registration-flow-script.md) | 3 min |

## Recording Setup

### Recommended Tools

- **Screen Recording:** [OBS Studio](https://obsproject.com/) (free) or [Loom](https://loom.com/)
- **Cursor Highlight:** [PointerFocus](https://www.pointerfocus.com/) (Windows) or built-in in OBS
- **Video Editing:** [DaVinci Resolve](https://www.blackmagicdesign.com/products/davinciresolve) (free)

### Settings

```
Resolution: 1920x1080 (1080p)
Frame Rate: 30 fps minimum (60 fps preferred)
Format: MP4 (H.264)
Audio: 44.1kHz, Stereo
```

### Browser Setup

1. Use Chrome or Firefox
2. Clear browser data / use incognito mode
3. Zoom level: 100%
4. Hide bookmarks bar
5. Disable extensions that show notifications

## Before Recording

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Verify Supabase is running and accessible

3. Prepare test email inboxes (or use Supabase Auth logs)

4. Have the test CSV file ready

## Output Files

Save completed videos to:
```
docs/demo-videos/
├── registration-flow.mp4
├── employee-management.mp4 (future)
├── hazard-assessment.mp4 (future)
└── ...
```

## Quick Commands

```bash
# Start dev server
npm run dev

# Run auth flow test (verify everything works)
npm run test:auth-flow

# Check Supabase connection
npx supabase status
```
