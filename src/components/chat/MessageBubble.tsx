import { format } from "date-fns";

interface Props {
  message: string;
  sender: string;
  timestamp: number;
  isCurrentUser: boolean;
}

export default function MessageBubble({ message, sender, timestamp, isCurrentUser }: Props) {
  return (
    <div className={`flex flex-col gap-0.5 ${isCurrentUser ? "items-end" : "items-start"}`}>
      {!isCurrentUser && (
        <span className="text-[10px] text-muted-foreground/50 px-1 font-medium">{sender}</span>
      )}
      <div className="flex items-end gap-1.5">
        <div
          className={`px-3 py-2 rounded-2xl text-[13px] leading-snug break-words max-w-[80%]
            ${isCurrentUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-secondary/70 text-foreground rounded-bl-sm"
            }`}
        >
          {message}
        </div>
        <span className="text-[9px] text-muted-foreground/30 flex-shrink-0 pb-0.5">
          {format(timestamp, "h:mm")}
        </span>
      </div>
    </div>
  );
}
