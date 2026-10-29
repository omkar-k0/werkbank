// Usernames are global (one login box for every shop), lowercase, and chosen by the owner.
export const USERNAME_RULE = /^[a-z0-9][a-z0-9._-]{2,39}$/;

export const normalizeUsername = (v: string) => v.trim().toLowerCase();

const slug = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

// "Jonas Weber" at "Crackmo Möbel" -> "jonas.crackmo". Only a suggestion: the owner can change it,
// and the server decides whether it is free.
export function suggestUsername(personName: string, shopName: string): string {
  const first = slug(personName.trim().split(/\s+/)[0] ?? "");
  const shop = slug(shopName.trim().split(/\s+/)[0] ?? "");
  return [first, shop].filter(Boolean).join(".");
}
