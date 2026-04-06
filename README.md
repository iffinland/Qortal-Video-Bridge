# Qortal Video Bridge

Local-first creator tool for importing YouTube videos into Qortal QDN.

The published q-app is only the frontend. Real video processing happens in a local helper
running on the creator's own computer. The helper downloads the source video with `yt-dlp`,
transcodes it with `ffmpeg` to AV1 + Opus, and then hands the prepared file back to the q-app
for QDN publishing.

## Architecture

- `dist/` is the q-app frontend that a creator can publish to their own local Qortal node.
- `server/index.ts` is the local helper that must run on `http://127.0.0.1:3001`.
- No VPS, domain, Caddy, or shared public helper is required.

## Local requirements

Install these on the same computer where the creator will use the tool:

- Node.js 22+
- `ffmpeg`
- `yt-dlp`

Optional:

- browser cookies support for `yt-dlp` via `YT_DLP_COOKIES_FROM_BROWSER`
- a custom binary path through `FFMPEG_BIN` or `YT_DLP_BIN`

## Frontend environment

Create `.env` from the example:

```bash
cp .env.example .env
```

Default frontend setting:

```bash
VITE_VIDEO_HELPER_URL=http://127.0.0.1:3001
```

## Helper environment

Create a helper env file from:

```bash
cp server/.env.example server/.env
```

Important helper settings:

```bash
PORT=3001
DEFAULT_TRANSCODE_PRESET=balanced
MAX_VIDEO_DURATION_SECONDS=7200
MAX_ACTIVE_JOBS=1
MAX_QUEUED_JOBS=2
MAX_PREPARED_DOWNLOADS=6
```

## Local development

In one terminal:

```bash
cd /home/iffiolen/VS-Code-Projects/REACT-PROJECTS/videobox-bridge
npm run server
```

In another terminal:

```bash
cd /home/iffiolen/VS-Code-Projects/REACT-PROJECTS/videobox-bridge
npm run dev
```

## Creator workflow

1. Start the local helper.
2. Open the q-app.
3. Confirm the helper health panel shows `yt-dlp` and `ffmpeg` as available.
4. Paste a YouTube URL.
5. Choose a transcode preset: `Small`, `Balanced`, or `High Quality`.
6. Approve the Qortal publish popup when the local helper finishes preparing the file.
7. Verify the video appears in the dashboard.

## Presets

- `Small`: lowest storage usage for long archive imports
- `Balanced`: recommended default for most uploads
- `High Quality`: larger frame size and higher bitrate for premium releases

All presets use AV1 video with Opus audio inside an MP4 output file, matching the current
Qortal-oriented encoding strategy for this project.

## Build for local publishing

Build the frontend:

```bash
npm run build
```

Share the resulting `dist/` directory with creators so they can publish it to their own local
Qortal node. They must also run the helper locally before using the app.

## Helper service example

An example `systemd` unit is included at:

```bash
server/videobox-helper.service.example
```

It is optional. Creators can also run `npm run server` manually.
