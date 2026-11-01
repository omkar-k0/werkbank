import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { readFlow, readToken, signFlow, signSession, type Session } from "@/lib/auth";
import { authorizeUrl, newFlow, verifyIdToken } from "@/lib/google";
import {
  BadRequest,
  createWorkshopUser,
  Forbidden,
  getShop,
  listWorkshops,
  login,
  loginWithGoogle,
  NotFound,
  resetWorkshopUserPassword,
  signupWithGoogle,
  workshopUsers,
} from "@/lib/repo";
import { suggestUsername } from "@/lib/username";

const anna = { sub: "g-anna-2", email: "Anna@Crackmo.test", name: "Anna Crack" };

describe("owner sign-in with Google", () => {
  let owner: Session;

  it("the first sign-in creates the shop, the owner and four workshops", async () => {
    owner = await signupWithGoogle(anna, "Crackmo", "pro");
    expect(owner.role).toBe("owner");
    expect(owner.name).toBe("Anna Crack");
    expect((await getShop(owner)).name).toBe("Crackmo");
    expect((await getShop(owner)).plan).toBe("pro");
    expect(await listWorkshops(owner)).toHaveLength(4);
  });

  it("signing up again with the same Google account signs in, it does not make a second shop", async () => {
    const again = await signupWithGoogle(anna, "Another name", "starter");
    expect(again.shopId).toBe(owner.shopId);
    expect((await loginWithGoogle(anna))!.uid).toBe(owner.uid);
  });

  it("an unknown Google account cannot sign in, and a sign-up needs a shop name", async () => {
    expect(await loginWithGoogle({ sub: "g-nobody", email: "nobody@x.test", name: "N" })).toBeNull();
    await expect(signupWithGoogle({ sub: "g-new", email: "new@x.test", name: "N" }, " ", "trial")).rejects.toBeInstanceOf(BadRequest);
  });

  it("an email that belongs to another Google account is refused, not merged", async () => {
    await expect(signupWithGoogle({ sub: "g-impostor", email: "anna@crackmo.test", name: "Impostor" }, "Fake", "trial")).rejects.toBeInstanceOf(BadRequest);
    expect(await loginWithGoogle({ sub: "g-impostor", email: "anna@crackmo.test", name: "Impostor" })).toBeNull();
  });

  it("owners have no password login", async () => {
    expect(await login("anna@crackmo.test", "anything")).toBeNull();
  });
});

describe("workshop staff accounts", () => {
  let owner: Session, other: Session, wsId: string;

  beforeAll(async () => {
    owner = await signupWithGoogle({ sub: "g-staff-owner", email: "o@staff.test", name: "Olga" }, "Staff Shop", "pro");
    other = await signupWithGoogle({ sub: "g-staff-other", email: "p@staff.test", name: "Paul" }, "Other Shop", "pro");
    wsId = (await listWorkshops(owner))[0].id;
  });

  it("the owner creates a staff login with a global username; usernames are not case sensitive", async () => {
    await createWorkshopUser(owner, wsId, "Jonas", "  Jonas.StaffShop ", "pw-12345678");
    const s = await login("JONAS.staffshop", "pw-12345678");
    expect(s).toMatchObject({ role: "staff".replace("staff", "workshop"), workshopId: wsId, shopId: owner.shopId, name: "Jonas" });
    expect(await login("jonas.staffshop", "wrong-password")).toBeNull();
    expect(await login("nobody.here", "pw-12345678")).toBeNull();
  });

  it("a username is taken for every shop, and bad ones are refused", async () => {
    const otherWs = (await listWorkshops(other))[0].id;
    await expect(createWorkshopUser(other, otherWs, "Jonas", "jonas.staffshop", "pw-12345678")).rejects.toThrow(/taken/);
    for (const bad of ["ab", "has space", "UPPER!", "-start", "x".repeat(41), ""])
      await expect(createWorkshopUser(owner, wsId, "X", bad, "pw-12345678"), bad).rejects.toBeInstanceOf(BadRequest);
    await expect(createWorkshopUser(owner, wsId, "X", "short.pw", "short")).rejects.toThrow(/8 characters/);
  });

  it("an owner cannot add staff to another shop's workshop, and staff cannot add staff", async () => {
    const foreignWs = (await listWorkshops(other))[0].id;
    await expect(createWorkshopUser(owner, foreignWs, "X", "x.foreign", "pw-12345678")).rejects.toBeInstanceOf(NotFound);
    const staff = (await login("jonas.staffshop", "pw-12345678"))!;
    await expect(createWorkshopUser(staff, wsId, "X", "x.byStaff", "pw-12345678")).rejects.toBeInstanceOf(Forbidden);
  });

  it("the owner resets a staff password; the old one stops working", async () => {
    const [jonas] = (await workshopUsers(owner)).filter((u) => u.username === "jonas.staffshop");
    await resetWorkshopUserPassword(owner, jonas.id, "brand-new-pw-1");
    expect(await login("jonas.staffshop", "pw-12345678")).toBeNull();
    expect(await login("jonas.staffshop", "brand-new-pw-1")).not.toBeNull();
    await expect(resetWorkshopUserPassword(owner, jonas.id, "short")).rejects.toThrow(/8 characters/);
  });

  it("only the owner of that shop can reset, and never an owner account", async () => {
    const [jonas] = await workshopUsers(owner);
    await expect(resetWorkshopUserPassword(other, jonas.id, "hijack-pw-123")).rejects.toBeInstanceOf(NotFound);
    const staff = (await login("jonas.staffshop", "brand-new-pw-1"))!;
    await expect(resetWorkshopUserPassword(staff, jonas.id, "self-reset-pw-1")).rejects.toBeInstanceOf(Forbidden);
    await expect(resetWorkshopUserPassword(owner, owner.uid, "owner-pw-12345")).rejects.toBeInstanceOf(NotFound);
    expect(await login("jonas.staffshop", "hijack-pw-123")).toBeNull();
  });

  it("the staff list shows usernames and never password hashes", async () => {
    const list = await workshopUsers(owner);
    expect(Object.keys(list[0]).sort()).toEqual(["id", "name", "username", "workshop_id"]);
    expect(await workshopUsers(other)).toHaveLength(0);
  });
});

