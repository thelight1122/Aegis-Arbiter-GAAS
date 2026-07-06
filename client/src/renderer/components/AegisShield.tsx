import React from "react";
import type { OverlayState } from "../../ipc/types";

interface Props {
  state: OverlayState;
}

const STATE_CONFIG = {
  dormant:  { opacity: 0.72, glow: "#4a7aab", pulse: false, prismOpacity: 0.7 },
  resting:  { opacity: 0.85, glow: "#6ab0f5", pulse: false, prismOpacity: 0.85 },
  engaged:  { opacity: 0.95, glow: "#a0d4ff", pulse: true,  prismOpacity: 0.95 },
  flow:     { opacity: 1.00, glow: "#ffffff", pulse: false,  prismOpacity: 1.0 },
};

export function AegisShield({ state }: Props) {
  const cfg = STATE_CONFIG[state];

  return (
    <svg
      viewBox="0 0 120 120"
      width="110"
      height="110"
      style={{
        opacity: cfg.opacity,
        filter: `drop-shadow(0 0 ${state === "flow" ? "12px" : "6px"} ${cfg.glow})`,
        transition: "opacity 1.2s ease, filter 1.2s ease",
        overflow: "visible",
      }}
    >
      <defs>
        {/* Crystal prism gradient */}
        <linearGradient id="prism" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#ff6b6b" stopOpacity={cfg.prismOpacity} />
          <stop offset="20%"  stopColor="#ffd93d" stopOpacity={cfg.prismOpacity} />
          <stop offset="40%"  stopColor="#6bcb77" stopOpacity={cfg.prismOpacity} />
          <stop offset="60%"  stopColor="#4d96ff" stopOpacity={cfg.prismOpacity} />
          <stop offset="80%"  stopColor="#c77dff" stopOpacity={cfg.prismOpacity} />
          <stop offset="100%" stopColor="#ff6b6b" stopOpacity={cfg.prismOpacity} />
        </linearGradient>

        {/* Crystal shield face gradient */}
        <linearGradient id="crystalFace" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor="#d0e8ff" stopOpacity="0.25" />
          <stop offset="50%"  stopColor="#a8c8f0" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#7aaee0" stopOpacity="0.30" />
        </linearGradient>

        {/* Crystal edge highlight */}
        <linearGradient id="crystalEdge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%"  stopColor="#aad4ff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Pulse animation */}
        {cfg.pulse && (
          <style>{`
            @keyframes aegis-pulse {
              0%, 100% { opacity: 0.85; }
              50%       { opacity: 1.0; }
            }
            .aegis-pulse { animation: aegis-pulse 2.4s ease-in-out infinite; }
          `}</style>
        )}
      </defs>

      <g className={cfg.pulse ? "aegis-pulse" : undefined}>
        {/* Shield body — crystal faceted */}
        <path
          d="M60 8 L100 22 L108 70 Q108 95 60 115 Q12 95 12 70 L20 22 Z"
          fill="url(#crystalFace)"
          stroke="url(#crystalEdge)"
          strokeWidth="1.5"
        />

        {/* Left facet */}
        <path
          d="M60 8 L20 22 L28 65 L60 55 Z"
          fill="#c0dcf8"
          fillOpacity="0.12"
          stroke="#aacef0"
          strokeWidth="0.5"
        />

        {/* Right facet */}
        <path
          d="M60 8 L100 22 L92 65 L60 55 Z"
          fill="#e8f4ff"
          fillOpacity="0.10"
          stroke="#aacef0"
          strokeWidth="0.5"
        />

        {/* Bottom left facet */}
        <path
          d="M28 65 L60 55 L60 110 Q38 100 28 65 Z"
          fill="#b0ccee"
          fillOpacity="0.10"
          stroke="#aacef0"
          strokeWidth="0.5"
        />

        {/* Bottom right facet */}
        <path
          d="M92 65 L60 55 L60 110 Q82 100 92 65 Z"
          fill="#d0e4f8"
          fillOpacity="0.08"
          stroke="#aacef0"
          strokeWidth="0.5"
        />

        {/* Geodesic sphere lines — faint structural web */}
        <g opacity="0.18" stroke={cfg.glow} strokeWidth="0.4" fill="none">
          <circle cx="60" cy="60" r="28" />
          <line x1="60" y1="32" x2="60" y2="88" />
          <line x1="32" y1="60" x2="88" y2="60" />
          <line x1="40" y1="40" x2="80" y2="80" />
          <line x1="80" y1="40" x2="40" y2="80" />
          <line x1="44" y1="36" x2="76" y2="84" />
          <line x1="76" y1="36" x2="44" y2="84" />
        </g>

        {/* Merkaba — upward triangle */}
        <polygon
          points="60,32 82,72 38,72"
          fill="url(#prism)"
          stroke="white"
          strokeWidth="0.6"
          strokeOpacity="0.5"
          filter="url(#glowFilter)"
        />

        {/* Merkaba — downward triangle */}
        <polygon
          points="60,88 38,48 82,48"
          fill="url(#prism)"
          fillOpacity="0.5"
          stroke="white"
          strokeWidth="0.6"
          strokeOpacity="0.3"
        />

        {/* Center light point */}
        <circle
          cx="60"
          cy="60"
          r="4"
          fill="white"
          fillOpacity={state === "flow" ? 0.95 : 0.6}
          filter="url(#glowFilter)"
        />

        {/* AEGIS wordmark */}
        <text
          x="60"
          y="22"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="8"
          fontWeight="bold"
          fill="#e8d898"
          fillOpacity="0.9"
          letterSpacing="1.5"
        >
          AEGIS
        </text>

        {/* Principle labels — Sovereignty, Integrity, Illumination, Flow */}
        <text x="18" y="64" textAnchor="middle" fontFamily="sans-serif"
          fontSize="5" fill="#aad4ff" fillOpacity="0.85"
          transform="rotate(-68 18 64)">Sovereignty</text>

        <text x="102" y="64" textAnchor="middle" fontFamily="sans-serif"
          fontSize="5" fill="#aad4ff" fillOpacity="0.85"
          transform="rotate(68 102 64)">Integrity</text>

        <text x="36" y="110" textAnchor="middle" fontFamily="sans-serif"
          fontSize="5" fill="#aad4ff" fillOpacity="0.85"
          transform="rotate(-28 36 110)">Illumination</text>

        <text x="84" y="110" textAnchor="middle" fontFamily="sans-serif"
          fontSize="5" fill="#aad4ff" fillOpacity="0.85"
          transform="rotate(28 84 110)">Flow</text>
      </g>
    </svg>
  );
}
