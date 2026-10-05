import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processIDPCallback } from "@/lib/server/idp-intent";
import { IdpProcessHandler } from "./idp-process-handler";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/lib/server/idp-intent", () => ({ processIDPCallback: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("Provider handoff presentation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it.each([undefined, "cosmos", "csk", "trinity"] as const)(
    "renders the transition immediately for %s, before hydration",
    (cosmosBrand) => {
      const html = renderToStaticMarkup(<IdpProcessHandler provider="google" id="intent" token="test" cosmosBrand={cosmosBrand} />);
      expect(html).toContain(`data-brand="${cosmosBrand ?? "cosmos"}"`);
      if (cosmosBrand === "csk") expect(html).toContain("/brands/csk.svg");
      expect(html).toContain("Opening your workspace");
      expect(html).not.toContain("processing.message");
      expect(html).not.toContain("Processing authentication");
      expect(html).not.toContain("<select");
    },
  );

  it.each(["cosmos", "csk"] as const)("keeps the %s transition while preserving the provider redirect", async (brand) => {
    let complete!: (result: { redirect: string }) => void;
    vi.mocked(processIDPCallback).mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    render(<IdpProcessHandler provider={brand === "csk" ? "saml" : "google"} id="intent" token="test" cosmosBrand={brand} />);
    expect(screen.getByRole("status").textContent).toContain("Opening your workspace");
    await act(async () => complete({ redirect: "/mfa" }));
    expect(push).toHaveBeenCalledWith("/mfa");
    expect(document.querySelector(".cosmos-auth-screen")?.getAttribute("data-brand")).toBe(brand);
    expect(screen.getByRole("status").textContent).toContain("Opening your workspace");
  });
});
