import "@/styles/globals.scss";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactNode } from "react";

// This route performs the provider handoff. Interactive login/MFA/consent pages
// retain the regular login layout; the handoff never mounts its card or controls.
// Resolve the trusted callback brand before sending the first screen. Streaming
// a generic loading fallback here flashes the wrong brand before the page resolves.
export default function ProcessingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, background: "#fff" }}>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
