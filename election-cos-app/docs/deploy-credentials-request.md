# Deploying Election Campaign OS — what is needed from you

The build is deploy-ready. `npm run deploy` runs the full check suite, a
fresh build, a preflight, and then `firebase deploy`. It currently stops
at the preflight on two items, both of which only the account owner can
supply.

Run `npm run preflight` at any time to see the live state. It never
deploys anything.

```
  ok    project id             election2026-campaignms7-0
  FAIL  deploy credential      neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_TOKEN is set
  FAIL  web app config         6 of 6 missing: VITE_FIREBASE_API_KEY, …
  ok    build output           dist is newer than src
  ok    function region        africa-south1, pinned in every function
  ok    functions readiness    7 reviewed, 1 fails-closed pending infra
  ok    firestore rules        present, no allow-all rule
  ok    storage rules          present, no allow-all rule
```

---

## There are two routes. Pick whichever suits you.

### Route A — you deploy, from your own machine (fastest)

If you are already signed in to Firebase on your laptop, this needs
nothing from me and no secrets move anywhere:

```bash
git clone <this repo> && cd election-cos-app
git checkout claude/election-campaign-os-jlzsw3
npm install && (cd functions && npm install)

cp .env.example .env     # fill in the six VITE_FIREBASE_* values (see §2)

npx firebase login       # opens a browser
npm run deploy
```

`npm run deploy` will refuse and tell you why if anything is wrong. It
will not deploy a stale build, a function in the wrong region, or a rules
file with an allow-all.

### Route B — I deploy, from this session

I need the two things below added to the environment. Everything else is
already in place.

---

## 1. A deploy credential

A service account is better than a personal token: it is scoped, it is
revocable, and it does not stop working when you change your password.

**In the Google Cloud console**, on project `election2026-campaignms7-0`:

1. IAM & Admin → Service Accounts → **Create service account**.
   Name it something like `ecos-deployer`.
2. Grant it these roles — this is the minimum for what we deploy:
   - **Firebase Hosting Admin** (`roles/firebasehosting.admin`)
   - **Cloud Datastore Index Admin** (`roles/datastore.indexAdmin`)
   - **Firebase Rules Admin** (`roles/firebaserules.admin`)
   - **Cloud Functions Admin** (`roles/cloudfunctions.admin`)
   - **Service Account User** (`roles/iam.serviceAccountUser`)
   - **Artifact Registry Writer** (`roles/artifactregistry.writer`) — the
     functions build pushes a container image
3. Keys → **Add key** → JSON. A file downloads.

**Then add it to this environment**, not to the chat: open the cloud
environment menu in the session title bar, choose **Edit**, and add it
under **Network secrets** (it may be labelled *API credentials*) or as an
environment variable. The variable name I read is:

```
GOOGLE_APPLICATION_CREDENTIALS
```

If that field takes a value rather than a file path, use `FIREBASE_TOKEN`
instead, from `npx firebase login:ci` on your own machine.

A new session picks the secret up — it will not appear in this one.

> Please don't paste the key into the chat. Chat history is not a secret
> store, and a service-account key is a standing credential on the
> project.

---

## 2. The Firebase web app config

Hosting can deploy perfectly and still serve an application that cannot
reach a backend, because this config is compiled into the bundle at build
time. That is why the preflight treats it as a blocker rather than a
warning.

**Firebase console** → `election2026-campaignms7-0` → Project settings →
General → **Your apps**. If no Web app is registered, register one
(`</>` icon). Then copy the six values from *SDK setup and configuration*
into `.env`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=election2026-campaignms7-0
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

These are not secrets — a Firebase web config is public by design, and
security comes from `firestore.rules`, not from hiding the API key. They
can go in the chat if that is easier, or in the environment the same way
as above.

The preflight checks more than presence: it fails if
`VITE_FIREBASE_PROJECT_ID` names a different project than `.firebaserc`
is deploying to, and it fails if `VITE_FIREBASE_USE_EMULATORS` is still
set. Six well-formed values for the wrong project would otherwise publish
a site that loads perfectly and reaches nothing.

---

## 3. One thing to check before the first deploy — it cannot be undone

**Firestore and Storage must be created in `africa-south1`.**

The region is fixed at resource-creation time, is not expressible in
`firebase.json`, and **cannot be changed once data exists**. If either was
created elsewhere, the fix is a new project, and that is far cheaper to
do now than after a campaign has loaded a voter roll.

Firebase console → Firestore Database → the region is shown at the top of
the Data tab. Same for Storage.

This is rule 1 of the build spec and the one thing the preflight cannot
check for you — reading it needs authentication.

---

## 4. Also worth enabling while you are there

- **Authentication → Sign-in method → Google.** The app is Google-only.
  Without this, sign-in fails for everybody.
- **Authorised domains** must include the Hosting domain.
- **Firestore TTL policy** on `tenants/{tid}/_syncIdempotency`, field
  `expiresAt`. Without it the sync idempotency records accumulate
  forever. Not urgent; they are small.

---

## What happens when those land

```
npm run deploy
```

→ lint, typecheck, hex guard, font guard, 965 tests
→ production build + service-worker precache manifest
→ preflight (all checks green)
→ `firebase deploy`: Hosting, Firestore rules and indexes, Storage rules,
   and the four Cloud Functions that are marked deployable

`functions/src/ppfaAggregation.ts` is deliberately **not** exported and
will not deploy — it is held pending the §6.8.1 legal confirmation.
`unmaskCandidateIdNumber` deploys but fails closed pending a KMS key: it
throws `unimplemented` as its entire body, so it cannot return a wrong
answer.

I will report what actually deployed, with the URLs, and nothing else.

---

## 5. The corporate landing page link needs nothing from you

`index.html` at the repository root carries an Election Campaign OS
launch card. It probes the application and becomes a real link only once
the application answers; until then it reads "Launching soon" and renders
no anchor at all, so a dead link on the public page is not a state it can
reach.

The moment the deploy succeeds, that link goes live by itself. Nobody has
to come back and change it, and the landing page does not need
redeploying.

If the application ends up on a custom domain rather than
`election2026-campaignms7-0.web.app`, change `APP_URL` in the script at
the bottom of `index.html`. It is the only place the URL appears.
