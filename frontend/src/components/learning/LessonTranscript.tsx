"use client";
import { useEffect, useRef, useState } from "react";
import { activeCueAt, parseTranscript, transcriptTime, type TranscriptCue } from "@/lib/transcript";
import styles from "./lesson-study.module.css";

export type TranscriptTrack = { language: string; label: string; url: string };
type TranscriptResult = { request: string; cues: TranscriptCue[]; error: boolean };

export default function LessonTranscript({ url, duration, position, language, onSeek, disabled, tracks: suppliedTracks }: {
  url: string; duration: number; position: number; language: string; onSeek: (seconds: number) => void; disabled: boolean; tracks?: TranscriptTrack[];
}) {
  const tracks = suppliedTracks?.length ? suppliedTracks : [{ language, label: language, url }];
  const [result, setResult] = useState<TranscriptResult>({ request: "", cues: [], error: false });
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const track = tracks.find((candidate) => candidate.url === selectedUrl) ?? tracks.find((candidate) => candidate.url === url) ?? tracks[0];
  const request = `${track.url}:${duration}:${retry}`;
  useEffect(() => {
    const abort = new AbortController();
    fetch(track.url, { signal: abort.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Transcript unavailable");
      const parsed = parseTranscript(await response.text(), duration);
      if (!parsed.length) throw new Error("No timed captions");
      if (!abort.signal.aborted) setResult({ request, cues: parsed, error: false });
    }).catch(() => { if (!abort.signal.aborted) setResult({ request, cues: [], error: true }); });
    return () => abort.abort();
  }, [track.url, duration, request]);
  const loaded = result.request === request;
  const error = loaded && result.error;
  const cues = loaded ? result.cues : [];
  const active = activeCueAt(cues, position);
  useEffect(() => {
    if (search) return;
    const region = list.current;
    const line = region?.querySelector<HTMLElement>('[aria-current="true"]');
    if (region && line) region.scrollTo?.({ top: line.offsetTop - region.clientHeight / 2 + line.clientHeight / 2, behavior: "instant" });
  }, [active?.id, search]);
  const filtered = cues.filter((cue) => cue.text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section data-tour-target="transcript" className={styles.transcript} aria-label="Interactive transcript" inert={disabled}>
    <header className={styles.panelHeader}>
      <div><h2>Transcript</h2><p>{track.label} · Synced to video</p></div>
      {tracks.length > 1 && <div className={styles.languageSwitch} role="group" aria-label="Transcript language">
        {tracks.map((candidate) => <button key={candidate.url} type="button" aria-pressed={candidate.url === track.url} onClick={() => { setSearch(""); setSelectedUrl(candidate.url); }}>{candidate.label}</button>)}
      </div>}
    </header>
    <input className={styles.search} aria-label="Search transcript" placeholder="Find a word or phrase…" value={search} onChange={(event) => setSearch(event.target.value)} />
    {error ? <p role="alert">Transcript unavailable. <button type="button" onClick={() => setRetry((n) => n + 1)}>Retry transcript</button></p> : !loaded ? <p role="status">Loading transcript…</p> : <>
      <p className={styles.small}>{search ? `${filtered.length} matching lines` : "Select a line to jump to that moment."}</p>
      <div ref={list} className={styles.cueList}>
        {filtered.map((cue) => <button key={cue.id} type="button" className={styles.cue} aria-current={active?.id === cue.id ? "true" : undefined} onClick={() => onSeek(cue.start)}>
          <time>{transcriptTime(cue.start)}</time><span>{cue.text}</span>
        </button>)}
        {!filtered.length && <p>No matching lines.</p>}
      </div>
    </>}
  </section>;
}
