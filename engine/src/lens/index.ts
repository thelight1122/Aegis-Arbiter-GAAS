export interface LensResult {
  tags: string[];
  tension: string;
  lens: Record<string, string>;
}

export function routeInput(_input: string): LensResult {
  return {
    tags: ["unclassified"],
    tension: "neutral",
    lens: { mental: "steady" }
  };
}
