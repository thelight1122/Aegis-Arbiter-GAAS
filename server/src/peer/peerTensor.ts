// /src/peer/peerTensor.ts

export type PeerNote = {
  id: string;
  timestamp: string;
  author: "human" | "ai";
  scope: string; // e.g. "ui-api", "family-hub", "arbiter-core"
  type:
    | "decision"
    | "constraint"
    | "preference"
    | "naming"
    | "correction"
    | "incomplete"
    | "resolved";
  content: string;
  refs?: string[]; // file paths or symbols this note applies to
};

export type PeerTensor = {
  session_id: string;
  project: string;
  notes: PeerNote[];
};
