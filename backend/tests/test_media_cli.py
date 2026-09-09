from scripts.media import build_parser


def test_media_cli_supports_import_status_and_retry_commands():
    parser = build_parser()
    assert parser.parse_args(["import", "lecture.mp4"]).command == "import"
    assert parser.parse_args(["status", "asset-1"]).asset_id == "asset-1"
    assert parser.parse_args(["retry", "job-1"]).job_id == "job-1"
    assert parser.parse_args(["worker", "--once"]).once is True
