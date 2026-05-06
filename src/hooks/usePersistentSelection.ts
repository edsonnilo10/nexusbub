import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Persiste a seleção (ex.: aba ativa) na URL (?key=valor) e no localStorage.
 *
 * Usa o useSearchParams do react-router-dom para manter o roteador
 * sincronizado (evita que o React Router sobrescreva mudanças feitas via
 * window.history.replaceState ao desmontar/montar a página).
 *
 * Ordem de resolução do estado inicial:
 *  1) URL param (?key=...)        — permite compartilhar link
 *  2) localStorage                — sobrevive a fechar/reabrir aba
 *  3) defaultValue                — primeiro acesso
 */
export function usePersistentSelection<T extends string = string>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selection, setSelectionState] = useState<T>(() => {
    try {
      const urlValue = searchParams.get(key);
      if (urlValue) return urlValue as T;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(key);
        if (stored) return stored as T;
      }
    } catch {
      /* ignore */
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, selection);
      }
      if (searchParams.get(key) !== selection) {
        setSearchParams(
          (prev) => {
            prev.set(key, selection);
            return prev;
          },
          { replace: true },
        );
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, selection]);

  const setSelection = useCallback((value: T) => {
    setSelectionState(value);
  }, []);

  return [selection, setSelection];
}
