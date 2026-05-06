import { useEffect, useState, useCallback } from "react";

/**
 * Persiste a seleção (ex.: aba ativa) na URL (?key=valor) e no localStorage.
 *
 * Ordem de resolução do estado inicial:
 *  1) URL param (?key=...)        — permite compartilhar link
 *  2) localStorage                — sobrevive a fechar/reabrir aba
 *  3) defaultValue                — primeiro acesso
 *
 * Ao mudar a seleção, sincroniza ambos sem recarregar a página.
 */
export function usePersistentSelection<T extends string = string>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [selection, setSelectionState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlValue = params.get(key);
      if (urlValue) return urlValue as T;
      const stored = window.localStorage.getItem(key);
      if (stored) return stored as T;
    } catch {
      /* ignore */
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, selection);
      const url = new URL(window.location.href);
      if (url.searchParams.get(key) !== selection) {
        url.searchParams.set(key, selection);
        window.history.replaceState({}, "", url);
      }
    } catch {
      /* ignore */
    }
  }, [key, selection]);

  const setSelection = useCallback((value: T) => {
    setSelectionState(value);
  }, []);

  return [selection, setSelection];
}
