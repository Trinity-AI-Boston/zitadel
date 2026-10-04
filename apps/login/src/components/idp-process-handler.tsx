"use client";

import { processIDPCallback } from "@/lib/server/idp-intent";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "./alert";
import { AutoSubmitForm } from "./auto-submit-form";
import { CosmosBrand } from "@/lib/cosmos-brand";
import { CosmosAuthLoader } from "./cosmos-auth-loader";

type Props = {
  cosmosBrand?: CosmosBrand;
  restartUrl?: string;
  provider: string;
  id: string;
  token: string;
  requestId?: string;
  organization?: string;
  link?: string;
  sessionId?: string;
  linkFingerprint?: string;
  postErrorRedirectUrl?: string;
};

/**
 * Client component that handles IDP callback processing.
 * Must be client-side to allow cookie modifications via server actions.
 */
export function IdpProcessHandler({
  cosmosBrand,
  restartUrl,
  provider,
  id,
  token,
  requestId,
  organization,
  link,
  sessionId,
  linkFingerprint,
  postErrorRedirectUrl,
}: Props) {
  const t = useTranslations("idp");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [samlData, setSamlData] = useState<{ url: string; fields: Record<string, string> } | null>(null);
  const executedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (executedRef.current) {
      return;
    }

    executedRef.current = true;

    console.log("[IDP Process Handler] Starting IDP callback processing from client");

    processIDPCallback({
      provider,
      id,
      token,
      requestId,
      organization,
      sessionId,
      linkFingerprint,
      postErrorRedirectUrl,
    })
      .then((result) => {
        if (result.error) {
          console.error("[IDP Process Handler] Error:", result.error);
          setError(result.error);
          setLoading(false);
          return;
        }

        if (result.redirect) {
          router.push(result.redirect);
          return;
        }

        if (result.samlData) {
          console.log("[IDP Process Handler] Received samlData, rendering AutoSubmitForm");
          setSamlData(result.samlData);
          setLoading(false);
          return;
        }

        setError(t("processing.noRedirect"));
        setLoading(false);
      })
      .catch((err) => {
        console.error("[IDP Process Handler] Unexpected error:", err);
        setError(err instanceof Error ? err.message : t("processing.unexpectedError"));
        setLoading(false);
      });
  }, [provider, id, token, requestId, organization, link, sessionId, linkFingerprint, postErrorRedirectUrl, router, t]);

  if (loading) return <CosmosAuthLoader brand={cosmosBrand} />;
  if (error && cosmosBrand)
    return <CosmosAuthLoader brand={cosmosBrand} error="We could not finish signing you in. Please start again." restartUrl={restartUrl} />;

  return (
    <div className="flex items-center justify-center">
      {samlData && <AutoSubmitForm url={samlData.url} fields={samlData.fields} />}
      {error && (
        <div className="max-w-md py-4">
          <Alert>{error}</Alert>
        </div>
      )}
    </div>
  );
}
