import { CosmosBrand } from "@/lib/cosmos-brand";
import styles from "./cosmos-auth-loader.module.css";

export function CosmosAuthLoader({ brand, error, restartUrl }: { brand?: CosmosBrand; error?: string; restartUrl?: string }) {
  const csk = brand === "csk";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <div className={`${styles.screen} ${csk ? styles.csk : styles.trinity}`} role={error ? "alert" : "status"} aria-live="polite">
      <div className={styles.content}>
        {brand === "cosmos" ? (
          <div className={styles.wordmark}>Cosmos One</div>
        ) : brand ? (
          <img
            src={`${basePath}/brands/${csk ? "csk.svg" : "trinity.png"}`}
            alt={csk ? "Cole, Scott & Kissane" : "Trinity AI Boston"}
            width={csk ? 280 : 180}
            height={csk ? 90 : 112}
          />
        ) : null}
        {!error && (
          <div className={styles.motion} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
        <h1>{error ? "Let’s get you signed in" : "Opening your workspace…"}</h1>
        <p>{error || "Just a moment while we get things ready."}</p>
        {error && restartUrl && (
          <a className={styles.retry} href={restartUrl}>
            Back to sign-in
          </a>
        )}
        <span>Powered by Cosmos One</span>
      </div>
    </div>
  );
}
