// hooks/useApi.js
"use client";

import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { useEffect, useRef } from 'react';

// ─── Module-level shared state (survives across re-renders) ─────────────────

// SWR cache: url → { data, timestamp }
const swrCache = new Map();
const SWR_TTL = 30_000; // 30 s — stale-while-revalidate window

// In-flight deduplication: url → Promise
const inFlightRequests = new Map();

// ─── Patched GET that adds SWR + deduplication ──────────────────────────────

function makeCachedGet(axiosInstance) {
  return function cachedGet(url, config) {
    const cacheKey = url + (config?.params ? JSON.stringify(config.params) : '');

    // 1. Return in-flight promise for identical concurrent requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const cached = swrCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < SWR_TTL) {
      // 2. Fresh cache hit — resolve immediately, no network call
      return Promise.resolve(cached.data);
    }

    // 3. Stale cache hit — return stale data instantly and revalidate in background
    const fetchPromise = axiosInstance
      .get(url, config)
      .then((response) => {
        swrCache.set(cacheKey, { data: response, timestamp: Date.now() });
        return response;
      })
      .finally(() => {
        inFlightRequests.delete(cacheKey);
      });

    inFlightRequests.set(cacheKey, fetchPromise);

    if (cached) {
      // Return stale immediately; background fetch will update the cache for next call
      return Promise.resolve(cached.data);
    }

    // 4. Cache miss — wait for the actual response
    return fetchPromise;
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useApi = () => {
  const { data: session, status } = useSession();
  const interceptorRef = useRef(null);
  const cachedGetRef = useRef(null);

  useEffect(() => {
    if (interceptorRef.current !== null) {
      api.interceptors.request.eject(interceptorRef.current);
    }

    interceptorRef.current = api.interceptors.request.use((config) => {
      let token = session?.backendToken;
      if (!token && typeof window !== 'undefined') {
        token = window.localStorage.getItem('auth_token');
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => Promise.reject(error));

    return () => {
      if (interceptorRef.current !== null) {
        api.interceptors.request.eject(interceptorRef.current);
        interceptorRef.current = null;
      }
    };
  }, [session?.backendToken, status]);

  // Build a proxy that replaces .get() with our cached version
  if (!cachedGetRef.current) {
    cachedGetRef.current = new Proxy(api, {
      get(target, prop) {
        if (prop === 'get') return makeCachedGet(target);
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }

  return cachedGetRef.current;
};

// Utility: manually invalidate SWR cache entries whose key starts with a prefix
export function invalidateSwrCache(prefix) {
  for (const key of swrCache.keys()) {
    if (key.startsWith(prefix)) swrCache.delete(key);
  }
}