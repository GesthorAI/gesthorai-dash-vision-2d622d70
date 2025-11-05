/**
 * Tests for environment variable validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Environment Validation', () => {
  beforeEach(() => {
    // Reset modules to allow re-importing with different env vars
    vi.resetModules();
  });

  it('should validate required environment variables', () => {
    // Environment variables are set in setup.ts
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_PROJECT_ID).toBeDefined();
  });

  it('should have correct environment types', () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    expect(typeof url).toBe('string');
    expect(url).toContain('https://');
  });

  it('should default to development environment in tests', () => {
    const env = import.meta.env.VITE_APP_ENV || 'development';
    expect(['development', 'test', 'staging', 'production']).toContain(env);
  });
});

describe('Environment Helpers', () => {
  it('should correctly identify environment', async () => {
    // Import env helpers
    const { isProduction, isDevelopment } = await import('../env');

    // In test environment
    expect(isProduction).toBe(false);
    expect(isDevelopment).toBe(false); // Actually 'test' env
  });
});
