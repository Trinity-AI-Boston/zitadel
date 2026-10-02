import { describe, expect, test, vi } from "vitest";
import { CSK_ENTRA_ERROR, CSK_ENTRA_PROVIDER_ID, CSK_ORGANIZATION_ID } from "../csk-entra";
import { registerUser, registerUserAndLinkToIDP } from "./register";

vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));

describe("CSK manual registration is unavailable", () => {
  const profile = { email: "pilot@csklegal.com", firstName: "Pilot", lastName: "User" };

  test("rejects local registration before creating a user", async () => {
    expect(await registerUser({ ...profile, organization: CSK_ORGANIZATION_ID })).toEqual({ error: CSK_ENTRA_ERROR });
  });

  test("rejects an old Entra registration form submission", async () => {
    expect(await registerUserAndLinkToIDP({
      ...profile, organization: CSK_ORGANIZATION_ID,
      idpId: CSK_ENTRA_PROVIDER_ID, idpUserId: "subject", idpUserName: "pilot",
      idpIntent: { idpIntentId: "intent", idpIntentToken: "token" },
    })).toEqual({ error: CSK_ENTRA_ERROR });
  });
});
