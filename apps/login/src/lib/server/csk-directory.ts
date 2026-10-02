import { Code } from "@zitadel/client";
import { ManagementService } from "@zitadel/proto/zitadel/management_pb";
import { ProjectGrantState } from "@zitadel/proto/zitadel/project_pb";
import { UserGrantState } from "@zitadel/proto/zitadel/user_pb";
import { COSMOS_PROJECT_ID, CSK_ENTRA_PROVIDER_ID, CSK_GROUP_ROLES, CSK_ORGANIZATION_ID } from "../csk-entra";
import { isClassifiedError } from "../grpc/interceptors/error-classification";
import { createServiceForHost } from "../service";
import type { ServiceConfig } from "../zitadel";

// Called only after the SAML intent, provider and user's organization have been validated.
export async function syncCskDirectory(serviceConfig: ServiceConfig, userId: string, groups: string[]) {
  const client = await createServiceForHost(ManagementService, serviceConfig);
  const options = { headers: { "x-zitadel-orgid": CSK_ORGANIZATION_ID }, timeoutMs: 10000 };
  const queries = [
    { query: { case: "userIdQuery" as const, value: { userId } } },
    { query: { case: "projectIdQuery" as const, value: { projectId: COSMOS_PROJECT_ID } } },
  ];
  const roleKeys = Array.from(new Set(groups.map((g) => CSK_GROUP_ROLES[g]).filter(Boolean)));
  const validRole = roleKeys.length === 1;
  const evidence = {
    provider_id: CSK_ENTRA_PROVIDER_ID,
    groups: validRole ? groups : [],
    checked_at: Math.floor(Date.now() / 1000),
  };
  const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

  // Invalidate old evidence before any role write. A partial failure must not retain old access.
  await client.setUserMetadata(
    { id: userId, key: "cosmos_csk_directory", value: encode({ ...evidence, groups: [] }) },
    options,
  );
  let assignments = (await client.listUserGrants({ queries }, options)).result;
  if (assignments.some((g) => g.details?.resourceOwner !== CSK_ORGANIZATION_ID) || assignments.length > 1) {
    throw new Error("Unexpected CSK project assignment");
  }
  if (!validRole) {
    for (const grant of assignments) {
      await client.updateUserGrant({ userId, grantId: grant.id, roleKeys: [] }, options);
    }
    throw new Error("Exactly one CSK role group is required");
  }
  // Use projects granted to CSK. The owner-side grant search excludes these.
  let projectGrant;
  for (let offset = 0; ; offset += 100) {
    const grants = await client.listGrantedProjects({ query: { offset: BigInt(offset), limit: 100 } }, options);
    projectGrant = grants.result.find(
      (g) =>
        g.projectId === COSMOS_PROJECT_ID && g.grantedOrgId === CSK_ORGANIZATION_ID && g.state === ProjectGrantState.ACTIVE,
    );
    if (projectGrant || grants.result.length < 100) break;
  }
  if (!projectGrant || !projectGrant.grantedRoleKeys.includes(roleKeys[0])) {
    throw new Error("CSK Cosmos project grant is missing the required role");
  }
  if (!assignments.length) {
    try {
      await client.addUserGrant(
        { userId, projectId: COSMOS_PROJECT_ID, projectGrantId: projectGrant.grantId, roleKeys },
        options,
      );
    } catch (error) {
      if (!isClassifiedError(error) || error.code !== Code.AlreadyExists) throw error;
      // Concurrent first logins may create the same assignment. Re-read and reconcile it below.
      assignments = (await client.listUserGrants({ queries }, options)).result;
      if (assignments.length !== 1 || assignments[0].details?.resourceOwner !== CSK_ORGANIZATION_ID) throw error;
    }
  }
  for (const grant of assignments) {
    // Respect a grant explicitly disabled by an administrator.
    if (grant.state !== UserGrantState.ACTIVE || grant.projectGrantId !== projectGrant.grantId) {
      throw new Error("CSK Cosmos role assignment is inactive or belongs to another grant");
    }
    if (grant.roleKeys.length !== 1 || grant.roleKeys[0] !== roleKeys[0]) {
      await client.updateUserGrant({ userId, grantId: grant.id, roleKeys }, options);
    }
  }
  await client.setUserMetadata({ id: userId, key: "cosmos_csk_directory", value: encode(evidence) }, options);
  // Wait for the read model used by the OIDC callback to observe the writes.
  // Otherwise a first login can race its own project-role assignment.
  for (let attempt = 0; attempt < 8; attempt++) {
    const [roles, metadata] = await Promise.all([
      client.listUserGrants({ queries }, options),
      client.getUserMetadata({ id: userId, key: "cosmos_csk_directory" }, options),
    ]);
    const grant = roles.result.find(
      (g) =>
        g.details?.resourceOwner === CSK_ORGANIZATION_ID &&
        g.projectGrantId === projectGrant.grantId &&
        g.state === UserGrantState.ACTIVE &&
        g.roleKeys.length === 1 &&
        g.roleKeys[0] === roleKeys[0],
    );
    if (grant && new TextDecoder().decode(metadata.metadata?.value) === JSON.stringify(evidence)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("CSK role assignment is still being applied; retry sign-in");
}
