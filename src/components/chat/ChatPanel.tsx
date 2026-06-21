import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, limit,
} from "firebase/firestore";
import { Send } from "lucide-react";
import MessageBubble from "./MessageBubble";

interface Props { roomId: string; username: string; currentUserId: string; }
interface Message { id: string; sender: string; message: string; timestamp: number; userId: string; }

export default function ChatPanel({ roomId, username, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const isFirstLoad = useRef(true);

  const scrollToBottom = useCallback((force = false) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (force || isAtBottomRef.current) {
        el.scrollTop = el.scrollHeight;
        setHasUnread(false);
      } else {
        setHasUnread(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, `rooms/${roomId}/messages`),
      orderBy("timestamp", "asc"),
      limit(200),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.timestamp) {
          msgs.push({
            id: d.id,
            sender: data.sender,
            message: data.message,
            timestamp: data.timestamp.toMillis(),
            userId: data.userId || "",
          });
        }
      });
      setMessages(msgs);
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        scrollToBottom(true);
      } else {
        scrollToBottom(false);
      }
    });
    return () => unsub();
  }, [roomId, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottomRef.current = atBottom;
    if (atBottom) setHasUnread(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || sending) return;
    setSending(true);
    setNewMessage("");
    try {
      await addDoc(collection(db, `rooms/${roomId}/messages`), {
        sender: username,
        userId: currentUserId,
        message: text,
        timestamp: serverTimestamp(),
      });
      // Force scroll when we send a message
      isAtBottomRef.current = true;
      scrollToBottom(true);
    } catch {
      setNewMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      {/* Chat header */}
      <div className="flex-shrink-0 px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] tracking-widest uppercase text-muted-foreground/35 font-medium">Chat</span>
        {hasUnread && (
          <button
            onClick={() => scrollToBottom(true)}
            className="text-[10px] text-primary animate-pulse"
          >
            ↓ new messages
          </button>
        )}
      </div>

      {/* Messages scroll container */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        onScroll={handleScroll}
      >
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[11px] text-muted-foreground/25 tracking-wider uppercase">
                No messages yet
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg.message}
                sender={msg.sender}
                timestamp={msg.timestamp}
                isCurrentUser={msg.userId === currentUserId}
              />
            ))
          )}
        </div>
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5
          border-t border-border/30 bg-background/95 backdrop-blur-sm"
      >
        <input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder="Message…"
          maxLength={300}
          className="flex-1 min-w-0 bg-secondary/40 border border-border/30 rounded-full
            text-sm px-3 py-1.5
            placeholder:text-muted-foreground/30 focus:outline-none
            focus:border-primary/40 transition-colors"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-primary
            flex items-center justify-center
            disabled:opacity-20 hover:opacity-80 active:scale-95 transition-all"
        >
          <Send className="w-3.5 h-3.5 text-primary-foreground" />
        </button>
      </form>
    </div>
  );
}
