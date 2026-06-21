import { Copy, LogOut, Trash2, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

interface RoomHeaderProps {
  roomCode: string;
  title: string;
  isAdmin: boolean;
  roomId: string;
}

export default function RoomHeader({ roomCode, title, isAdmin, roomId }: RoomHeaderProps) {
  const [, setLocation] = useLocation();

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Code copied");
  };

  const handleCloseRoom = async () => {
    if (!confirm("Close room for everyone?")) return;
    try {
      const batch = writeBatch(db);
      const [msgSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, `rooms/${roomId}/messages`)),
        getDocs(collection(db, `rooms/${roomId}/users`)),
      ]);
      msgSnap.forEach((d) => batch.delete(d.ref));
      usersSnap.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "rooms", roomId));
      await batch.commit();
      setLocation("/");
    } catch { toast.error("Failed to close room"); }
  };

  return (
    <header className="h-11 flex-shrink-0 border-b border-border/30 bg-background/80 backdrop-blur-md
      flex items-center justify-between px-3 gap-2 z-20">
      {/* Left */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href="/">
          <Clapperboard className="w-4 h-4 text-primary hover:opacity-70 transition-opacity cursor-pointer flex-shrink-0" strokeWidth={1.5} />
        </Link>
        <span className="text-sm font-medium truncate text-foreground/80 hidden sm:block max-w-[180px] md:max-w-xs">
          {title}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Room code */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-[0.2em]
            text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded transition-colors"
          title="Copy code"
        >
          {roomCode}
          <Copy className="w-2.5 h-2.5 opacity-60" />
        </button>

        {/* Admin: delete room */}
        {isAdmin && (
          <button
            onClick={handleCloseRoom}
            className="p-1.5 text-muted-foreground/40 hover:text-red-400 transition-colors rounded"
            title="Close room"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Leave */}
        <Link href="/">
          <button
            className="p-1.5 text-muted-foreground/40 hover:text-foreground transition-colors rounded"
            title="Leave room"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </header>
  );
}
