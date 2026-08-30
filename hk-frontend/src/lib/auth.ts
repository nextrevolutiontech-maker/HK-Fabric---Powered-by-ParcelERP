import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const COOKIE_NAME = 'hk_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ─── Password Security (Scrypt + Salt) ───────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!password || !combinedHash || !combinedHash.includes(':')) {
    return false;
  }
  const [salt, storedKey] = combinedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(storedKey, 'hex'), Buffer.from(derivedKey, 'hex'));
}

// ─── Session Token Security ──────────────────────────────────────────────────

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Initial Single User Setup Helper ────────────────────────────────────────

export async function ensureInitialUser() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const username = (process.env.ADMIN_USERNAME || 'admin').trim();
      const rawPassword = process.env.ADMIN_PASSWORD || 'hkfabric2026';
      const passwordHash = hashPassword(rawPassword);

      await prisma.user.create({
        data: {
          username,
          passwordHash,
          isActive: true
        }
      });
      console.log(`[Auth Setup] Initial single user "${username}" created in database.`);
    }
  } catch (e) {
    console.error('Error ensuring initial user:', e);
  }
}

// ─── Server-Side Session & Authentication Helpers ────────────────────────────

export interface AuthenticatedUser {
  id: string;
  username: string;
  sessionId: string;
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, item) => {
    const [key, ...v] = item.trim().split('=');
    if (key) acc[key] = decodeURIComponent(v.join('='));
    return acc;
  }, {});

  return cookies[COOKIE_NAME] || null;
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { sessionTokenHash: tokenHash },
    include: { user: true }
  });

  if (!session) return null;

  if (new Date() > session.expiresAt || !session.user || !session.user.isActive) {
    // Delete expired or invalid session
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    sessionId: session.id,
  };
}

export async function createSessionCookieHeader(token: string): Promise<string> {
  const isProd = process.env.NODE_ENV === 'production';
  const secureFlag = isProd ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function createClearSessionCookieHeader(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const secureFlag = isProd ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ─── Owner PIN Security Helper ───────────────────────────────────────────────

export async function verifyOwnerPin(providedPin: string | null | undefined): Promise<boolean> {
  if (!providedPin || typeof providedPin !== 'string') {
    return false;
  }

  const cleanPin = providedPin.trim();
  if (cleanPin.length === 0) {
    return false;
  }

  const envPin = process.env.OWNER_PIN;
  if (envPin && envPin.trim()) {
    return cleanPin === envPin.trim();
  }

  try {
    const setting = await prisma.setting.findFirst();
    if (setting && setting.ownerPin) {
      return cleanPin === setting.ownerPin.trim();
    }
  } catch (e) {
    console.error('Error fetching PIN setting:', e);
  }

  return cleanPin === '1234';
}

// ─── DTO Sanitizer ───────────────────────────────────────────────────────────

export function sanitizeOrderUpdateDto(input: any) {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const allowedFields = [
    'status', 'codStatus', 'voidReason', 'notes', 'handledBy', 
    'orderType', 'totalAmount', 'deliveryCharges', 'advancePayment', 
    'paymentType', 'items', 'trackingNumber', 'trackingNumber2', 
    'courierName', 'pin', 'actionName', 'performedBy', 'customerId', 
    'customerDetails'
  ];

  const sanitized: any = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
      sanitized[field] = input[field];
    }
  }

  return sanitized;
}
