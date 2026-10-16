# Running Election Campaign OS locally

Until session 38 this application could not be run. `signInWithPopup`
needs a live Google OAuth round trip, there was no emulator wiring, and
no Firebase project has ever been reachable from the build environment —
so in thirty-seven sessions nobody had seen a signed-in screen of this
product. Everything was proven by unit test and review.

This is how you run it now.

## 1. Install

```bash
cd election-cos-app
npm install
(cd functions && npm install)
```

## 2. Point it at the emulator suite

```bash
cp .env.example .env
```

Then set these in `.env`. The values do not have to be real — the
emulator accepts any well-formed config — but they must be present, or
the Firebase client refuses to initialise:

```
VITE_FIREBASE_API_KEY=demo-emulator-key
VITE_FIREBASE_AUTH_DOMAIN=demo-ecos.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-ecos
VITE_FIREBASE_STORAGE_BUCKET=demo-ecos.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
VITE_FIREBASE_USE_EMULATORS=true
```

`VITE_FIREBASE_USE_EMULATORS` points Auth, Firestore, Storage and
Functions at `127.0.0.1` on the ports in `firebase.json`. It is ignored in
any production build — `usingEmulators()` checks `import.meta.env.PROD`
first, and `client.test.ts` asserts that ordering — so this cannot ship.

## 3. Run

Two terminals:

```bash
npm run emulators      # auth 9099, firestore 8080, storage 9199, functions 5001
npm run dev            # http://127.0.0.1:5173
```

The emulator UI is at <http://127.0.0.1:4000>.

## 4. Sign in

With the emulator flag set, the sign-in screen offers email sign-in below
the Google button. Use any email and password; the account is created on
first use and discarded when the emulator stops.

Google sign-in does not work against the emulator — the Firebase SDK
loads `apis.google.com` for the popup flow and no emulator stands in for
it. That is why the email block exists.

## 5. Give yourself a role

Signing in is not access. You will land on **Awaiting access**, because
no tenant or capabilities have been stamped on your token — in production
`resolveCapabilities` does that from a staff record. Locally, set the
claims directly:

```bash
node tools/dev/grant-claims.mjs thandi@example.org
```

Sign out and back in, or wait for the token to refresh.

## 6. Load real data

```bash
node tools/dev/seed-emulator.mjs
```

Loads the real NW405 (JB Marks) delimitation from
`seed-data/jb-marks-nw405-wards-vds.json` — 34 wards, 136 ward-scoped
voting-district records, 122,059 registered voters — plus the
municipality profile. Those are the figures the Wards page then
reconciles against the proclaimed delimitation, so you can see the
cross-check actually pass.

## What you should see

- **Wards**: 34 / 34, 136 voting districts, 122,059 registered voters.
- **Proclaimed delimitation · aligned**: 34 wards, 67 council seats,
  33 PR, category B, all four findings green.
- **Seed check · needs attention**: one ward listing the same voting
  district code twice. That is real — NW405-W32 genuinely does, and the
  check is right to say so.
- **War Room**: ward count populated, counters at zero. The counters are
  maintained by Firestore triggers in `functions/src/warRoomCounters.ts`,
  which only run if you also start the functions emulator.

## Caveats worth knowing

- **The emulator is not the project.** Rules are enforced, but region,
  indexes and quotas are not the real ones.
- **`npm run emulators` fails in a proxied container.** As written it
  starts the functions emulator, whose own startup reaches out and gets a
  plaintext `request blocked` back from the egress proxy where it expects
  JSON. It then takes the whole suite down with
  `Unable to parse JSON: SyntaxError: Unexpected token 'r', "request bl"`.
  Start the three you need instead:

  ```bash
  npx firebase emulators:start --project demo-ecos --only auth,firestore,storage
  ```

  Everything in this document works against those three. What you lose is
  the War Room counters, which are maintained by Firestore triggers.

- **Do not stop the emulators with `pkill -f "firebase emulators"`** or
  `pgrep -f "emulators:start"`. The pattern matches the shell's own
  command line, so the shell kills itself and anything chained after it
  silently never runs (exit 144). It has cost three shells on this
  project. Check the ports instead — `curl -s -o /dev/null -w '%{http_code}'
  http://127.0.0.1:8080` — and kill by the pid you actually want.

  (This bullet replaces an older one claiming functions are *not* started
  by `npm run emulators`. That was true when it was written; the
  `firebase.json` change that added the functions predeploy hook made the
  functions emulator part of the default set, which is what now breaks the
  suite. To run the functions emulator deliberately, build first with
  `npm --prefix functions run build`, and expect the proxy failure above.)
- **`npm run deploy` will not work from a developer machine** without a
  deploy credential. Run `npm run preflight` to see exactly what is
  missing; it checks the project, credential, web config, build
  freshness, function regions and rules, and never deploys anything
  itself.
