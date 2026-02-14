import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}));

const { storageService } = await import('./storage.js');

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('uploadDocument uploads file to correct path', async () => {
    mockUpload.mockResolvedValue({
      data: { path: 'user-1/doc-1/test.pdf' },
      error: null,
    });

    const result = await storageService.uploadDocument({
      userId: 'user-1',
      documentId: 'doc-1',
      fileName: 'test.pdf',
      fileBuffer: Buffer.from('PDF'),
      mimeType: 'application/pdf',
    });

    expect(result.path).toBe('user-1/doc-1/test.pdf');
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/doc-1/test.pdf',
      expect.any(Buffer),
      { contentType: 'application/pdf', upsert: false },
    );
  });

  test('uploadDocument throws on storage error', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    await expect(
      storageService.uploadDocument({
        userId: 'u',
        documentId: 'd',
        fileName: 'f.pdf',
        fileBuffer: Buffer.from(''),
        mimeType: 'application/pdf',
      }),
    ).rejects.toThrow('Storage upload failed');
  });

  test('getSignedUrl returns signed URL string', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed?token=abc' },
      error: null,
    });

    const url = await storageService.getSignedUrl('user-1/doc-1/test.pdf');
    expect(url).toBe('https://example.com/signed?token=abc');
  });
});
