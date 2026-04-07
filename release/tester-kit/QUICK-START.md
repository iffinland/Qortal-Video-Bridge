# VideoBox Bridge Quick Start

This guide is for a brand new tester.

Do these steps in order. Do not run `npm run build` inside the tester kit.

## 1. Install Requirements

Install these on the same computer:

- Qortal Hub
- Node.js 22 or newer
- `ffmpeg`
- `yt-dlp`

Check them:

```bash
node -v
npm -v
ffmpeg -version
yt-dlp --version
```

## 2. Unpack the Tester Kit

Example:

```bash
mkdir -p ~/videobox-test
cd ~/videobox-test
unzip videobox-bridge-tester-kit.zip
cd tester-kit
```

After that, you should be inside the `tester-kit/` folder.

## 3. Install and Start the Helper

Open the helper folder:

```bash
cd ~/videobox-test/tester-kit/helper
```

Install helper packages:

```bash
npm install
```

Create the helper config:

```bash
cp server/.env.example server/.env
```

Open the config:

```bash
nano server/.env
```

Use at least this:

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

Save and exit `nano`:

- `Ctrl + O`
- `Enter`
- `Ctrl + X`

Start the helper:

```bash
npm run server
```

Leave that terminal open.

## 4. Check the Helper

Open a second terminal and run:

```bash
curl http://127.0.0.1:3001/health
```

You want to see:

- `ok: true`
- `ytDlp.available: true`
- `ffmpeg.available: true`

## 5. Publish the App

Do not build anything.

The tester kit already includes a ready q-app build here:

```text
~/videobox-test/tester-kit/app/dist
```

Publish that `app/dist` folder to your local Qortal node.

## 6. Open the App in Qortal Hub

In Qortal Hub:

1. Open the published q-app.
2. Authenticate with your Qortal name.
3. Check that the helper section shows `Ready`.

## 7. First Safe Test

Use this first:

- a short public YouTube video
- preset: `Balanced`
- metadata: `Public`

Then:

1. click `Process Video`
2. wait for helper processing
3. approve the Qortal publish popup
4. confirm the video appears in the dashboard

## 8. If YouTube Blocks Extraction

Edit:

```bash
nano ~/videobox-test/tester-kit/helper/server/.env
```

Then try:

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

Or use a cookies file:

```env
YT_DLP_COOKIES_FILE=/full/path/to/youtube-cookies.txt
```

After changing `server/.env`, restart the helper:

```bash
cd ~/videobox-test/tester-kit/helper
npm run server
```

## 9. Where Everything Is

- helper: `~/videobox-test/tester-kit/helper`
- q-app build: `~/videobox-test/tester-kit/app/dist`
- website demo: `~/videobox-test/tester-kit/website/website`
- guides: `~/videobox-test/tester-kit/docs`

## 10. If This Worked

Continue with:

- `docs/FULL-MANUAL.md`
- `docs/TEST-CHECKLIST.md`
