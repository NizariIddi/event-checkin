import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { requireScanner } from '../middleware/auth.js';
import { normalizeCode } from '../utils.js';

const router = Router();
router.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
router.use(requireScanner);

const pub = (g) => ({
  code: g.code, full_name: g.full_name, phone: g.phone, category: g.category,
  table_no: g.table_no, checked_in_at: g.checked_in_at,
});

async function stats(eventId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total, COALESCE(SUM(checked_in_at IS NOT NULL),0) AS arrived FROM guests WHERE event_id = ?', [eventId]);
  return { total: Number(rows[0].total), arrived: Number(rows[0].arrived) };
}

async function findGuest(rawCode, eventId) {
  const code = normalizeCode(rawCode);
  if (!code) return { status: 'not_found' };
  const [rows] = await pool.query('SELECT * FROM guests WHERE code = ?', [code]);
  const g = rows[0];
  if (!g) return { status: 'not_found', code };
  // ID exists but belongs to another event: reveal nothing about the guest
  if (g.event_id !== eventId) return { status: 'wrong_event', code };
  return { status: g.checked_in_at ? 'already' : 'ok', code, guest: pub(g) };
}

router.get('/event', async (req, res, next) => {
  try {
    const { name, event_date, venue } = req.event;
    res.json({ name, event_date, venue, ...(await stats(req.event.id)) });
  } catch (e) { next(e); }
});

// Look up only (does not check anyone in)
router.post('/lookup', async (req, res, next) => {
  try { res.json(await findGuest(req.body?.code, req.event.id)); } catch (e) { next(e); }
});

// Confirm arrival. The UPDATE is atomic, so two scanners can't both succeed.
router.post('/checkin', async (req, res, next) => {
  try {
    const found = await findGuest(req.body?.code, req.event.id);
    if (found.status !== 'ok') return res.json(found);
    const [r] = await pool.query(
      'UPDATE guests SET checked_in_at = NOW() WHERE code = ? AND event_id = ? AND checked_in_at IS NULL',
      [found.code, req.event.id]);
    const after = await findGuest(found.code, req.event.id);
    res.json({ ...after, status: r.affectedRows === 1 ? 'checked_in' : 'already' });
  } catch (e) { next(e); }
});

export default router;
