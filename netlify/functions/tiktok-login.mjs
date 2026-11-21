// TikTok: tombol "Daftar dengan TikTok" mengarah ke sini -> diteruskan ke halaman izin TikTok.
import crypto from 'node:crypto';

export default async () => {
  const state = crypto.randomBytes(16).toString('hex');
  const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
  u.search = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    scope: 'user.info.basic,user.info.profile',
    response_type: 'code',
    redirect_uri: `${process.env.SITE_URL}/.netlify/functions/tiktok-callback`,
    state,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: u.toString(),
      'Set-Cookie': `tt_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  });
};
