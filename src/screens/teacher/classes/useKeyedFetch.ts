import { useRef, useState } from "react";

import { useFetch, type FetchState } from "@/lib/hooks";

type Params = Record<string, string | number | boolean | null | undefined>;

export interface KeyedFetchState<T> extends FetchState<T> {
  /** True until the reply for the *current* parameters is in: show the skeleton, not the previous tab's rows */
  pending: boolean;
}

/**
 * useFetch for a list whose parameters change (tab, page, month). useFetch keeps the previous reply on
 * screen while the next one loads; this adds `pending`, so a tab change never flashes the other tab's classes.
 */
export function useKeyedFetch<T>(path: string, params: Params, options: { enabled?: boolean; pollMs?: number } = {}): KeyedFetchState<T> {
  const key = JSON.stringify(params);
  const latestKey = useRef(key);
  latestKey.current = key;
  const [dataKey, setDataKey] = useState<string | null>(null);

  // A reply is only ever accepted for the latest request, so it belongs to the latest parameters
  const state = useFetch<T>(path, params, { ...options, onData: () => setDataKey(latestKey.current) });

  return { ...state, pending: state.loading || (dataKey !== key && !state.error) };
}
