import { useEffect } from "react";
import Lenis from "lenis";

let globalLenis: Lenis | null = null;

export function useLenis() {
  useEffect(() => {
    // Don't init on room page (fixed layout, no scroll needed)
    const isRoomPage = window.location.pathname.startsWith("/room/");
    if (isRoomPage) return;

    if (globalLenis) { globalLenis.destroy(); globalLenis = null; }

    globalLenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId: number;
    const raf = (time: number) => {
      globalLenis?.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      globalLenis?.destroy();
      globalLenis = null;
    };
  }, []);
}
