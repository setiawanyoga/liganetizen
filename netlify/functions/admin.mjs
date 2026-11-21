// Panel admin: lihat pendaftar menunggu, setujui / tolak. Dilindungi ADMIN_PASSWORD.
import crypto from 'node:crypto';
import { cari, ubahStatus, izinkan, cabut, json } from './_db.mjs';

const cocok = (a, b) => {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export default async (req) => {
  const pw = (process.env.ADMIN_PASSWORD || '').trim();
  if (!pw) {
    return json({ error: 'Server belum membaca ADMIN_PASSWORD. Cek nama key di Netlify, lalu publish versi terbaru.' }, 500);
  }
  if (!cocok((req.headers.get('x-admin-password') || '').trim(), pw)) {
    return json({ error: `Password salah (password di server terdiri dari ${pw.length} karakter)` }, 401);
  }
  if (req.method === 'GET') {
    const status = new URL(req.url).searchParams.get('status') || 'menunggu';
    if (!['aktif', 'menunggu', 'ditolak'].includes(status)) return json({ error: 'Status tidak dikenal' }, 400);
    return json(await cari(`status=eq.${status}&order=created_at.asc&select=id,platform,username,status,created_at`));
  }
  if (req.method === 'POST') {
    const { id, status } = await req.json();
    if (!['aktif', 'ditolak'].includes(status)) return json({ error: 'Status harus aktif atau ditolak' }, 400);
    const [row] = await ubahStatus(id, status);
    if (row) await (status === 'aktif' ? izinkan(row.username) : cabut(row.username));
    return json([row]);
  }
  return json({ error: 'Method tidak didukung' }, 405);
};
