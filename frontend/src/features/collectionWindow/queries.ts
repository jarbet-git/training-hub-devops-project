// src/features/collectionWindow/queries.ts
import { useQuery } from "@tanstack/react-query";
import { getCollectionWindowApi } from "./api";

export const collectionWindowKeys = {
  all: ["collectionWindow"] as const,
};

export function useCollectionWindow() {
  return useQuery({
    queryKey: collectionWindowKeys.all,
    queryFn: getCollectionWindowApi,
  });
}
