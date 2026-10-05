import { CosmosBrand } from "@/lib/cosmos-brand";
import "./cosmos-auth-loader.css";
import { CosmosWordmark } from "./cosmos-wordmark";

export function CosmosAuthLoader({
  brand = "cosmos",
  error,
  restartUrl,
}: {
  brand?: CosmosBrand;
  error?: string;
  restartUrl?: string;
}) {
  const csk = brand === "csk";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <main className="cosmos-auth-screen" data-brand={brand}>
      <div className="cosmos-auth-content">
        <div className="cosmos-auth-logo">
          <div className="auth-client-brand">
            <img
              className="auth-client-logo"
              src={`${basePath}/brands/${csk ? "csk.svg" : "trinity.png"}`}
              alt={csk ? "Cole, Scott & Kissane" : "Trinity AI Boston"}
              width={csk ? 702 : 323}
              height={csk ? 225 : 200}
              fetchPriority="high"
            />
            {!csk && <p className="auth-client-tagline">Engineering Scale at Trust</p>}
          </div>
        </div>
        {!error && (
          <div className="cosmos-auth-motion" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
        <div role={error ? "alert" : "status"} aria-live="polite" aria-atomic="true">
          <h1 className="cosmos-auth-title">{error ? "Let’s get you signed in" : "Opening your workspace…"}</h1>
          <p className="cosmos-auth-description">{error || "Just a moment while we get things ready."}</p>
        </div>
        {error && restartUrl && (
          <a className="cosmos-auth-retry" href={restartUrl}>
            Back to sign-in
          </a>
        )}
        <p className="cosmos-auth-footer">
          Powered by <CosmosWordmark />
        </p>
      </div>
    </main>
  );
}
