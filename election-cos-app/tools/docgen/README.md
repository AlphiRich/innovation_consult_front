# docgen

Regenerates the three branded documents under `../../docs/`:

- `docs/legal-drafts/privacy-policy-DRAFT.docx`
- `docs/legal-drafts/terms-of-use-DRAFT.docx`
- `docs/app-user-guide.docx`

```bash
npm install
npm run build
```

Brand source: `../innovation-consult-brand.md` (extracted from the
"Letterhead Options" Claude Design canvas). The two legal drafts are
placeholders pending attorney review — see the DRAFT banner on their
cover pages and `BUILD-STATUS.md`. Do not publish either without
sign-off.

The real Innovation Consult logo/icon PNGs weren't supplied with the
canvas export, so `build-docs.js` renders a text wordmark placeholder.
Once the real files exist, swap `wordmark()` in `build-docs.js` for an
`ImageRun`.
