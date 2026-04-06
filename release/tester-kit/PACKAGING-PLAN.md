# VideoBox Bridge Tester Packaging Plan

This document defines the recommended structure for the package that will be shared with external testers.

## Goal

A tester should receive one simple kit that contains:

- the q-app frontend build
- the website demo build
- the helper files
- clear setup instructions
- a repeatable testing checklist

## Recommended Folder Layout

Create a release folder with this structure:

```text
tester-kit/
├── app/
│   └── dist/
├── website/
│   └── website/
├── helper/
│   ├── package.json
│   ├── package-lock.json
│   ├── server/
│   ├── public/
│   ├── .env.example
│   ├── server/.env.example
│   └── server/videobox-helper.service.example
├── docs/
│   ├── QUICK-START.md
│   ├── FULL-MANUAL.md
│   └── TEST-CHECKLIST.md
└── README.txt
```

## What To Include

### App

Copy the full `dist/` directory after a fresh build:

```bash
npm run build
```

The tester publishes this frontend to their own Qortal node.

### Website

Copy the full `website/` directory or a clean website zip.

This is optional for pure app testing, but useful when you want testers to verify:

- embed code
- detail pages
- gallery flow
- cross-links between the app and website

### Helper

The tester needs enough of the repository to run:

```bash
npm install
npm run server
```

At minimum include:

- `package.json`
- `package-lock.json`
- `server/`
- `public/`
- `src/`
- config files required by the TypeScript/runtime setup

If you want the simplest path, ship the full repository without:

- `.git`
- `node_modules`
- `.vite`
- local backup archives

## Recommended First Tester Configuration

Use this helper profile for general testing:

```env
TRANSCODE_PROFILE=workflow-test
DEFAULT_TRANSCODE_PRESET=balanced
MAX_VIDEO_DURATION_SECONDS=7200
MAX_ACTIVE_JOBS=1
MAX_QUEUED_JOBS=2
MAX_PREPARED_DOWNLOADS=6
```

This keeps hardware pressure lower and increases the chance that testers validate the whole flow successfully.

## Suggested Release Preparation Workflow

1. Run a fresh frontend build.
2. Confirm helper health locally.
3. Confirm one short video still publishes successfully.
4. Copy `dist/` into the tester kit.
5. Copy `website/` into the tester kit.
6. Copy the helper files into the tester kit.
7. Copy the docs into the tester kit.
8. Zip the final `tester-kit/` folder.

## Recommended Final Zip Names

- `videobox-bridge-tester-kit.zip`
- `videobox-bridge-app-dist.zip`
- `videobox-bridge-website.zip`

## Important Reminder

Do not send only `dist/`.

The tester also needs:

- Node.js
- `ffmpeg`
- `yt-dlp`
- the local helper files

Without the helper, the q-app cannot process YouTube videos.
