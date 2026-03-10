import React, { useState } from "react";
import PeerWidget from "./PeerWidget.js";
import PeerOverlay from "./PeerOverlay.js";

export default function PeerRoot() {
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);

    return (
        <>
            <PeerWidget onOpenOverlay={() => setIsOverlayOpen(true)} />
            <PeerOverlay isOpen={isOverlayOpen} onClose={() => setIsOverlayOpen(false)} />
        </>
    );
}
