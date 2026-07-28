import assert from "node:assert/strict";
import test from "node:test";

import { parseLocaleAmount } from "../src/utils/amounts.ts";

test("interpreta importi italiani e valori decimali non formattati", () => {
  assert.equal(
    parseLocaleAmount("276953.8"),
    276_953.8,
  );
  assert.equal(
    parseLocaleAmount("276953,80"),
    276_953.8,
  );
  assert.equal(
    parseLocaleAmount("276.953,80"),
    276_953.8,
  );
  assert.equal(
    parseLocaleAmount("1.070.000"),
    1_070_000,
  );
});

test("interpreta anche importi con separatori internazionali", () => {
  assert.equal(
    parseLocaleAmount("276,953.80"),
    276_953.8,
  );
  assert.equal(
    parseLocaleAmount("1,070,000"),
    1_070_000,
  );
});

test("rifiuta valori non monetari", () => {
  assert.equal(parseLocaleAmount(""), 0);
  assert.equal(
    parseLocaleAmount("276.953.8"),
    0,
  );
  assert.equal(
    parseLocaleAmount("-100"),
    0,
  );
});
