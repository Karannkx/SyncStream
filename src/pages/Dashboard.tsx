import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDocs, writeBatch } from "firebase/firestore";
import { Link, useLocation } from "wouter";
import { Clapperboard, LogOut, Plus, Copy, Trash2, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CreateRoomModal from "@/components/dashboard/CreateRoomModal";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { user, clearUser } = useAuthStore();
  const [, setLocation] = useLocation();
  const [rooms, setRooms] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "rooms"), where("createdBy", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((d) => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setRooms(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try { await signOut(auth); clearUser(); setLocation("/"); }
    catch { toast.error("Error signing out"); }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Delete this room permanently?")) return;
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
      toast.success("Room deleted");
    } catch { toast.error("Failed to delete room"); }
  };

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border/30 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <span className="font-display text-2xl tracking-wider">SYNCSTREAM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs text-muted-foreground">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-primary mb-1 font-medium">Rooms</p>
            <h1 className="font-display text-4xl leading-none">YOUR ROOMS</h1>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 font-medium" size="sm">
            <Plus className="w-4 h-4" /> New Room
          </Button>
        </div>

        {/* Room list */}
        {rooms.length === 0 ? (
          <div className="text-center py-24 border-t border-border/30">
            <p className="font-display text-3xl text-muted-foreground/30 mb-2">NO ROOMS YET</p>
            <p className="text-sm text-muted-foreground/50 mb-8">Create your first room and share the code</p>
            <Button onClick={() => setIsCreateModalOpen(true)} variant="outline" size="sm">
              Create room
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/30 border-t border-border/30">
            {rooms.map((room) => (
              <div key={room.id} className="py-4 flex items-center gap-4 group">
                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{room.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground/50">
                      {room.createdAt ? formatDistanceToNow(room.createdAt, { addSuffix: true }) : "Just now"}
                    </span>
                    {(room.activeUserCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-green-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {room.activeUserCount} watching
                      </span>
                    )}
                  </div>
                </div>

                {/* Code */}
                <button
                  onClick={() => handleCopyCode(room.code)}
                  className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-[0.2em]
                    text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded transition-colors"
                  title="Copy code"
                >
                  {room.code}
                  <Copy className="w-3 h-3 opacity-60" />
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="p-1.5 text-muted-foreground/40 hover:text-red-400 transition-colors rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Link href={`/room/${room.code}`}>
                  <button className="flex items-center gap-1.5 text-xs font-medium text-foreground/70
                    hover:text-primary transition-colors px-3 py-1.5 border border-border/40
                    hover:border-primary/40 rounded">
                    Enter <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userId={user.uid}
      />
    </div>
  );
}
