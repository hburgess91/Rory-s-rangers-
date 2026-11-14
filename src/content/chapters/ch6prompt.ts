import type { Line } from "../../data/types";
import { dir } from "../dsl";

/** Shown when Chapter 5 is done: Chapter 6 is the point of no return. */
export const KR6_LAST_CHANCE: Line[] = [
  dir("⚠ A WORD OF WARNING. Chapter 6 is coming, and once it starts there's no going back. Things are going to get very, very loud."),
  dir("This is your LAST CHANCE to gather weapons, ammo, upgrades, Krezzcoin and Krokens: the Kreddle Exchange, the slots, the bank, the armoury, the side quests. Do it now."),
  dir("When you're ready, go to the Town Hall to begin Chapter 6."),
];

/** After the Town Hall comes down: the sixth cum crystal turns up. Nobody earned it. */
export const CRYSTAL_SIX: Line[] = [
  dir("Black. A ringing noise. Dust. Somebody is coughing. Somebody else is saying 'yee', very quietly."),
  dir("In the rubble where the Town Hall used to be, something is glowing pink."),
  dir("It's a cum crystal. The sixth one. It's just… there. Nobody knows where it came from. Nobody asks."),
  dir("CUM CRYSTALS: 6/6."),
];
