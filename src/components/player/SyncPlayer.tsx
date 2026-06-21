import { useEffect, useRef, useState, useCallback } from "react";
import ReactPlayerLib from "react-player";
const ReactPlayer = ReactPlayerLib as any; // eslint-disable-line @typescript-eslint/no-explicit-any
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRoomStore, Room } from "@/store/roomStore";
import { Play, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  detectVideoType, getGDriveFileId,
  getGDriveEmbedUrl, getGDriveDirectUrl,
} from "@/utils/videoUrl";

interface SyncPlayerProps { url: string; isAdmin: boolean; roomId: string; }

// ─── Time helpers ──────────────────────────────────────────────────────────────
function fmtTime(s: number): string {
  if (!s || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map(p => parseInt(p.trim(), 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  const justNum = parseInt(trimmed, 10);
  return isNaN(justNum) ? null : justNum;
}

// ─── Drive iframe (fallback for large files) ──────────────────────────────────
// Admin has a compact sync bar; viewers auto-reload when admin forces a sync.
function DriveIframeFallback({
  fileId, isAdmin, room, roomId, onReady,
}: {
  fileId: string; isAdmin: boolean;
  room: Room | null; roomId: string; onReady: () => void;
}) {
  const [iframeKey, setIframeKey] = useState(0);
  const [syncInput, setSyncInput] = useState("");
  const lastSyncAt = useRef<number>(0);

  const syncFirestore = useCallback(
    (patch: Record<string, unknown>) =>
      updateDoc(doc(db, "rooms", roomId), patch).catch(console.error),
    [roomId],
  );

  // Viewer: watch for admin sync command → reload iframe at synced time
  useEffect(() => {
    if (isAdmin || !room?.syncAt) return;
    if (room.syncAt !== lastSyncAt.current) {
      lastSyncAt.current = room.syncAt;
      setIframeKey(k => k + 1);
    }
  }, [room?.syncAt, isAdmin]);

  // Build embed URL; for viewers, start at last synced position via ?t=
  const getEmbedUrl = (startSecs = 0): string => {
    const base = `https://drive.google.com/file/d/${fileId}/preview`;
    return startSecs > 2 ? `${base}?t=${Math.floor(startSecs)}` : base;
  };

  const handleSync = () => {
    const parsed = parseTimeInput(syncInput);
    if (parsed === null && !syncInput.trim()) {
      toast.error("Enter a timestamp e.g. 1:23:45");
      return;
    }
    const time = parsed ?? (room?.currentTime ?? 0);
    syncFirestore({ currentTime: time, syncAt: Date.now() });
    setSyncInput("");
    setIframeKey(k => k + 1); // Also reload admin's own iframe to same position
    toast.success(`Synced all viewers to ${fmtTime(time)}`);
  };

  // Viewer embed starts at last synced position; admin embed always starts fresh
  const embedUrl = isAdmin
    ? getEmbedUrl(0)
    : getEmbedUrl(room?.currentTime ?? 0);

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* iframe fills all remaining space */}
      <div className="flex-1 min-h-0 relative">
        <iframe
          key={iframeKey}
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={onReady}
        />
      </div>

      {/* Admin-only sync toolbar */}
      {isAdmin && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2
          bg-background border-t border-border/30">
          <span className="text-[10px] tracking-widest uppercase text-muted-foreground/40 flex-shrink-0">
            Sync viewers
          </span>
          <input
            value={syncInput}
            onChange={e => setSyncInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSync(); }}
            placeholder="e.g. 1:23:45"
            className="flex-1 min-w-0 bg-secondary/40 border border-border/30 rounded
              px-2 py-1 text-xs font-mono text-center
              focus:outline-none focus:border-primary/50 transition-colors
              placeholder:text-muted-foreground/25"
          />
          <button
            onClick={handleSync}
            className="flex-shrink-0 px-3 py-1.5 bg-primary text-primary-foreground
              text-[11px] font-medium rounded hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Sync all
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Drive HTML5 player — full programmatic sync ──────────────────────────────
// Works for publicly-shared files up to a few hundred MB. Large files (1GB+)
// will error (Drive serves an HTML warning page instead of video bytes), which
// triggers automatic fallback to DriveIframeFallback above.
function DriveHtml5Player({
  fileId, isAdmin, room, roomId, onReady, onError,
}: {
  fileId: string; isAdmin: boolean;
  room: Room | null; roomId: string;
  onReady: () => void; onError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedTime = useRef(0);
  const isSyncingRef = useRef(false);
  const hasInitialSeek = useRef(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // No crossOrigin attribute — Drive's download URL doesn't return CORS headers,
  // but <video> elements don't need CORS for basic playback (unlike fetch/XHR).
  const directUrl = getGDriveDirectUrl(fileId);

  const syncFirestore = useCallback(
    (patch: Record<string, unknown>) =>
      updateDoc(doc(db, "rooms", roomId), patch).catch(console.error),
    [roomId],
  );

  // Viewer: react to Firestore position/play state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isAdmin || !room) return;

    const diff = Math.abs(video.currentTime - room.currentTime);
    if (diff > 1 && !isSyncingRef.current) {
      isSyncingRef.current = true;
      setSyncing(true);
      video.currentTime = room.currentTime;
      setTimeout(() => { isSyncingRef.current = false; setSyncing(false); }, 1200);
    }

    if (room.isPlaying && video.paused) {
      video.play().catch(() => setAutoplayBlocked(true));
    } else if (!room.isPlaying && !video.paused) {
      video.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.currentTime, room?.isPlaying, isAdmin]);

  const handleCanPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!hasInitialSeek.current) {
      hasInitialSeek.current = true;
      const target = room?.currentTime ?? 0;
      if (target > 2) { video.currentTime = target; lastSavedTime.current = target; }
      if (room?.isPlaying && !isAdmin) {
        video.play().catch(() => setAutoplayBlocked(true));
      }
    }
    onReady();
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        src={directUrl}
        className="w-full h-full object-contain"
        controls={isAdmin}
        preload="metadata"
        playsInline
        onCanPlay={handleCanPlay}
        onError={onError}
        onPlay={(e) => {
          if (!isAdmin) return;
          setAutoplayBlocked(false);
          syncFirestore({ isPlaying: true, currentTime: e.currentTarget.currentTime });
        }}
        onPause={(e) => {
          if (!isAdmin) return;
          syncFirestore({ isPlaying: false, currentTime: e.currentTarget.currentTime });
        }}
        onSeeked={(e) => {
          if (!isAdmin) return;
          const t = e.currentTarget.currentTime;
          lastSavedTime.current = t;
          syncFirestore({ currentTime: t });
        }}
        onTimeUpdate={(e) => {
          if (!isAdmin) return;
          const t = e.currentTarget.currentTime;
          if (Math.abs(t - lastSavedTime.current) > 2) {
            lastSavedTime.current = t;
            syncFirestore({ currentTime: t });
          }
        }}
      />

      {!isAdmin && <div className="absolute inset-0 z-10" style={{ pointerEvents: "all" }} />}

      {syncing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 border border-white/10">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <span className="text-white/60 text-xs">Syncing…</span>
          </div>
        </div>
      )}

      {autoplayBlocked && !isAdmin && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto">
          <button
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              if (room?.currentTime) video.currentTime = room.currentTime;
              video.play().then(() => setAutoplayBlocked(false)).catch(console.error);
            }}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center
              shadow-xl shadow-primary/40 group-hover:scale-105 transition-transform">
              <Play className="w-7 h-7 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-medium">Tap to watch</p>
              <p className="text-white/40 text-xs mt-0.5">
                {room?.isPlaying ? `Playing · ${fmtTime(room.currentTime)}` : "Paused"}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main SyncPlayer ──────────────────────────────────────────────────────────
export default function SyncPlayer({ url, isAdmin, roomId }: SyncPlayerProps) {
  const playerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const { room } = useRoomStore();
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // "html5" → try direct stream first; "iframe" → large file fallback
  const [driveMode, setDriveMode] = useState<"html5" | "iframe">("html5");

  const lastSavedTime = useRef(0);
  const lastServerPlaying = useRef(false);
  const isSyncingRef = useRef(false);

  const videoType = detectVideoType(url || "");
  const isGDrive = videoType === "gdrive";
  const driveFileId = isGDrive ? getGDriveFileId(url) : null;

  useEffect(() => {
    setIsPlayerReady(false);
    setIsPlaying(false);
    setPlayerError(null);
    setDriveMode("html5");
    lastSavedTime.current = 0;
    lastServerPlaying.current = false;
  }, [url, retryKey]);

  const syncFirestore = useCallback(
    (patch: Record<string, unknown>) =>
      updateDoc(doc(db, "rooms", roomId), patch).catch(console.error),
    [roomId],
  );

  // Non-Drive viewer sync
  useEffect(() => {
    if (!room || !isPlayerReady || !playerRef.current || isGDrive || isAdmin) return;
    if (room.isPlaying !== lastServerPlaying.current) {
      setIsPlaying(room.isPlaying);
      lastServerPlaying.current = room.isPlaying;
    }
    const currentTime = playerRef.current.getCurrentTime() ?? 0;
    const diff = Math.abs(currentTime - room.currentTime);
    if (diff > 1 && !isSyncingRef.current) {
      isSyncingRef.current = true;
      playerRef.current.seekTo(room.currentTime, "seconds");
      setTimeout(() => { isSyncingRef.current = false; }, 800);
    }
  }, [room?.currentTime, room?.isPlaying, isPlayerReady, isGDrive, isAdmin]);

  const handleReactPlayerReady = () => {
    setIsPlayerReady(true);
    setPlayerError(null);
    if (!playerRef.current) return;
    const target = room?.currentTime ?? 0;
    if (target > 1) { playerRef.current.seekTo(target, "seconds"); lastSavedTime.current = target; }
    if (room?.isPlaying) { setIsPlaying(true); lastServerPlaying.current = true; }
  };

  const retry = () => {
    setPlayerError(null); setIsPlayerReady(false);
    setDriveMode("html5"); setRetryKey(k => k + 1);
  };

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-white/20 text-xs tracking-widest uppercase">No video URL</p>
      </div>
    );
  }

  if (isGDrive && !driveFileId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black gap-3 p-6 text-center">
        <AlertCircle className="w-6 h-6 text-red-500/50" />
        <p className="text-white/40 text-xs max-w-[220px]">
          Couldn't read a file ID from this Drive URL. Paste the sharing link directly.
        </p>
      </div>
    );
  }

  if (!isGDrive && playerError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black gap-4 p-8 text-center">
        <AlertCircle className="w-7 h-7 text-red-500/50" />
        <p className="text-white/40 text-xs max-w-xs">{playerError}</p>
        <button onClick={retry}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded border border-primary/30
            text-primary text-xs hover:bg-primary/10 transition-colors">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  // ── Google Drive ─────────────────────────────────────────────────────────
  if (isGDrive && driveFileId) {
    return (
      <div className="w-full h-full relative bg-black">
        {!isPlayerReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-white/25 text-[11px] tracking-widest uppercase">Loading…</p>
          </div>
        )}
        <div className="absolute inset-0">
          {driveMode === "html5" ? (
            <DriveHtml5Player
              key={`html5-${retryKey}`}
              fileId={driveFileId}
              isAdmin={isAdmin}
              room={room}
              roomId={roomId}
              onReady={() => setIsPlayerReady(true)}
              onError={() => {
                setIsPlayerReady(false);
                setDriveMode("iframe");
              }}
            />
          ) : (
            <DriveIframeFallback
              key={`iframe-${retryKey}`}
              fileId={driveFileId}
              isAdmin={isAdmin}
              room={room}
              roomId={roomId}
              onReady={() => setIsPlayerReady(true)}
            />
          )}
        </div>
      </div>
    );
  }

  // ── ReactPlayer — YouTube, MP4, HLS ─────────────────────────────────────
  return (
    <div className="w-full h-full relative bg-black">
      {!isPlayerReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black gap-3">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
          <p className="text-white/25 text-[11px] tracking-widest uppercase">Buffering…</p>
        </div>
      )}
      <ReactPlayer
        key={retryKey}
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        playing={isPlaying}
        controls={isAdmin}
        progressInterval={2000}
        onReady={handleReactPlayerReady}
        onPlay={() => {
          setIsPlaying(true);
          if (isAdmin) syncFirestore({ isPlaying: true, currentTime: playerRef.current?.getCurrentTime() ?? 0 });
        }}
        onPause={() => {
          setIsPlaying(false);
          if (isAdmin) syncFirestore({ isPlaying: false, currentTime: playerRef.current?.getCurrentTime() ?? 0 });
        }}
        onSeek={(s: number) => {
          if (!isAdmin) return;
          lastSavedTime.current = s;
          syncFirestore({ currentTime: s });
        }}
        onProgress={(state: { playedSeconds: number }) => {
          if (!isAdmin || !isPlaying) return;
          if (Math.abs(state.playedSeconds - lastSavedTime.current) > 2) {
            lastSavedTime.current = state.playedSeconds;
            syncFirestore({ currentTime: state.playedSeconds });
          }
        }}
        onError={(e: unknown) => {
          console.error("ReactPlayer error:", e);
          setPlayerError("Could not load video. Check the URL and try again.");
        }}
        config={{ youtube: { playerVars: { modestbranding: 1, disablekb: isAdmin ? 0 : 1 } } }}
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      {!isAdmin && <div className="absolute inset-0 z-10" style={{ pointerEvents: "all" }} />}
    </div>
  );
}
