import { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { db } from "@/lib/firebase";
import {
  collection, query, where, getDocs, doc,
  onSnapshot, serverTimestamp, setDoc, deleteDoc,
} from "firebase/firestore";
import { useRoomStore } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import SyncPlayer from "@/components/player/SyncPlayer";
import ChatPanel from "@/components/chat/ChatPanel";
import OnlineUsers from "@/components/room/OnlineUsers";
import RoomHeader from "@/components/room/RoomHeader";

type RoomStatus = "loading" | "ready" | "error";

export default function RoomPage() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { room, setRoom } = useRoomStore();

  useViewportHeight();

  const [displayName, setDisplayName] = useState("");
  const [roomDocId, setRoomDocId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<RoomStatus>("loading");

  const currentUserId = useRef(
    user?.uid || (() => {
      const key = `syncstream_guestId_${code}`;
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;
      const id = `guest_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(key, id);
      return id;
    })()
  );

  const hasJoinedPresence = useRef(false);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (!code) { setLocation("/"); return; }
    const savedName = localStorage.getItem("syncstream_username");
    if (!savedName && !user) { toast.error("Enter a display name to join"); setLocation("/"); return; }
    setDisplayName(user?.displayName || savedName || "Anonymous");
  }, [code, user, setLocation]);

  useEffect(() => {
    if (!code || !displayName) return;
    let cancelled = false;
    const lookup = async () => {
      try {
        const q = query(collection(db, "rooms"), where("code", "==", code.toUpperCase()));
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) { toast.error("Room not found"); setLocation("/"); return; }
        const roomDoc = snap.docs[0];
        setRoomDocId(roomDoc.id);
        if (user && roomDoc.data().createdBy === user.uid) setIsAdmin(true);
      } catch { if (!cancelled) { toast.error("Failed to connect"); setLocation("/"); } }
    };
    lookup();
    return () => { cancelled = true; };
  }, [code, displayName, user, setLocation]);

  useEffect(() => {
    if (!roomDocId) return;
    const unsub = onSnapshot(
      doc(db, "rooms", roomDocId),
      (snap) => {
        if (!snap.exists()) {
          if (!isLeavingRef.current) toast.error("Room closed by admin");
          setLocation("/"); return;
        }
        const d = snap.data();
        setRoom({
          roomId: snap.id, code: d.code, movieUrl: d.movieUrl, title: d.title,
          currentTime: d.currentTime ?? 0, isPlaying: d.isPlaying ?? false,
          createdBy: d.createdBy, createdAt: d.createdAt,
          activeUserCount: d.activeUserCount ?? 0,
          syncAt: d.syncAt ?? undefined,
        });
        setStatus("ready");
      },
      () => { toast.error("Lost connection"); setStatus("error"); }
    );
    return () => unsub();
  }, [roomDocId, setRoom, setLocation]);

  useEffect(() => {
    if (!roomDocId || status !== "ready" || hasJoinedPresence.current) return;
    hasJoinedPresence.current = true;
    isLeavingRef.current = false;
    const uid = currentUserId.current;
    const userRef = doc(db, `rooms/${roomDocId}/users`, uid);
    setDoc(userRef, { userId: uid, username: displayName, joinedAt: serverTimestamp() }).catch(console.error);
    const cleanup = () => { isLeavingRef.current = true; deleteDoc(userRef).catch(() => {}); };
    window.addEventListener("beforeunload", cleanup);
    return () => { window.removeEventListener("beforeunload", cleanup); cleanup(); hasJoinedPresence.current = false; };
  }, [roomDocId, status, displayName]);

  useEffect(() => {
    if (!roomDocId) return;
    const uid = currentUserId.current;
    const unsub = onSnapshot(doc(db, `rooms/${roomDocId}/users`, uid), (snap) => {
      if (!snap.exists() && hasJoinedPresence.current && !isLeavingRef.current) {
        toast.error("Removed from room by admin");
        setLocation("/");
      }
    });
    return () => unsub();
  }, [roomDocId, setLocation]);

  if (status === "loading" || !room) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background flex-col gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground tracking-wider uppercase">Connecting…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background flex-col gap-4">
        <p className="text-sm text-destructive">Connection failed</p>
        <button onClick={() => setLocation("/")} className="text-xs text-muted-foreground underline">Go home</button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-background overflow-hidden"
      style={{ height: "var(--vp-height, 100dvh)" }}
    >
      <RoomHeader roomCode={room.code} title={room.title} isAdmin={isAdmin} roomId={room.roomId} />

      {/*
        Mobile / portrait  → stacked (video 16:9 then sidebar fills rest)
        Landscape md+ ≥768 → side by side (video flex-1, sidebar fixed width)
      */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

        {/* ── Video ────────────────────────────────────────────────────── */}
        <div className="w-full flex-shrink-0 bg-black aspect-video md:aspect-auto md:flex-1 md:h-full">
          <SyncPlayer url={room.movieUrl} isAdmin={isAdmin} roomId={room.roomId} />
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className="
          flex-1 min-h-0 overflow-hidden
          flex flex-col
          md:flex-none md:w-64 lg:w-72
          border-t border-border/20
          md:border-t-0 md:border-l md:border-border/20
        ">
          <OnlineUsers roomId={room.roomId} currentUserId={currentUserId.current} isAdmin={isAdmin} />
          <div className="h-px bg-border/20 shrink-0" />
          <ChatPanel roomId={room.roomId} username={displayName} currentUserId={currentUserId.current} />
        </div>
      </div>
    </div>
  );
}
