import crypto from 'crypto';
import { config } from './config.js';

/** 6 hex digits with a dash in the middle, e.g. A3F-9C2 */
export function generateCode() {
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${hex.slice(0, 3)}-${hex.slice(3)}`;
}

/** Accepts "a3f9c2", "a3f-9c2", " A3F 9C2 " ... returns "A3F-9C2" or null */
export function normalizeCode(input) {
  const s = String(input || '').toUpperCase().replace(/[^0-9A-F]/g, '');
  if (s.length !== 6) return null;
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

export const newToken = () => crypto.randomBytes(24).toString('hex'); // 48 chars
export const newPin = () => String(crypto.randomInt(100000, 1000000)); // 6 digits

/** Link stops working at the end of the day AFTER the event date */
export function eventExpiry(event) {
  const day = String(event.event_date).slice(0, 10);
  const endOfEventDay = Date.parse(`${day}T23:59:59${config.tzOffset}`);
  return new Date(endOfEventDay + 24 * 60 * 60 * 1000);
}

export function isEventAccessOpen(event) {
  return !!event.access_active && Date.now() < eventExpiry(event).getTime();
}

export const clean = (v, max = 190) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
