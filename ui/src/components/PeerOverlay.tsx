import React, { useState, useEffect, useRef } from "react";
import { witnessEmitter } from "../witness.js";
import "../styles/PeerComponents.css";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

function ProgressFill({ width }: { width: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.style.setProperty("--progress-width", width);
        }
    }, [width]);
    return <div ref={ref} className="progress-fill" />;
}

export default function PeerOverlay({ isOpen, onClose }: Props) {
    const [telemetry, setTelemetry] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = witnessEmitter.on("resonance_event", (data: any) => {
            setTelemetry(data);
        });
        return () => unsubscribe();
    }, []);

    if (!isOpen) return null;

    return (
        <div className="peer-overlay">
            <div className="peer-overlay-header">
                <div>
                    <h1 className="peer-overlay-title">Mirror of Memory</h1>
                    <p className="peer-overlay-subtitle">Sovereign Participant Alignment Interface</p>
                </div>
                <button
                    onClick={onClose}
                    className="peer-overlay-close-btn"
                >
                    Close Prism
                </button>
            </div>

            <div className="peer-overlay-grid">
                {/* PARALLEL LEDGERS */}
                <section className="peer-section">
                    <h2 className="peer-section-title">
                        <span className="ledger-accent">◈</span> 4-Body Ledgers
                    </h2>
                    <div className="ledger-container">
                        {["Physical", "Emotional", "Mental", "Spiritual"].map(l => {
                            const percent = ((telemetry?.lens?.[l.toLowerCase()] ?? 0.5) * 100).toFixed(0);
                            return (
                                <div key={l} className="ledger-item">
                                    <div className="ledger-label-row">
                                        <span className="ledger-label">{l}</span>
                                        <span className="ledger-value">{percent}%</span>
                                    </div>
                                    <div className="progress-bg">
                                        <ProgressFill width={`${percent}%`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* DATAQUAD STATUS */}
                <section className="peer-section">
                    <h2 className="peer-section-title">
                        <span className="dataquad-accent">◈</span> DataQuad Persistence
                    </h2>
                    <div className="dataquad-grid">
                        {["PEER", "PCT", "NCT", "SPINE"].map(q => (
                            <div key={q} className="dataquad-card">
                                <div className="dataquad-label">{q}</div>
                                <div className="dataquad-status">ACTIVE</div>
                            </div>
                        ))}
                    </div>
                    <div className="spine-status-card">
                        <div className="spine-status-title">Logic Spine Status</div>
                        <div className="spine-status-text">
                            Continuity maintained across 12 turns. Resonance delta stable at 0.12.
                        </div>
                    </div>
                </section>

                {/* TELEMETRY FEED */}
                <section className="peer-section flex-col">
                    <h2 className="peer-section-title">
                        <span className="resonance-accent">◈</span> Resonance Stream
                    </h2>
                    <div className="resonance-stream">
                        {telemetry?.tags?.map((t: string, i: number) => (
                            <div key={i} className="resonance-tag">
                                {t}
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="peer-footer">
                AEGIS KERNEL 2.0 • PROTOCOL OF NON-COERCION
            </div>
        </div>
    );
}
