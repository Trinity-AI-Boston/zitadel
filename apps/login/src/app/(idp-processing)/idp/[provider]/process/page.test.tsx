import { beforeEach, expect, it, vi } from "vitest";
import { IdpProcessHandler } from "@/components/idp-process-handler";
import { getAuthRequest, getBrandingSettings, getDefaultOrg } from "@/lib/zitadel";
import ProcessPage from "./page";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/service-url", () => ({ getServiceConfig: () => ({ serviceConfig: {} }) }));
vi.mock("@/lib/zitadel", () => ({ getAuthRequest: vi.fn(), getBrandingSettings: vi.fn(), getDefaultOrg: vi.fn() }));
vi.mock("@/components/idp-process-handler", () => ({ IdpProcessHandler: () => null }));
vi.mock("@/components/dynamic-theme", () => ({ DynamicTheme: () => null }));

beforeEach(() => vi.clearAllMocks());

it.each([
  ["http://localhost:3000/auth/callback", "cosmos"],
  ["https://dev.cosmosone.ai/auth/callback", "cosmos"],
  ["http://csk.localhost:3000/auth/callback", "csk"],
  ["http://trinity.localhost:3000/auth/callback", "trinity"],
])("skips the login card and theme queries for %s", async (redirectUri, brand) => {
  vi.mocked(getAuthRequest).mockResolvedValue({ authRequest: { redirectUri } } as Awaited<ReturnType<typeof getAuthRequest>>);
  const page = await ProcessPage({
    params: Promise.resolve({ provider: "google" }),
    searchParams: Promise.resolve({ id: "intent", token: "test", requestId: "oidc_request", organization: "caller-org" }),
  });
  expect(page.type).toBe(IdpProcessHandler);
  expect(page.props.cosmosBrand).toBe(brand);
  expect(page.props.restartUrl).toBe(new URL("/login", redirectUri).toString());
  expect(getBrandingSettings).not.toHaveBeenCalled();
  expect(getDefaultOrg).not.toHaveBeenCalled();
});
