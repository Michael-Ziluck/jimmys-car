"use client";

import { useCallback, useEffect, useState } from "react";

type RequestState<T> = { key: string; data: T | null; error: string | null };
type SongDataResult<T> = {
  data: T | null;
  error: string | null;
  retry: () => void;
};

const requests: Map<string, Promise<unknown>> = new Map();

function fetchJson<T>(url: string, errorMessage: string): Promise<T> {
  const pending: Promise<unknown> | undefined = requests.get(url);
  if (pending) return pending as Promise<T>;

  const request: Promise<T> = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(errorMessage);
      return response.json() as Promise<T>;
    })
    .finally(() => {
      requests.delete(url);
    });
  requests.set(url, request);
  return request;
}

export function useSongData<T>(
  url: string,
  errorMessage: string,
): SongDataResult<T> {
  const [state, setState] = useState<RequestState<T>>({
    key: "",
    data: null,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore: boolean = false;
    void fetchJson<T>(url, errorMessage)
      .then((data) => {
        if (!ignore) setState({ key: url, data, error: null });
      })
      .catch((reason: unknown) => {
        if (!ignore)
          setState({
            key: url,
            data: null,
            error: reason instanceof Error ? reason.message : errorMessage,
          });
      });
    return () => {
      ignore = true;
    };
  }, [errorMessage, reloadKey, url]);

  const retry: () => void = useCallback((): void => {
    setState({ key: "", data: null, error: null });
    setReloadKey((value) => value + 1);
  }, []);

  return state.key === url
    ? { data: state.data, error: state.error, retry }
    : { data: null, error: null, retry };
}
