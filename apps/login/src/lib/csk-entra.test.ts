import { describe, expect, test } from "vitest";
import {
  CSK_ENTRA_PROVIDER_ID,
  CSK_GROUP_CLAIM,
  CSK_GROUP_ROLES,
  CSK_ORGANIZATION_ID,
  isCskRegistration,
  readCskEntraProfile,
  readCskGroups,
} from "./csk-entra";

const prefix = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/";
const attributes = {
  [prefix + "emailaddress"]: [" Pilot@csklegal.com "],
  [prefix + "givenname"]: ["Pilot"],
  [prefix + "surname"]: ["User"],
};

describe("CSK Entra provisioning", () => {
  test("reads profile from Entra claims", () => {
    expect(
      readCskEntraProfile(CSK_ENTRA_PROVIDER_ID, CSK_ORGANIZATION_ID, {
        attributes,
      }),
    ).toEqual({
      email: "pilot@csklegal.com",
      givenName: "Pilot",
      familyName: "User",
    });
  });

  test("rejects a different provider or organization", () => {
    expect(() => readCskEntraProfile("other", CSK_ORGANIZATION_ID, { attributes })).toThrow();
    expect(() => readCskEntraProfile(CSK_ENTRA_PROVIDER_ID, "other", { attributes })).toThrow();
  });

  test.each([
    undefined,
    {},
    { attributes: {} },
    { attributes: { ...attributes, [prefix + "surname"]: [""] } },
    {
      attributes: {
        ...attributes,
        [prefix + "emailaddress"]: ["pilot@untrusted.example"],
      },
    },
    {
      attributes: {
        ...attributes,
        [prefix + "emailaddress"]: ["pilot@csklegal.com", "other@csklegal.com"],
      },
    },
  ])("rejects missing, ambiguous or unapproved profile data", (raw) => {
    expect(() => readCskEntraProfile(CSK_ENTRA_PROVIDER_ID, CSK_ORGANIZATION_ID, raw)).toThrow();
  });

  test("blocks CSK manual registration without affecting other organizations", () => {
    expect(isCskRegistration(CSK_ORGANIZATION_ID, "other")).toBe(true);
    expect(isCskRegistration("other", CSK_ENTRA_PROVIDER_ID)).toBe(true);
    expect(isCskRegistration("other", "other")).toBe(false);
  });
});

describe("CSK groups", () => {
  test.each(Object.keys(CSK_GROUP_ROLES))("accepts configured group %s", (group) => {
    expect(readCskGroups({ attributes: { [CSK_GROUP_CLAIM]: [group, group, "unrelated"] } })).toEqual([group]);
  });
  test.each([
    undefined,
    {},
    { attributes: {} },
    { attributes: { [CSK_GROUP_CLAIM]: "invalid" } },
    { attributes: { [CSK_GROUP_CLAIM]: [123] } },
  ])("does not grant access for missing or malformed groups", (raw) => {
    expect(readCskGroups(raw)).toEqual([]);
  });
});
