import { eq, and, desc } from 'drizzle-orm';
import { db, promptVersions } from '@kratos/db';

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

  /** Activate a specific version (deactivates all others for that key) */
  async activate(promptKey: string, version: number) {
    await db
      .update(promptVersions)
      .set({ isActive: false })
      .where(eq(promptVersions.promptKey, promptKey));

    const [result] = await db
      .update(promptVersions)
      .set({ isActive: true })
      .where(
        and(
          eq(promptVersions.promptKey, promptKey),
          eq(promptVersions.version, version),
        ),
      )
      .returning();

    return result ?? null;
  },
};
