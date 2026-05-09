import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "wedding_admin_session";

type SessionPayload = {
  username: string;
  exp: number;
};

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url<T>(input: string): T {
  return JSON.parse(Buffer.from(input, "base64url").toString("utf8")) as T;
}

function getAdminSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

export function getAdminUsername() {
  return process.env.ADMIN_USER ?? "novios";
}

function sign(value: string) {
  return createHmac("sha256", getAdminSecret()).update(value).digest("base64url");
}

export function createAdminSessionToken(username: string) {
  const payload: SessionPayload = {
    username,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token || !getAdminSecret()) return false;
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return false;

  const expected = sign(payloadPart);
  const ok =
    expected.length === signaturePart.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signaturePart));
  if (!ok) return false;

  try {
    const payload = fromBase64Url<SessionPayload>(payloadPart);
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

function verifyScryptHash(password: string, storedHash: string) {
  const [algo, salt, hashHex] = storedHash.split("$");
  if (algo !== "scrypt" || !salt || !hashHex) return false;

  const derived = scryptSync(password, salt, 64).toString("hex");
  return (
    derived.length === hashHex.length &&
    timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hashHex, "hex"))
  );
}

export function createScryptHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUser = getAdminUsername();
  if (username !== expectedUser) return false;

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return verifyScryptHash(password, hash);

  const plainPassword = process.env.ADMIN_PASSWORD;
  if (!plainPassword) return false;

  return (
    plainPassword.length === password.length &&
    timingSafeEqual(Buffer.from(plainPassword), Buffer.from(password))
  );
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}
