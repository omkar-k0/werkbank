import type { Capability } from "./types";

// Hand-written cue lexicon: the cheap deterministic layer.
// Weight 3 = decisive on its own, 2 = strong, 1 = supporting.
// Cues are matched on normalised text (lowercase, umlauts folded),
// as whole words or phrases. English + German, since the target
// shops are in Germany and staff write in both.
export const LEXICON: Record<Capability, Record<string, number>> = {
  carpentry: {
    "broken leg": 3, "loose joint": 3, "wobbly": 2, "wobbles": 2, "wobble": 2, "joint": 2, "joinery": 3,
    "drawer": 2, "drawer stuck": 3, "runner": 2, "shelf": 2, "shelves": 2, "slat": 3, "slats": 3,
    "cracked wood": 3, "split": 2, "crack": 1, "dowel": 3, "mortise": 3, "plywood": 3, "mdf": 3,
    "veneer": 2, "teak": 2, "oak": 1, "walnut": 1, "sheesham": 2, "solid wood": 2, "wooden": 1,
    "cut to size": 3, "panel": 1, "carcass": 3, "termite": 3, "woodworm": 3, "door hanging": 2,
    "tischler": 3, "schreiner": 3, "holz": 2, "bein": 2, "wackelt": 3, "schublade": 3, "regal": 2,
  },
  upholstery: {
    "fabric": 3, "torn fabric": 3, "cushion": 3, "cushions": 3, "foam": 3, "sagging": 2, "sag": 2,
    "reupholster": 3, "re upholster": 3, "upholstery": 3, "cover": 2, "covers": 2, "stuffing": 3,
    "springs": 2, "spring": 1, "leather": 2, "faux leather": 3, "velvet": 3, "button tufting": 3,
    "tufting": 3, "seat padding": 3, "padding": 2, "stitching": 2, "seam": 2, "zip": 2, "headboard": 1,
    "stoff": 3, "polster": 3, "bezug": 3, "kissen": 3, "schaumstoff": 3, "leder": 2, "naht": 2,
  },
  finishing: {
    "scratch": 2, "scratches": 2, "scratched": 2, "polish": 3, "repolish": 3, "faded": 2, "fade": 2,
    "repaint": 3, "paint": 2, "painted": 2, "lacquer": 3, "varnish": 3, "stain": 2, "re stain": 3,
    "water ring": 3, "water rings": 3, "white marks": 3, "heat mark": 3, "gloss": 2, "matte": 2,
    "colour": 1, "color": 1, "darker": 2, "shade": 1, "duco": 3, "pu finish": 3, "wax": 2, "sanding": 2,
    "dull": 2, "peeling": 1, "kratzer": 3, "lack": 3, "lackieren": 3, "politur": 3, "beizen": 3,
  },
  metal: {
    "weld": 3, "welding": 3, "welded": 3, "rust": 3, "rusted": 3, "rusty": 3, "iron": 2,
    "wrought iron": 3, "steel": 2, "metal": 2, "metal frame": 3, "aluminium": 3, "aluminum": 3,
    "powder coat": 3, "powder coating": 3, "bent": 2, "bolt": 1, "brass": 2, "chrome": 2,
    "bunk bed": 1, "garden chair": 1, "railing": 2, "rost": 3, "metall": 3, "stahl": 3, "eisen": 3,
    "schweissen": 3, "geschweisst": 3,
  },
};

// Pre-sort cues longest-first so phrase matches win over single words.
const CUES = (Object.entries(LEXICON) as [Capability, Record<string, number>][])
  .flatMap(([cap, cues]) => Object.entries(cues).map(([cue, w]) => ({ cap, cue, w })))
  .sort((a, b) => b.cue.length - a.cue.length);

export interface CueHit {
  cue: string;
  capability: Capability;
  weight: number;
}

export function matchCues(normalisedText: string): CueHit[] {
  let text = ` ${normalisedText} `;
  const hits: CueHit[] = [];
  for (const { cap, cue, w } of CUES) {
    const needle = ` ${cue} `;
    if (text.includes(needle)) {
      hits.push({ cue, capability: cap, weight: w });
      // consume the phrase so "broken leg" doesn't also count "leg" elsewhere
      text = text.split(needle).join(" ");
    }
  }
  return hits;
}
