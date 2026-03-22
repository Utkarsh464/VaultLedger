/**
 * Safe error responder — never leaks internal error messages in production.
 * Use this for all 500-level route catches instead of res.status(500).json({ error: err.message }).
 */
export function serverError(res, err, fallback = 'Internal server error') {
  const message = process.env.NODE_ENV === 'production'
    ? fallback
    : (err?.message || fallback);
  console.error(`[${new Date().toISOString()}] Error:`, err?.message || err);
  return res.status(500).json({ error: message });
}
