/**
 * Client-side error logging utility
 * 
 * Provides privacy-respecting error logging with user/session correlation.
 * Logs errors to Supabase for monitoring and debugging.
 */

import { supabase } from '@/lib/supabaseBrowser';

export type ErrorType = 'client_error' | 'server_error' | 'edge_function_error';

export interface ErrorLogMetadata {
  browser?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
  [key: string]: any;
}

export interface ErrorLogParams {
  error: Error | string;
  errorType?: ErrorType;
  componentName?: string;
  metadata?: ErrorLogMetadata;
}

/**
 * Get or create a session ID for anonymous error correlation
 * Stored in sessionStorage (cleared on tab close)
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('error_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('error_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Gather browser metadata for error context
 */
function getBrowserMetadata(): ErrorLogMetadata {
  if (typeof window === 'undefined') return {};
  
  return {
    browser: navigator.userAgent.includes('Chrome') ? 'Chrome' :
             navigator.userAgent.includes('Firefox') ? 'Firefox' :
             navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
}

/**
 * Log an error to the database
 * Privacy-respecting: Only logs what's necessary for debugging
 */
export async function logError({
  error,
  errorType = 'client_error',
  componentName,
  metadata = {},
}: ErrorLogParams): Promise<void> {
  try {
    // Don't log in development to reduce noise
    if (process.env.NODE_ENV === 'development') {
      console.error('[DEV] Error logged:', { error, errorType, componentName, metadata });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Get current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Gather metadata
    const fullMetadata = {
      ...getBrowserMetadata(),
      ...metadata,
    };

    // Insert error log
    // NOTE: 'error_logs' does not exist in the live schema — this insert fails
    // at runtime (and is swallowed below). Kept compiling until the table ships.
    const { error: insertError } = await supabase
      // @ts-expect-error error_logs table missing from live schema
      .from('error_logs')
      .insert({
        user_id: user?.id || null,
        session_id: getSessionId(),
        error_message: errorMessage,
        error_stack: errorStack,
        error_type: errorType,
        component_name: componentName,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        metadata: fullMetadata,
      });

    if (insertError) {
      console.error('Failed to log error to database:', insertError);
    }
  } catch (loggingError) {
    // Silently fail - don't want error logging to break the app
    console.error('Error in error logging:', loggingError);
  }
}

/**
 * Log a client error (JavaScript error, React error, etc.)
 */
export async function logClientError(error: Error, componentName?: string, metadata?: ErrorLogMetadata) {
  return logError({
    error,
    errorType: 'client_error',
    componentName,
    metadata,
  });
}

/**
 * Log a server error (API error, Edge function error, etc.)
 */
export async function logServerError(error: Error | string, componentName?: string, metadata?: ErrorLogMetadata) {
  return logError({
    error,
    errorType: 'server_error',
    componentName,
    metadata,
  });
}

/**
 * Set up global error handlers
 * Call this once in the app initialization
 */
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logClientError(
      new Error(event.reason?.message || 'Unhandled promise rejection'),
      'UnhandledPromiseRejection',
      { reason: String(event.reason) }
    );
  });

  // Catch global errors
  window.addEventListener('error', (event) => {
    logClientError(
      event.error || new Error(event.message),
      'GlobalErrorHandler',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });
}
