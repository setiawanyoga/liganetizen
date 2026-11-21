-- Tabel pendaftaran otomatis Liga Netizen
create table if not exists public.pendaftar (
  id          bigint generated always as identity primary key,
  platform    text not null check (platform in ('instagram','youtube','tiktok')),
  platform_id text not null,          -- IGSID Instagram / channelId YouTube / username TikTok (huruf kecil)
  username    text not null,
  status      text not null default 'menunggu' check (status in ('aktif','menunggu','ditolak')),
  created_at  timestamptz not null default now(),
  unique (platform, platform_id)
);

-- Hanya server (service role) yang boleh menulis. Publik hanya bisa membaca pemain aktif.
alter table public.pendaftar enable row level security;

drop policy if exists "baca pemain aktif" on public.pendaftar;
create policy "baca pemain aktif" on public.pendaftar
  for select using (status = 'aktif');