describe("username suggestions", () => {
  it("first name plus the shop's first word, without umlauts or spaces", () => {
    expect(suggestUsername("Jonas Weber", "Crackmo Möbel GmbH")).toBe("jonas.crackmo");
    expect(suggestUsername("Zoë", "Müller & Söhne")).toBe("zoe.muller");
    expect(suggestUsername("", "Crackmo")).toBe("crackmo");
    expect(suggestUsername("Jonas", "")).toBe("jonas");
  });
});

describe("Google ID token checks", () => {
  const clientId = "client-123.apps.googleusercontent.com";
  let jwks: ReturnType<typeof createLocalJWKSet>;
  let sign: (claims: Record<string, unknown>, o?: { iss?: string; aud?: string; key?: CryptoKey }) => Promise<string>;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const other = await generateKeyPair("RS256");
    jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: "RS256", kid: "k1" }] });
    sign = (claims, o = {}) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "k1" })
        .setIssuer(o.iss ?? "https://accounts.google.com")
        .setAudience(o.aud ?? clientId)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(o.key ?? privateKey);
    (sign as unknown as { forged: CryptoKey }).forged = other.privateKey;
  });

  const good = { sub: "123", email: "a@b.test", email_verified: true, name: "A", nonce: "n1" };
  const check = (t: string, nonce = "n1") => verifyIdToken(t, { clientId, nonce }, jwks);

  it("accepts a correct token", async () => {
    expect(await check(await sign(good))).toEqual({ sub: "123", email: "a@b.test", name: "A" });
  });

  it("refuses wrong audience, issuer, nonce, unverified email, expired or forged tokens", async () => {
    await expect(check(await sign(good, { aud: "someone-else" }))).rejects.toThrow();
    await expect(check(await sign(good, { iss: "https://evil.example" }))).rejects.toThrow();
    await expect(check(await sign(good), "other-nonce")).rejects.toThrow(/Nonce/);
    await expect(check(await sign({ ...good, email_verified: false }))).rejects.toThrow(/verified/);
    await expect(check(await sign({ ...good, email_verified: "true" }))).rejects.toThrow(/verified/);
    await expect(check(await sign({ sub: "1", email_verified: true, nonce: "n1" }))).rejects.toThrow(/profile/);
    const forged = await sign(good, { key: (sign as unknown as { forged: CryptoKey }).forged });
    await expect(check(forged)).rejects.toThrow();
    const expired = await new SignJWT(good).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer("https://accounts.google.com").setAudience(clientId).setIssuedAt(1).setExpirationTime(2).sign((await generateKeyPair("RS256")).privateKey);
    await expect(check(expired)).rejects.toThrow();
  });
});

describe("sign-in flow plumbing", () => {
  it("builds a PKCE authorization URL with fresh state and nonce", () => {
    const a = newFlow();
    const b = newFlow();
    expect(a.state).not.toBe(b.state);
    expect(a.challenge).not.toBe(a.verifier);
    const u = new URL(authorizeUrl({ redirectUri: "https://x.test/api/auth/google/callback", state: a.state, nonce: a.nonce, challenge: a.challenge }));
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("state")).toBe(a.state);
    expect(u.searchParams.get("scope")).toBe("openid email profile");
  });

  it("flow tokens and session tokens cannot stand in for each other", async () => {
    const flow = await signFlow({ state: "s", mode: "login" });
    expect(await readToken(flow)).toBeNull(); // a flow token is not a session
    expect((await readFlow<{ state: string }>(flow))?.state).toBe("s");
    const session = await signSession({ uid: "u", shopId: "s", role: "owner", workshopId: null, name: "N" });
    expect(await readFlow(session)).toBeNull(); // and a session is not a flow token
    expect(await readFlow("garbage")).toBeNull();
  });
});

describe("first-run checklist data", () => {
  it("counts a new shop's orders and staff, per shop", async () => {
    const { createOrder, onboardingStatus } = await import("@/lib/repo");
    const a = await signupWithGoogle({ sub: "g-ob-a", email: "a@ob.test", name: "A" }, "Onboarding A", "trial");
    const b = await signupWithGoogle({ sub: "g-ob-b", email: "b@ob.test", name: "B" }, "Onboarding B", "trial");
    expect(await onboardingStatus(a)).toEqual({ orders: 0, staff: 0 });
    await createOrder(a, { customerName: "C", item: "Sofa", description: "fabric torn, new foam" });
    await createWorkshopUser(a, (await listWorkshops(a))[0].id, "Jo", "jo.onboarda", "pw-12345678");
    expect(await onboardingStatus(a)).toEqual({ orders: 1, staff: 1 });
    expect(await onboardingStatus(b)).toEqual({ orders: 0, staff: 0 }); // another shop's work does not count
    const staff = (await login("jo.onboarda", "pw-12345678"))!;
    await expect(onboardingStatus(staff)).rejects.toBeInstanceOf(Forbidden);
  });
});
