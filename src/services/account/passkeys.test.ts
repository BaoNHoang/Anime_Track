import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authenticationOptions,
  registrationOptions
} from "./passkeys";

describe("passkey browser options", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("decodes registration and authentication challenges", () => {
    vi.stubGlobal("window", {
      atob: (value: string) => globalThis.atob(value)
    });

    const registration = registrationOptions({
      challenge: "AQID",
      rp: { name: "Banime" },
      user: { id: "BAUG", name: "user", displayName: "User" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }]
    });
    const authentication = authenticationOptions({ challenge: "BwgJ" });

    expect(Array.from(registration.challenge as Uint8Array)).toEqual([1, 2, 3]);
    expect(Array.from(registration.user.id as Uint8Array)).toEqual([4, 5, 6]);
    expect(Array.from(authentication.challenge as Uint8Array)).toEqual([7, 8, 9]);
  });
});
