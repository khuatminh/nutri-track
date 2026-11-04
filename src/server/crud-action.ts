import { getSession, type SessionUser } from "@/server/auth";

export type ActionFailure = { ok: false; code: string; message: string; error: string; fields?: Record<string, string>; needsConfirm?: boolean };

/** Keep expected failures serializable and never expose database exceptions to clients. */
export async function crudAction<T>(run: (user: SessionUser) => Promise<T>): Promise<Exclude<T, { ok: false }> | ActionFailure> {
  try {
    const user = await getSession();
    if (!user) return failure("UNAUTHENTICATED", "Vui lòng đăng nhập lại");
    const result = await run(user);
    if (typeof result === "object" && result !== null && "ok" in result && result.ok === false && "error" in result) {
      const r = result as { error: string; fields?: Record<string, string>; needsConfirm?: boolean };
      const code = r.needsConfirm ? "CONFLICT" : r.fields ? "VALIDATION_ERROR" : r.error.startsWith("Không tìm thấy") ? "NOT_FOUND" : "VALIDATION_ERROR";
      return { ...r, ...failure(code, r.error) };
    }
    return result as Exclude<T, { ok: false }>;
  } catch {
    return failure("INTERNAL_ERROR", "Không thể hoàn tất thao tác. Vui lòng thử lại");
  }
}

function failure(code: string, message: string): ActionFailure {
  return { ok: false, code, message, error: message };
}
