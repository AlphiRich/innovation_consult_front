---
name: ecos-build-discipline
description: The working rules for building Election Campaign OS (Innovation Consult's SA local-government campaign platform) — verification protocol, what must never be fabricated, what must never be drafted, deploy gates, and the standing instruction on the proclaimed 2026 delimitation. Load this before changing anything under election-cos-app/, before touching delimitation, seat-calculation, legal or deploy code, and before adding a test that is meant to guard against a defect.
---

# Election Campaign OS — build discipline

Governing spec: `IC-ECOS-BUILD-2026-V2`. Product: a multi-tenant,
offline-first PWA for South African political campaign field operations,
built for Innovation Consult (Pty) Ltd as its first SaaS offering.

These thirteen rules are not style preferences. Each one is here because
breaking it cost a session, or would have shipped something false into a
product that a campaign will make decisions with. The reasoning for each
is in `election-cos-app/docs/design-decision-and-change-log.md`.

---

## 1. The 2026 delimitation is proclaimed. Do not second-guess it.

Annexure A to **IEC Circular 1 of 2025** is the delimitation for the
**4 November 2026** local government elections: 258 municipalities
(8 metros, 206 locals, 44 districts), 214 warded, 4,488 wards.

It is the culmination of two years of work across the Municipal
Demarcation Board, the national department, and the provincial MECs for
local government. It is final for this cycle and will not change before
the election.

Do not treat its ward counts or council sizes as a possibly-stale
snapshot, do not hedge about "which version is current", and do not
cross-check it against something else as though the something else might
win. Hardwire it. `src/modules/reference/municipalRegister.ts` holds
`DELIMITATION_VERSION`, and a guard test fails the build if vintage
hedging wording ever returns to the codebase.

Separate the two things that do move differently:

- **The voters' roll** moves continuously — people register and move.
- **The delimitation and the council determination** are fixed for the
  cycle.

A disagreement between a computed figure and the proclaimed baseline is
therefore `BLOCKING`, not a warning: the baseline is right and the
computation is wrong.

## 2. Never fabricate data, and never fabricate statute.

No invented voter counts, ward names, candidate records, sentiment
figures, turnout numbers, or section numbers. No paraphrased statutory
text presented as the text.

Every statutory rule traces to a primary source, or it is marked
unverified and pending attorney review, or it is not in the build. The
seat calculator implements **Municipal Structures Act Schedule 1 Item 12**
(`Q = (A/(B−C−D))+1`), **Item 16** (excessive seats) and **Schedule 2**
for category C — because those were read, not recalled.

Where a feature needs data that does not exist, **the feature does not get
built**. Three screens from the session-39 design reference stay unbuilt
for exactly this reason: volunteer hours and per-ward sentiment have no
data model here, and placeholder numbers in a product whose whole value is
computational honesty is the one mistake that would be unrecoverable.

## 3. Never draft binding legal instruments.

Terms of Use, licence agreements, tenancy agreements, indemnities,
limitation-of-liability clauses: attorney work, not yours. Produce a
structured brief of what the instrument must cover and hand it over.
Drafts that exist live under `docs/legal-drafts/` and are marked as
pending review.

Customer-facing marketing claims are different and must be **reworded
before anything is scrapped** — exhaust rewording a commitment before
removing a genuinely valuable function or a comparative advantage.

## 4. A guard test must be proved to fail.

The protocol, every time:

1. Write the test that encodes the defect class.
2. **Inject the defect** and watch the test fail.
3. Revert clean and watch it pass.

A guard that has never failed is not a guard — it is a line in a coverage
report. Prove each branch separately: the defect fails, and a legitimate
near-miss still passes.

**Strip comments and known-good constants before asserting absence.** This
defect class has now appeared three times: a font-import guard whose regex
matched the import *inside a comment*, a negative-regex test catching its
own disclaimer text, and the type-scale guard flagging its own header plus
the comments that named the classes it had just removed. A guard that
fails on the sentence explaining it gets switched off, and then it guards
nothing — so blank comments rather than deleting them, and keep the line
numbers honest.

## 5. Present is not correct.

A presence check passes on six well-formed values for the wrong project.
Check the **relationship**, not the existence: that
`VITE_FIREBASE_PROJECT_ID` matches what `.firebaserc` deploys to, that the
emulator flag is *not* set, that `dist` is newer than `src`, that `main`
names a file that exists.

This cost a near-miss: a deploy that would have published a site loading
perfectly and reaching nothing.

## 6. Every Cloud Function carries an `@deployable` marker.

In the file header, one of:

- `@deployable yes` — finished.
- `@deployable fails-closed` — cannot do its job and refuses, rather than
  guessing. `unmaskCandidateIdNumber` throws `unimplemented` as its entire
  body pending a KMS key, so it cannot return a wrong answer.
- `@deployable no` — a half-written path that can write. Never deploys.

The preflight fails on an unmarked function. **Unreviewed must not mean
shippable**, and the default for anything a reviewer has not looked at is
"does not ship".

`ppfaAggregation.ts` is deliberately not exported, held pending the
§6.8.1 legal confirmation.

## 7. Region is `africa-south1`, and it is fixed at creation.

Rule 1 of the spec. Every function pins it; the preflight checks every
function pins it.

Firestore and Storage region is set when the resource is created, is not
expressible in `firebase.json`, and **cannot be changed once data
exists**. It also cannot be read without authenticating, so the preflight
cannot check it. Confirm it by hand before the first deploy. If either was
created elsewhere, the remedy is a new project — cheap now, impossible
after a campaign has loaded a roll.

## 8. Run the thing.

Thirty-seven sessions of green tests did not notice that **none of the
three brand typefaces had ever loaded**. Running the application for the
first time found that, plus a lexicographically sorted ward list
(`NW40501, NW40510, NW40502`) and grids too cramped to read on a phone.

Tests prove the logic. Only running it proves the product. This is a
one-handed phone application used standing at a gate: drive the real
routes, signed in, against the emulator with real seed data, at phone and
desktop width, and watch the console.

## 9. Probe before you link.

A link on Innovation Consult's public page that 404s has told a
prospective client something about the company, and it is not true.

The landing page's launch card loads `/icon-192.png` from the application
origin via `new Image()` and replaces the inert element with a real anchor
only on success. An image load either works or it does not — no CORS, no
CSP dependency, no fetch. **A dead link is not a state that page can
reach**, and the link goes live by itself when the deploy lands.

The origin appears as a single `const`. Everything else derives from it.

## 10. Secrets never go in the conversation.

Never ask for a token, key, password or service-account JSON to be pasted
into chat. Chat history is not a secret store and a service-account key is
a standing credential on the project.

Credentials belong in the environment's settings (cloud environment menu →
**Edit** → Network secrets) or as GitHub repository **secrets**. A
Firebase *web* config is public by design — security comes from
`firestore.rules`, not from hiding the API key — so it may go in chat, or
in Actions **variables** where it shows in logs and is useful.

