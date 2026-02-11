// hooks/useApi.js
"use client";

import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { useEffect, useRef, useMemo } from 'react';

export const useApi = () => {
  const { data: session, status } = useSession();
  const interceptorRef = useRef(null);

  useEffect(() => {
    // Remove existing interceptor if any
    if (interceptorRef.current !== null) {
      api.interceptors.request.eject(interceptorRef.current);
    }

    // Add request interceptor
    interceptorRef.current = api.interceptors.request.use((config) => {
      // Try to get token from session first
      let token = session?.backendToken;
      
      // Fallback: try localStorage
      if (!token && typeof window !== 'undefined') {
        token = window.localStorage.getItem('auth_token');
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => {
      return Promise.reject(error);
    });

    return () => {
      // Cleanup interceptor on unmount
      if (interceptorRef.current !== null) {
        api.interceptors.request.eject(interceptorRef.current);
        interceptorRef.current = null;
      }
    };
  }, [session?.backendToken, status]);

  return api;
};