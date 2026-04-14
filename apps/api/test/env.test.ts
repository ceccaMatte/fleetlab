import { describe, expect, it } from "vitest";

import { loadEnv } from "../src/config/env.ts";

describe("loadEnv", () => {
  it("uses default host and port when env is empty", () => {
    expect(loadEnv({})).toEqual({
      host: "0.0.0.0",
      port: 3000
    });
  });

  it("throws when API_PORT is not a positive integer", () => {
    expect(() => loadEnv({ API_PORT: "0" })).toThrow("Invalid API_PORT value: 0");
    expect(() => loadEnv({ API_PORT: "abc" })).toThrow("Invalid API_PORT value: abc");
  });
});
