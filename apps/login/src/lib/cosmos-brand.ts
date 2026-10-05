export type CosmosBrand = "cosmos" | "csk" | "trinity";

// Presentation follows the registered callback, without granting membership.
export function cosmosBrandForCallback(uri?: string): CosmosBrand | undefined {
  const callbacks: Record<string, CosmosBrand> = {
    "http://localhost:3000/auth/callback": "cosmos",
    "https://dev.cosmosone.ai/auth/callback": "trinity",
    "https://csk.cosmosone.ai/auth/callback": "csk",
    "https://csk.dev.cosmosone.ai/auth/callback": "csk",
    "https://trinity.dev.cosmosone.ai/auth/callback": "trinity",
    "http://csk.localhost:3000/auth/callback": "csk",
    "http://trinity.localhost:3000/auth/callback": "trinity",
  };
  return uri && Object.hasOwn(callbacks, uri) ? callbacks[uri] : undefined;
}

export function withGoogleLoginHint(uri: string, hint?: string): string {
  if (!hint || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hint)) return uri;
  try {
    const url = new URL(uri);
    if (url.origin !== "https://accounts.google.com" || !["/o/oauth2/v2/auth", "/o/oauth2/auth"].includes(url.pathname))
      return uri;
    url.searchParams.set("login_hint", hint);
    return url.toString();
  } catch {
    return uri;
  }
}
