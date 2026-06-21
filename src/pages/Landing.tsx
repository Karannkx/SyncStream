import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowRight, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import { useScramble } from "@/hooks/useScramble";

// ─── Scramble heading ────────────────────────────────────────────────────────
function ScrambleText({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const display = useScramble(text, delay, 35);
  return <span className={className}>{display}</span>;
}

// ─── Split-letter animation ──────────────────────────────────────────────────
function SplitReveal({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={`inline-flex ${className}`} aria-label={text}>
      {text.split("").map((char, i) => (
        <span key={i} className="overflow-hidden inline-block">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.65,
              delay: delay + i * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ─── Infinite horizontal ticker ───────────────────────────────────────────────
const TICKER_WORDS = ["SYNC", "WATCH", "TOGETHER", "PAUSE", "REWIND", "ENJOY", "STREAM", "VIBE"];
function Ticker() {
  const items = [...TICKER_WORDS, ...TICKER_WORDS, ...TICKER_WORDS];
  return (
    <div className="overflow-hidden py-3 border-t border-border/20 select-none">
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: ["0%", "-33.333%"] }}
        transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
      >
        {items.map((word, i) => (
          <span key={i} className="flex items-center gap-6 shrink-0">
            <span className="font-display text-sm tracking-[0.25em] text-muted-foreground/20">
              {word}
            </span>
            <span className="w-1 h-1 rounded-full bg-primary/30 shrink-0" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Glitch line overlay ──────────────────────────────────────────────────────
function GlitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0.2, 0.45, 0.72].map((top, i) => (
        <motion.div
          key={i}
          className="absolute left-0 right-0 h-px bg-primary/15"
          style={{ top: `${top * 100}%` }}
          animate={{ opacity: [0, 0.6, 0], scaleX: [0.3, 1, 0.3], x: ["-10%", "5%", "0%"] }}
          transition={{ duration: 2.4, delay: 1.2 + i * 0.5, repeat: Infinity, repeatDelay: 6 + i * 3 }}
        />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Landing() {
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem("syncstream_username");
    if (saved) setDisplayName(saved);
  }, []);

  const handleJoinInit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length !== 6) { toast.error("Room code must be 6 characters"); return; }
    setIsJoinModalOpen(true);
  };

  const handleJoinConfirm = () => {
    if (!displayName.trim()) { toast.error("Enter a display name"); return; }
    localStorage.setItem("syncstream_username", displayName.trim());
    setLocation(`/room/${roomCode.toUpperCase()}`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <GlitchLines />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="px-6 py-5 flex items-center justify-between border-b border-border/25 relative z-10"
      >
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Clapperboard className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </motion.div>
          <span className="font-display text-2xl tracking-wider">
            <ScrambleText text="SYNCSTREAM" delay={200} />
          </span>
        </div>
        <Link href="/login">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-muted-foreground/40 hover:text-foreground transition-colors tracking-widest uppercase cursor-pointer"
          >
            Admin
          </motion.span>
        </Link>
      </motion.header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10">
        <div className="max-w-lg w-full">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-[10px] tracking-[0.4em] uppercase text-primary mb-6 font-medium"
          >
            Synchronized Watch Party
          </motion.p>

          {/* Big heading — split reveal + scramble combo */}
          <div className="mb-8 leading-[0.88]">
            <div className="font-display text-7xl sm:text-9xl block">
              <SplitReveal text="MOVIE" delay={0.4} />
            </div>
            <div className="font-display text-7xl sm:text-9xl block">
              <SplitReveal text="NIGHT." delay={0.6} />
            </div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1, ease: "easeOut" }}
            className="text-muted-foreground/50 text-sm mb-10 max-w-xs mx-auto leading-relaxed"
          >
            Admin controls the playback. Everyone stays in sync.
          </motion.p>

          {/* Join form */}
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.25, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleJoinInit}
            className="flex flex-col sm:flex-row gap-2.5 max-w-sm mx-auto"
          >
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ENTER CODE"
              maxLength={6}
              className="flex-1 h-11 bg-secondary/30 border border-border/30 rounded-lg
                px-4 text-center font-mono text-base tracking-[0.3em] uppercase
                focus:outline-none focus:border-primary/50 transition-colors
                placeholder:text-muted-foreground/20 placeholder:tracking-widest placeholder:text-xs"
            />
            <Button
              type="submit"
              disabled={roomCode.length !== 6}
              className="h-11 px-5 font-medium tracking-wide gap-2 whitespace-nowrap"
            >
              Join <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xs text-muted-foreground/25 mt-4"
          >
            No account needed
          </motion.p>
        </div>
      </main>

      {/* Footer ticker */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        className="relative z-10"
      >
        <Ticker />
      </motion.footer>

      {/* Name modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <Dialog open onOpenChange={setIsJoinModalOpen}>
            <DialogContent className="w-[88vw] max-w-sm bg-card border-border/50 p-5">
              <DialogHeader className="text-left mb-3">
                <DialogTitle className="text-base font-semibold">
                  Joining{" "}
                  <span className="font-mono text-primary tracking-widest">{roomCode}</span>
                </DialogTitle>
              </DialogHeader>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Your name
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. MovieBuff"
                  className="bg-background border-border/40 focus:border-primary/50 h-10"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleJoinConfirm(); } }}
                  autoFocus
                />
              </div>
              <DialogFooter className="mt-4 flex-row gap-2 justify-end">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsJoinModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-8 text-xs px-4" onClick={handleJoinConfirm}>
                  Enter Room
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
