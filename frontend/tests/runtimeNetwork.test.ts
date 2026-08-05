import assert from "node:assert/strict";
import test from "node:test";

import {
  isLanHostname,
  resolveApiUrl,
} from "../src/utils/runtimeNetwork.ts";

test("uses localhost for the standard Mac session", () => {
  assert.equal(
    resolveApiUrl({
      protocol: "http:",
      hostname: "localhost",
    }),
    "http://localhost:3000",
  );
});

test("uses the same Mac hostname when opened from iPhone", () => {
  assert.equal(
    resolveApiUrl({
      protocol: "http:",
      hostname: "192.168.1.25",
    }),
    "http://192.168.1.25:3000",
  );
});

test("an explicit API URL has priority and is normalized", () => {
  assert.equal(
    resolveApiUrl({
      configuredUrl: "https://gfo.example.test/api/",
      protocol: "http:",
      hostname: "192.168.1.25",
    }),
    "https://gfo.example.test/api",
  );
});

test("recognizes LAN sessions", () => {
  assert.equal(isLanHostname("localhost"), false);
  assert.equal(isLanHostname("127.0.0.1"), false);
  assert.equal(isLanHostname("192.168.1.25"), true);
  assert.equal(isLanHostname("macbook-air.local"), true);
});
