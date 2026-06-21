import { useEffect, useState, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&*";

/**
 * Scrambles text character by character, then resolves to the real text.
 * @param text  Target string to reveal
 * @param delay ms delay before animation starts
 * @param speed ms between frames (lower = faster)
 */
export function useScramble(text: string, delay = 0, speed = 40) {
  const [display, setDisplay] = useState(() => randomize(text));
  const frameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      let frame = 0;
      const total = text.length * 2.5;

      const tick = () => {
        setDisplay(
          text
            .split("")
            .map((char, i) => {
              if (char === " " || char === "\n") return char;
              if (i <= frame / 2.5) return char; // lock in from left
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join("")
        );
        frame++;
        if (frame <= total) {
          frameRef.current = window.setTimeout(tick, speed);
        }
      };
      tick();
    }, delay);

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(frameRef.current);
    };
  }, [text, delay, speed]);

  return display;
}

function randomize(text: string) {
  return text
    .split("")
    .map((c) => (c === " " ? " " : CHARS[Math.floor(Math.random() * CHARS.length)]))
    .join("");
}
