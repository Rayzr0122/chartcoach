from scripts.media import build_parser


def test_media_cli_supports_import_status_and_retry_commands():
    parser = build_parser()
    assert parser.parse_args(["import", "lecture.mp4"]).command == "import"
    assert parser.parse_args(["status", "asset-1"]).asset_id == "asset-1"
    assert parser.parse_args(["retry", "job-1"]).job_id == "job-1"
    assert parser.parse_args(["worker", "--once"]).once is True
    package = parser.parse_args(["package", "asset-1", "--generation", "g1"])
    assert (package.asset_id, package.generation) == ("asset-1", "g1")
    caption = parser.parse_args(["caption", "asset-1", "captions.srt", "--language", "hi", "--label", "Hindi"])
    assert (caption.asset_id, caption.language, caption.label) == ("asset-1", "hi", "Hindi")
