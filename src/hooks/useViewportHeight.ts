import { useEffect } from "react";

/**
 * Tracks visualViewport height and writes it as --vp-height CSS variable.
 * Fixes the mobile keyboard push-up issue: when the keyboard opens,
 * visualViewport.height shrinks, so the container adjusts without
 * the video scrolling out of view.
 */
export function useViewportHeight() {
  useEffect(() => {
    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vp-height", `${h}px`);
    };

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);
}
