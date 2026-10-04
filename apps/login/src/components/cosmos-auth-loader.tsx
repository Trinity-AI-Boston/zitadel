import { CosmosBrand } from "@/lib/cosmos-brand";
import "./cosmos-auth-loader.css";

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
  const cosmos = brand === "cosmos";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <main className="cosmos-auth-screen" data-brand={brand}>
      <div className="cosmos-auth-content">
        <div className="cosmos-auth-logo">
          <img
            className={cosmos ? "cosmos-auth-mark" : "cosmos-auth-organization"}
            src={`${basePath}/brands/${cosmos ? "cosmos.png" : csk ? "csk.svg" : "trinity.png"}`}
            alt={
              cosmos ? "" : csk ? "Cole, Scott & Kissane" : "Trinity AI Boston"
            }
            width={cosmos ? 54 : csk ? 310 : 218}
            height={cosmos ? 54 : csk ? 100 : 112}
            fetchPriority="high"
          />
          {cosmos && <span>Cosmos One</span>}
        </div>
        {!error && (
          <div className="cosmos-auth-motion" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
        <div
          role={error ? "alert" : "status"}
          aria-live="polite"
          aria-atomic="true"
        >
          <h1 className="cosmos-auth-title">
            {error ? "Let’s get you signed in" : "Opening your workspace…"}
          </h1>
          <p className="cosmos-auth-description">
            {error || "Just a moment while we get things ready."}
          </p>
        </div>
        {error && restartUrl && (
          <a className="cosmos-auth-retry" href={restartUrl}>
            Back to sign-in
          </a>
        )}
        <p className="cosmos-auth-footer">Powered by Cosmos One</p>
      </div>
    </main>
  );
}
