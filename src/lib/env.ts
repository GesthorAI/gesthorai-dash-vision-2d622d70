/**
 * Environment Variables Validation
 *
 * This module validates all required environment variables at startup
 * and provides type-safe access to them throughout the application.
 */

import { z } from 'zod';

/**
 * Environment variable schema with validation rules
 */
const envSchema = z.object({
  // Supabase Configuration (Required)
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required'),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1, 'VITE_SUPABASE_PROJECT_ID is required'),

  // Application Configuration
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Monitoring (Optional in development, required in production)
  VITE_SENTRY_DSN: z.string().url().optional(),

  // Analytics (Optional)
  VITE_GA_MEASUREMENT_ID: z.string().optional(),
  VITE_PLAUSIBLE_DOMAIN: z.string().optional(),

  // Feature Flags (Optional)
  VITE_ENABLE_EXPERIMENTAL_FEATURES: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  VITE_DEBUG_MODE: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
});

/**
 * Validated environment variables type
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Raw environment variables from import.meta.env
 */
const rawEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  VITE_GA_MEASUREMENT_ID: import.meta.env.VITE_GA_MEASUREMENT_ID,
  VITE_PLAUSIBLE_DOMAIN: import.meta.env.VITE_PLAUSIBLE_DOMAIN,
  VITE_ENABLE_EXPERIMENTAL_FEATURES: import.meta.env.VITE_ENABLE_EXPERIMENTAL_FEATURES,
  VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE,
};

/**
 * Validates environment variables and throws detailed error if validation fails
 */
function validateEnv(): Env {
  try {
    const validated = envSchema.parse(rawEnv);

    // Additional production-specific validation
    if (validated.VITE_APP_ENV === 'production') {
      if (!validated.VITE_SENTRY_DSN) {
        console.warn('⚠️ VITE_SENTRY_DSN is not set in production environment. Error tracking will be disabled.');
      }

      if (validated.VITE_DEBUG_MODE) {
        console.warn('⚠️ Debug mode is enabled in production. This should be disabled.');
      }
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n');

      console.error('❌ Environment validation failed:\n' + missingVars);
      console.error('\n📋 Please check your .env file and ensure all required variables are set.');
      console.error('💡 See .env.example for reference.\n');

      throw new Error('Environment validation failed. Check console for details.');
    }
    throw error;
  }
}

/**
 * Validated and typed environment variables
 * This will throw an error at startup if validation fails
 */
export const env = validateEnv();

/**
 * Check if running in production
 */
export const isProduction = env.VITE_APP_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.VITE_APP_ENV === 'development';

/**
 * Check if running in staging
 */
export const isStaging = env.VITE_APP_ENV === 'staging';

/**
 * Check if debug mode is enabled
 */
export const isDebugMode = env.VITE_DEBUG_MODE;

/**
 * Check if experimental features are enabled
 */
export const hasExperimentalFeatures = env.VITE_ENABLE_EXPERIMENTAL_FEATURES;

/**
 * Log environment info (safe for production)
 */
export function logEnvironmentInfo() {
  console.log('🚀 GesthorAI Starting...');
  console.log(`📦 Environment: ${env.VITE_APP_ENV}`);
  console.log(`🔧 Debug Mode: ${isDebugMode ? 'Enabled' : 'Disabled'}`);
  console.log(`🧪 Experimental Features: ${hasExperimentalFeatures ? 'Enabled' : 'Disabled'}`);
  console.log(`📊 Monitoring: ${env.VITE_SENTRY_DSN ? 'Enabled' : 'Disabled'}`);

  if (isDevelopment) {
    console.log('🔍 Development mode active');
    console.log(`🗄️ Supabase URL: ${env.VITE_SUPABASE_URL}`);
    console.log(`🆔 Project ID: ${env.VITE_SUPABASE_PROJECT_ID}`);
  }
}
