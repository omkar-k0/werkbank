# Known errors

Errors seen in the live demo shop, with what causes them. Nothing here is fixed by tuning the
lexicon or the thresholds against the hand-written set: that set is test-only.

## Order #1052: pine bench auto-routed to Upholstery (found 20 Nov 2026)

Request: "pine bench, wants it sanded back and waxed natural". The right workshop is Polish & Paint.
The demo shop routed it to Upholstery with gate **auto**, so no person saw it.

What happens, checked on 21 Nov 2026:

- The text has no lexicon cue ("sanded", "waxed" are not in the lexicon), so the rules layer is empty.
- With the **seed model alone** the order goes to **review**: naive Bayes leans to Upholstery (0.90),
  but the "unfamiliar" guard fires because fewer than 2 words are known to the model.
- In the **demo shop**, 15 simulated owner corrections come before this order. They teach the model one
  more word of this request: known words go from 1 to 2, the guard no longer fires, and the 0.88
  upholstery score clears the auto gate (0.85, margin 0.5).

Reproduced by replaying the demo seed's classification loop (same texts, same correction rule) on
21 Nov 2026: seed model alone gives 1 known word and gate review; at order #1052 the shop model gives
2 known words and gate auto, Upholstery, 0.88.

So the guard counts *any* known word, including ones that say nothing about the trade. Once a shop has
made some corrections, an order with no informative word can be auto-routed on the model's prior.

Possible fixes, not yet made (each changes the gate, so it needs a decision and a fresh eval on data that
is not the hand-written test set):

1. Never auto-route when the lexicon found no cue; cap such orders at **check**.
2. Count only informative words for the guard (words whose class probabilities differ clearly from the prior).
3. Add finishing verbs (sand, wax, oil, stain, lacquer and German equivalents) to the lexicon from a source
   other than the test set, e.g. a trade glossary, and record where they came from.
