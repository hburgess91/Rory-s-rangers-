# Chat canon notes (internal)

Curated notes from the four Messenger exports (K1–K4, ~34,600 unique messages after
de-duplication, Feb 2022 – Feb 2025). This is the lore bible the game was written from.
The raw exports are **not** in the repo and are never bundled. Verbatim lines the game uses
live in `src/content/archive/canonQuotes.ts`, each with its original timestamp.

## Who is who

| Krel name | Real name | Notes |
|---|---|---|
| Drongus B. Drippin' | Harry | Leader, lore engine, AI songs/scripts/wiki. Previously Drippy Drongus, Gartlin, Bonky Bonkit, Richie Prescripshi. |
| Scrombus | Ben Matthews | Added 31 Dec 2024, 21:46 — "the prophecy… it was all true". Minister of Lore (wanted Lore/Prophecy; also "Minister of AI"). |
| Krezmar | Charlie Brinkley | Money & Loans. Fizzy bongo withdrawals. Pussy juice vending machines. |
| Kreblis | David Gray | "Minister of all the crazy things that have been occurring of late". Krelmergency messages. |
| Krezwonk | Mart Johnson (Moborsh Creltu) | Prophecy. Lurks. Wrote the Krezmond saga. |
| Krebon | Benn Orgill | Named by a menu ("Krebon   Real butter .. krebon is coming") before he was named in chat. Minister of Krunching. |
| Lil' Crongus / Lulon | Luke Shears | Children's Minister. Last vestige of the Cron era. Said "salmon diet" in 2022. |
| Gronny G | Rory Burgess | Gut-Stank Gronston. Minister Without Portfolio (or RuneScape). Shorts at minus six; Krez-ousers held to ransom. |
| Flenky Jenky | James Jenkins | Removed from the group 9 times. "Banned until she dies" (the Queen, Sept 2022). |
| Mikey Nevitt | Mikey | FGM ULTRA era. Operation Fragmar operative. "i think he's bluffing anyway". |
| Proctus Krelmor | (fictional) | Grown from Detective Krelmor (Krebley case) and "Frothy krelmor" (Mikey, May 2022). |

Polson and Eden are outside the group. In the game they are fictionalised NPCs; the jokes
are about indecision, permissions, cheese and the Mork Voice — not about the real people.

## Key sequences (all dramatised in game)

- **Motto** — 29 Dec 2024: group renamed "'KREZZING' KREW … (AKA "KRELWORLD" - WONK IT 'TIL YOU KREZ)".
- **Origin lore** — 31 Dec 2024: Krelford, Wildern (Krelford branch), the chosen one, the Scrombus prophecy. "whatever I don't care, no big deal, what the fuck ever."
- **National drink** — 31 Dec 2024, 20:04: "The national drink of krelworld is pussy juice!"
- **Krazy Fact Emergency** — 4 Jan 2025: 24-hour ultimatum, "What's the plural of Drongus?" "Drongi", Scrombus's scringleberry creation myth / Krezzsplosion, the wonking-and-krezzing strike, Krezwonk's Krezmond saga.
- **Cabinet** — 9 Jan 2025: Flenky suggests it, Drongus takes all roles, Scrombus's poll, Drongus votes No, ministries assigned (two offensive portfolios redacted in game), "Fuck sake".
- **Defence** — 10 Jan 2025: Extra Virgin Krezz oil ransom, "Who was in charge of defence?" "No one is." Krezbians (80m, cannons for right arms, purple).
- **Wiki & TV** — 13 Jan 2025: Krelworld wiki, Cuddle/Kuddle Kronster, "Thick cumming cock", vending machines, pipelines, Umami Punani advert.
- **Threat level purple** — 15 Jan 2025: "Is purple high or low?"
- **Wonking Machine & appreciation** — 15 Jan 2025: reach-around feature, Big Bertha, waste pipe into the water dispenser, 98 minutes of silence, "I'm here 4 u", "make this environment much more hostile", Drongus's AI craft explanation (10–20 regenerations per song).
- **Kreltower** — destroyed Jan 2025 (Flenky "ninja backflip"), breached again Feb 2025.
- **Crobley Arc** — 6 Feb 2025: "Nibble on a crobley".
- **Boner control repository** — Feb 2025 group rename → the Ministry of Boner Control.
- **Vouchers** — 25 Feb 2025: "I give this group chat my all… no Door dash gift voucher…", "You should start a krelfund x", "There's a new sheriff in town boys…".
- **FGM ULTRA** — Cheesegate & "the nuclear war option" (14 Apr 2022, attributed to Drongus — the game's Archive disputes Mikey's claim), Operation Fragmar (16 Apr 2022, 03:27, "Maybe 12 Midday"), the Mork Voice (19 May 2022, audio not preserved).

## Deliberately left out

Slurs, racist "themes", rape and CSAM jokes, threats, and the personal attacks on Polson and
Eden that run through the FGM-era chat. `tests/content.test.ts` fails the build if any of the
listed slurs appear in shipped content. The one darker piece kept is *Thick Cumming Cock*
Episode 7, which was supplied as an authored script and is staged as written (disclosure is
dialogue-only, the 9/11 cut is stylised, with a content note).
