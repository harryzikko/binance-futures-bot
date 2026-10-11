import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../services/api';

// The loader must be memoized. Abort + identity checks prevent an old response
// from being displayed under a new symbol, month or mode (including StrictMode).
export function useApiResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<{
    loader: typeof loader;
    data: T | null;
    error: string | null;
    isLoading: boolean;
  }>({ loader, data: null, error: null, isLoading: true });
  const controllerRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setResult(prev => ({ loader, data: prev.loader === loader ? prev.data : null, error: null, isLoading: true }));
    void loader(controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setResult({ loader, data, error: null, isLoading: false });
      }
    }).catch(error => {
      if (!controller.signal.aborted) {
        setResult({ loader, data: null, error: getErrorMessage(error), isLoading: false });
      }
    });
  }, [loader]);

  useEffect(() => {
    let active = true;
    // Defer to avoid starting a request during StrictMode's discarded setup.
    void Promise.resolve().then(() => { if (active) reload(); });
    return () => {
      active = false;
      controllerRef.current?.abort();
    };
  }, [reload]);

  const current = result.loader === loader
    ? result
    : { data: null, error: null, isLoading: true };
  return { data: current.data, error: current.error, isLoading: current.isLoading, reload };
}
