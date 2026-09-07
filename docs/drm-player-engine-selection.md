# DRM lesson playback engine decision

Decision date: 2026-09-07. Status: **Shaka Player core selected for implementation; live DRM validation pending and required before release.** No credentials, DRM asset, dependency installation, or device playback was available in this research task.

Mux remains responsible for encoding, DRM licensing, and delivery. ChartCoach owns the controls, chapters, required questions, and learning progress. Use Shaka behind an application adapter with a plain video element; do not adopt Shaka's default control overlay.

## Evidence and alternatives

The comparisons below distinguish documented capabilities from untested integration assumptions. Commercial licensing terms must be obtained before adopting a commercial engine; no price or support SLA is assumed.

| Criterion | Shaka core (selected) | Bitmovin Web Player | Dolby OptiView / THEOplayer Web |
| --- | --- | --- | --- |
| Mux compatibility | Mux publishes a Shaka DRM configuration; Shaka publishes Mux-specific FairPlay transforms. Best direct documentation fit. | Configurable DRM servers and request handling; Mux compatibility is an inference requiring a pilot, especially HLS/CBCS Widevine. | Configurable content protection; Mux compatibility is unproven. Published platform tables do not establish HLS/Widevine support for this exact pipeline. |
| DASH / HLS and DRM | Both manifests; Widevine, FairPlay, and PlayReady, subject to browser/CDM support. | HLS and DASH; Widevine, FairPlay, and PlayReady. | HLS and DASH; Widevine and FairPlay paths vary by platform/manifest. |
| ChartCoach controls | Core APIs attach to our video; no vendor UI required. | UI is separate from core; custom controls possible. | Chromeless SDK explicitly supports application-owned controls. |
| English captions | WebVTT and text-track APIs; native caption rendering available. | Embedded/sideloaded captions and custom subtitle display examples. | Text-track APIs and subtitle controls; custom UI integration documented. |
| Mobile web | Safari FairPlay/native HLS; official Chrome Android Widevine. Device validation required. | Safari/iOS and Android browser support; native iOS fullscreen limits custom UI. | Safari iOS FairPlay and Chrome Android Widevine documented, with manifest-specific limits. |
| Analytics | Player/media events, stats, and official Mux Data Shaka integration. | Player events; official Mux Data Bitmovin integration and vendor observability. | Player event API can feed application telemetry; a Mux-specific monitoring integration was not established here. |
| License / testing | Apache-2.0; retain notices. Open source enables inspection and adapter fakes. Real CDMs still need device tests. | Commercial key/domain setup; Stream Lab offers physical-device testing. Adapter fakes still required. | Commercial SDK license/domain setup; adapter fakes and licensed real-device tests required. |

