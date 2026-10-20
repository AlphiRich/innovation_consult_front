"""
Build the consolidated LGE2026 candidate database CSV from the 9 provincial
"LGE2026 Certified Candidate List - XX.pdf" files.

Schema (matches the reference schema the user supplied, with ward_or_order
kept as the raw published value rather than a derived rank -- see notes):
  province, province_code, district, municipality_code, municipality_name,
  party, candidate_type, ward_or_list_order, fullname, surname, id_number_masked

District derivation is NOT guessed or looked up externally. Within each
province's own file, local-municipality codes embed their parent district
council's number as the first two digits of their own 3-digit numeric
suffix (e.g. NW405 -> "40" -> DC40 "Dr Kenneth Kaunda"), and this holds
for every province checked (NC, NW, GP, WC). Metro codes are alphabetic
only (CPT, JHB, TSH, NMA, ...) and have no parent district.

candidate_type is derived from the raw ward_or_list_order value's own
format, confirmed against real data (JB Marks/ACTIONSA, NMA/ACDP): a
short plain number (<=3 digits) is a ward number; an 8-digit code is a
PR list entry. This is read off the source's own formatting, not assumed.
"""
import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pdfplumber
from extract_common import rows_from_page

PROVINCES = {
    'EC': 'Eastern Cape',
    'FS': 'Free State',
    'GP': 'Gauteng',
    'KZN': 'KwaZulu-Natal',
    'LP': 'Limpopo',
    'MP': 'Mpumalanga',
    'NC': 'Northern Cape',
    'NW': 'North West',
    'WC': 'Western Cape',
}

LOCAL_MUNI_RE = re.compile(r'^([A-Z]{2,3})(\d{3})$')
DC_RE = re.compile(r'^DC(\d{1,2})$')
METRO_RE = re.compile(r'^[A-Z]{2,4}$')  # alpha-only, no digits


def split_municipality(raw: str):
    """'NW405 - JB Marks' -> ('NW405', 'JB Marks'). Tolerates stray spaces."""
    if ' - ' not in raw:
        return raw.strip(), ''
    code, name = raw.split(' - ', 1)
    return code.strip(), name.strip()


def classify_candidate_type(ward_or_order: str) -> str:
    if not ward_or_order:
        return 'UNKNOWN'
    if ward_or_order.isdigit() and len(ward_or_order) >= 6:
        return 'PR List Candidate'
    if ward_or_order.isdigit() and len(ward_or_order) <= 3:
        return 'Ward Candidate'
    return 'UNKNOWN'


def extract_province(pdf_path: Path, province_code: str):
    """Returns (rows, stats) for one province PDF."""
    province_name = PROVINCES[province_code]
    raw_rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for row in rows_from_page(page):
                raw_rows.append(row)

    # Build the DC-number -> "Name District (DCnn)" lookup from this
    # province's own data before resolving any local municipality's district.
    dc_lookup = {}
    for row in raw_rows:
        code, name = split_municipality(row['municipality'])
        m = DC_RE.match(code)
        if m:
            dc_lookup[int(m.group(1))] = f"{name} District ({code})"

    out_rows = []
    unresolved_district = 0
    unresolved_ward_id = 0

    for row in raw_rows:
        code, name = split_municipality(row['municipality'])
        if not code:
            continue

        if DC_RE.match(code):
            district = dc_lookup.get(int(DC_RE.match(code).group(1)), '')
        elif LOCAL_MUNI_RE.match(code):
            prov_letters, digits = LOCAL_MUNI_RE.match(code).groups()
            dc_num = int(digits[:2])
            district = dc_lookup.get(dc_num, '')
            if not district:
                unresolved_district += 1
        elif METRO_RE.match(code):
            district = f"{name} Metro ({code})"
        else:
            district = ''
            unresolved_district += 1

        ward_or_order = row['ward_or_order']
        id_number = row['id_number']
        if not ward_or_order or not id_number:
            unresolved_ward_id += 1

        out_rows.append({
            'province': province_name,
            'province_code': province_code,
            'district': district,
            'municipality_code': code,
            'municipality_name': name,
            'party': row['party'],
            'candidate_type': classify_candidate_type(ward_or_order),
            'ward_or_list_order': ward_or_order,
            'fullname': row['fullname'],
            'surname': row['surname'],
            'id_number_masked': id_number,
        })

    stats = {
        'province_code': province_code,
        'total_rows': len(out_rows),
        'unresolved_district': unresolved_district,
        'unresolved_ward_id': unresolved_ward_id,
    }
    return out_rows, stats


def main():
    pdf_dir = Path(sys.argv[1])
    out_csv = Path(sys.argv[2])

    fieldnames = [
        'province', 'province_code', 'district', 'municipality_code',
        'municipality_name', 'party', 'candidate_type', 'ward_or_list_order',
        'fullname', 'surname', 'id_number_masked',
    ]

    all_stats = []
    with out_csv.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for code in sorted(PROVINCES):
            pdf_path = next(pdf_dir.glob(f"*Certified Candidate List - {code}.pdf"))
            rows, stats = extract_province(pdf_path, code)
            for r in rows:
                writer.writerow(r)
            all_stats.append(stats)
            print(f"{code}: {stats['total_rows']} rows, "
                  f"{stats['unresolved_district']} unresolved district, "
                  f"{stats['unresolved_ward_id']} unresolved ward/id", file=sys.stderr)

    total = sum(s['total_rows'] for s in all_stats)
    total_unresolved_district = sum(s['unresolved_district'] for s in all_stats)
    total_unresolved_ward_id = sum(s['unresolved_ward_id'] for s in all_stats)
    print(f"\nTOTAL: {total} candidate rows across {len(all_stats)} provinces", file=sys.stderr)
    print(f"TOTAL unresolved district: {total_unresolved_district}", file=sys.stderr)
    print(f"TOTAL unresolved ward/id (likely page-footer collisions): {total_unresolved_ward_id}", file=sys.stderr)


if __name__ == '__main__':
    main()
