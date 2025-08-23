'use strict';

const { Pool } = require('pg');

let pool = null;

function createPgPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (pool) return pool;
  const needsSsl = /supabase\.co/i.test(url) || /render\.com|railway\.app|herokuapp\.com/i.test(process.env.PUBLIC_URL || '');
  const base = { connectionString: url, max: 3, idleTimeoutMillis: 30000 };
  pool = new Pool(needsSsl ? { ...base, ssl: { rejectUnauthorized: false } } : base);
  return pool;
}

async function insertRoomLogPg({ roomId, createdAtIso, closedAtIso, messagesEncrypted, participants }) {
  const pg = createPgPool();
  if (!pg) return false;
  const text = `
    create table if not exists rooms (
      id bigserial primary key,
      room_id text not null,
      created_at timestamptz default now(),
      created_at_iso text,
      closed_at_iso text,
      messages_encrypted jsonb,
      participants jsonb
    );
    insert into rooms (room_id, created_at_iso, closed_at_iso, messages_encrypted, participants)
    values ($1, $2, $3, $4::jsonb, $5::jsonb);
  `;
  await pg.query('begin');
  try {
    await pg.query(text, [roomId, createdAtIso, closedAtIso, JSON.stringify(messagesEncrypted), JSON.stringify(participants)]);
    await pg.query('commit');
    return true;
  } catch (e) {
    await pg.query('rollback');
    return false;
  }
}

module.exports = { createPgPool, insertRoomLogPg };