Sources: [Mux DRM integration](https://www.mux.com/docs/guides/protect-videos-with-drm), [Shaka support and license](https://github.com/shaka-project/shaka-player), [Shaka API](https://shaka-project.github.io/shaka-player/docs/api/shaka.Player.html), [Shaka text plugins](https://shaka-project.github.io/shaka-player/docs/api/tutorial-plugins.html), [Mux Shaka monitoring](https://www.mux.com/docs/guides/monitor-shaka-player), [Bitmovin Web SDK](https://bitmovin.com/video-player/web-sdk-browsers/), [Bitmovin DRM config](https://cdn.bitmovin.com/player/web/8/docs/interfaces/drm.drmconfig.html), [Bitmovin UI](https://bitmovin.com/demos/player-ui-styling/), [Bitmovin subtitle samples](https://github.com/bitmovin/bitmovin-player-web-samples), [Mux Bitmovin monitoring](https://www.mux.com/docs/guides/monitor-bitmovin-player), [Bitmovin licensing](https://bitmovin.com/pricing), [THEOplayer setup](https://docs.optiview.dolby.com/theoplayer/getting-started/sdks/web/getting-started/), [THEOplayer platform matrix](https://www.theoplayer.com/platform-support), [THEOplayer chromeless UI](https://docs.optiview.dolby.com/theoplayer/how-to-guides/ui/introduction/), [THEOplayer source/text configuration](https://docs.optiview.dolby.com/theoplayer/v8/api-reference/web/interfaces/SourceDescription.html).

Shaka avoids an additional commercial player contract and has the strongest explicit Mux integration evidence. This selection does not prove it meets the complete lesson workflow. Reopen the decision if the pinned implementation cannot pass FairPlay, captions, or gate enforcement on required devices. Bitmovin is the first commercial candidate to trial; switching engines must preserve the adapter and Mux service boundary.

## Mux and FairPlay integration rules

Use the backend-issued signed HLS manifest URL. Mux's documented custom DRM pipeline is HLS with CMAF/CBCS; an engine's DASH support does **not** establish a Mux `.mpd` endpoint. Browser selection must preserve encryption and never fall back to a clear MP4. Playback and DRM-license tokens are separate; the backend signs them after checking active authentication and enrollment. API credentials, signing private keys, and FairPlay private keys stay server-side. Short-lived signed URLs and the public FairPlay certificate necessarily reach the browser. [Mux DRM guide](https://www.mux.com/docs/guides/protect-videos-with-drm)

Task 3 must pin the exact released Shaka version and check its shipped APIs against these living docs. The documented Mux baseline is legacy Apple Media Keys, `com.apple.fps.1_0`, native HLS (`streaming.useNativeHlsForFairPlay`), the Apple polyfill, and Shaka's `muxFairPlayRequest`, `commonFairPlayResponse`, and `muxInitDataTransform` helpers. Configure the supplied FairPlay certificate URI and license server before loading. Install/register these only for the FairPlay path, scope filters to DRM requests, and remove instance filters/listeners on disposal. Handle global polyfill installation idempotently. Modern EME uses `com.apple.fps`; do not swap the identifier without validating the complete Mux request/response flow. [Shaka FairPlay guide, including Mux recipe](https://shaka-project.github.io/shaka-player/docs/api/tutorial-fairplay.html)

The authorization payload must supply the manifest URL, Widevine license URL, FairPlay license URL, FairPlay certificate URL, and expiration; optional PlayReady is outside the required pilot matrix. These correspond to Mux's `stream.mux.com/{playbackId}.m3u8`, `license.mux.com/license/{system}/{playbackId}`, and `license.mux.com/appcert/fairplay/{playbackId}` endpoints with their appropriate signed tokens. Treat URLs as sensitive capabilities: keep in memory, redact query strings and vendor error details, and never persist them in progress or analytics. [Mux DRM endpoints](https://www.mux.com/docs/guides/protect-videos-with-drm)

## Frontend adapter contract for Task 3

This is an application contract, not Shaka API syntax. Concrete TypeScript names may follow repository conventions; preserve these semantics.

| Surface | Contract |
| --- | --- |
| Creation | One adapter per mounted video element. Inject an adapter factory for UI tests. Capability detection returns supported DRM, caption availability, and fullscreen capability without exposing vendor objects. |
| `load(source, startSeconds)` | Async load of the authorization payload above; include lesson ID and optional English caption URL/label/language if not in the manifest. Resolve when seekable metadata/tracks are ready. Use backend-approved resume, clamped by lesson gates. Autoplay remains user initiated. |
| Controls | `play(): Promise<void>`, `pause()`, `seek(seconds)`, `setVolume(0..1)`, `setMuted(boolean)`, `setCaptions(boolean)`. Reject invalid/non-finite positions; report play rejection without implying playback started. |
| Snapshot | Duration, current position, paused/ended/buffering, volume/mute, captions available/enabled, and seekable bounds. Emit actual media state, not optimistic control state. |
| Subscription | Return an unsubscribe function. Normalize ready, state/time, seeking/seeked, buffering, ended, track changes, and errors. Errors expose a stable category (`unsupported`, `authorization`, `network`, `drm`, `media`) and retryability with sanitized detail. |
| Renewal / teardown | Controller obtains fresh authorization from backend. Pause, preserve allowed position, reload the fresh source, and resume only when appropriate. Coalesce refreshes; prevent retry loops and ignore stale async loads. `destroy(): Promise<void>` releases player, media source, subscriptions, filters, and optional analytics monitor; repeated disposal is safe. |

Map core lifecycle/text methods using the [Shaka API](https://shaka-project.github.io/shaka-player/docs/api/shaka.Player.html); normalize native media events too because Safari can use native HLS. English captions must render in core-only mode, including Safari: use a text displayer supported by the pinned version and synchronize native tracks where needed. [Native text displayer](https://shaka-project.github.io/shaka-player/docs/api/shaka.text.NativeTextDisplayer.html)

The lesson controller owns questions, forward limits, server progress heartbeats, retries, and completion. Every seek entry point goes through its gate policy; also inspect actual `seeking` and time changes for native-control or external seeks, pause at the next unanswered required prompt, and exclude jumps from watched intervals. The backend remains authoritative; media events and Mux analytics do not prove learning completion.

Fullscreen belongs to the UI wrapper so question overlays remain visible. Use container fullscreen where supported and an accessible expanded-inline fallback otherwise. Do not launch video-only native fullscreen when it would hide required prompts; if the OS enters it externally, pause and exit before showing a prompt. iOS native fullscreen has platform-owned controls and cannot display arbitrary web overlays. Test this limitation explicitly. [Bitmovin iOS fullscreen explanation](https://developer.bitmovin.com/playback/docs/why-is-the-full-screen-player-ui-different-with-ios-and-other-devices), [THEOplayer native fullscreen limitation](https://optiview.dolby.com/docs/theoplayer/v9/api-reference/web/interfaces/UIPlayerConfiguration.html)

## Live validation release gate

All rows are **NOT RUN**. Use an HTTPS deployment, the actual DRM-only pilot asset with reviewed English captions and required questions, Mux DRM enabled, and provisioned FairPlay credentials. Use physical devices and installed release browsers, not headless Chromium, browser emulation, a clear-content demo, or a mocked license endpoint. “Current” is fixed at the validation date: record the precise OS/browser build, hardware, Shaka version, asset ID, DRM policy, test date, and sanitized evidence per row. Repeat Safari rows for current and previous major OS releases; run current stable desktop/Android browsers.

| Required row | Expected transport / DRM | Additional interaction checks |
| --- | --- | --- |
| Windows 11 / Chrome | HLS CMAF / Widevine | Keyboard-only controls, screen reader labels, desktop fullscreen |
| Windows 11 / Edge | HLS CMAF / Widevine | Confirm selected CDM; same keyboard/fullscreen checks |
| Windows 11 / Firefox | HLS CMAF / Widevine | DRM-enabled and DRM-disabled states |
| macOS / Safari (current and previous major OS) | Native HLS / FairPlay | Certificate/license transforms, captions, fullscreen overlay behavior |
| macOS / Chrome | HLS CMAF / Widevine | Keyboard/fullscreen, device sleep and return |
| Physical iPhone / Safari (current and previous major iOS) | Native HLS / FairPlay | Portrait/landscape, inline/expanded mode, external fullscreen, touch captions, VoiceOver |
| Physical iPad / Safari (current and previous major iPadOS) | Native HLS / FairPlay | Rotation, fullscreen/inline gate transitions, touch target layout |
| Physical Android phone / official Chrome (current and previous major Android) | HLS CMAF / Widevine | Touch/TalkBack, captions, rotation, background/foreground |

For **every row**, record pass/fail for: authorized encrypted start; adaptive playback during bandwidth changes; caption on/off and sync across seeks; play/pause/volume or system-volume fallback; backward seeks and allowed resume; forward seeking and natural playback stopping at every required question; wrong-answer retry and correct-answer continuation; refresh preserving server progress; 90% coverage plus all questions required for completion; buffering/offline recovery; token expiration and controlled renewal; expired/invalid authorization denied; signed-out/inactive/unenrolled access denied; page unmount/remount without duplicate audio/listeners; and errors/analytics containing no bearer URLs or secrets. Expiration may not immediately stop already buffered/decrypted media: verify new protected requests are denied, then verify authorized reload behavior.

Local Task 3 adapter/UI tests should use deterministic fakes for lifecycle, races, errors, captions, seek gates, and event cleanup. Browser smoke tests can establish rendering and interactions. Neither is live DRM proof. Release requires all required rows passed with retained evidence; until then report “implemented, live DRM unverified,” and keep the pilot unreleased.
