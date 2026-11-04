import { hash, verify } from "@node-rs/argon2";

// argon2id (algorithm 2), OWASP-recommended parameters.
const OPTS = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Constant-ish work for unknown emails so response time does not reveal account existence. */
let dummy: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummy ??= hashPassword("nutritrack-dummy-password-1");
  await verifyPassword(await dummy, password);
}
