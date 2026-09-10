"""Operator CLI for local media import, job inspection, and retry."""

from __future__ import annotations

import argparse
import json
import os
import socket
import time
from pathlib import Path

import pymongo

from app.services.media_ingest import (
    FFprobeMediaProbe,
    FileMediaStorage,
    MediaIngestService,
    ProcessingJobWorker,
)
from app.services.media_packaging import MediaPackagingService, validate_generation
from app.services.media_keys import DevelopmentKeyBroker


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--database-name", default=os.getenv("DATABASE_NAME", "chartcoach-local"))
    parser.add_argument("--media-root", default=os.getenv("MEDIA_ROOT", "../.media"))
    commands = parser.add_subparsers(dest="command", required=True)
    import_command = commands.add_parser("import", help="Import and probe an immutable source")
    import_command.add_argument("source")
    status_command = commands.add_parser("status", help="Show an asset and its jobs")
    status_command.add_argument("asset_id")
    retry_command = commands.add_parser("retry", help="Requeue a failed job")
    retry_command.add_argument("job_id")
    worker_command = commands.add_parser("worker", help="Run the single leased media worker")
    worker_command.add_argument("--once", action="store_true")
    package_command = commands.add_parser("package", help="Create an adaptive package generation")
    package_command.add_argument("asset_id")
    package_command.add_argument("--generation", required=True)
    package_command.add_argument("--encrypt", action="store_true")
    caption_command = commands.add_parser("caption", help="Attach a timed-text source to an asset")
    caption_command.add_argument("asset_id")
    caption_command.add_argument("source")
    caption_command.add_argument("--language", required=True)
    caption_command.add_argument("--label", required=True)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if not args.database_url:
        parser.error("--database-url or DATABASE_URL is required")
    db = pymongo.MongoClient(args.database_url, serverSelectionTimeoutMS=5000)[args.database_name]
    if args.command == "import":
        asset = MediaIngestService(
            db,
            FileMediaStorage(Path(args.media_root)),
            FFprobeMediaProbe(),
        ).import_source(Path(args.source))
        print(json.dumps({key: asset[key] for key in ("id", "state", "duration_seconds")}))
    elif args.command == "status":
        asset = db.media_assets.find_one({"id": args.asset_id}, {"_id": 0})
        jobs = list(db.processing_jobs.find({"asset_id": args.asset_id}, {"_id": 0}))
        print(json.dumps({"asset": asset, "jobs": jobs}, default=str))
    elif args.command == "caption":
        caption = MediaIngestService(
            db,
            FileMediaStorage(Path(args.media_root)),
            FFprobeMediaProbe(),
        ).attach_caption(
            args.asset_id,
            Path(args.source),
            language=args.language,
            label=args.label,
        )
        print(json.dumps(caption))
    elif args.command == "retry":
        ProcessingJobWorker(db, worker_id="operator-cli").retry(args.job_id)
        print(json.dumps({"job_id": args.job_id, "state": "queued"}))
    elif args.command == "worker":
        worker = ProcessingJobWorker(db, worker_id=f"{socket.gethostname()}-{os.getpid()}")
        storage = FileMediaStorage(Path(args.media_root))
        probe = FFprobeMediaProbe()
        while True:
            worked = worker.run_once(storage, probe)
            if args.once:
                print(json.dumps({"processed": worked}))
                break
            if not worked:
                time.sleep(2)
    else:
        key_broker = (
            DevelopmentKeyBroker(
                db,
                environment=os.getenv("APP_ENVIRONMENT", "development"),
                wrapping_secret=os.getenv("LOCAL_MEDIA_WRAPPING_SECRET"),
            )
            if args.encrypt
            else None
        )
        generation = MediaPackagingService(
            db, Path(args.media_root), key_broker=key_broker
        ).package(
            args.asset_id,
            generation_id=args.generation,
            validate=validate_generation,
        )
        print(json.dumps({"generation": generation["id"], "state": generation["state"]}))


if __name__ == "__main__":
    main()
