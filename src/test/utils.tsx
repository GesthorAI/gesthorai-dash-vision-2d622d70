/**
 * Test Utilities
 *
 * Helper functions for testing React components
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * Create a new QueryClient for each test
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * Wrapper component with all providers
 */
interface AllProvidersProps {
  children: ReactNode;
}

export function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Wait for async operations to complete
 */
export async function waitForLoadingToFinish() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signIn: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  };
}

/**
 * Mock user session for authenticated tests
 */
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    name: 'Test User',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser,
};

/**
 * Setup authenticated user for tests
 */
export function setupAuthenticatedUser() {
  const mockClient = createMockSupabaseClient();
  mockClient.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
  return mockClient;
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';
