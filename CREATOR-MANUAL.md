# VideoBox Bridge Creator Manual

This guide explains how a Qortal creator installs and uses the local version of VideoBox Bridge.

## What This Tool Is

VideoBox Bridge is a local creator tool for importing YouTube videos into Qortal QDN.

The system has two parts:

- the q-app frontend that the creator publishes to their own local Qortal node
- the local helper that runs on the same computer and does the real video processing

The helper:

- downloads the source video with `yt-dlp`
- transcodes it with `ffmpeg`
- outputs an AV1 + Opus MP4 file
- sends that prepared file back to the q-app for QDN publishing

## What You Need

Install these on the same computer:

- Qortal Hub
- Node.js 22 or newer
- `ffmpeg`
- `yt-dlp`

## Project Files the Creator Needs

The creator needs:

- the built q-app from the `dist/` directory
- the helper project files so the local helper can be started

The `dist/` folder alone is not enough, because browser code cannot run `yt-dlp` or `ffmpeg`.

## 1. Install Dependencies

Inside the helper project folder run:

```bash
npm install
```

Check that both binaries exist:

```bash
ffmpeg -version
yt-dlp --version
```

If one of them is missing, install it first before continuing.

## 2. Configure the Frontend

Create `.env` in the project root:

```bash
cp .env.example .env
```

Default local helper URL:

```bash
VITE_VIDEO_HELPER_URL=http://127.0.0.1:3001
```

## 3. Configure the Local Helper

Create a helper env file:

```bash
cp server/.env.example server/.env
```

Recommended starting values:

```bash
PORT=3001
DEFAULT_TRANSCODE_PRESET=balanced
MAX_VIDEO_DURATION_SECONDS=7200
MAX_ACTIVE_JOBS=1
MAX_QUEUED_JOBS=2
MAX_PREPARED_DOWNLOADS=6
DOWNLOAD_TTL_MS=1800000
```

Optional values:

```bash
FFMPEG_BIN=ffmpeg
YT_DLP_BIN=
YT_DLP_COOKIES_FILE=
YT_DLP_COOKIES_FROM_BROWSER=
YT_DLP_JS_RUNTIMES=node
ALLOWED_ORIGINS=
```

Use `YT_DLP_COOKIES_FROM_BROWSER` if some YouTube videos require browser cookies.

Example:

```bash
YT_DLP_COOKIES_FROM_BROWSER=firefox
```

## 4. Start the Local Helper

In the project root run:

```bash
npm run server
```

If it starts correctly, the helper listens on:

```text
http://127.0.0.1:3001
```

You can verify helper health by opening:

```text
http://127.0.0.1:3001/health
```

## 5. Run the Frontend Locally for Testing

For local testing run:

```bash
npm run dev
```

Then open the q-app through Qortal Hub developer mode.

## 6. Build the q-app for Local Publishing

When ready to publish the frontend:

```bash
npm run build
```

The built frontend will be in:

```text
dist/
```

That `dist/` directory is what the creator publishes to their own local Qortal node.

## 7. Publish and Use the Tool

Normal creator workflow:

1. Start the local helper.
2. Open the published q-app in Qortal.
3. Authenticate with a Qortal name.
4. Confirm the helper panel shows `yt-dlp` and `ffmpeg` as available.
5. Paste a YouTube link.
6. Choose a transcode preset.
7. Choose whether metadata should be public or private.
8. Click `Process Video`.
9. Wait for the local helper to finish download and transcode.
10. Approve the Qortal publish popup.
11. Wait for the JSON metadata publish step to finish.
12. Confirm the video appears in the dashboard.

## 8. Presets

Available presets:

- `Small`: lowest storage usage, best for long archive imports
- `Balanced`: recommended default for most creators
- `High Quality`: larger output and better retained detail

All presets use:

- video codec: AV1
- audio codec: Opus
- container: MP4

## 9. Current Limits

Default helper limits:

- maximum video length: 2 hours
- active jobs: 1
- queued jobs: 2
- prepared downloads kept locally: 6

These values can be changed in `server/.env`.

## 10. Cleanup

The q-app includes a cleanup button for prepared local downloads.

Use it when:

- a job failed and left temporary files behind
- the helper storage is full
- you want to clear prepared files after publishing

## 11. Troubleshooting

If the helper panel shows offline:

- make sure `npm run server` is running
- check `http://127.0.0.1:3001/health`
- confirm `.env` uses `VITE_VIDEO_HELPER_URL=http://127.0.0.1:3001`

If `ffmpeg` is missing:

- install `ffmpeg`
- or set `FFMPEG_BIN` to the correct binary path

If `yt-dlp` is missing:

- install `yt-dlp`
- or set `YT_DLP_BIN` to the correct binary path

If some videos fail on YouTube extraction:

- try `YT_DLP_COOKIES_FROM_BROWSER=firefox`
- or use a cookies file through `YT_DLP_COOKIES_FILE`

If a video is rejected as too long:

- raise `MAX_VIDEO_DURATION_SECONDS` in `server/.env`

If the publish popup does not appear:

- confirm Qortal authentication is active
- confirm the user has a registered Qortal name
- confirm Qortal Hub is working normally

## 12. Recommended Release Package for Creators

When sharing this tool with creators, include:

- the `dist/` build output
- the helper project files
- this manual
- a short dependency checklist for Node.js, `ffmpeg`, and `yt-dlp`

## 13. Important Reminder

The frontend and the helper are meant to be used together.

The q-app alone cannot:

- download YouTube videos
- run `ffmpeg`
- create local temporary files

Those actions only happen inside the local helper running on the creator's own machine.
