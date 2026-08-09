# Innovation Consult corporate brand reference

Source: "Letterhead Options" Claude Design canvas (uploaded 9 Aug 2026 as
`_bootstrap.html` / `Letterhead_Options.dc.html` — the same canvas exported
twice; identical content). Six cover-page systems (3a–3f) each with a
matching back cover, plus two standard letterhead layouts (1a/1b).

**This is the corporate identity for Innovation Consult publications**
(reports, contracts, policies, letterheads) — a **separate namespace** from
the Election-COS1.0 **product** design tokens in `src/design/tokens.ts`.
Do not merge them: `#13244A` (this system's navy) and `#1A2246` (the
product's ink) are both "navy" but are different values from different
source systems, used for different things (this is a company that
publishes documents; the product is one thing that company builds).

## Colours (hex, extracted from the canvas's `rgb()` values)

| Name | Hex | Used for |
|---|---|---|
| Ink (navy) | `#13244A` | Primary background/text colour across all six covers |
| Gold | `#C9A227` | Accent, section rules, spine labels |
| Maroon | `#7B1E30` | Section labels, "Research" and "SOP/Contract" cover accents |
| Cream/paper | `#F4EFE2` | Light-cover backgrounds and reversed body text |
| Legal cover background | `#E4E7EA` | 3f (Legal & Compliance) cover only |
| Fine-print slate | `#5A5648` | Footer/disclaimer text |

## Typography

Poppins (sans-serif) throughout the actual document content — headings,
body, fine print. Georgia serif appears only in the Claude Design canvas's
own UI chrome (the little "3a — Strategy / Plan" caption tags floating
above each cover) — that's canvas tooling, not part of the document design
itself; ignore it.

## The six cover systems (3a–3f)

Each pairs a document class with a colourway and a vertical spine label:

| Code | Class | Cover background | Spine label |
|---|---|---|---|
| 3a | Strategy / Plan | Ink | STRATEGY & PLANNING |
| 3b | Financial / Analysis | Maroon | FINANCIAL & ANALYSIS |
| 3c | Research / White Paper | Cream | RESEARCH & WHITE PAPER |
| 3d | Product / Tech Plan | Charcoal `#1C2027` | PRODUCT & TECH PLAN |
| 3e | SOP / Contract | Light cream `#E8E3D8` | SOP & CONTRACT (knight ♞ seal instead of spine icon) |
| 3f | **Legal & Compliance** | `#E4E7EA` | LEGAL & COMPLIANCE (§ mark instead of spine icon) |

Every cover carries the same metadata block (Document ID, Author, Date of
Publication, Revision, Version) and a QR-style corner mark with a web
address underneath (the canvas prints "innovationconsult.com" there —
superseded, see the domain note below). Every front cover has a matching back
cover: logo, "Copyright & Disclaimer" heading, the standard copyright +
disclaimer paragraph (reproduced verbatim below), an ISBN placeholder
(`978-0-000000-00-0` — never a real one, this is template filler), and the
company address/contact line.

## Standard letterhead (1a/1b)

680×880px page: logo top-left (Innovation Consult wordmark, ~122px tall),
company address block top-right, a tricolour textured bar rule, a faint
centred icon watermark, and a footer with a services line and the company
registration line. 1a ("Classic Banner") and 1b ("Modern Split") are
visually identical in the exported markup — the canvas doesn't show a
meaningful difference between them as captured.

## Company particulars (verbatim, for reuse in generated documents)

```
Just Be Trading 10 (Pty) Ltd t/a Innovation Consult (Pty) Ltd
Registration Number: 2007/021390/07
Directors: M. K. N. Dlutu & A. N. Dlutu
P.O. Box 2590, Potchefstroom, 2520, N.W. Province, South Africa
+27 (0)67 907 1580
info@innovationconsult.co.za
www.innovationconsult.co.za
```

**Domain — resolved.** The letterhead canvas prints `innovationconsult.com`
throughout (every cover's corner mark, the back-cover contact line, the
1a/1b letterhead footer). Confirmed by the human (9 Aug 2026): the
actually-registered domain is `innovationconsult.co.za`, matching
`docs/phase-0-infra-plan.md`. The canvas's `.com` is design-tool filler,
not the real domain — `.co.za` is used everywhere in this repo and in the
generated documents (`tools/docgen/build-docs.js`'s `COMPANY` object).
The canvas's own cover artwork (the small corner-mark text baked into
each cover graphic) still says `.com` where it renders the URL as an
image element rather than text pulled from `COMPANY` — that's cosmetic
canvas output, not something this repo generates, so there's nothing
here to fix beyond what's already corrected.

## Standard copyright/disclaimer block (verbatim from every back cover)

> © [Year] Just Be Trading 10 (Pty) Ltd t/a Innovation Consult (Pty) Ltd.
> All rights reserved. Registration Number: 2007/021390/07. No part of
> this publication may be reproduced, distributed, or transmitted in any
> form or by any means, including photocopying, recording, or other
> electronic or mechanical methods, without the prior written permission
> of Innovation Consult, except in the case of brief quotations embodied
> in critical reviews and other noncommercial uses permitted by copyright
> law.
>
> **Disclaimer:** This document is provided for informational purposes
> only and does not constitute professional, legal, financial, or
> investment advice. While every effort has been made to ensure the
> accuracy of the information contained herein, Innovation Consult makes
> no warranties, express or implied, regarding the completeness,
> reliability, or suitability of this content. Innovation Consult, its
> directors, employees, and agents accept no liability for any loss or
> damage of any kind arising from reliance on this document.

## What's missing — logo/icon image files

The canvas HTML references `logo-full-trimmed-v2.png` (full wordmark) and
`icon-only-v2.png` (a horse/knight icon, used as a faded full-bleed
watermark on every cover — same motif as the ♞ glyph used as the 3e/3f
seal) via relative `src` paths. **Neither image file was included in this
upload** — only the markup describing their placement. The three
generated documents (`legal-drafts/*.docx`, `app-user-guide.docx`) use a
plain text wordmark placeholder instead of the real logo. Supply the two
PNGs and re-run `tools/docgen` (`npm install && npm run build`) after
swapping `wordmark()` in `tools/docgen/build-docs.js` for a real
`ImageRun`.
