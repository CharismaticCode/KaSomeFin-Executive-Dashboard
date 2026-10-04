import { describe, it, expect } from "vitest";
import { hashResetCode, newCode, prettyCode, whatsappLink } from "../src/lib/resetcode.js";

describe("reset codes", () => {
  it("hash matches the app's server function (shared test vector)", async () => {
    expect(await hashResetCode("a1b2c3", "123456")).toBe("4f2f3bff5af2c6f668b70a0d29cf509a7398b32a1dcc4eedcf424b8bba3a9b74");
  });
  it("codes are 6 digits, zero-padded, and skip biased values", () => {
    const seq = [[0xFFFFFFFF], [42]];
    expect(newCode(() => seq.shift())).toBe("000042");
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^\d{6}$/);
  });
  it("formats and builds a WhatsApp message", () => {
    expect(prettyCode("123456")).toBe("123 456");
    const url = whatsappLink("+260 97 100 0002", "Daniel Khena", "123456", "2026-10-05T16:30:00Z");
    expect(url.startsWith("https://wa.me/260971000002?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("Hi Daniel, your KaSomeFin password reset code is 123 456.");
    expect(text).toContain("until 18:30 tomorrow");
  });
});
