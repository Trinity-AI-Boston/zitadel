import { DynamicTheme } from "@/components/dynamic-theme";
import { IdpProcessHandler } from "@/components/idp-process-handler";
import { getServiceConfig } from "@/lib/service-url";
import { getAuthRequest, getBrandingSettings, getDefaultOrg } from "@/lib/zitadel";
import { cosmosBrandForCallback } from "@/lib/cosmos-brand";
import { Organization } from "@zitadel/proto/zitadel/org/v2/org_pb";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

/**
 * This page handles the initial IDP callback with the single-use token.
 * It delegates to a client component which calls the server action.
 * The client component is needed so that cookies can be set properly.
 */
export default async function ProcessPage(props: {
  searchParams: Promise<Record<string | number | symbol, string | undefined>>;
  params: Promise<{ provider: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { provider } = params;
  const { id, token, requestId, organization, link, postErrorRedirectUrl, linkToSessionId, linkFingerprint } = searchParams;

  // Validate required parameters before passing to client component
  if (!id || !token) {
    throw new Error("Missing required IDP callback parameters");
  }

  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);
  const authRequest = requestId?.startsWith("oidc_")
    ? await getAuthRequest({ serviceConfig, authRequestId: requestId.slice(5) }).catch(() => undefined)
    : undefined;
  const callbackUri = authRequest?.authRequest?.redirectUri;
  const cosmosBrand = cosmosBrandForCallback(callbackUri);
  // Branded transitions use fixed copy; only other clients need translated errors.
  const t = cosmosBrand ? undefined : await getTranslations("idp");
  const handler = (
    <IdpProcessHandler
      messages={t ? { noRedirect: t("processing.noRedirect"), unexpectedError: t("processing.unexpectedError") } : undefined}
      cosmosBrand={cosmosBrand}
      restartUrl={cosmosBrand && callbackUri ? new URL("/login", callbackUri).toString() : undefined}
      provider={provider}
      id={id}
      token={token}
      requestId={requestId}
      organization={organization}
      link={link}
      sessionId={linkToSessionId}
      linkFingerprint={linkFingerprint}
      postErrorRedirectUrl={postErrorRedirectUrl}
    />
  );

  // The transition has its own root layout; do not render the login card first.
  if (cosmosBrand) return handler;

  let defaultOrganization;
  if (!organization) {
    const org: Organization | null = await getDefaultOrg({ serviceConfig });
    if (org) {
      defaultOrganization = org.id;
    }
  }

  const branding = await getBrandingSettings({ serviceConfig, organization: organization ?? defaultOrganization });

  return <DynamicTheme branding={branding}>{handler}</DynamicTheme>;
}
