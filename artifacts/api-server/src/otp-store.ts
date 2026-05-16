interface OtpEntry { code: string; expiresAt: number; attempts: number }
interface CooldownEntry { lastRequestAt: number }

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const otpStore = new Map<string, OtpEntry>();
export const otpCooldown = new Map<string, CooldownEntry>();

export function cleanExpired(): void {
  const now = Date.now();
  for (const [k, v] of otpStore) if (v.expiresAt < now) otpStore.delete(k);
  for (const [k, v] of otpCooldown) if (now - v.lastRequestAt > OTP_TTL_MS) otpCooldown.delete(k);
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("27") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+27${digits.slice(1)}`;
  if (digits.length === 9) return `+27${digits}`;
  return `+${digits}`;
}

/** Generate an OTP, store it, and return the code. */
export function issueOtp(key: string): string {
  cleanExpired();
  const code = generateOtp();
  otpStore.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  otpCooldown.set(key, { lastRequestAt: Date.now() });
  return code;
}
