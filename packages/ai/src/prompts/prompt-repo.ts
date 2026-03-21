import { createHash } from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db, promptVersions } from '@kratos/db';

function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export const promptRepo = {
  /** Get the active version for a prompt key, or null if none active */
  async getActive(promptKey: string) {
    const [result] = await db
      .select()
      .from(promptVersions)
      .where(
        and(
          eq(promptVersions.promptKey, promptKey),
          eq(promptVersions.isActive, true),
        ),
      )
      .limit(1);

    return result ?? null;
  },

  /** List all versions for a prompt key, ordered by version desc */
  async listVersions(promptKey: string) {
    return db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.promptKey, promptKey))
      .orderBy(desc(promptVersions.version));
  },

  /** List all distinct prompt keys with their active version */
  async listKeys() {
    return db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.isActive, true))
      .orderBy(promptVersions.promptKey);
  },

  /** Activate a specific version (deactivates all others for that key, marks old active as rolled_back) */
  async activate(promptKey: string, version: number) {
    // Mark the previously active version as rolled_back
    await db
      .update(promptVersions)
      .set({ isActive: false, status: 'rolled_back' })
      .where(
        and(
          eq(promptVersions.promptKey, promptKey),
          eq(promptVersions.isActive, true),
        ),
      );

    // Deactivate any remaining versions
    await db
      .update(promptVersions)
      .set({ isActive: false })
      .where(eq(promptVersions.promptKey, promptKey));

    const [result] = await db
      .update(promptVersions)
      .set({ isActive: true, status: 'active' })
      .where(
        and(
          eq(promptVersions.promptKey, promptKey),
          eq(promptVersions.version, version),
        ),
      )
      .returning();

    return result ?? null;
  },

  /** Create a new prompt version in draft status with auto-computed content hash */
  async createVersion(data: { promptKey: string; version: number; content: string }) {
    const contentHash = computeContentHash(data.content);
    const [result] = await db.insert(promptVersions).values({
      promptKey: data.promptKey,
      version: data.version,
      content: data.content,
      isActive: false,
      status: 'draft',
      contentHash,
    }).returning();

    return result;
  },

  /** Approve a draft version (must be approved before activation) */
  async approve(promptKey: string, version: number) {
    const [result] = await db
      .update(promptVersions)
      .set({ status: 'approved' })
      .where(
        and(
          eq(promptVersions.promptKey, promptKey),
          eq(promptVersions.version, version),
        ),
      )
      .returning();

    return result ?? null;
  },

  /** Validate a prompt's content hash matches the stored hash */
  async validate(promptKey: string): Promise<{ valid: boolean; message: string }> {
    const active = await this.getActive(promptKey);
    if (!active) {
      return { valid: false, message: `No active version for key "${promptKey}"` };
    }

    const computedHash = computeContentHash(active.content);
    const storedHash = active.contentHash;

    if (storedHash && computedHash !== storedHash) {
      return {
        valid: false,
        message: `Content hash mismatch for "${promptKey}" v${active.version}: ` +
          `stored=${storedHash}, computed=${computedHash}`,
      };
    }

    return { valid: true, message: `Prompt "${promptKey}" v${active.version} is valid` };
  },
};
