/**
 * `@muxima/permissions` — the authorization vocabulary, with ZERO runtime
 * dependencies.
 *
 * This package exists so that three very different consumers can share one
 * definition without importing each other:
 *
 *   - `packages/auth`   → resolves a user's permissions at request time (DB);
 *   - `packages/api`    → enforces them in the guards;
 *   - `packages/db`     → seeds them (`prisma/seed.ts`);
 *   - `apps/web`        → types its `can()` calls and hides UI actions.
 *
 * The Prisma seed cannot import `@muxima/auth` (which pulls a database client,
 * creating a cycle), and the browser cannot import it either. Keeping the
 * catalogue and the seed matrix here, with no imports at all, is what lets a
 * single matrix drive the database, the API and the UI.
 *
 * The DATABASE remains the authority at runtime: `prisma/seed.ts` upserts the
 * matrix below into `RolePermission`, and every guard reads those rows back.
 * The matrix is a *seed definition*, not a second rule — see `matrix.ts`.
 */
export * from "./catalogue";
export * from "./matrix";
