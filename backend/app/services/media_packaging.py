"""Reproducible adaptive transcode and package orchestration."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
import os
from pathlib import Path
import platform
import re
import time
from typing import Any, Callable, Protocol


FFMPEG_IMAGE = (
    "ghcr.io/linuxserver/ffmpeg:8.1.2-cli-ls76"
    "@sha256:2e7000921be8de2704a4f27dfd3d988562697a346eaabb937a81046c306f0af7"
)
PACKAGER_IMAGE = (
    "google/shaka-packager:v3.9.3"
    "@sha256:3cc287d86a3d291a8b102c636b9c2bdd51f14cdbe7812f79254414e25de897e9"
)


@dataclass(frozen=True)
class Rendition:
    height: int
    video_bitrate: str


def plan_renditions(source_height: int) -> list[Rendition]:
    ladder = [
        Rendition(360, "800k"),
        Rendition(720, "2800k"),
        Rendition(1080, "5000k"),
    ]
    eligible = [rendition for rendition in ladder if rendition.height <= source_height]
    return eligible or [Rendition(source_height, "600k")]


def validate_generation(generation_root: Path) -> bool:
    package_root = generation_root / "package"
    required = [package_root / "master.m3u8", package_root / "manifest.mpd"]
    return (
        all(path.is_file() and path.stat().st_size > 0 for path in required)
        and any(path.stat().st_size > 0 for path in package_root.glob("*.m4s"))
        and any(path.stat().st_size > 0 for path in (generation_root / "thumbnails").glob("*.jpg"))
        and not any(package_root.glob("packager-tempfile-*"))
    )


class CommandRunner(Protocol):
    def run(self, command: list[str]) -> None: ...


class SubprocessRunner:
    def run(self, command: list[str]) -> None:
        subprocess.run(command, check=True)


class MediaPackagingService:
    def __init__(
        self,
        db: Any,
        storage_root: Path,
        *,
        runner: CommandRunner | None = None,
        key_broker: Any | None = None,
    ) -> None:
        self.db = db
        self.storage_root = storage_root.resolve()
        self.runner = runner or SubprocessRunner()
        self.key_broker = key_broker

    def package(
        self,
        asset_id: str,
        *,
        generation_id: str,
        validate: Callable[[Path], bool],
    ) -> dict[str, Any]:
        started = time.perf_counter()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", generation_id):
            raise ValueError("media generation id is invalid")
        asset = self.db.media_assets.find_one({"id": asset_id, "state": "ready_for_encoding"})
        if not asset:
            raise ValueError("media asset is not ready for encoding")
        video_stream = next(
            (stream for stream in asset.get("streams", []) if stream.get("codec_type") == "video"),
            None,
        )
        if not video_stream:
            raise ValueError("media asset has no video stream")
        renditions = plan_renditions(int(video_stream["height"]))
        generation_root = self.storage_root / "outputs" / asset_id / generation_id
        if generation_root.exists() or self.db.media_generations.find_one({"id": generation_id}):
            raise ValueError("media generation already exists")
        transcode_root = generation_root / "transcoded"
        package_root = generation_root / "package"
        thumbnail_root = generation_root / "thumbnails"
        caption_root = generation_root / "captions"
        for directory in (transcode_root, package_root, thumbnail_root, caption_root):
            directory.mkdir(parents=True, exist_ok=True)

        mount = f"{self.storage_root}:/media"
        source_key = str(asset["source_key"]).replace("\\", "/")
        source = f"/media/{source_key}"
        ffmpeg = ["docker", "run", "--rm", "-v", mount, FFMPEG_IMAGE, "-y", "-i", source]
        for rendition in renditions:
            output = f"/media/outputs/{asset_id}/{generation_id}/transcoded/{rendition.height}p.mp4"
            ffmpeg.extend(
                [
                    "-map", "0:v:0", "-map", "0:a:0?",
                    "-vf", f"scale=-2:{rendition.height}",
                    "-c:v", "libx264", "-preset", "medium", "-profile:v", "high",
                    "-b:v", rendition.video_bitrate, "-maxrate", rendition.video_bitrate,
                    "-bufsize", rendition.video_bitrate, "-sc_threshold", "0",
                    "-force_key_frames", "expr:gte(t,n_forced*4)",
                    "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-movflags", "+faststart",
                    output,
                ]
            )
        self.runner.run(ffmpeg)

        thumbnail_output = f"/media/outputs/{asset_id}/{generation_id}/thumbnails/%05d.jpg"
        self.runner.run(
            [
                "docker", "run", "--rm", "-v", mount, FFMPEG_IMAGE,
                "-y", "-i", source, "-vf", "fps=1/10,scale=320:-2", "-q:v", "3",
                thumbnail_output,
            ]
        )

        packaged_captions: list[dict[str, str]] = []
        for caption in asset.get("captions", []):
            language = str(caption.get("language", "und"))
            if not re.fullmatch(r"[A-Za-z0-9-]+", language):
                raise ValueError("caption language is invalid")
            caption_key = str(caption["source_key"]).replace("\\", "/")
            caption_output = f"/media/outputs/{asset_id}/{generation_id}/captions/captions_{language}.vtt"
            self.runner.run(
                [
                    "docker", "run", "--rm", "-v", mount, FFMPEG_IMAGE,
                    "-y", "-i", f"/media/{caption_key}", "-f", "webvtt", caption_output,
                ]
            )
            packaged_captions.append(
                {"language": language, "label": str(caption.get("label", language)), "path": caption_output}
            )

        packager = ["docker", "run", "--rm", "-v", mount, PACKAGER_IMAGE, "packager"]
        for rendition in renditions:
            base = f"/media/outputs/{asset_id}/{generation_id}/package/{rendition.height}p"
            packager.append(
                f"in=/media/outputs/{asset_id}/{generation_id}/transcoded/{rendition.height}p.mp4,"
                f"stream=video,init_segment={base}_init.mp4,segment_template={base}_$Number$.m4s,"
                f"playlist_name={rendition.height}p.m3u8"
            )
        audio_source = renditions[-1].height
        packager.append(
            f"in=/media/outputs/{asset_id}/{generation_id}/transcoded/{audio_source}p.mp4,"
            f"stream=audio,init_segment=/media/outputs/{asset_id}/{generation_id}/package/audio_init.mp4,"
            f"segment_template=/media/outputs/{asset_id}/{generation_id}/package/audio_$Number$.m4s,"
            "playlist_name=audio.m3u8,hls_group_id=audio,hls_name=English"
        )
        for caption in packaged_captions:
            language = caption["language"]
            packager.append(
                f"in={caption['path']},stream=text,segment_template=/media/outputs/{asset_id}/{generation_id}/package/"
                f"captions_{language}_$Number$.vtt,playlist_name=captions_{language}.m3u8,hls_group_id=text,"
                f"hls_name={caption['label']},lang={language}"
            )
        content_key = self.key_broker.get_or_create(asset_id) if self.key_broker else None
        if content_key:
            packager.extend(
                [
                    "--enable_raw_key_encryption",
                    "--keys",
                    f"label=:key_id={content_key['kid_hex']}:key={content_key['key_hex']}",
                    "--protection_scheme",
                    "cenc",
                ]
            )
        packager.extend(
            [
                "--segment_duration", "4",
                "--generate_static_live_mpd",
                "--mpd_output", f"/media/outputs/{asset_id}/{generation_id}/package/manifest.mpd",
                "--hls_master_playlist_output", f"/media/outputs/{asset_id}/{generation_id}/package/master.m3u8",
            ]
        )
        self.runner.run(packager)

        published = bool(validate(generation_root))
        output_bytes = sum(path.stat().st_size for path in generation_root.rglob("*") if path.is_file())
        generation = {
            "id": generation_id,
            "asset_id": asset_id,
            "state": "published" if published else "failed",
            "renditions": [rendition.height for rendition in renditions],
            "captions": packaged_captions,
            "thumbnail_interval_seconds": 10,
            "encryption": (
                {
                    "type": "development-clear-key",
                    "scheme": "cenc",
                    "kid": content_key["kid"],
                }
                if content_key
                else None
            ),
            "processing_seconds": round(time.perf_counter() - started, 3),
            "output_bytes": output_bytes,
            "worker_host": {
                "system": platform.system(),
                "machine": platform.machine(),
                "cpu_count": os.cpu_count(),
            },
            "created_at": datetime.now(timezone.utc),
        }
        self.db.media_generations.insert_one(generation)
        if not published:
            raise RuntimeError("generated media failed validation")
        self.db.media_assets.update_one(
            {"id": asset_id},
            {"$set": {"published_generation_id": generation_id, "state": "ready"}},
        )
        return generation
