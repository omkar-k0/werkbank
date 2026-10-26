/*
 * Synthetic labelled request generator.
 *
 * There is no public dataset of furniture-shop job tickets, so the seed
 * model is trained on generated requests. To keep the evaluation honest:
 *  - TRAIN uses template set A and synonym set A
 *  - TEST uses template set B and synonym set B (never seen in training)
 *  - data/handwritten.json is a separate, hand-written messy set
 * Numbers in the README come from TEST and handwritten, never from TRAIN.
 *
 *   npx tsx scripts/generate-data.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import type { Capability, JobType, LabeledExample } from "../src/lib/classifier/types";

// deterministic RNG so the dataset is reproducible
let seed = 20261026;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];
const chance = (p: number) => rnd() < p;

interface Problem {
  cap: Capability;
  job: JobType;
  // [setA phrasings, setB phrasings]
  text: [string[], string[]];
  items: string[]; // item keys this problem plausibly applies to
}

// items: [setA names, setB names]
const ITEMS: Record<string, [string[], string[]]> = {
  sofa: [["sofa", "3 seater sofa", "sofa set"], ["couch", "settee", "two-seater couch"]],
  armchair: [["armchair", "recliner"], ["lounge chair", "wingback chair"]],
  chair: [["dining chair", "chair"], ["kitchen chair", "side chair"]],
  table: [["dining table", "coffee table"], ["centre table", "work table"]],
  wardrobe: [["wardrobe", "cupboard"], ["almirah", "closet"]],
  bed: [["bed", "king bed", "bed frame"], ["queen bed", "double bed"]],
  shelf: [["bookshelf", "shelf unit"], ["bookcase", "wall rack"]],
  cabinet: [["cabinet", "tv unit"], ["sideboard", "chest of drawers"]],
  stool: [["bar stool", "stool"], ["counter stool", "high stool"]],
  garden: [["garden chair", "patio set"], ["balcony chair", "outdoor bench"]],
  bunk: [["bunk bed", "metal bed"], ["iron cot", "steel bed"]],
  ottoman: [["ottoman", "footstool"], ["pouf", "footrest"]],
  headboard: [["headboard"], ["bed back panel"]],
};

const WOOD = ["chair", "table", "wardrobe", "bed", "shelf", "cabinet", "stool"];
const SOFT = ["sofa", "armchair", "chair", "ottoman", "headboard"];
const METAL = ["garden", "bunk", "stool", "bed", "table"];

const PROBLEMS: Problem[] = [
  // carpentry
  { cap: "carpentry", job: "repair", items: ["chair", "table", "stool", "bed", "cabinet"],
    text: [["one leg is broken", "the legs are wobbly", "a joint has come loose", "it wobbles when you sit"],
           ["a leg snapped off", "it is shaky and unstable", "the frame joints are loose", "it rocks from side to side"]] },
  { cap: "carpentry", job: "repair", items: ["wardrobe", "cabinet"],
    text: [["the drawer is stuck", "the door is hanging off", "a drawer runner broke"],
           ["the drawers will not slide", "the door has dropped and won't close", "the drawer keeps jamming"]] },
  { cap: "carpentry", job: "repair", items: ["bed", "shelf", "table", "wardrobe"],
    text: [["there is a crack in the wood", "a slat is broken", "the side panel split"],
           ["the timber has cracked", "two slats snapped", "the plank is split down the middle"]] },
  { cap: "carpentry", job: "repair", items: WOOD,
    text: [["woodworm damage", "termite damage in the base"], ["little holes from woodworm", "termites have eaten the bottom"]] },
  { cap: "carpentry", job: "custom", items: ["wardrobe", "shelf", "table", "cabinet", "bed"],
    text: [["want a custom one made in teak", "build a new one to fit the wall", "make one in solid wood, cut to size"],
           ["please build one in sheesham to our measurements", "make a made-to-measure one from oak", "design and build one to fit the alcove"]] },
  { cap: "carpentry", job: "custom", items: ["table", "shelf", "cabinet"],
    text: [["extend it by 40 cm", "add two more shelves"], ["make it longer by half a metre", "add extra shelving inside"]] },
  // upholstery
  { cap: "upholstery", job: "repair", items: SOFT,
    text: [["the fabric is torn", "cushions are sagging", "springs are poking out", "the foam is flat"],
           ["there is a rip in the material", "the seat has sunk in", "you can feel the coils through the seat", "the padding has gone hard and thin"]] },
  { cap: "upholstery", job: "refurbish", items: SOFT,
    text: [["want to reupholster it in velvet", "new cover in a different fabric", "replace foam and fabric"],
           ["re-cover it in a new material", "change the cloth to grey linen", "redo the seat with fresh padding and new cloth"]] },
  { cap: "upholstery", job: "repair", items: ["sofa", "armchair", "headboard"],
    text: [["leather is peeling", "stitching came apart", "the zip on the cushion cover broke"],
           ["the leatherette is flaking", "a seam has opened up", "the cushion casing has split along the edge"]] },
  { cap: "upholstery", job: "custom", items: ["headboard", "ottoman", "sofa"],
    text: [["make a new one with button tufting", "custom cushions for the bench"],
           ["create a padded one with deep buttoning", "made-to-order seat pads for the bench"]] },
  // finishing
  { cap: "finishing", job: "refurbish", items: WOOD,
    text: [["the polish has faded", "it needs repolishing", "want it stained darker"],
           ["the finish has gone dull and patchy", "please refinish the surface", "change the shade to dark walnut"]] },
  { cap: "finishing", job: "repair", items: ["table", "cabinet", "wardrobe", "shelf"],
    text: [["there are scratches on top", "white water rings on the surface", "heat mark from a hot plate"],
           ["the top is scuffed and marked", "cloudy marks where glasses stood", "a burn mark left by a hot pan"]] },
  { cap: "finishing", job: "refurbish", items: ["wardrobe", "cabinet", "bed", "chair"],
    text: [["repaint it white", "lacquer is peeling, redo it", "change matte to gloss"],
           ["give it a fresh coat in cream", "the top coat is flaking, please redo", "make the surface shiny instead of flat"]] },
  // metal
  { cap: "metal", job: "repair", items: METAL,
    text: [["the weld broke", "the metal frame is rusted", "one iron leg is bent"],
           ["the joint where the steel pieces meet has cracked", "it is covered in corrosion", "a steel leg got buckled"]] },
  { cap: "metal", job: "refurbish", items: ["garden", "bunk", "stool"],
    text: [["needs powder coating", "remove rust and repaint the iron"],
           ["strip the corrosion and recoat the frame", "give the frame a new baked-on coat"]] },
  { cap: "metal", job: "custom", items: ["table", "shelf", "bed"],
    text: [["make a steel frame for it", "want a wrought iron base"],
           ["fabricate an industrial pipe frame", "build a black iron stand for it"]] },
  // assembly (goes to carpentry in most shops)
  { cap: "carpentry", job: "assembly", items: ["wardrobe", "bed", "shelf", "cabinet"],
    text: [["please assemble the flat pack", "needs dismantling and reassembly for moving"],
           ["put together the self-assembly kit", "take it apart and rebuild it in the new flat"]] },
];

const TEMPLATES: [string[], string[]] = [
  [
    "{item}: {problem}",
    "Customer says the {item} - {problem}.",
    "Hi, our {item} has a problem, {problem}. Can you fix it?",
    "{problem} on {item}, pls check {when}",
    "Walk-in: {item}, {problem}. {extra}",
    "Order for {name}: {item}, {problem}",
  ],
  [
    "Hello, I bought a {item} from you last year and {problem}. {extra}",
    "Phone call from {name}. {Item} - {problem}. {when}",
    "Note: {problem} ({item}). Customer wants a quote.",
    "WhatsApp msg: {item} issue, {problem} {when}",
    "{Item} came in today, {problem}, {extra}",
  ],
];

const NAMES = ["Mrs Sharma", "Mr Becker", "Patel family", "Herr Yilmaz", "Anna", "Mr Khan", "Frau Weber", "Ravi"];
const WHENS = ["", "", "by Friday", "before the wedding", "urgent", "no rush", "next week", "asap"];
const EXTRAS = ["", "", "Will drop it off Monday.", "Pickup needed.", "Photos sent on WhatsApp.", "Wants a price first."];

// German fragments mixed in for some examples
const DE: Partial<Record<Capability, [string[], string[]]>> = {
  carpentry: [["das Bein ist gebrochen", "die Schublade klemmt", "es wackelt"], ["ein Holzbein ist abgebrochen", "der Schrank wackelt stark"]],
  upholstery: [["der Stoff ist gerissen", "neuer Bezug gewünscht", "Kissen durchgesessen"], ["das Polster ist kaputt", "neuer Stoff und Schaumstoff"]],
  finishing: [["Kratzer auf der Platte", "neu lackieren"], ["die Politur ist matt", "bitte neu beizen"]],
  metal: [["Rost am Gestell", "Schweißnaht gebrochen"], ["das Metallgestell ist verbogen", "Stahlrahmen rostet"]],
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// `holdout` marks examples whose problem phrasing or item name is the
// last variant in its list. train.ts calibrates on those after fitting
// on the rest, which mimics meeting unseen wording in production.
function make(set: 0 | 1, n: number): (LabeledExample & { holdout: boolean })[] {
  const out: (LabeledExample & { holdout: boolean })[] = [];
  for (let i = 0; i < n; i++) {
    const p = pick(PROBLEMS);
    const names = ITEMS[pick(p.items)][set];
    const ii = Math.floor(rnd() * names.length);
    const item = names[ii];
    const pi = Math.floor(rnd() * p.text[set].length);
    let problem = p.text[set][pi];
    const holdout = (pi === p.text[set].length - 1 && p.text[set].length > 1) || (ii === names.length - 1 && names.length > 1 && chance(0.5));
    const de = DE[p.cap];
    if (de && chance(0.15)) problem = pick(de[set]);
    const t = pick(TEMPLATES[set]);
    const text = t
      .replace("{item}", item)
      .replace("{Item}", cap(item))
      .replace("{problem}", problem)
      .replace("{name}", pick(NAMES))
      .replace("{when}", pick(WHENS))
      .replace("{extra}", pick(EXTRAS))
      .replace(/\s+/g, " ")
      .trim();
    out.push({ text, capability: p.cap, jobType: p.job, holdout });
  }
  return out;
}

mkdirSync("data", { recursive: true });
const train = make(0, 2400);
const test = make(1, 800);
writeFileSync("data/train.json", JSON.stringify(train, null, 1));
writeFileSync("data/test.json", JSON.stringify(test, null, 1));
console.log(`train ${train.length}, test ${test.length}`);
