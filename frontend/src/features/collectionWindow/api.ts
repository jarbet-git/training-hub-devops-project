// src/features/collectionWindow/api.ts
import { apiFetch } from "@/lib/http";
import type { CollectionWindowResponse } from "./types";

export function getCollectionWindowApi() {
  return apiFetch<CollectionWindowResponse>("/collection-window", {
    method: "GET",
    // endpoint jest publiczny w Twoim backendzie, auth niepotrzebne
  });
}
