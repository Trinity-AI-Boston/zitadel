import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { processIDPCallback } from "@/lib/server/idp-intent";
import { IdpProcessHandler } from "./idp-process-handler";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/lib/server/idp-intent", () => ({ processIDPCallback: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("Provider handoff presentation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([undefined, "cosmos", "csk", "trinity"] as const)(
    "renders the transition immediately for %s, before hydration",
    (cosmosBrand) => {
      const html = renderToStaticMarkup(<IdpProcessHandler provider="google" id="intent" token="test" cosmosBrand={cosmosBrand} />);
      expect(html).toContain("Opening your workspace");
      expect(html).not.toContain("processing.message");
      expect(html).not.toContain("Processing authentication");
      expect(html).not.toContain("<select");
    },
  );

  it("keeps the branded transition while preserving the provider redirect", async () => {
    let complete!: (result: { redirect: string }) => void;
    vi.mocked(processIDPCallback).mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    render(<IdpProcessHandler provider="google" id="intent" token="test" cosmosBrand="cosmos" />);
    expect(screen.getByRole("status").textContent).toContain("Opening your workspace");
    await act(async () => complete({ redirect: "/mfa" }));
    expect(push).toHaveBeenCalledWith("/mfa");
    expect(screen.getByRole("status").textContent).toContain("Opening your workspace");
  });
});
