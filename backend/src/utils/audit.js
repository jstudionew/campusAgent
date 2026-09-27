import { query } from '../config/db.js';

export const appendAuditLog = async ({
  actorId = null,
  actorRole = null,
  action,
  entityType = null,
  entityId = null,
  campusId = null,
  details = {},
  ipAddress = null,
  userAgent = null,
}) => {
  if (!action) return null;

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        actor_id INTEGER,
        actor_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        campus_id INTEGER,
        details JSONB DEFAULT '{}'::jsonb,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const result = await query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, campus_id, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW())
       RETURNING *`,
      [
        actorId ?? null,
        actorRole ?? null,
        action,
        entityType,
        entityId != null ? String(entityId) : null,
        campusId ?? null,
        JSON.stringify(details ?? {}),
        ipAddress ?? null,
        userAgent ?? null,
      ]
    );

    return result.rows[0] || null;
  } catch (_) {
    return null;
  }
};
