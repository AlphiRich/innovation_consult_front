/**
 * Election Campaign OS — Cloud Storage adapter: file store
 * IC-ECOS-BUILD-2026-V2 §5, §6.4.
 *
 * The only place in the app that writes an object to Storage. Bucket
 * location is africa-south1, set at bucket-creation time (§0 rule 1) —
 * see firebase.json's note; it is not expressible from client code, so
 * this adapter cannot enforce it and does not pretend to.
 */
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { SessionContext } from '@/dal/ports/session';
import { isPathWithinTenant, type FileStoreRepository, type StoredFile } from '@/dal/ports/fileStore';
import { getStorageClient } from './client';

function assertTenantPath(ctx: SessionContext, path: string): void {
  if (!isPathWithinTenant(ctx.tenantId, path)) {
    // storage.rules is the enforcement layer; this is the same
    // defence-in-depth as geoScopeConstraints() in base.ts — fail here
    // with a legible message rather than as an opaque 403.
    throw new Error(`Refusing to touch "${path}": outside tenant ${ctx.tenantId}.`);
  }
}

export const fileStoreRepository: FileStoreRepository = {
  async upload(ctx: SessionContext, path: string, bytes: Uint8Array, contentType: string): Promise<StoredFile> {
    assertTenantPath(ctx, path);
    const objectRef = ref(getStorageClient(), path);
    const result = await uploadBytes(objectRef, bytes, { contentType });
    return {
      path,
      downloadUrl: await getDownloadURL(objectRef),
      sizeBytes: result.metadata.size ?? bytes.byteLength,
    };
  },

  async getDownloadUrl(ctx: SessionContext, path: string): Promise<string> {
    assertTenantPath(ctx, path);
    return getDownloadURL(ref(getStorageClient(), path));
  },
};
