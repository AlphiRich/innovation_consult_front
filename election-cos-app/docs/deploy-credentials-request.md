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
  FAIL  web app config         VITE_FIREBASE_USE_EMULATORS is true in .env
  ok    build output           dist is newer than src
  ok    function region        africa-south1, pinned in every function
  ok    functions readiness    7 reviewed, 1 fails-closed pending infra
  ok    functions build        1 codebase(s) build before deploy
  ok    firestore rules        firestore.rules present, no allow-all rule
  ok    storage rules          storage.rules present, no allow-all rule
```

The second failure is the local `.env` pointing at the emulator suite,
which is correct for development and wrong to publish. On your machine or
in CI, where `.env` carries the real web config and no emulator flag, that
line reads `ok` — see §2.

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

### Route B — GitHub Actions deploys it (no secret reaches my container)

Added in session 41, and probably the best of the three: it routes around
the thing that has been blocking this all along. No Google credential can
reach the build container I run in — `gcloud auth print-access-token`
there returns the literal string `proxy-injected`. GitHub Actions has no
such limitation.

1. **Repository → Settings → Secrets and variables → Actions → Secrets.**
   Add `FIREBASE_SERVICE_ACCOUNT` — paste the whole service-account JSON
   from §1 as the value.
2. **Same page → Variables.** Add the six `VITE_FIREBASE_*` values from
   §2. Variables rather than secrets because a Firebase web config is
   public by design; keeping them out of secrets means they show in logs
   where they are useful for debugging.
3. **Actions → Deploy Election Campaign OS → Run workflow.** Choose
   `hosting`, `rules`, `functions` or `everything`.

The workflow runs the full check suite, builds, and then runs the same
preflight before anything is sent. It is manual on purpose — automatic
deploys from every push, on a repository holding a campaign's voter data,
is a decision to make deliberately rather than inherit.

### Route C — I deploy, from this session

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

### 3.1 If it is wrong: what "a new project" actually involves

Only read this if §3 came back as something other than `africa-south1`.

I cannot create a project from this container — there is no Google
credential here at all (`gcloud auth print-access-token` returns the
literal string `proxy-injected`), so this is yours to do in the console
or from your own `gcloud`. The steps, with the things that bite:

1. **Pick the project ID carefully. It is permanent.** The name can be
   edited forever; the ID never can. It must be 6–30 characters,
   lowercase letters, digits and hyphens, start with a letter, not end
   with one — and it **cannot reuse an ID that has ever existed**,
   including a deleted one. So `election2026-campaignms7-0` is spent
   whatever happens to it. Something like
   `ic-ecos-2026-za` leaves room.
2. **Create it**, then create Firestore and Storage **first**, before
   anything else, choosing `africa-south1` for both. That ordering is
   the whole point of the exercise.
3. **Keep the old project alive until the new one serves.** A
   soft-deleted project still counts against your project quota for 30
   days and is only then fully removed, so deleting early buys nothing.
4. **Tag it `environment=production`.** Create an `environment` tag key
   and a `production` value, then attach it. The Cloud console then
   shows a "Prod" badge in the project picker. On a project that will
   hold a municipality's voter roll, a visual reminder of which project
   is selected before somebody runs a destructive command is worth the
   five minutes.
5. **Then come back to §1 and §2 of this document**: new service
   account, new six `VITE_FIREBASE_*` values, and
   `election-cos-app/.firebaserc` updated to the new project ID. The
   preflight already fails if the web config names a project other than
   the one being deployed to, so a half-finished switch cannot ship.

Nothing in the application code is tied to the project ID. Verified by
grep: the only references are `.firebaserc`, `.env.example` (line 12 and
a comment above it), your own `.env`, and the Actions variables.

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
