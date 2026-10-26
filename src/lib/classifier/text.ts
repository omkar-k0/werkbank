// Text normalisation shared by training and inference. Anything that
// changes here changes the model, so retrain after edits.

const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

const STOPWORDS = new Set(
  (
    "a an the and or but of to in on at for with from by is are was were be been it its this that these those " +
    "my our your their his her we you they i me us them pls please can could would will hi hello dear thanks thank " +
    "customer says said wants want need needs needed also just very really some any has have had do does did " +
    "der die das und oder ein eine einen mit von zu im am ist sind bitte hallo danke unser unsere mein meine"
  ).split(" "),
);

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUTS[c] ?? c)
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Deliberately light stemmer: strips plural / verb endings so that
// "scratches", "scratched", "scratch" collapse to one feature.
export function stem(word: string): string {
  if (word.length <= 3) return word;
  for (const suf of ["ings", "ing", "ies", "es", "ed", "s"]) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      const base = word.slice(0, -suf.length);
      return suf === "ies" ? base + "y" : base;
    }
  }
  return word;
}

export function tokens(text: string): string[] {
  return normalise(text)
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

// Unigrams + bigrams. Bigrams catch "broken leg" vs "broken weld".
export function features(text: string): string[] {
  const t = tokens(text);
  const out = [...t];
  for (let i = 0; i < t.length - 1; i++) out.push(`${t[i]}_${t[i + 1]}`);
  return out;
}
