import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { AnalyticsEvent } from '../types';

interface AnalyticsContextType {
  sessionId: string;
  trackEvent: (
    eventType: AnalyticsEvent['eventType'],
    data?: Partial<AnalyticsEvent>
  ) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

const generateSessionId = () => {
  return `BASIC-ANON-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Date.now().toString().slice(-6)}`;
};

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Initialize or retrieve anonymous session ID
    let currentSessionId = localStorage.getItem('basic_session_id');
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      localStorage.setItem('basic_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  const trackEvent = useCallback(
    async (eventType: AnalyticsEvent['eventType'], data?: Partial<AnalyticsEvent>) => {
      if (!sessionId) return; // session not ready yet

      // Determine role based on auth state
      // If user is staff, maybe we don't track them or track as 'anggota' for testing. We'll track staff as 'anggota' or ignore?
      // Let's track members as 'anggota', others as 'basic'
      const userRole = user?.role === 'member' ? 'anggota' : 'basic';
      const userId = user?.uid || undefined;

      const eventPayload: Omit<AnalyticsEvent, 'id'> = {
        sessionId,
        userId,
        userRole,
        eventType,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        ...data,
      };

      try {
        await addDoc(collection(db, 'analyticsEvents'), eventPayload);
      } catch (error) {
        console.warn('Failed to track analytics event:', error);
      }
    },
    [sessionId, user]
  );

  // Track initial page view when session is ready
  useEffect(() => {
    if (sessionId) {
      trackEvent('page_view');
    }
  }, [sessionId, trackEvent]);

  return (
    <AnalyticsContext.Provider value={{ sessionId, trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
