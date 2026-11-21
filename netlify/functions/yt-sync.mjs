// YouTube: tarik subscriber publik tiap jam dan daftarkan yang baru.
import { tambah, izinkan, rapikan, json } from './_db.mjs';

export const config = { schedule: '@hourly' };

async function aksesToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID,
      client_secret: process.env.YT_CLIENT_SECRET,
      refresh_token: process.env.YT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Token YouTube: ' + JSON.stringify(d));
  return d.access_token;
}

export default async () => {
  const token = await aksesToken();
  let pageToken = '', total = 0, baru = 0;
  do {
    const u = new URL('https://www.googleapis.com/youtube/v3/subscriptions');
    u.search = new URLSearchParams({ part: 'subscriberSnippet', mySubscribers: 'true', maxResults: '50', ...(pageToken && { pageToken }) });
    const d = await fetch(u, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (d.error) throw new Error('YouTube API: ' + JSON.stringify(d.error));
    const items = d.items || [];
    // Ambil @handle tiap subscriber (channels.list, 1 unit per 50 channel)
    const ids = items.map(it => it.subscriberSnippet.channelId);
    const handle = {};
    if (ids.length) {
      const c = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&maxResults=50&id=${ids.join(',')}`,
        { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      for (const ch of c.items || []) handle[ch.id] = ch.snippet?.customUrl || ch.snippet?.title;
    }
    const rows = items.map(it => ({
      platform: 'youtube',
      platform_id: it.subscriberSnippet.channelId,
      username: rapikan(handle[it.subscriberSnippet.channelId] || it.subscriberSnippet.title),
      status: 'aktif',
    })).filter(r => r.username);
    total += rows.length;
    const masuk = await tambah(rows); // hanya yang benar-benar baru
    for (const r of masuk) await izinkan(r.username);
    baru += masuk.length;
    pageToken = d.nextPageToken || '';
  } while (pageToken);
  console.log(`YouTube sync: ${total} subscriber publik, ${baru} pemain baru`);
  return json({ total, baru });
};
