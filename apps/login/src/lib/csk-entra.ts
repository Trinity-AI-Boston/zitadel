// CSK DEV's explicitly trusted Entra SAML provider. Other providers retain their registration flow.
export const CSK_ORGANIZATION_ID = "393340147136987139";
export const CSK_ENTRA_PROVIDER_ID = "393340902027821059";
export const COSMOS_PROJECT_ID = "385976020320124931";
export const CSK_ENTRA_ERROR = "Microsoft sign-in could not be completed. Please contact Cosmos One support.";

const CLAIM_PREFIX = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/";
export const CSK_GROUP_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups";
export const CSK_GROUP_ROLES: Record<string, string> = {
  "467a0f7d-a139-4961-8290-761d75660d06": "associate",
  "7db93988-c905-4b4c-af7c-788af97adb1d": "managing_partner",
  "e2d0b62a-1511-46ef-b87a-10277ad10c4d": "paralegal",
  "74fbceb1-888a-46c4-b13e-f28fef575718": "partner",
};

export function readCskGroups(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const attributes = (raw as Record<string, unknown>).attributes;
  if (!attributes || typeof attributes !== "object") return [];
  const values = (attributes as Record<string, unknown>)[CSK_GROUP_CLAIM];
  if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) return [];
  return Array.from(new Set(values.filter((v: string) => Object.hasOwn(CSK_GROUP_ROLES, v))));
}
const DOMAINS = new Set([
  "csklegal.com",
  "colescottkissane.onmicrosoft.com",
  "csk.legal",
  "colescottkissane.mail.onmicrosoft.com",
  "tprm.csklegal.com",
]);

export function isCskRegistration(organization?: string, providerId?: string): boolean {
  return organization === CSK_ORGANIZATION_ID || providerId === CSK_ENTRA_PROVIDER_ID;
}

// Only call with rawInformation retrieved by the server from a validated IDP intent.
// Browser query parameters and submitted form values must never supply these claims.
export function readCskEntraProfile(providerId: string, organization: string | undefined, raw: unknown) {
  if (providerId !== CSK_ENTRA_PROVIDER_ID || organization !== CSK_ORGANIZATION_ID) {
    throw new Error("CSK identity provider or organization mismatch");
  }
  if (!raw || typeof raw !== "object") throw new Error("Missing Entra attributes");
  const attributes = (raw as Record<string, unknown>).attributes;
  if (!attributes || typeof attributes !== "object") throw new Error("Missing Entra attributes");
  function claim(name: string): string {
    const values = (attributes as Record<string, unknown>)[CLAIM_PREFIX + name];
    if (!Array.isArray(values) || values.length !== 1 || typeof values[0] !== "string") {
      throw new Error("Missing or ambiguous Entra profile claim");
    }
    const value = values[0].trim();
    if (!value || value.length > 200) throw new Error("Invalid Entra profile claim");
    return value;
  }
  const email = claim("emailaddress").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || !DOMAINS.has(email.split("@")[1])) {
    throw new Error("Unapproved Entra email domain");
  }
  const givenName = claim("givenname");
  const familyName = claim("surname");
  return { email, givenName, familyName };
}
