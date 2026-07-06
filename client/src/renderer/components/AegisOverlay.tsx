import React, { useEffect, useState, useRef } from "react";
import { AegisShield } from "./AegisShield";
import { SettingsPanel } from "./SettingsPanel";
import type { OverlayState } from "../../ipc/types";

export function AegisOverlay() {
  const [state, setState] = useState<OverlayState>("dormant");
  const [provider, setProvider] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; wx: number; wy: number } | null>(null);

  useEffect(() => {
    const aegis = (window as any).aegis;
    if (!aegis) return;

    aegis.onStateChange((s: OverlayState) => setState(s));
    aegis.onSessionStart((session: { provider: string }) => {
      setProvider(session.provider);
    });
    aegis.onSessionEnd(() => {
      setProvider(null);
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStart.current = {
      mx: e.screenX,
      my: e.screenY,
      wx: window.screenX,
      wy: window.screenY,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = ev.screenX - dragStart.current.mx;
      const dy = ev.screenY - dragStart.current.my;
      (window as any).aegis?.drag(
        dragStart.current.wx + dx,
        dragStart.current.wy + dy
      );
    };

    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleDoubleClick = () => {
    (window as any).aegis?.openSettings?.();
    setShowSettings(true);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        background: "transparent",
      }}
      title={
        state === "dormant" ? "AEGIS — Connecting…" :
        state === "resting" ? "AEGIS — Environment held" :
        state === "engaged" ? `AEGIS — ${provider ?? "LLM"} session active` :
        `AEGIS — Flow state · ${provider ?? ""}`
      }
    >
      <AegisShield state={state} />
      {showSettings && (
        <SettingsPanel onClose={() => {
          (window as any).aegis?.closeSettings?.();
          setShowSettings(false);
        }} />
      )}
    </div>
  );
}
