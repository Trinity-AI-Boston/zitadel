import { beforeEach, expect, test, vi } from "vitest";
import { COSMOS_PROJECT_ID, CSK_ORGANIZATION_ID } from "../csk-entra";
import { createServiceForHost } from "../service";
import { syncCskDirectory } from "./csk-directory";

vi.mock("../service", () => ({ createServiceForHost: vi.fn() }));
const group = "e2d0b62a-1511-46ef-b87a-10277ad10c4d";
const api = {
  setUserMetadata: vi.fn(),
  listUserGrants: vi.fn(),
  listGrantedProjects: vi.fn(),
  addUserGrant: vi.fn(),
  updateUserGrant: vi.fn(),
  getUserMetadata: vi.fn(),
};
const config = { baseUrl: "https://identity.example.test" };
const assignment = {
  id: "assignment",
  details: { resourceOwner: CSK_ORGANIZATION_ID },
  state: 1,
  projectGrantId: "project-grant",
  roleKeys: ["managing_partner"],
};

let assignments: (typeof assignment)[] = [];
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createServiceForHost).mockResolvedValue(api as never);
  assignments = [];
  api.listUserGrants.mockImplementation(async () => ({ result: assignments }));
  api.addUserGrant.mockImplementation(async ({ roleKeys }) => {
    assignments = [{ ...assignment, roleKeys }];
  });
  api.updateUserGrant.mockImplementation(async ({ roleKeys }) => {
    assignments = assignments.map((g) => ({ ...g, roleKeys }));
  });
  api.getUserMetadata.mockImplementation(async () => ({
    metadata: { value: api.setUserMetadata.mock.calls.at(-1)?.[0].value },
  }));
  api.listGrantedProjects.mockResolvedValue({
    result: [
      {
        grantId: "project-grant",
        projectId: COSMOS_PROJECT_ID,
        grantedOrgId: CSK_ORGANIZATION_ID,
        state: 1,
        grantedRoleKeys: ["paralegal"],
      },
    ],
  });
});

test("creates the project assignment before publishing fresh group evidence", async () => {
  await syncCskDirectory(config, "pilot", [group]);
  expect(api.addUserGrant).toHaveBeenCalledWith(
    { userId: "pilot", projectId: COSMOS_PROJECT_ID, projectGrantId: "project-grant", roleKeys: ["paralegal"] },
    expect.anything(),
  );
  const writes = api.setUserMetadata.mock.calls;
  expect(JSON.parse(new TextDecoder().decode(writes[0][0].value)).groups).toEqual([]);
  expect(JSON.parse(new TextDecoder().decode(writes[1][0].value)).groups).toEqual([group]);
  expect(api.addUserGrant.mock.invocationCallOrder[0]).toBeLessThan(api.setUserMetadata.mock.invocationCallOrder[1]);
});

test("replaces an old role when Entra membership changes", async () => {
  assignments = [{ ...assignment }];
  await syncCskDirectory(config, "pilot", [group]);
  expect(api.updateUserGrant).toHaveBeenCalledWith(
    { userId: "pilot", grantId: "assignment", roleKeys: ["paralegal"] },
    expect.anything(),
  );
  expect(api.addUserGrant).not.toHaveBeenCalled();
});

test("clears old evidence and roles when membership is removed", async () => {
  assignments = [{ ...assignment }];
  await expect(syncCskDirectory(config, "pilot", [])).rejects.toThrow("Exactly one");
  expect(api.updateUserGrant).toHaveBeenCalledWith(
    { userId: "pilot", grantId: "assignment", roleKeys: [] },
    expect.anything(),
  );
  expect(api.setUserMetadata).toHaveBeenCalledTimes(1);
});

test("refuses a foreign organization assignment", async () => {
  assignments = [{ ...assignment, details: { resourceOwner: "other" } }];
  await expect(syncCskDirectory(config, "pilot", [group])).rejects.toThrow("Unexpected");
  expect(api.updateUserGrant).not.toHaveBeenCalled();
});

test("does not reactivate an administrator-disabled assignment", async () => {
  assignments = [{ ...assignment, state: 2 }];
  await expect(syncCskDirectory(config, "pilot", [group])).rejects.toThrow("inactive");
  expect(api.updateUserGrant).not.toHaveBeenCalled();
});

test("does not publish valid evidence if the role assignment fails", async () => {
  api.addUserGrant.mockRejectedValue(new Error("permission denied"));
  await expect(syncCskDirectory(config, "pilot", [group])).rejects.toThrow();
  expect(api.setUserMetadata).toHaveBeenCalledTimes(1);
});

test("requires the project role to be granted to CSK", async () => {
  api.listGrantedProjects.mockResolvedValue({ result: [] });
  await expect(syncCskDirectory(config, "pilot", [group])).rejects.toThrow("project grant");
  expect(api.addUserGrant).not.toHaveBeenCalled();
});

test("rejects conflicting group memberships without publishing access", async () => {
  await expect(syncCskDirectory(config, "pilot", [group, "7db93988-c905-4b4c-af7c-788af97adb1d"])).rejects.toThrow(
    "Exactly one",
  );
  expect(api.addUserGrant).not.toHaveBeenCalled();
  expect(api.setUserMetadata).toHaveBeenCalledTimes(1);
});

test("waits for the project assignment to reach the read model", async () => {
  api.listUserGrants.mockResolvedValueOnce({ result: [] }).mockResolvedValueOnce({ result: [] });
  await syncCskDirectory(config, "pilot", [group]);
  expect(api.listUserGrants).toHaveBeenCalledTimes(3);
});
