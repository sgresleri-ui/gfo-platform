import assert from "node:assert/strict";
import test from "node:test";

import {
  parseFlexibleDecimal,
  parseLocaleAmount,
  parseLocaleAmountOrNull,
} from "../src/utils/amounts.ts";

test("interpreta punto e virgola come separatori decimali equivalenti", () => {
  assert.equal(
    parseFlexibleDecimal("23.613"),
    23.613,
  );
  assert.equal(
    parseFlexibleDecimal("23,613"),
    23.613,
  );
  assert.equal(
    parseFlexibleDecimal("-0.25"),
    -0.25,
  );
  assert.equal(
    parseFlexibleDecimal("-0,25"),
    -0.25,
  );
});

test("rifiuta separatori ambigui nei campi decimali", () => {
  assert.equal(
    parseFlexibleDecimal("1.234,56"),
    null,
  );
  assert.equal(
    parseFlexibleDecimal("1,234.56"),
    null,
  );
  assert.equal(
    parseFlexibleDecimal("12,3,4"),
    null,
  );
});

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

test("distingue lo zero valido da un importo non riconosciuto", () => {
  assert.equal(
    parseLocaleAmountOrNull("0"),
    0,
  );
  assert.equal(
    parseLocaleAmountOrNull("70.016,43"),
    70_016.43,
  );
  assert.equal(
    parseLocaleAmountOrNull("70,016.43"),
    70_016.43,
  );
  assert.equal(
    parseLocaleAmountOrNull("70016.43"),
    70_016.43,
  );
  assert.equal(
    parseLocaleAmountOrNull("70016,43"),
    70_016.43,
  );
  assert.equal(
    parseLocaleAmountOrNull("70.016.43"),
    null,
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
