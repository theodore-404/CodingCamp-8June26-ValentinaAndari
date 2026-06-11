// Feature: expense-budget-visualizer — test scaffolding
// Shared arbitraries and smoke test. Property tests are added in subsequent tasks.

import * as fc from "fast-check";

// ── Shared arbitrary ─────────────────────────────────────────────────────────

/**
 * Generates a valid transaction object matching the Transaction shape
 * defined in the design document:
 *   { name: string (1–100 non-whitespace), amount: positive integer, category: string }
 */
export const transactionArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  amount: fc.integer({ min: 1 }),
  category: fc.constantFrom("Food", "Transport", "Fun"),
});

// ── Smoke test ───────────────────────────────────────────────────────────────

describe("Test scaffolding smoke test", () => {
  it("transactionArb generates valid transaction objects", () => {
    fc.assert(
      fc.property(transactionArb, (transaction) => {
        expect(typeof transaction.name).toBe("string");
        expect(transaction.name.trim().length).toBeGreaterThan(0);
        expect(transaction.name.length).toBeLessThanOrEqual(100);
        expect(typeof transaction.amount).toBe("number");
        expect(transaction.amount).toBeGreaterThan(0);
        expect(["Food", "Transport", "Fun"]).toContain(transaction.category);
      })
    );
  });
});
