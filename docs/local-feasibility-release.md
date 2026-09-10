# Local media feasibility release

This release proves the local ChartCoach learner flow with development-only
Clear Key encryption. It does not prove production DRM, cloud scale, high
availability, disaster recovery, or Mux retirement.

## Reproduce the learner flow

1. Start the local stack with `./start-local.ps1`.
2. Import and package an operator-owned source using the media commands in
   `docs/media-ingest.md` and `docs/media-packaging.md`.
3. Package the selected generation with `--encrypt`.
4. Publish the protected pilot and optional local enrollment with:

```powershell
Set-Location backend
python -m scripts.import_pilot_lesson `
  --media-asset-id <ready-local-asset-id> `
  --duration-seconds <source-duration-seconds> `
  --caption-url http://127.0.0.1:3000/api/local-lecture/captions.vtt `
  --thumbnail-url http://127.0.0.1:3000/api/local-lecture/poster.jpg `
  --enrollment-email <local-learner-email>
```

The command is idempotent. A local asset must be ready and have a published
generation; it cannot silently fall back to a Mux asset.

5. Sign in as the enrolled learner, open **Test player** from the desktop
sidebar, and complete the lesson flow: play, change speed, seek, answer each
required check, leave, reload, and resume.

## Failure checks

The automated suite covers corrupt ingestion, duplicate import, interrupted
jobs, missing package output, traversal attempts, expired/rotated sessions,
anonymous requests, unenrolled learners, invalid progress, and invalid prompt
answers. Run it from `backend` with the test settings documented in the test
environment, then run `npm test -- --run` and `npm run build` from `frontend`.

For a local service incident, inspect `.local/backend.err.log`,
`.local/frontend.err.log`, Docker Mongo logs, and the media processing job
record. These logs must contain only sanitized failure reasons: never add
wrapping secrets, content keys, DRM tokens, or signed media URLs.

## Real DRM handoff

The `CredentialedDrmAdapter` boundary accepts only HTTPS manifest, Widevine
license, FairPlay license, and FairPlay certificate URLs plus an expiry. A
vendor implementation belongs behind that adapter after contract review and
credential approval. The test double verifies the handoff shape without
claiming live DRM playback.

Before a credentialed release, retain physical-device evidence for Windows,
Android, macOS, iPhone, and iPad: packaging, license exchange, renewal, expiry,
captions, speed changes, seeking, fullscreen, foreground/background behavior,
and player remounting. Development Clear Key results do not satisfy that gate.

## Watermarking guardrail

Packaging uses aligned 10-second media segments. Production watermarking is
fail-closed: set `WATERMARK_MODE=server`, provide a dedicated
`WATERMARK_SECRET`, and enable the deployed server-side renderer before issuing
playback sessions. Until that renderer is present, production authorization is
refused rather than serving unwatermarked media. The session identity primitive
uses a masked visible label plus a session-bound HMAC forensic identifier; the
forensic renderer must embed both into clear media before CENC encryption.
