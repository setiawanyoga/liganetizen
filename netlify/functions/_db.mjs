// Helper Supabase REST (dipakai semua fungsi). Kunci service role HANYA di server.
const URL_ = () => process.env.SUPABASE_URL;
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

// Kunci baru (sb_secret_...) cukup lewat header apikey; kunci lama (service_role JWT) juga lewat Authorization.
const headers = (extra = {}) => ({
  apikey: KEY(),
  ...(KEY().startsWith('sb_') ? {} : { Authorization: `Bearer ${KEY()}` }),
  'Content-Type': 'application/json',
  ...extra,
});

// Tambah pendaftar. Jika (platform, platform_id) sudah ada, data lama dipertahankan.
export async function tambah(rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) return [];
  const r = await fetch(`${URL_()}/rest/v1/pendaftar?on_conflict=platform,platform_id`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates,return=representation' }),
    body: JSON.stringify(list),
  });
  if (!r.ok) throw new Error(`Supabase insert gagal: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function cari(query) {
  const r = await fetch(`${URL_()}/rest/v1/pendaftar?${query}`, { headers: headers() });
  if (!r.ok) throw new Error(`Supabase select gagal: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function ubahStatus(id, status) {
  const r = await fetch(`${URL_()}/rest/v1/pendaftar?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error(`Supabase update gagal: ${r.status} ${await r.text()}`);
  return r.json();
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// Ubah nama platform jadi username yang diterima website (huruf kecil, a-z 0-9 . _ , maks 30).
export const rapikan = (u) => String(u || '').trim().replace(/^@/, '').toLowerCase()
  .replace(/[^a-z0-9._]/g, '_').slice(0, 30);

// Masukkan ke daftar follower website (tabel "allowed") supaya bisa memilih klub/nomor/posisi.
export async function izinkan(username) {
  const r = await fetch(`${URL_()}/rest/v1/allowed?on_conflict=username`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify([{ username }]),
  });
  if (!r.ok) throw new Error(`Supabase allowed gagal: ${r.status} ${await r.text()}`);
}

// Keluarkan dari daftar follower (pemain yang sudah terdaftar tidak ikut terhapus).
export async function cabut(username) {
  const r = await fetch(`${URL_()}/rest/v1/allowed?username=eq.${encodeURIComponent(username)}`, {
    method: 'DELETE', headers: headers(),
  });
  if (!r.ok) throw new Error(`Supabase allowed hapus gagal: ${r.status} ${await r.text()}`);
}
