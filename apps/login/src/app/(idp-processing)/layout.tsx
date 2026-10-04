import "@/styles/globals.scss";
import { CosmosAuthLoader } from "@/components/cosmos-auth-loader";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactNode, Suspense } from "react";

// This route performs the provider handoff. Interactive login/MFA/consent pages
// retain the regular login layout; the handoff never mounts its card or controls.
export default function ProcessingLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, background: "#fff" }}>
        <ThemeProvider>
          <Suspense fallback={<CosmosAuthLoader />}>
            <LanguageProvider>{children}</LanguageProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
