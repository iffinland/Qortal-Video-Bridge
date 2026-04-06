# VideoBox Bridge Full Manual

This document explains the full local setup and creator workflow in detail.

## Overview

VideoBox Bridge has two required parts:

- the q-app frontend published to a Qortal node
- the local helper that processes videos on the same machine

The helper is responsible for:

- downloading the source video with `yt-dlp`
- transcoding it with `ffmpeg`
- preparing the file for QDN publishing

## Required Software

Install these first:

- Qortal Hub
- Node.js 22+
- `ffmpeg`
- `yt-dlp`

Recommended verification:

```bash
node -v
npm -v
ffmpeg -version
yt-dlp --version
```

## Frontend Configuration

Create the frontend env file:

```bash
cp .env.example .env
```

Expected value:

```env
VITE_VIDEO_HELPER_URL=http://127.0.0.1:3001
```

## Helper Configuration

Create the helper env file:

```bash
cp server/.env.example server/.env
```

### Recommended Test Configuration

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

### About `TRANSCODE_PROFILE`

- `workflow-test`
  - lighter processing
  - best for first-time testers and weaker hardware
  - validates the complete app flow quickly
- `qortal-final`
  - final Qortal-oriented target mode
  - heavier processing
  - better suited for stronger hardware and later-stage testing

## Starting the Helper

Run from the repository root:

```bash
npm install
npm run server
```

The helper should listen on:

```text
http://127.0.0.1:3001
```

Health endpoint:

```text
http://127.0.0.1:3001/health
```

Expected result:

- `ok: true`
- `ytDlp.available: true`
- `ffmpeg.available: true`

## Publishing the q-app

Build the frontend:

```bash
npm run build
```

Publish the `dist/` directory to your local Qortal node.

## First Use Flow

1. Start the helper.
2. Open the published q-app in Qortal Hub.
3. Authenticate with your Qortal name.
4. Confirm the helper panel shows `Ready`.
5. Paste a YouTube URL.
6. Pick a transcode preset.
7. Choose public or private metadata.
8. Click `Process Video`.
9. Wait for helper processing.
10. Approve the Qortal publish popup.
11. Wait for the JSON metadata publish step.
12. Confirm the video appears in your dashboard.

## Presets

Available presets:

- `Small`
  - lowest storage usage
  - useful for longer imports
- `Balanced`
  - recommended default
  - best first testing preset
- `High Quality`
  - larger output
  - useful when stronger hardware is available

## Cleanup Button

`Cleanup prepared downloads` removes temporary helper files only.

It does not delete:

- published QDN videos
- published QDN JSON metadata
- dashboard entries that already exist in QDN

Use cleanup when:

- a job failed and left temporary files behind
- you want to free helper storage
- you have old prepared downloads you no longer need

## Cookie Options

Some YouTube videos may require login cookies.

### Option A: Browser Cookies

Example:

```env
YT_DLP_COOKIES_FROM_BROWSER=firefox
```

Write the browser name you really use after the `=` sign.

Common examples:

```env
YT_DLP_COOKIES_FROM_BROWSER=firefox
YT_DLP_COOKIES_FROM_BROWSER=chrome
YT_DLP_COOKIES_FROM_BROWSER=chromium
```

This is usually the easiest setup for local creator use.

### Option B: Cookie File

Example:

```env
YT_DLP_COOKIES_FILE=/full/path/to/youtube-cookies.txt
```

Use this if browser extraction is not available or not reliable on the tester's machine.

## Current Default Limits

- max video duration: 2 hours
- active jobs: 1
- queued jobs: 2
- prepared downloads retained: 6

These can all be changed in `server/.env`.

## Troubleshooting

### Helper shows offline

- confirm `npm run server` is still running
- check `http://127.0.0.1:3001/health`
- confirm `.env` points to `http://127.0.0.1:3001`

### `ffmpeg` missing

- install `ffmpeg`
- or set `FFMPEG_BIN` to the full binary path

### `yt-dlp` missing

- install `yt-dlp`
- or set `YT_DLP_BIN` to the full binary path

### YouTube extraction error

- try `YT_DLP_COOKIES_FROM_BROWSER=firefox`
- or configure `YT_DLP_COOKIES_FILE`

### Publish popup never appears

- confirm Qortal auth is active
- confirm the account has a registered Qortal name
- confirm helper processing actually finished

### Processing is too slow

- keep `TRANSCODE_PROFILE=workflow-test`
- start with `Balanced`
- test shorter videos first

## Optional Background Service

An example `systemd` service file is available:

```text
server/videobox-helper.service.example
```

This is optional. Manual helper startup is enough for testing.
