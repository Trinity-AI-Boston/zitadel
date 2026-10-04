import { describe, expect, it } from "vitest";
import { cosmosBrandForCallback, withGoogleLoginHint } from "./cosmos-brand";

describe("Cosmos login handoff", () => {
  it("only brands exact registered callbacks", () => {
    expect(cosmosBrandForCallback("http://localhost:3000/auth/callback")).toBe("cosmos");
    expect(cosmosBrandForCallback("https://dev.cosmosone.ai/auth/callback")).toBe("cosmos");
    expect(cosmosBrandForCallback("https://csk.dev.cosmosone.ai/auth/callback")).toBe("csk");
    expect(cosmosBrandForCallback("http://trinity.localhost:3000/auth/callback")).toBe("trinity");
    for (const uri of [
      undefined,
      "constructor",
      "https://csk.dev.cosmosone.ai.evil.test/auth/callback",
      "https://csk.dev.cosmosone.ai/auth/callback?brand=trinity",
    ])
      expect(cosmosBrandForCallback(uri)).toBeUndefined();
  });
  it("forwards the email hint while preserving OAuth state and prompts", () => {
    const url = new URL(
      withGoogleLoginHint(
        "https://accounts.google.com/o/oauth2/v2/auth?state=opaque&prompt=consent&redirect_uri=https%3A%2F%2Fid.test%2Fcallback",
        "person@csklegal.com",
      ),
    );
    expect(url.searchParams.get("login_hint")).toBe("person@csklegal.com");
    expect(url.searchParams.get("state")).toBe("opaque");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("redirect_uri")).toBe("https://id.test/callback");
  });
  it("does not forward email to other destinations", () => {
    for (const uri of [
      "/relative",
      "http://accounts.google.com/o/oauth2/auth",
      "https://accounts.google.com.evil.test/o/oauth2/auth",
      "https://accounts.google.com/other",
    ])
      expect(withGoogleLoginHint(uri, "person@csklegal.com")).toBe(uri);
    expect(withGoogleLoginHint("https://accounts.google.com/o/oauth2/auth", "invalid")).toBe("https://accounts.google.com/o/oauth2/auth");
  });
});
