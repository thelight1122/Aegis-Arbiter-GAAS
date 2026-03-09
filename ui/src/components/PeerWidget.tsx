import React, { useState, useEffect, useRef } from "react";
import { witnessEmitter } from "../witness.js";
import "../styles/PeerComponents.css";

interface TelemetryData {
    flow: { resonance: number; entropy: number };
    lens: { physical: number; emotional: number; mental: number; spiritual: number };
    tags: string[];
}

export default function PeerWidget({ onOpenOverlay }: { onOpenOverlay: () => void }) {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const widgetRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = witnessEmitter.on("resonance_event", (data: any) => {
            setTelemetry(data);
        });
        return () => unsubscribe();
    }, []);

    const resonance = telemetry?.flow.resonance ?? 0.5;
    const pulseScale = 1 + (resonance * 0.1);

    useEffect(() => {
        if (widgetRef.current) {
            widgetRef.current.style.setProperty(
                "--widget-shadow", 
                `0 10px 30px rgba(0,0,0,0.5), 0 0 ${isHovered ? 20 : 10}px rgba(0, 153, 255, ${resonance})`
            );
            widgetRef.current.style.setProperty(
                "--widget-transform", 
                `scale(${isHovered ? 1.15 : 1})`
            );
        }
    }, [isHovered, resonance]);

    useEffect(() => {
        if (innerRef.current) {
            innerRef.current.style.setProperty("--inner-transform", `scale(${pulseScale})`);
            innerRef.current.style.setProperty("--inner-animation", resonance > 0.7 ? "pulse 1s infinite alternate" : "none");
        }
    }, [pulseScale, resonance]);

    return (
        <div
            ref={widgetRef}
            onClick={onOpenOverlay}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="peer-widget"
        >
            <div ref={innerRef} className="peer-widget-inner">
                <span className="peer-widget-label">A</span>
            </div>
        </div>
    );
}
