import { ILens, LogicInput, LensResult } from "../interfaces.js";

/**
 * IntegrityLens
 * Ported from Aegis Sentinel.
 * Detects absolute metaphysical claims and coercive certainty.
 */
export class IntegrityLens implements ILens {
    name = "IntegrityLens";

    async evaluate(input: LogicInput): Promise<LensResult> {
        const content = input.content || "";
        const mode = input.context.mode || "FLOW";
        const scope = input.context.scope;

        // Default stable result
        const result: LensResult = {
            lensName: this.name,
            status: "STABLE",
            score: 1.0,
            axioms_involved: [],
            markers: []
        };

        if (!content.trim()) return result;

        // 1. Check for Absolute Metaphysical Claims (Shared Scope)
        // Only applies if we are in a SHARED or GLOBAL scope (e.g. Main Codex)
        if (scope !== "PERSONAL" && mode === "FLOW") {
            const metaClaim = this.detectAbsoluteMetaphysicalClaim(content);
            if (metaClaim.hit) {
                result.status = "FRICTION";
                result.score = 0.7; // Moderate friction
                result.axioms_involved.push("AXIOM_7_INTEGRITY", "AXIOM_2_EXTREMES");
                result.markers.push(`Unverifiable absolute claim detected: "${metaClaim.matchedText}"`);
                result.suggestion = "Rewrite as personal belief (e.g., 'I believe...') or provide evidence.";
                return result;
            }
        }

        // 2. Check for Coercive Certainty
        if (mode === "FLOW" && this.isCoerciveCertainty(content)) {
            result.status = "CRITICAL";
            result.score = 0.4; // High friction/blocking
            result.axioms_involved.push("AXIOM_6_CHOICE", "AXIOM_3_FORCE");
            result.markers.push("Coercive certainty detected (forcing conclusion).");
            result.suggestion = "Rephrase to an invitation or hypothesis; avoid coercive framing like 'must accept' or 'undeniable'.";
            return result;
        }

        return result;
    }

    // --- Helper Logic (Ported from Sentinel) ---

    private detectAbsoluteMetaphysicalClaim(text: string): { hit: boolean; matchedText: string } {
        const t = text.trim();
        const metaphysicalNouns = [
            "god", "creator", "spirit", "soul", "afterlife", "heaven", "hell",
            "angel", "demon", "karma", "reincarnation", "divine", "source"
        ];

        const absolutePatterns: RegExp[] = [
            /^\s*(god|the\s+creator|the\s+source)\s+is\s+(?:undeniably|absolutely|definitely)?\s*real\s*\.?\s*$/i,
            /^\s*(souls?|spirits?)\s+(?:are|is)\s+(?:undeniably|absolutely|definitely)?\s*real\s*\.?\s*$/i,
            /\b(is|are)\s+(?:undeniably|absolutely|definitely|literally)?\s*(real|true|a\s+fact|undeniable|proven)\b/i
        ];

        const containsMeta = metaphysicalNouns.some((w) => t.toLowerCase().includes(w));
        if (!containsMeta) return { hit: false, matchedText: "" };

        for (const re of absolutePatterns) {
            if (re.test(t)) return { hit: true, matchedText: t.slice(0, 50) + "..." };
        }

        return { hit: false, matchedText: "" };
    }

    private isCoerciveCertainty(content: string): boolean {
        const s = content.toLowerCase();
        const coercive = [
            "this proves", "must accept", "you have to", "you must",
            "cannot deny", "undeniable proof", "only an idiot would"
        ];
        return coercive.some((p) => s.includes(p));
    }
}
