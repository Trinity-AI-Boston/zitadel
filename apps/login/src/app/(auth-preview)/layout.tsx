import "@/styles/globals.scss";
import { ThemeProvider } from "@/components/theme-provider";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

// Match the processing page's global styles without contacting the identity API.
export default function AuthPreviewLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, background: "#fff" }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
