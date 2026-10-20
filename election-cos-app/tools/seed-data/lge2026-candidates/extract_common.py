import re

ID_SEARCH_RE = re.compile(r'\d{6}\*{4}\d{2}\*')

def rows_from_page(page):
    """Yields cols per logical row. Column boundaries are derived fresh
    from THIS page's own header row (x0 of 'Municipality'/'Party'/'Ward'/
    'IDNumber'/'Fullname'/'Surname') since they drift slightly between
    province files and sometimes between pages of the same file.

    ward_or_order / id_number are recovered by regex on the raw
    (unspaced) concatenation of both buckets' words, not by the bucket
    split alone: in some province files (e.g. EC) the two values render
    with no gap and pdfminer merges them into a single word token
    (e.g. "83870617****08*"), while in others (NC, NW, GP) they're
    already separate tokens. The regex anchor on the ID's fixed format
    (6 digits + **** + 2 digits + *) handles both cases identically.
    """
    words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    if not words:
        return
    rows = {}
    for w in words:
        y = round(w['top'], 1)
        rows.setdefault(y, []).append(w)

    header_y = None
    for y, row_words in rows.items():
        texts = [w['text'] for w in row_words]
        if 'Municipality' in texts and 'Party' in texts:
            header_y = y
            break
    if header_y is None:
        return

    header_words = {w['text']: w['x0'] for w in rows[header_y]}
    raw_party_x0 = header_words.get('Party')
    raw_ward_x0 = header_words.get('Ward')
    raw_id_x0 = header_words.get('IDNumber')
    raw_full_x0 = header_words.get('Fullname')
    raw_sur_x0 = header_words.get('Surname')
    if None in (raw_party_x0, raw_ward_x0, raw_id_x0, raw_full_x0, raw_sur_x0):
        return

    # Column gaps are tens of points wide in every observed file, but a
    # data word's x0 can land a fraction of a point left of the header
    # label's own x0 (e.g. "AL" of "AL JAMA-AH" at 108.51 vs a Party
    # header x0 of 108.546) -- sub-pixel font-metric noise, not a real
    # column. A small uniform margin absorbs it without risk, given the
    # real gaps are an order of magnitude larger.
    MARGIN = 3.0
    party_x0 = raw_party_x0 - MARGIN
    ward_x0 = raw_ward_x0 - MARGIN
    id_x0 = raw_id_x0 - MARGIN
    full_x0 = raw_full_x0 - MARGIN
    sur_x0 = raw_sur_x0 - MARGIN

    for y in sorted(rows):
        if abs(y - header_y) < 0.5:
            continue
        row_words = sorted(rows[y], key=lambda w: w['x0'])
        if not row_words:
            continue
        if row_words[0]['text'] == 'LGE2026':
            continue  # title row

        muni_words, party_words, ward_id_words, full_words, sur_words = [], [], [], [], []
        for w in row_words:
            x = w['x0']
            if x < party_x0:
                muni_words.append(w['text'])
            elif x < ward_x0:
                party_words.append(w['text'])
            elif x < full_x0:
                ward_id_words.append(w['text'])  # ward/order + id, unsplit
            elif x < sur_x0:
                full_words.append(w['text'])
            else:
                sur_words.append(w['text'])

        if not muni_words and not party_words:
            continue

        raw = ''.join(ward_id_words)
        m = ID_SEARCH_RE.search(raw)
        if m and re.fullmatch(r'\d{1,8}', raw[:m.start()]):
            ward_or_order = raw[:m.start()]
            id_number = m.group()
        else:
            # Regex failed or the prefix isn't clean digits -- most often
            # a page-footer ("Page N of M") overlapping the last data row
            # on a page at the same y-coordinate. Leave both blank rather
            # than store corrupted text; caller counts these.
            ward_or_order = ''
            id_number = ''

        yield {
            'municipality': ' '.join(muni_words),
            'party': ' '.join(party_words),
            'ward_or_order': ward_or_order,
            'id_number': id_number,
            'fullname': ' '.join(full_words),
            'surname': ' '.join(sur_words),
        }
