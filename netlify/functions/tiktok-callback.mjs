// TikTok: setelah follower mengizinkan, TikTok kembali ke sini membawa kode.
// Ambil username asli dari TikTok -> daftar langsung aktif -> arahkan ke kartu pemain.
import { tambah, cari, izinkan, rapikan } from './_db.mjs';

const redirect = (path) => new Response(null, {
  status: 302,
  headers: { Location: `${process.env.SITE_URL}${path}`, 'Set-Cookie': 'tt_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' },
});

export default async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  const cookie = (req.headers.get('cookie') || '').match(/(?:^|;\s*)tt_state=([a-f0-9]+)/)?.[1];

  if (u.searchParams.get('error') || !code) return redirect('/#daftar-info=batal');
  if (!state || state !== cookie) return redirect('/#daftar-info=gagal');

  try {
    // 1) Tukar kode dengan access token
    const tok = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.SITE_URL}/.netlify/functions/tiktok-callback`,
      }),
    }).then(r => r.json());
    if (!tok.access_token) throw new Error('Token TikTok: ' + JSON.stringify(tok));

    // 2) Ambil open_id dan username asli
    const info = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then(r => r.json());
    const user = info?.data?.user;
    if (!user?.open_id || !user?.username) throw new Error('User TikTok: ' + JSON.stringify(info));

    // 3) Daftarkan (langsung aktif) + masukkan ke daftar follower website.
    const un = rapikan(user.username);
    const ada = await cari(`platform=eq.tiktok&platform_id=eq.${encodeURIComponent(user.open_id)}&select=status`);
    if (ada.length && ada[0].status === 'ditolak') return redirect('/#daftar-info=nonaktif');
    if (!ada.length) await tambah({ platform: 'tiktok', platform_id: user.open_id, username: un, status: 'aktif' });
    await izinkan(un);
    return redirect(`/#daftar=${encodeURIComponent(un)}`);
  } catch (e) {
    console.error(e);
    return redirect('/#daftar-info=gagal');
  }
};
