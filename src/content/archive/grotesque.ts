import type { Line } from "../../data/types";
import { canon, dir } from "../dsl";
import { GROTESQUE } from "./grotesqueQuotes";

/** The harder-edged side of the group chat, slipped into Drongus's leak previews. */

let leakCursor = 0;
/** Two extra, nastier lines for one of Drongus's leak previews. */
export function leakExtras(): Line[] {
  const pool = GROTESQUE.filter((g) => g.leak);
  if (!pool.length) return [];
  const out = [pool[leakCursor % pool.length], pool[(leakCursor + 7) % pool.length]];
  leakCursor += 3;
  return out.map((l) => canon(l.id));
}

/** The rest of the record: extra lines appended to the archive entries they belong with. */
const ARCHIVE_EXTRAS: Record<string, string[]> = {
  arch_fragmar: ["g_infected_1", "g_infected_2", "g_infected_3", "g_infected_4", "g_disgusting_porn_1", "g_disgusting_porn_2", "g_disgusting_porn_3", "g_piss_brain_1", "g_pissed_on_cunt", "g_piss_love_story"],
  arch_fragmar_sequel: ["g_dregs_1", "g_dregs_2", "g_dregs_3", "g_filthy_pig", "g_vomited_program", "g_diarrhoea_flake", "g_rimming", "g_smells_good", "g_shit_photos", "g_smashing_balls", "g_two_bumps", "g_pisstory"],
  arch_flenky_bans: ["g_flenkanal_1", "g_flenkanal_2", "g_flenkanal_3", "g_flenkanal_4", "g_time_to_die", "g_tongue_gary", "g_pool_ball", "g_stolen_porn"],
  arch_parents_rule: ["g_queen_source", "g_queue_1", "g_queue_2", "g_queue_3", "g_queue_4", "g_queue_5"],
  arch_nuclear_option: ["g_murder_brutally", "g_kill_everyone", "g_shank_doctor", "g_bite_dick", "g_bourdain", "g_motherless"],
  arch_squeeze: ["g_nice_cock_1", "g_nice_cock_2", "g_nice_cock_3", "g_nice_cock_4", "g_nice_cock_5", "g_shag_dead_1", "g_shag_dead_2", "g_shag_dead_3", "g_rock_hard", "g_boner_admit", "g_pussy_grease", "g_grum", "g_slytherin", "g_cybercock", "g_winky", "g_menu_tonight"],
  arch_drongus_craft: ["g_ozempic_dick", "g_gave_me_cancer", "g_meta_jail", "g_camera_roll", "g_spit_arsehole", "g_codeine_wank", "g_fuck_fuck"],
  arch_cheesegate: ["g_shit_bath", "g_squalid_mikey", "g_fart_or_shit", "g_slice_bum", "g_prison_fat", "g_oppenheimer_fart", "g_arsehole_imagery", "g_fingers_arse", "g_not_even_blood", "g_vomit_sideways", "g_fat_fuck_gift", "g_dick_cock"],
};

export function weaveArchive<T extends { id: string; original: Line[] }>(list: T[]): T[] {
  const known = new Set(GROTESQUE.map((g) => g.id));
  return list.map((e) => {
    const extra = (ARCHIVE_EXTRAS[e.id] ?? []).filter((id) => known.has(id));
    return extra.length ? { ...e, original: [...e.original, dir("Also in the record, from around the same time:"), ...extra.map((id) => canon(id))] } : e;
  });
}
