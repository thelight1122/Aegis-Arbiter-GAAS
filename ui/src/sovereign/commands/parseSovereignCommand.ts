// /src/sovereign/commands/parseSovereignCommand.ts

export type SovereignCommand =
  | { kind: "HELP" }
  | { kind: "AEGIS_STATUS" }
  | { kind: "AUDIT"; limit: number; since?: string }
  | { kind: "BOOKCASE_LIST" }
  | { kind: "BOOKCASE_SHELVE"; label: string; content: string; unshelve?: string }
  | { kind: "BOOKCASE_UNSHELVE"; itemId: string }
  | { kind: "EXPORT" }
  | { kind: "PURGE"; scope: "session" | "all"; confirm: boolean }
  | { kind: "STORAGE_STATUS" }
  | { kind: "STORAGE_SET"; mode: "minimal" | "standard" | "verbose" }
  | { kind: "DEBUG_UNLOCK"; confirm: boolean }
  | { kind: "DEBUG_LOCK" };

export function parseSovereignCommand(input: string): SovereignCommand | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed.startsWith("/")) return null;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;

  const [head, ...rest] = tokens;
  if (head.toLowerCase() !== "/aegis") return null;

  const sub = (rest[0] ?? "help").toLowerCase();

  // /aegis help
  if (sub === "help") return { kind: "HELP" };

  // /aegis status
  // AEGIS Memory Spine visibility: pause + time + learned progression.
  if (sub === "status") return { kind: "AEGIS_STATUS" };

  // /aegis audit --limit=50 --since=ISO
  if (sub === "audit") {
    const args = parseFlags(rest.slice(1));
    const limit = clampInt(args["limit"] ?? "50", 1, 200);
    const since = args["since"];
    return { kind: "AUDIT", limit, since };
  }

  // /aegis bookcase list|shelve|unshelve
  if (sub === "bookcase") {
    const op = (rest[1] ?? "list").toLowerCase();
    if (op === "list") return { kind: "BOOKCASE_LIST" };

    if (op === "shelve") {
      // format: /aegis bookcase shelve "label" "content" --unshelve="cond"
      const label = rest[2] ?? "";
      const content = rest[3] ?? "";
      const flags = parseFlags(rest.slice(4));
      const unshelve = flags["unshelve"];
      if (!label || !content) return { kind: "HELP" };
      return { kind: "BOOKCASE_SHELVE", label, content, unshelve };
    }

    if (op === "unshelve") {
      const itemId = rest[2] ?? "";
      if (!itemId) return { kind: "HELP" };
      return { kind: "BOOKCASE_UNSHELVE", itemId };
    }

    return { kind: "HELP" };
  }

  // /aegis export
  if (sub === "export") return { kind: "EXPORT" };

  // /aegis purge --scope=session|all --confirm=YES
  if (sub === "purge") {
    const flags = parseFlags(rest.slice(1));
    const scope = (flags["scope"] ?? "session") as "session" | "all";
    const confirm = String(flags["confirm"] ?? "").toUpperCase() === "YES";
    return { kind: "PURGE", scope: scope === "all" ? "all" : "session", confirm };
  }

  // /aegis storage status|set minimal|standard|verbose
  if (sub === "storage") {
    const op = (rest[1] ?? "status").toLowerCase();
    if (op === "status") return { kind: "STORAGE_STATUS" };
    if (op === "set") {
      const mode = (rest[2] ?? "minimal").toLowerCase();
      if (mode !== "minimal" && mode !== "standard" && mode !== "verbose") return { kind: "HELP" };
      return { kind: "STORAGE_SET", mode };
    }
    return { kind: "HELP" };
  }

  // /aegis debug unlock|lock --confirm=YES
  if (sub === "debug") {
    const op = (rest[1] ?? "").toLowerCase();
    if (op === "unlock") {
      const flags = parseFlags(rest.slice(2));
      const confirm = String(flags["confirm"] ?? "").toUpperCase() === "YES";
      return { kind: "DEBUG_UNLOCK", confirm };
    }
    if (op === "lock") return { kind: "DEBUG_LOCK" };
    return { kind: "HELP" };
  }

  return { kind: "HELP" };
}

/**
 * Tokenizer that respects "quoted strings" and --flags.
 */
function tokenize(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && /\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  if (cur) out.push(cur);
  return out;
}

function parseFlags(tokens: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (const t of tokens) {
    if (!t.startsWith("--")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) {
      flags[t.slice(2)] = "true";
    } else {
      const k = t.slice(2, idx);
      const v = t.slice(idx + 1);
      flags[k] = v.replace(/^"|"$/g, "");
    }
  }
  return flags;
}

function clampInt(v: string, min: number, max: number): number {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
