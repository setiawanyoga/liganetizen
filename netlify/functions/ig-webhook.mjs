// Instagram: follower kirim DM "DAFTAR" -> cek follow -> daftar -> balas DM.
import crypto from 'node:crypto';
import { tambah, cari, ubahStatus, izinkan, rapikan, json } from './_db.mjs';

const GRAPH = 'https://graph.instagram.com/v21.0';
const KATA_KUNCI = /^\s*daftar\s*$/i;

export default async (req) => {
  // 1) Verifikasi webhook dari Meta (sekali saat setup)
  if (req.method === 'GET') {
    const u = new URL(req.url);
    if (u.searchParams.get('hub.mode') === 'subscribe' &&
        u.searchParams.get('hub.verify_token') === process.env.IG_VERIFY_TOKEN) {
      return new Response(u.searchParams.get('hub.challenge'), { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // 2) Pastikan pesan benar dari Meta (tanda tangan HMAC)
  const raw = await req.text();
  const sig = req.headers.get('x-hub-signature-256') || '';
  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.IG_APP_SECRET).update(raw).digest('hex');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return new Response('Bad signature', { status: 401 });
  }

  const body = JSON.parse(raw);
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      const text = ev.message?.text;
      const igsid = ev.sender?.id;
      if (!text || !igsid || ev.message?.is_echo || !KATA_KUNCI.test(text)) continue;
      try { await proses(igsid); } catch (e) { console.error(e); }
    }
  }
  return json({ ok: true }); // Meta butuh 200 cepat
};

async function proses(igsid) {
  const token = process.env.IG_ACCESS_TOKEN;
  const p = await fetch(`${GRAPH}/${igsid}?fields=username,is_user_follow_business&access_token=${token}`).then(r => r.json());
  if (p.error) throw new Error('Profil IG: ' + JSON.stringify(p.error));

  if (!p.is_user_follow_business) {
    return balas(igsid, `Halo @${p.username}! Follow akun Liga Netizen dulu ya, lalu kirim DAFTAR lagi.`);
  }

  const u = rapikan(p.username);
  const link = `${process.env.SITE_URL}/#daftar=${encodeURIComponent(u)}`;
  const lama = await cari(`platform=eq.instagram&platform_id=eq.${igsid}&select=id,status`);
  if (lama.length && lama[0].status === 'ditolak') {
    return balas(igsid, `@${u}, akunmu sudah dinonaktifkan oleh admin Liga Netizen.`);
  }
  if (!lama.length) await tambah({ platform: 'instagram', platform_id: igsid, username: u, status: 'aktif' });
  else if (lama[0].status !== 'aktif') await ubahStatus(lama[0].id, 'aktif');
  await izinkan(u);
  return balas(igsid, `Mantap @${u}, kamu terverifikasi sebagai follower Liga Netizen! Buka link ini untuk memilih klub, nomor punggung, dan posisi: ${link}`);
}

async function balas(igsid, text) {
  const r = await fetch(`${GRAPH}/me/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}` },
    body: JSON.stringify({ recipient: { id: igsid }, message: { text } }),
  });
  if (!r.ok) console.error('Balas DM gagal', r.status, await r.text());
}
