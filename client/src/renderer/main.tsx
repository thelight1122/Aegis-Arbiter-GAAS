import React from "react";
import { createRoot } from "react-dom/client";
import { AegisOverlay } from "./components/AegisOverlay";

const root = createRoot(document.getElementById("root")!);
root.render(<AegisOverlay />);
