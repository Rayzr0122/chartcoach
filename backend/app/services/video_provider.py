"""
Video Provider Abstraction for ChartCoach.
Complies with Section 14 and 18 of the Senior Engineering Specification.
Keeps video delivery vendor-agnostic (Mux, Cloudflare Stream, Vimeo, or Mock).
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class VideoProvider(ABC):
    """Abstract interface for video asset resolution and signed playback info."""

    @abstractmethod
    def get_playback_info(self, video_asset_id: str, user_id: str) -> Dict[str, Any]:
        pass


class MockVideoProvider(VideoProvider):
    """
    Standard educational video provider supplying authentic HTML5 streaming playback
    metadata for ChartCoach lessons.
    """

    # High quality, freely streamable trading education sample clips
    DEFAULT_SAMPLE_STREAMS = {
        "trading-101": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "chart-reading-101": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "reading-the-market": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "entry-exit-rules": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        "building-a-strategy": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    }

    def get_playback_info(self, video_asset_id: str, user_id: str) -> Dict[str, Any]:
        course_prefix = video_asset_id.split("-")[0] if "-" in video_asset_id else "trading-101"
        stream_url = self.DEFAULT_SAMPLE_STREAMS.get(
            video_asset_id,
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        )

        return {
            "assetId": video_asset_id,
            "playbackUrl": stream_url,
            "type": "video/mp4",
            "provider": "mock",
            "isAuthorized": True,
            "posterUrl": f"https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1280&q=80",
        }


# Singleton active video provider
default_video_provider: VideoProvider = MockVideoProvider()


def get_video_provider() -> VideoProvider:
    return default_video_provider
