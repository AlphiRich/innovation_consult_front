import { PagePlaceholder } from '@/app/PagePlaceholder';

export function WardsPage() {
  return (
    <PagePlaceholder
      title="Wards"
      route="/wards"
      status="stub"
      note="Schematic map first (SVG / simple tile + VD markers) — no GIS stack in v1. Seed from JB Marks demarcation PDFs via a repeatable ingest script."
    />
  );
}
