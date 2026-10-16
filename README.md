# innovation_consult_front

Innovation Consult (Pty) Ltd — public-facing front end and the Election
Campaign OS build.

> **Note on this file.** Until 16 October 2026 this README carried a
> pasted copy of the entire corporate landing page — 235 lines of HTML,
> `<!DOCTYPE html>` and all, below the first paragraph. It had been there
> since the first scaffold commit. GitHub renders a README, so the
> repository's front page was a half-rendered duplicate of a page that
> already exists as `index.html`, and the duplicate had drifted: it still
> carried the superseded palette and predated the launch card. Nothing in
> it was unique to the README, so it is gone. `index.html` is the page.

## Contents

| Path | What it is |
|---|---|
| `index.html` | The corporate landing page, served as-is |
| `election-cos-app/` | Election Campaign OS — the application |
| `.github/workflows/deploy-ecos.yml` | Manual deploy of the application to Firebase |
| `.claude/skills/ecos-build-discipline/` | The build's working rules, loaded by Claude Code |

## The corporate landing page

`index.html` carries a launch card for Election Campaign OS. **The link
verifies itself before it offers itself:** it probes the application and
becomes a real anchor only once the application answers, so an undeployed
application shows "Launching soon" rather than a dead link on a public
page. When the deploy happens the link goes live on its own — this page
needs no change and no redeploy.

The application URL appears in exactly one place: `APP_URL` in the script
at the bottom of `index.html`. Change that one line to point at a custom
domain.

Its palette is the canonical Innovation Consult corporate identity —
`#13244A` / `#C9A227` / `#7B1E30` / `#F4EFE2`, from the letterheads and
covers system. The launch card inside it deliberately uses Election
Campaign OS's own product tokens, because the corporate identity and the
product identity are two systems. Both are documented in
[`election-cos-app/docs/innovation-consult-brand.md`](./election-cos-app/docs/innovation-consult-brand.md).

## Election Campaign OS

A multi-tenant, offline-first PWA for South African political campaign
field operations, built against `IC-ECOS-BUILD-2026-V2`.

**Start here:**

- [`election-cos-app/docs/session-handoff.md`](./election-cos-app/docs/session-handoff.md)
  — the state of the build in one page: what is built, what is blocked and
  on whom, what is deliberately unbuilt and why.
- [`.claude/skills/ecos-build-discipline/SKILL.md`](./.claude/skills/ecos-build-discipline/SKILL.md)
  — the twelve working rules. Read before changing anything in the
  application.
- [`election-cos-app/docs/running-locally.md`](./election-cos-app/docs/running-locally.md)
  — emulators, seed data, custom claims, a signed-in local run.
- [`election-cos-app/docs/deploy-credentials-request.md`](./election-cos-app/docs/deploy-credentials-request.md)
  — the three deploy routes and what each needs.
- [`election-cos-app/BUILD-STATUS.md`](./election-cos-app/BUILD-STATUS.md)
  — per-phase status.
- [`election-cos-app/docs/design-decision-and-change-log.md`](./election-cos-app/docs/design-decision-and-change-log.md)
  — every decision by session, with what it cost.

```bash
cd election-cos-app
npm install && npm ci --prefix functions
npm run check:all     # lint, typecheck, token guards, tests
npm run build
npm run preflight     # prints the deploy gate state; never deploys
```
