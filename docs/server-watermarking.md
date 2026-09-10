# In-house server watermarking contract

The platform now has the policy boundary for production watermarking, but the
forensic renderer remains a separately deployable media worker. This separation
is intentional: a visible overlay and a robust forensic mark must be applied to
clear media before CENC encryption; adding browser text or HTTP metadata is not
an equivalent security control.

## Required worker behavior

For every authorized playback session, the worker must:

1. Validate the short-lived session and obtain the session-bound watermark
   identity from the backend.
2. Render the masked email continuously into every video rendition, using a
   safe-area position that rotates on a fixed schedule.
3. Embed the forensic identifier redundantly across frames and, where the
   detector supports it, audio. The detector must be tested against scaling,
   re-encoding, bitrate changes, cropping attempts, segment extraction, and
   screen capture.
4. Produce aligned 10-second segments and encrypt them before publication.
5. Publish only an immutable, session-scoped generation whose expiry matches
   the authorization session.

If any stage fails, the session must remain unavailable. There is no fallback to
the unwatermarked generation.

## Guardrails

- Keep the unwatermarked source and base generations inaccessible to learner
  sessions.
- Do not log raw email addresses, watermark payloads, DRM keys, or signed media
  URLs.
- Bound the worker queue and segment-ahead window; return a retryable overload
  response instead of building unbounded personalized media.
- Delete expired session generations and rotate forensic secrets separately
  from content keys.
- Record sanitized render latency, failures, and detector-validation results.

`WATERMARK_MODE=server` is fail-closed until the deployed renderer is enabled.
The local feasibility proof intentionally keeps it disabled so its Clear Key
fixture remains available for integration testing.
