/**
 * NFR-09: retried saves carry a client-generated `clientRequestId`.
 * A save whose response was lost (offline, timeout, reload) is replayed with the same key;
 * the server returns the row created by the first attempt instead of creating a duplicate.
 */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002";
}
