# VideoBox Bridge Creator Manual

This repository now keeps creator and tester documentation in the `release/tester-kit/`
folder so the final sharing package has one clear home.

## Documentation Index

- `release/tester-kit/QUICK-START.md`
  - shortest possible setup path for a new tester
- `release/tester-kit/FULL-MANUAL.md`
  - complete step-by-step install and usage guide
- `release/tester-kit/TEST-CHECKLIST.md`
  - structured testing checklist for different presets and video lengths
- `release/tester-kit/PACKAGING-PLAN.md`
  - how to assemble the files that will be shared with testers

## Recommended Reading Order

1. `PACKAGING-PLAN.md`
2. `QUICK-START.md`
3. `FULL-MANUAL.md`
4. `TEST-CHECKLIST.md`

## Current Product Model

VideoBox Bridge is a local-first Qortal creator tool.

The system has two required parts:

- the q-app frontend published from `dist/`
- the local helper started from this repository

The frontend alone is not enough. Real video processing happens in the helper through:

- `yt-dlp`
- `ffmpeg`

If a guide shows:

- `YT_DLP_COOKIES_FROM_BROWSER=`

the creator must write the browser name they actually use, for example:

- `YT_DLP_COOKIES_FROM_BROWSER=firefox`
- `YT_DLP_COOKIES_FROM_BROWSER=chrome`
- `YT_DLP_COOKIES_FROM_BROWSER=chromium`

## Current Recommended Tester Mode

Use these defaults when sharing the tool for broad testing:

- `TRANSCODE_PROFILE=workflow-test`
- `DEFAULT_TRANSCODE_PRESET=balanced`

This keeps setup lighter and makes the complete publishing flow easier to validate on mixed hardware.

## Final Encoding Note

The long-term Qortal-oriented target remains:

- video codec: AV1
- audio codec: Opus
- container: MP4

But the current tester path should prioritize stability and successful end-to-end validation first.
