import { CosmosAuthLoader } from "@/components/cosmos-auth-loader";
import { notFound } from "next/navigation";

/** Visual preview only: does not process an IDP intent or create a session. */
export default async function AuthLoaderPreview({ searchParams }: {
  searchParams: Promise<{ brand?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { brand: requested } = await searchParams;
  const brand = requested === "csk" || requested === "trinity" ? requested : "cosmos";
  return <CosmosAuthLoader brand={brand} />;
}
