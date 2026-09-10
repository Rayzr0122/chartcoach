from pathlib import Path

import mongomock
import pytest

from app.services.media_packaging import MediaPackagingService, plan_renditions, validate_generation


class Runner:
    def __init__(self):
        self.commands = []

    def run(self, command):
        self.commands.append(command)


def test_rendition_plan_never_upscales_and_uses_expected_ladder():
    assert [item.height for item in plan_renditions(1080)] == [360, 720, 1080]
    assert [item.height for item in plan_renditions(700)] == [360]
    assert [item.height for item in plan_renditions(360)] == [360]


def test_generation_is_published_only_after_all_commands_and_validation(tmp_path):
    db = mongomock.MongoClient().chartcoach
    storage_root = tmp_path / "media"
    source = storage_root / "sources" / "source.mp4"
    source.parent.mkdir(parents=True)
    source.write_bytes(b"source")
    caption = storage_root / "sources" / "captions.srt"
    caption.write_text("1\n00:00:00,000 --> 00:00:01,000\nHello\n", encoding="utf-8")
    db.media_assets.insert_one(
        {
            "id": "asset-1",
            "source_provider": "local",
            "source_key": "sources/source.mp4",
            "state": "ready_for_encoding",
            "duration_seconds": 60,
            "streams": [{"codec_type": "video", "width": 1920, "height": 1080}],
            "captions": [{"language": "hi", "label": "Hindi", "source_key": "sources/captions.srt"}],
        }
    )
    runner = Runner()
    service = MediaPackagingService(db, storage_root, runner=runner)

    generation = service.package("asset-1", generation_id="generation-1", validate=lambda _: True)

    assert generation["renditions"] == [360, 720, 1080]
    assert generation["processing_seconds"] >= 0
    assert generation["output_bytes"] == 0
    assert generation["worker_host"]["cpu_count"] is not None
    assert db.media_assets.find_one({"id": "asset-1"})["published_generation_id"] == "generation-1"
    ffmpeg = runner.commands[0]
    assert "-force_key_frames" in ffmpeg
    assert "expr:gte(t,n_forced*4)" in ffmpeg
    assert any("fps=1/10" in part for command in runner.commands for part in command)
    assert any("captions_hi.vtt" in part for command in runner.commands for part in command)
    packager = runner.commands[-1]
    assert any("google/shaka-packager" in part for part in packager)
    image_index = next(i for i, part in enumerate(packager) if "google/shaka-packager" in part)
    assert packager[image_index + 1] == "packager"
    assert any("stream=text" in part for part in packager)
    text_descriptor = next(part for part in packager if "stream=text" in part)
    assert "segment_template=" in text_descriptor
    assert ",output=" not in text_descriptor
    assert "--generate_static_live_mpd" in packager
    assert any("@sha256:" in part for command in runner.commands for part in command if "ffmpeg" in part or "packager" in part)
    db.media_assets.update_one({"id": "asset-1"}, {"$set": {"state": "ready_for_encoding"}})
    with pytest.raises(ValueError, match="already exists"):
        service.package("asset-1", generation_id="generation-1", validate=lambda _: True)


def test_generation_validator_requires_both_manifests_and_segments(tmp_path):
    package = tmp_path / "package"
    package.mkdir()
    (package / "master.m3u8").write_text("#EXTM3U", encoding="utf-8")
    (package / "manifest.mpd").write_text("<MPD/>", encoding="utf-8")
    assert validate_generation(tmp_path) is False
    (package / "video_1.m4s").write_bytes(b"segment")
    assert validate_generation(tmp_path) is False
    thumbnails = tmp_path / "thumbnails"
    thumbnails.mkdir()
    (thumbnails / "00001.jpg").write_bytes(b"thumbnail")
    assert validate_generation(tmp_path) is True
    (package / "packager-tempfile-1-deadbeef").write_bytes(b"partial manifest")
    assert validate_generation(tmp_path) is False


def test_generation_id_cannot_escape_the_output_root(tmp_path):
    db = mongomock.MongoClient().chartcoach
    db.media_assets.insert_one(
        {
            "id": "asset-1",
            "source_key": "sources/source.mp4",
            "state": "ready_for_encoding",
            "streams": [{"codec_type": "video", "height": 720}],
        }
    )

    with pytest.raises(ValueError, match="generation id"):
        MediaPackagingService(db, tmp_path).package(
            "asset-1", generation_id="../escape", validate=lambda _: True
        )