If no credential can reach the container, say so and route around it
rather than retrying. `gcloud auth print-access-token` returning the
literal string `proxy-injected` is not an expired token; it means no
Google credential can exist here, and `.github/workflows/deploy-ecos.yml`
exists because of it.

## 11. Never match a process pattern that matches your own shell.

`pkill -f "firebase emulators"`, `pgrep -f "emulators:start"`,
`pkill -f http-server` — each of these kills the shell running it,
because the shell's own command line contains the pattern. Exit 144, and
every command chained after it silently never runs. It has cost **four
shells** on this project, twice in one session, and each time the real
damage was the chained work that looked done and wasn't.

Find the pid without a self-matching pattern, then kill by pid:

```bash
python3 -c "
import os
needle = 'http' + '-server'      # split, so this cmdline cannot match itself
for pid in os.listdir('/proc'):
    if not pid.isdigit(): continue
    try: cmd = open(f'/proc/{pid}/cmdline','rb').read().replace(b'\0',b' ').decode()
    except OSError: continue
    if needle in cmd and 'python3' not in cmd: os.kill(int(pid), 15)
"
```

Then confirm the port is actually free — a dead parent does not mean a
dead listener:

```bash
curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:PORT
```

`000` is down. Anything else is still serving.

## 12. Verify, then commit, every time.

```
npm run check:all     # lint, typecheck, hex guard, font guard, tests
npm run build
npm run preflight     # never deploys; prints the live gate state
```

Then commit and push to the working branch. Do **not** open a pull request
unless explicitly asked. Keep model identifiers out of commit messages,
PR bodies and code comments.

Design tokens only. Two guards enforce it, and both exist because
`tailwind.config.js` *extends* its theme rather than replacing it, so
off-token values keep working and nothing complains:

- `scripts/check-no-hex.mjs` — no raw hex in product source.
- `scripts/check-type-scale.mjs` — no `text-xs`…`text-9xl`, no
  `text-[13px]`. Use `text-body-md`, `text-headline-md`,
  `text-label-caps`, `text-data-mono`, `text-body-lg`,
  `text-display-lg`, `text-display-lg-mobile`.

The nav is fixed at **nine items** by §3.2 and `nav.test.ts` guards the
count.

## 13. Use the primitives, but never substitute one that merely looks close.

`src/components/ui` holds the shared spelling of every pattern. Prefer it.
But migrating a page is not a `sed` job, because three kinds of
substitution are wrong even when the result is pixel-identical:

- **A heading is not a paragraph.** `SectionLabel` defaults to `<p>`; pass
  `as="h2"` where the label titles a section, or the document outline a
  screen-reader user navigates by silently disappears.
- **A link is not a button.** `Button` renders a real `<button>`.
  Something that navigates stays a `<Link>` styled to match, or
  middle-click, cmd-click and "copy link address" break.
- **A counter is not a status pill.** `Pill` is a tinted status word. A
  bordered `Contacted: 1 204` chip is a different pattern and keeps its
  own markup.

And where a control carries a selected state that exists only in colour,
add `aria-pressed`. Colour alone tells a screen-reader user nothing about
which filter, view or row is active.

---

## Two standing instructions on how to spend a turn

**Extract value; do not re-litigate.** When a supplied asset contradicts
the build, find what can be incorporated. Rehashing a settled
contradiction is the most expensive thing a turn can do.

**The defect is found by implementing the next thing.** Not by thinking
harder about the last one. Running the app found the fonts. Reissuing the
credential request found the preflight's false pass. Writing the CI
workflow found the functions that would have deployed dead on arrival.
Keep moving forward; the next implementation is also the next audit.
