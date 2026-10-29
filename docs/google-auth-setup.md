# Google sign-in for shop owners: setup

Owners sign in with Google. Workshop staff use a username and password their owner sets, and the demo
buttons need no login. Until the two variables below are set, the owner buttons are disabled and
everything else keeps working.

## 1. Create the OAuth client (once, about 10 minutes)

1. Open <https://console.cloud.google.com/> and create a project (for example `werkbank`).
2. **APIs & Services → OAuth consent screen**: user type *External*, app name `Werkbank`, your email as
   support and developer contact. Scopes: only `openid`, `email`, `profile` (these need no review).
   Leave publishing status on *Testing* and add your own Google account as a **test user**, or publish
   the app (publishing with only these scopes does not need verification).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type *Web application*.
4. **Authorised redirect URIs** (exact, no trailing slash):
   - `https://werkbank-gamma.vercel.app/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (for `npm run dev`)
5. Copy the client ID and client secret. Do not paste them into chat or commit them.

## 2. Give them to the app

| Where | Variables |
| --- | --- |
| Vercel project → Settings → Environment Variables (Production) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Local `.env.local` | the same two |

Redeploy after adding them. `APP_URL` (for example `https://werkbank-gamma.vercel.app`) is optional;
set it only if the redirect address the app computes does not match the one you registered.
Vercel preview URLs change per deployment, so Google sign-in works on the main URL and localhost, not on previews.

## 3. Try it

1. Open `/signup`, type a shop name, press *Continue with Google*. You land on the board of a new shop.
2. Sign out, open `/login`, press *Sign in with Google*: same shop.
3. Workshops → add a login for a staff member: the username is suggested from their name and your shop
   name, you set the password, and you can reset it later.

## If an owner loses their Google account

There is no self-service recovery by design. In the database, change the owner's login:

```sql
UPDATE users SET google_sub = NULL, email = 'new-address@example.com' WHERE id = '<owner id>' AND role = 'owner';
```

The next Google sign-in with a **verified** `new-address@example.com` claims that owner row.
