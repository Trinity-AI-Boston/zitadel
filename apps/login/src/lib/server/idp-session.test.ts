import { beforeEach, expect, it, vi } from "vitest";
import { createNewSessionFromIdpIntent } from "./idp";
import { getUserByID, getLoginSettings, listAuthenticationMethodTypes } from "../zitadel";
import { createSessionForIdpAndUpdateCookie } from "./cookie";
import { checkEmailVerification, checkMFAFactors } from "../verify-helper";
import { completeFlowOrGetUrl } from "../client";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../service-url", () => ({ getServiceConfig: () => ({ serviceConfig: {} }) }));
vi.mock("../zitadel", () => ({ getUserByID: vi.fn(), getLoginSettings: vi.fn(), listAuthenticationMethodTypes: vi.fn() }));
vi.mock("./cookie", () => ({ createSessionForIdpAndUpdateCookie: vi.fn() }));
vi.mock("../verify-helper", () => ({ checkEmailVerification: vi.fn(), checkMFAFactors: vi.fn() }));
vi.mock("../client", () => ({ completeFlowOrGetUrl: vi.fn() }));

const command = { userId: "user", idpIntent: { idpIntentId: "intent", idpIntentToken: "test" }, requestId: "oidc_test" };
const session = { id: "session", factors: { user: { id: "user", organizationId: "org" } } };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getUserByID).mockResolvedValue({ user: { details: { resourceOwner: "org" }, type: { case: "human", value: {} } } } as any);
  vi.mocked(getLoginSettings).mockResolvedValue({} as any);
  vi.mocked(createSessionForIdpAndUpdateCookie).mockResolvedValue(session as any);
  vi.mocked(listAuthenticationMethodTypes).mockResolvedValue({ authMethodTypes: [] } as any);
  vi.mocked(completeFlowOrGetUrl).mockResolvedValue({ redirect: "/done" });
});

it("overlaps the MFA read with session creation and waits for both before verification", async () => {
  let finishSession!: (value: any) => void;
  let finishMethods!: (value: any) => void;
  vi.mocked(createSessionForIdpAndUpdateCookie).mockReturnValue(new Promise(resolve => { finishSession = resolve; }));
  vi.mocked(listAuthenticationMethodTypes).mockReturnValue(new Promise(resolve => { finishMethods = resolve; }));
  const result = createNewSessionFromIdpIntent(command);
  await vi.waitFor(() => expect(listAuthenticationMethodTypes).toHaveBeenCalledWith({ serviceConfig: {}, userId: "user" }));
  expect(createSessionForIdpAndUpdateCookie).toHaveBeenCalledTimes(1);
  expect(checkMFAFactors).not.toHaveBeenCalled();
  finishSession(session);
  await Promise.resolve();
  expect(completeFlowOrGetUrl).not.toHaveBeenCalled();
  finishMethods({ authMethodTypes: [] });
  expect(await result).toEqual({ redirect: "/done" });
  expect(checkEmailVerification).toHaveBeenCalledTimes(1);
  expect(checkMFAFactors).toHaveBeenCalledTimes(1);
});

it("keeps required MFA ahead of the application redirect", async () => {
  vi.mocked(checkMFAFactors).mockResolvedValue({ redirect: "/mfa" });
  expect(await createNewSessionFromIdpIntent(command)).toEqual({ redirect: "/mfa" });
  expect(completeFlowOrGetUrl).not.toHaveBeenCalled();
});

it("does not complete sign-in when the methods lookup fails", async () => {
  vi.mocked(listAuthenticationMethodTypes).mockRejectedValue(new Error("unavailable"));
  await expect(createNewSessionFromIdpIntent(command)).rejects.toThrow("unavailable");
  expect(completeFlowOrGetUrl).not.toHaveBeenCalled();
});

it("rejects a session for a different identity", async () => {
  vi.mocked(createSessionForIdpAndUpdateCookie).mockResolvedValue({ ...session, factors: { user: { id: "other" } } } as any);
  expect(await createNewSessionFromIdpIntent(command)).toEqual({ error: "Session user does not match the requested user" });
  expect(completeFlowOrGetUrl).not.toHaveBeenCalled();
});
