// FILE: ui/src/App.tsx
import { useEffect } from "react";
import "./styles.css";
import { MirrorApp } from "./MirrorApp";

const AEGIS_BRAND = Object.freeze({
  documentTitle: "AEGIS — Technical Demonstration",
});

export default function App() {
  useEffect(() => {
    document.title = AEGIS_BRAND.documentTitle;
  }, []);

  return <MirrorApp />;
}
