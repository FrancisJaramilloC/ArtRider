import type { Metadata } from "next";
import { Suspense } from "react";
import { getListings } from "@/services/listingsService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Navbar from "@/components/layout/Navbar";
import ExploreClient from "@/components/explore/ExploreClient";

export const metadata: Metadata = {
  title: "Explorar Equipos | ArtRider",
  description: "Explora equipos de alquiler en el mapa interactivo de ArtRider.",
};

export default async function ExplorePage(props: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const searchParams = await props.searchParams;

  const [listings, supabase] = await Promise.all([
    getListings(),
    createSupabaseServerClient(),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <Navbar initialUser={user} />
      <Suspense>
        <ExploreClient
          listings={listings}
          initialCity={searchParams.city}
          initialCategory={searchParams.category}
        />
      </Suspense>
    </div>
  );
}
