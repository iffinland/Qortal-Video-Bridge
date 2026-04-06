# VideoBox Bridge Quick Start

This is the shortest setup path for a new tester.

## 1. Install Requirements

Install these on the same computer:

- Qortal Hub
- Node.js 22 or newer
- `ffmpeg`
- `yt-dlp`

Check the binaries:

```bash
node -v
npm -v
ffmpeg -version
yt-dlp --version
```

## 2. Open the Helper Folder

Inside the helper package run:

```bash
npm install
```

## 3. Create Environment Files

Frontend:

```bash
cp .env.example .env
```

Helper:

```bash
cp server/.env.example server/.env
```

## 4. Use the Recommended Starter Helper Settings

Edit `server/.env` so it contains at least:

```env
PORT=3001
FFMPEG_BIN=ffmpeg
YT_DLP_BIN=
YT_DLP_COOKIES_FILE=
YT_DLP_COOKIES_FROM_BROWSER=
YT_DLP_JS_RUNTIMES=node
TRANSCODE_PROFILE=workflow-test
DEFAULT_TRANSCODE_PRESET=balanced
MAX_ACTIVE_JOBS=1
MAX_QUEUED_JOBS=2
MAX_PREPARED_DOWNLOADS=6
MAX_VIDEO_DURATION_SECONDS=7200
DOWNLOAD_TTL_MS=1800000
```

## 5. Start the Helper

In the project root:

```bash
npm run server
```

Check the helper:

```bash
http://127.0.0.1:3001/health
```

The helper should report that both `yt-dlp` and `ffmpeg` are available.

## 6. Publish the q-app

Publish the provided `dist/` folder to your local Qortal node.

## 7. Open the App

In Qortal Hub:

1. Open the published q-app.
2. Authenticate with your Qortal name.
3. Confirm the helper section shows `Ready`.

## 8. First Safe Test

Use this first:

- a short public YouTube video
- preset: `Balanced`
- metadata: `Public`

Then:

1. click `Process Video`
2. wait for the local helper
3. approve the Qortal publish popup
4. confirm the video appears in the dashboard

## 9. If YouTube Blocks Extraction

Try one of these in `server/.env`:

```env
YT_DLP_COOKIES_FROM_BROWSER=firefox
```

Write the browser name you actually use every day after the `=` sign.

Examples:

```env
YT_DLP_COOKIES_FROM_BROWSER=firefox
YT_DLP_COOKIES_FROM_BROWSER=chrome
YT_DLP_COOKIES_FROM_BROWSER=chromium
```

or:

```env
YT_DLP_COOKIES_FILE=/full/path/to/youtube-cookies.txt
```

## 10. Next Step

After the first successful upload, continue with:

- `FULL-MANUAL.md`
- `TEST-CHECKLIST.md`
