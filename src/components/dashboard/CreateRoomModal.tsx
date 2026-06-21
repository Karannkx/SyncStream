import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

interface Props { isOpen: boolean; onClose: () => void; userId: string; }

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const snap = await getDocs(query(collection(db, "rooms"), where("code", "==", code)));
    if (snap.empty) return code;
  }
  return randomCode();
}

export default function CreateRoomModal({ isOpen, onClose, userId }: Props) {
  const [title, setTitle] = useState("");
  const [movieUrl, setMovieUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !movieUrl.trim()) { toast.error("Fill in both fields"); return; }
    try {
      setIsCreating(true);
      const code = await generateUniqueCode();
      await addDoc(collection(db, "rooms"), {
        code, title: title.trim(), movieUrl: movieUrl.trim(),
        currentTime: 0, isPlaying: false, createdBy: userId,
        createdAt: Date.now(), activeUserCount: 0,
      });
      toast.success("Room created!");
      setTitle(""); setMovieUrl(""); onClose();
    } catch { toast.error("Failed to create room"); }
    finally { setIsCreating(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm bg-card border-border/50 p-5">
        <form onSubmit={handleCreate}>
          <DialogHeader className="mb-4 text-left">
            <DialogTitle className="font-display text-2xl leading-none tracking-wider">
              NEW ROOM
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Room Title
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Interstellar Night"
                className="bg-background/60 border-border/40 focus:border-primary/60 h-10 text-sm"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Video URL
              </Label>
              <Input
                value={movieUrl}
                onChange={(e) => setMovieUrl(e.target.value)}
                placeholder="YouTube, MP4, HLS…"
                className="bg-background/60 border-border/40 focus:border-primary/60 h-10 text-sm"
                disabled={isCreating}
              />
            </div>
          </div>

          <DialogFooter className="mt-5 flex-row gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isCreating}
              className="h-8 px-3 text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isCreating} className="h-8 px-4 text-xs min-w-20">
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
