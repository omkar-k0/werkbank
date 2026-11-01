# Design notes

Direction: Apple-like minimalism with the warm wood palette. Designed in Google Stitch, rebuilt in the
existing components (so translations, tests and live data keep working).

- Colours unchanged: paper `#F7F2E8`, card `#FFFDF8`, ink `#2B221A`, walnut `#7A4A2B` as the one accent.
- Type: Newsreader for page titles and big numbers, Inter for everything else.
- One filled (walnut) button per screen. Status is an 8px dot plus a text label, never a coloured pill.
- Hairline borders instead of shadows, 14px card radius, no textures.
- Staff view is phone first: three tabs, one column of cards, 48px buttons.

What was deliberately NOT taken from the Stitch output (it invented these): "System online",
"Routing engine v2.4", order refs and queue positions, Export / Print / Add note buttons, probability
percentages above 99%+, footer links to pages that do not exist, and the PRD's performance claims.

`preview/` holds screenshots of the current build (en-*, de-*; phone-* are 390px wide at 2x).
