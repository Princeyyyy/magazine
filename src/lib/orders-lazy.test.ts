import { describe, it, expect, afterAll } from "vitest";
import { ensureDbReady, db } from "@/db";
import { orders } from "@/db/schema";
import { createOrLoadDraft, saveDraftAnswers, getDraftByToken } from "@/lib/orders";
import { eq } from "drizzle-orm";

describe("Lazy Order Creation & Phantom Record Prevention", () => {
  let createdDraftToken: string | undefined;

  afterAll(async () => {
    if (createdDraftToken) {
      await db.delete(orders).where(eq(orders.draftToken, createdDraftToken));
    }
  });

  it("does not create an order in DB on blank visit with no token", async () => {
    await ensureDbReady();
    const countBefore = (await db.select().from(orders)).length;

    const draft = await createOrLoadDraft(undefined);
    expect(draft).toBeNull();

    const countAfter = (await db.select().from(orders)).length;
    expect(countAfter).toBe(countBefore);
  });

  it("does not create an order in DB on empty save", async () => {
    await ensureDbReady();
    const countBefore = (await db.select().from(orders)).length;

    const result = await saveDraftAnswers(undefined, {});
    expect(result.created).toBe(false);
    expect(result.draftToken).toBe("");

    const countAfter = (await db.select().from(orders)).length;
    expect(countAfter).toBe(countBefore);
  });

  it("lazily creates exactly 1 order when meaningful data is entered", async () => {
    await ensureDbReady();
    const countBefore = (await db.select().from(orders)).length;

    const firstSave = await saveDraftAnswers(undefined, {
      customer_name: "Prince Mumo Test",
    });

    expect(firstSave.created).toBe(true);
    expect(firstSave.draftToken).toBeTruthy();
    expect(firstSave.reference).toMatch(/^HM-\d{4}-\d{4}$/);
    createdDraftToken = firstSave.draftToken;

    const countAfter = (await db.select().from(orders)).length;
    expect(countAfter).toBe(countBefore + 1);

    // Subsequent updates to the same draft must NOT create new orders
    const secondSave = await saveDraftAnswers(firstSave.draftToken, {
      customer_name: "Prince Mumo Test",
      her_name: "Amina Hassan",
    });

    expect(secondSave.created).toBe(false);
    expect(secondSave.draftToken).toBe(firstSave.draftToken);

    const countFinal = (await db.select().from(orders)).length;
    expect(countFinal).toBe(countBefore + 1);

    const restored = await getDraftByToken(firstSave.draftToken);
    expect(restored).not.toBeNull();
    expect(restored?.values["her_name"]).toBe("Amina Hassan");
  });
});
