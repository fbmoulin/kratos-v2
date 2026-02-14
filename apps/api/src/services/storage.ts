import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

interface UploadParams {
  userId: string;
  documentId: string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
}

export const storageService = {
  async uploadDocument({ userId, documentId, fileName, fileBuffer, mimeType }: UploadParams) {
    const path = `${userId}/${documentId}/${fileName}`;
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, fileBuffer, { contentType: mimeType, upsert: false });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return { path: data.path };
  },

  async getSignedUrl(path: string, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, expiresIn);

    if (error) throw new Error(`Signed URL failed: ${error.message}`);
    return data.signedUrl;
  },
};
