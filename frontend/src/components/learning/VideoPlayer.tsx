"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

type VideoPlayerProps = {
  videoUrl: string;
  thumbnailUrl?: string;
  lessonTitle: string;
  initialPositionSeconds?: number;
  durationSeconds?: number;
  onProgressSync?: (data: {
    lastPositionSeconds: number;
    watchedSeconds: number;
    durationSeconds: number;
    completed: boolean;
  }) => void;
  onVideoEnded?: () => void;
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  lessonTitle,
  initialPositionSeconds = 0,
  durationSeconds = 1080,
  onProgressSync,
  onVideoEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [resumedToast, setResumedToast] = useState<string | null>(null);
  const [totalWatched, setTotalWatched] = useState(0);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const initialSeekDoneRef = useRef<boolean>(false);

  // Auto-resume from initial position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!initialSeekDoneRef.current && initialPositionSeconds > 5) {
      const handleLoadedMetadata = () => {
        if (!initialSeekDoneRef.current) {
          video.currentTime = Math.min(initialPositionSeconds, video.duration - 2);
          setCurrentTime(video.currentTime);
          initialSeekDoneRef.current = true;
          setResumedToast(`Resumed from ${formatTime(initialPositionSeconds)}`);
          setTimeout(() => setResumedToast(null), 4500);
        }
      };

      if (video.readyState >= 1) {
        handleLoadedMetadata();
      } else {
        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      }
    }
  }, [initialPositionSeconds]);

  // Periodic progress sync (debounced ~10-12s of playback)
  const syncProgress = useCallback(
    (pos: number, dur: number, completed = false) => {
      if (!onProgressSync) return;
      const watched = Math.round(pos);
      onProgressSync({
        lastPositionSeconds: Math.round(pos),
        watchedSeconds: Math.max(watched, totalWatched),
        durationSeconds: Math.round(dur || durationSeconds),
        completed,
      });
    },
    [onProgressSync, totalWatched, durationSeconds]
  );

  // Time update handler
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;
    setCurrentTime(current);
    setTotalWatched((prev) => Math.max(prev, Math.round(current)));

    // Sync every 10 seconds of playback
    if (Math.abs(current - lastSyncTimeRef.current) >= 10) {
      lastSyncTimeRef.current = current;
      syncProgress(current, video.duration || duration);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    const video = videoRef.current;
    const dur = video?.duration || duration;
    syncProgress(dur, dur, true);
    if (onVideoEnded) {
      onVideoEnded();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      syncProgress(video.currentTime, video.duration || duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
    setPlaybackSpeed(nextSpeed);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    setResumedToast(null);
  };

  // Auto-hide controls during playback
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3200);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 shadow-2xl border border-slate-800 select-none"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        className="h-full w-full object-cover cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        playsInline
      />

      {/* Resumed Notification Toast */}
      {resumedToast && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2.5 rounded-xl bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md border border-slate-700 animate-fade-in">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span>{resumedToast}</span>
          <button
            type="button"
            onClick={restartVideo}
            className="ml-1.5 flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
          >
            <RotateCcw className="h-3 w-3" /> Start over
          </button>
        </div>
      )}

      {/* Big Center Play Button overlay when paused */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-slate-950/35 cursor-pointer transition-opacity backdrop-blur-[2px]"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition-transform duration-200 hover:scale-110 active:scale-95">
            <Play className="h-7 w-7 fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div className="relative mb-3 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700/80 accent-blue-500 hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${progressPercent}%, rgba(51, 65, 85, 0.8) ${progressPercent}%, rgba(51, 65, 85, 0.8) 100%)`,
            }}
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
            </button>

            {/* Volume control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-300 hover:text-white transition cursor-pointer"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-14 cursor-pointer accent-blue-500 hidden sm:inline-block"
              />
            </div>

            {/* Time Stamp */}
            <span className="font-mono text-[11px] text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Playback speed toggle */}
            <button
              type="button"
              onClick={changeSpeed}
              className="rounded-md bg-white/10 px-2 py-1 font-mono text-[11px] font-bold text-slate-200 hover:bg-white/20 transition cursor-pointer"
            >
              {playbackSpeed}x
            </button>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Toggle fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
