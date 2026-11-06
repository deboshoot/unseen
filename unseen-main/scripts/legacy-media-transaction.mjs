const quote = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`;

export function legacyMediaTransaction(row, asset, { rollback = false } = {}) {
  return `begin;
    set local lock_timeout='5s';
    do $migration$ begin
      perform 1 from public.opere where id=${quote(row.id)}::uuid and status=${quote(row.status)}
        and owner_id is not distinct from ${quote(row.owner_id)}::uuid and immagine_url=${quote(row.immagine_url)} and media_asset_id is null for update;
      if not found then raise exception 'Legacy source changed; retry migration'; end if;
      if ${quote(row.status)} <> 'accepted' and exists(select 1 from public.championship_entries where artwork_id=${quote(row.id)}::uuid) then
        raise exception 'Private image referenced by public bracket'; end if;
      insert into public.media_assets(id,owner_id,bucket,object_key,kind,mime_type,bytes,etag,is_public)
        values(${quote(asset.assetId)}::uuid,${quote(row.owner_id)}::uuid,${quote(asset.bucket)},${quote(asset.objectKey)},'image',${quote(asset.mime)},${Number(asset.bytes)},${quote(asset.etag)},${row.status === 'accepted'});
      update public.opere set immagine_url=${quote(asset.url)},media_asset_id=${quote(asset.assetId)}::uuid where id=${quote(row.id)}::uuid;
      update public.championship_entries set image_url=${quote(asset.url)} where artwork_id=${quote(row.id)}::uuid and image_url=${quote(row.immagine_url)};
      if not exists(select 1 from public.opere o join public.media_assets a on a.id=o.media_asset_id
        where o.id=${quote(row.id)}::uuid and a.object_key=${quote(asset.objectKey)} and a.is_public=${row.status === 'accepted'}) then
        raise exception 'Legacy asset link verification failed'; end if;
      if exists(select 1 from public.championship_entries where artwork_id=${quote(row.id)}::uuid and image_url=${quote(row.immagine_url)}) then
        raise exception 'Legacy bracket image reference remained'; end if;
    end $migration$;
    ${rollback ? 'rollback' : 'commit'};`;
}
