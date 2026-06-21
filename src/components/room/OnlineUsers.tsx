import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, onSnapshot, orderBy, deleteDoc, doc,
} from "firebase/firestore";
import { X } from "lucide-react";
import { toast } from "sonner";

interface Props { roomId: string; currentUserId: string; isAdmin: boolean; }
interface User { id: string; userId: string; username: string; }

export default function OnlineUsers({ roomId, currentUserId, isAdmin }: Props) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, `rooms/${roomId}/users`),
      orderBy("joinedAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: User[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() as Omit<User, "id"> }));
      setUsers(list);
    });
    return () => unsub();
  }, [roomId]);

  const kick = async (user: User) => {
    if (!confirm(`Remove ${user.username} from room?`)) return;
    try {
      await deleteDoc(doc(db, `rooms/${roomId}/users`, user.id));
      toast.success(`${user.username} removed`);
    } catch { toast.error("Failed to remove"); }
  };

  if (users.length === 0) return null;

  return (
    <div className="flex-shrink-0 px-3 py-2.5">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-0.5 scrollbar-none">
        {/* Count label */}
        <span className="text-[10px] tracking-widest uppercase text-muted-foreground/40 flex-shrink-0 mr-0.5">
          {users.length}
        </span>

        {users.map((user) => {
          const isMe = user.userId === currentUserId;
          const canKick = isAdmin && !isMe;

          return (
            <div key={user.id} className="relative flex-shrink-0">
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center
                  text-[11px] font-semibold select-none
                  ${isMe
                    ? "bg-primary/25 text-primary border border-primary/40"
                    : "bg-secondary text-muted-foreground border border-border/40"
                  }`}
                title={user.username + (isMe ? " (You)" : "")}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>

              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full
                bg-green-500 border-2 border-background pointer-events-none" />

              {/* Kick button — always visible for admin on touch devices */}
              {canKick && (
                <button
                  onClick={() => kick(user)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full
                    bg-background border border-border/60
                    flex items-center justify-center
                    text-muted-foreground/60 hover:text-red-400
                    hover:border-red-400/40 transition-colors z-10"
                  title={`Remove ${user.username}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
