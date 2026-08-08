# Postgres adapter — Phase 8, conditional

Empty until a signed, paying subscription triggers Phase 8
(IC-ECOS-BUILD-2026-V2 §10). When triggered:

1. Cloud SQL PostgreSQL 15+, `africa-south1`.
2. Implement one file per port in `src/dal/ports/*` here, mirroring
   `src/dal/adapters/firestore/*` file-for-file.
3. Run the same port test suite (once written, see §5.2) against both
   adapters. If it passes here with zero changes to `src/modules/**`, the
   DAL discipline held.
4. Port the RLS policy *logic* from `rls-tenancy-migrations.sql` (isolation
   + geographic scoping is sound; strip the PPFA sections — those are
   superseded, see master index §6 "Retired").
5. Dual-write, verify, cut over, decommission the Firestore adapter's write
   path (reads can stay dual-sourced longer if useful for verification).

Do not start this early. Firestore is deliberately cheap-to-build-on for
Phase 0–7; building this before a paying customer exists is scope the spec
explicitly defers.
