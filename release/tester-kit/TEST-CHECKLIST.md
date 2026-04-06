# VideoBox Bridge Test Checklist

Use this checklist when giving the app to external testers.

## Environment Check

- Node.js installed
- `ffmpeg` installed
- `yt-dlp` installed
- helper starts without errors
- `http://127.0.0.1:3001/health` returns `ok: true`
- q-app opens in Qortal Hub
- Qortal authentication works
- tester has a registered Qortal name

## Recommended Starting Settings

- `TRANSCODE_PROFILE=workflow-test`
- `DEFAULT_TRANSCODE_PRESET=balanced`

## Core Flow Tests

- short video with `Balanced`
- short video with `Small`
- short video with `High Quality`
- confirm publish popup appears
- confirm video appears in dashboard
- confirm helper reports `Ready`

## Medium-Length Tests

- 10 minute video with `Small`
- 10 minute video with `Balanced`
- confirm full flow completes successfully

## Longer Hardware Test

Only for stronger machines:

- 30 minute video with `Small`
- 30 minute video with `Balanced`
- optional 60 minute test

## Metadata Tests

- publish one video as `Public`
- publish one video as `Private`
- change a video from public to private
- change a video from private to public
- edit title and description
- delete a video from the dashboard

## Reuse Tests

- copy embed code
- use `Post to CHAT`
- verify the website gallery can play the video
- verify `clean.html` style page can play the video

## Report Back For Each Failure

Ask testers to report:

- operating system
- Node.js version
- `ffmpeg -version`
- `yt-dlp --version`
- chosen preset
- video duration
- whether helper health was `ok: true`
- exact error message from the app
- exact error message from the helper terminal

## Minimum Success Criteria

A tester result is considered successful if:

- helper health is green
- at least one short video publishes successfully
- the published video appears in the dashboard
- embed or chat reuse works
