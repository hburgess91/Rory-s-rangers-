export type Behavior = "chaser" | "charger" | "shooter" | "bomber" | "spawner" | "blinker" | "orbiter" | "swarm";

export interface EnemyDef {
  id: string;
  name: string;
  behavior: Behavior;
  hp: number;
  speed: number;
  damage: number;
  size: number; // sprite pixel size (square)
  color: number;
  accent: number;
  shape: "fish" | "blob" | "bubble" | "humanoid" | "box" | "ghost" | "page" | "drone" | "brute" | "mite";
  label?: string; // tiny glyph drawn on the sprite
  projectile?: { speed: number; damage: number; color: number; rate: number; spread?: number; count?: number };
  coins: number;
  krezz: number;
  counter?: string;
  spawns?: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  // Chapter 1 — Wildern Academy
  smolt: { id: "smolt", name: "Smolt", behavior: "swarm", hp: 14, speed: 120, damage: 6, size: 12, color: 0xff8a73, accent: 0xffffff, shape: "fish", coins: 2, krezz: 2, counter: "kill_smolt" },
  dinner_lady: { id: "dinner_lady", name: "Dinner Lady Ghoul", behavior: "charger", hp: 46, speed: 80, damage: 14, size: 18, color: 0x8fa38f, accent: 0xffffff, shape: "humanoid", coins: 6, krezz: 5 },
  wisp: { id: "wisp", name: "Notification Wisp", behavior: "shooter", hp: 24, speed: 90, damage: 8, size: 14, color: 0x3b82f6, accent: 0xff3b30, shape: "bubble", label: "1", projectile: { speed: 170, damage: 8, color: 0x3b82f6, rate: 1700 }, coins: 4, krezz: 4, counter: "kill_wisp" },
  tray_turret: { id: "tray_turret", name: "School Dinner Tray", behavior: "orbiter", hp: 30, speed: 70, damage: 6, size: 14, color: 0xb0b8c0, accent: 0x6b7280, shape: "box", projectile: { speed: 190, damage: 7, color: 0xd1d5db, rate: 1400 }, coins: 4, krezz: 3 },
  // Chapter 2 — Polson Towers / Reaction Network
  friend_crawler: { id: "friend_crawler", name: "Friend Request", behavior: "chaser", hp: 30, speed: 105, damage: 9, size: 14, color: 0x1877f2, accent: 0xffffff, shape: "blob", label: "+", coins: 4, krezz: 3 },
  plushie: { id: "plushie", name: "Stuffed Toy", behavior: "chaser", hp: 26, speed: 95, damage: 8, size: 14, color: 0xc08457, accent: 0xffffff, shape: "blob", coins: 3, krezz: 3 },
  trinket: { id: "trinket", name: "Trinket Swarm", behavior: "swarm", hp: 12, speed: 150, damage: 5, size: 10, color: 0xa78bfa, accent: 0xfde68a, shape: "mite", coins: 1, krezz: 2 },
  mould: { id: "mould", name: "Mouldy Takeaway", behavior: "shooter", hp: 30, speed: 70, damage: 8, size: 14, color: 0x84cc16, accent: 0x3f6212, shape: "box", projectile: { speed: 160, damage: 7, color: 0x9ccc65, rate: 1700 }, coins: 4, krezz: 4 },
  mould_pizza: { id: "mould_pizza", name: "Furry Pizza", behavior: "charger", hp: 44, speed: 85, damage: 13, size: 17, color: 0x65a30d, accent: 0xfacc15, shape: "brute", coins: 5, krezz: 5 },
  cheese_mite: { id: "cheese_mite", name: "Cheese Mite", behavior: "swarm", hp: 10, speed: 135, damage: 5, size: 9, color: 0xffd23f, accent: 0xb58b00, shape: "mite", coins: 1, krezz: 2 },
  blocked_brute: { id: "blocked_brute", name: "Blocked User", behavior: "charger", hp: 70, speed: 70, damage: 16, size: 22, color: 0x4b5563, accent: 0xef4444, shape: "brute", label: "⊘", coins: 9, krezz: 6 },
  pending_orb: { id: "pending_orb", name: "Pending Request", behavior: "bomber", hp: 26, speed: 95, damage: 20, size: 14, color: 0x9ca3af, accent: 0xffffff, shape: "bubble", label: "…", coins: 4, krezz: 4 },
  // Chapter 3 — Ministry of Boner Control
  pipe_gremlin: { id: "pipe_gremlin", name: "Pipe Gremlin", behavior: "chaser", hp: 34, speed: 115, damage: 10, size: 13, color: 0xd97706, accent: 0x1f2937, shape: "humanoid", coins: 4, krezz: 3 },
  krezbian: { id: "krezbian", name: "Krezbian", behavior: "shooter", hp: 64, speed: 75, damage: 12, size: 20, color: 0x8b5cf6, accent: 0x4c1d95, shape: "brute", projectile: { speed: 230, damage: 12, color: 0xc084fc, rate: 1500 }, coins: 8, krezz: 6 },
  vending_mimic: { id: "vending_mimic", name: "Vending Mimic", behavior: "bomber", hp: 50, speed: 85, damage: 24, size: 18, color: 0xff4fa3, accent: 0x111827, shape: "box", label: "PJ", coins: 10, krezz: 5 },
  krez_leak: { id: "krez_leak", name: "Krez Leak", behavior: "spawner", hp: 60, speed: 0, damage: 6, size: 18, color: 0xf5f0dc, accent: 0xd4d4aa, shape: "blob", spawns: "pipe_gremlin", coins: 8, krezz: 8 },
  // Chapter 4 — Bonky Temple
  cultist: { id: "cultist", name: "Bonky Cultist", behavior: "chaser", hp: 38, speed: 110, damage: 11, size: 15, color: 0x7c2d12, accent: 0xfbbf24, shape: "humanoid", coins: 5, krezz: 4 },
  decree_drone: { id: "decree_drone", name: "Decree Drone", behavior: "orbiter", hp: 36, speed: 95, damage: 9, size: 14, color: 0xfbbf24, accent: 0x7c2d12, shape: "drone", label: "!", projectile: { speed: 210, damage: 9, color: 0xfde68a, rate: 1200, spread: 0.25, count: 2 }, coins: 5, krezz: 5 },
  hammerling: { id: "hammerling", name: "Hammerling", behavior: "charger", hp: 66, speed: 75, damage: 18, size: 20, color: 0x6b7280, accent: 0xfbbf24, shape: "brute", coins: 9, krezz: 6 },
  // Chapter 5 — Krezteua d'If
  betrayer: { id: "betrayer", name: "Betrayer Shade", behavior: "blinker", hp: 44, speed: 100, damage: 14, size: 16, color: 0x334155, accent: 0x94a3b8, shape: "ghost", coins: 6, krezz: 6 },
  guard_ghost: { id: "guard_ghost", name: "Prison Guard (Version B)", behavior: "shooter", hp: 48, speed: 70, damage: 11, size: 16, color: 0x64748b, accent: 0xe2e8f0, shape: "ghost", projectile: { speed: 200, damage: 11, color: 0xcbd5e1, rate: 1400, spread: 0.3, count: 3 }, coins: 6, krezz: 6 },
  record: { id: "record", name: "Conflicting Record", behavior: "chaser", hp: 40, speed: 100, damage: 10, size: 15, color: 0xe7d8b0, accent: 0x7f1d1d, shape: "page", label: "?", coins: 5, krezz: 5 },
  // Chapter 6 — Wiki Citadel
  citation: { id: "citation", name: "[citation needed]", behavior: "swarm", hp: 22, speed: 140, damage: 8, size: 11, color: 0x3366cc, accent: 0xffffff, shape: "page", label: "?", coins: 3, krezz: 3 },
  wiki_fragment: { id: "wiki_fragment", name: "Wiki Fragment", behavior: "orbiter", hp: 50, speed: 100, damage: 10, size: 16, color: 0xf8fafc, accent: 0x334155, shape: "page", label: "W", projectile: { speed: 230, damage: 10, color: 0xe5e7eb, rate: 1100 }, coins: 6, krezz: 6 },
  deleted_text: { id: "deleted_text", name: "Deleted Text", behavior: "bomber", hp: 40, speed: 120, damage: 22, size: 15, color: 0xdc2626, accent: 0xffffff, shape: "page", label: "✕", coins: 5, krezz: 5 },
  ai_portrait: { id: "ai_portrait", name: "AI Portrait", behavior: "shooter", hp: 58, speed: 70, damage: 12, size: 18, color: 0xffd23f, accent: 0x111827, shape: "box", label: "AI", projectile: { speed: 250, damage: 12, color: 0xffe066, rate: 1300, spread: 0.2, count: 3 }, coins: 8, krezz: 7 },
  unread: { id: "unread", name: "Unread Notification", behavior: "shooter", hp: 28, speed: 100, damage: 9, size: 13, color: 0xff3b30, accent: 0xffffff, shape: "bubble", label: "9", projectile: { speed: 200, damage: 9, color: 0xff3b30, rate: 1500 }, coins: 4, krezz: 4, counter: "kill_wisp" },
  // Kreltower plot — Krozno's bandits
  bandit: { id: "bandit", name: "Krozno's Bandit", behavior: "chaser", hp: 48, speed: 120, damage: 12, size: 15, color: 0x3f3f46, accent: 0xef4444, shape: "humanoid", coins: 6, krezz: 5 },
  bandit_gunner: { id: "bandit_gunner", name: "Bandit Lookout", behavior: "shooter", hp: 44, speed: 85, damage: 11, size: 15, color: 0x52525b, accent: 0xfacc15, shape: "humanoid", projectile: { speed: 240, damage: 11, color: 0xfacc15, rate: 1300 }, coins: 6, krezz: 5 },
  trolley: { id: "trolley", name: "Possessed Drinks Trolley", behavior: "charger", hp: 70, speed: 70, damage: 18, size: 18, color: 0xd1d5db, accent: 0xe0a35a, shape: "box", label: "B", coins: 9, krezz: 6 },
  // Drongus's army (Citadel parade ground)
  soldier: { id: "soldier", name: "Krelworld Guardsman", behavior: "chaser", hp: 56, speed: 110, damage: 13, size: 16, color: 0x6d28d9, accent: 0xffd23f, shape: "humanoid", coins: 6, krezz: 6 },
  // Arena minions
  roadie: { id: "roadie", name: "Roadie", behavior: "chaser", hp: 40, speed: 115, damage: 10, size: 15, color: 0x1f2937, accent: 0xe5e7eb, shape: "humanoid", coins: 5, krezz: 4 },
  gym_bro: { id: "gym_bro", name: "Gym Bro", behavior: "charger", hp: 60, speed: 85, damage: 14, size: 18, color: 0xf97316, accent: 0x111827, shape: "brute", coins: 7, krezz: 5 },
  invoice: { id: "invoice", name: "Unpaid Bill", behavior: "swarm", hp: 16, speed: 140, damage: 7, size: 11, color: 0xffffff, accent: 0xdc2626, shape: "page", label: "£", coins: 2, krezz: 2 },
};
