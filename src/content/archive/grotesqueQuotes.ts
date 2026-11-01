// Generated from the group chat exports: the harder-edged lines. Slurs are fully starred out.
export interface GrotesqueLine {
  id: string;
  speaker: string;
  text: string;
  ts: number;
  date: string;
  tags: string[];
  theme: "body" | "sex" | "roast" | "dark" | "threat" | "food" | "rant" | "polson" | "misc";
  group?: string;
}

export const GROTESQUE: GrotesqueLine[] = [];
