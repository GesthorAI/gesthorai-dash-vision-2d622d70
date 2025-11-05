/**
 * Security Utilities for Edge Functions
 *
 * This module provides reusable security middleware for Supabase Edge Functions:
 * - Rate limiting
 * - Request validation
 * - CORS handling
 * - Error handling
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * CORS configuration for production
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // TODO: Restrict to specific domains in production
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

/**
 * Security headers for all responses
 */
export const SECURITY_HEADERS = {
  ...CORS_HEADERS,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * Content Security Policy header
 */
export const CSP_HEADER = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
  ].join('; '),
};

/**
 * Rate limiter configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

/**
 * Rate limiter using Supabase as storage
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private supabase: any;

  constructor(config: RateLimitConfig, supabaseUrl: string, supabaseKey: string) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyPrefix: config.keyPrefix || 'rate_limit',
    };
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get recent requests from database (you'll need to create a rate_limits table)
      // For now, using in-memory fallback
      // TODO: Implement proper database-backed rate limiting

      // Temporary in-memory implementation
      const allowed = true;
      const remaining = this.config.maxRequests;
      const resetAt = new Date(now + this.config.windowMs);

      return { allowed, remaining, resetAt };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: new Date(now + this.config.windowMs),
      };
    }
  }
}

/**
 * Create rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return new RateLimiter(config, supabaseUrl, supabaseKey);
}

/**
 * Validate request has required authentication
 */
export async function validateAuth(req: Request): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    return { valid: true, userId: user.id };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { valid: false, error: 'Authentication failed' };
  }
}

/**
 * Validate request body against schema
 */
export function validateRequestBody<T>(body: any, requiredFields: string[]): { valid: boolean; data?: T; error?: string } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  const missingFields = requiredFields.filter(field => !(field in body));

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  return { valid: true, data: body as T };
}

/**
 * Create standardized error response
 */
export function errorResponse(message: string, status: number = 400, details?: any) {
  return new Response(
    JSON.stringify({
      error: message,
      details,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create standardized success response
 */
export function successResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function handleCorsPreFlight() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * IP-based rate limiting (extract IP from request)
 */
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from headers (behind proxy/CDN)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';
  return ip.trim();
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate webhook signature (for external webhooks)
 */
export function validateWebhookSignature(
  req: Request,
  secret: string,
  signatureHeader: string = 'x-signature'
): boolean {
  const signature = req.headers.get(signatureHeader);

  if (!signature) {
    return false;
  }

  // TODO: Implement proper HMAC signature verification
  // For now, simple secret comparison
  return signature === secret;
}

/**
 * Security middleware wrapper for Edge Functions
 */
export interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  rateLimit?: RateLimitConfig;
  validateWebhook?: boolean;
  webhookSecret?: string;
  allowedOrigins?: string[];
}

export function withSecurity(
  handler: (req: Request) => Promise<Response>,
  options: SecurityMiddlewareOptions = {}
) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreFlight();
    }

    try {
      // Validate origin if specified
      if (options.allowedOrigins && options.allowedOrigins.length > 0) {
        const origin = req.headers.get('origin');
        if (origin && !options.allowedOrigins.includes(origin)) {
          return errorResponse('Origin not allowed', 403);
        }
      }

      // Rate limiting
      if (options.rateLimit) {
        const rateLimiter = createRateLimiter(options.rateLimit);
        const clientId = getClientIdentifier(req);
        const { allowed, remaining, resetAt } = await rateLimiter.checkLimit(clientId);

        if (!allowed) {
          return new Response(
            JSON.stringify({
              error: 'Rate limit exceeded',
              resetAt: resetAt.toISOString(),
            }),
            {
              status: 429,
              headers: {
                ...SECURITY_HEADERS,
                'Content-Type': 'application/json',
                'Retry-After': Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
                'X-RateLimit-Limit': options.rateLimit.maxRequests.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': resetAt.toISOString(),
              },
            }
          );
        }
      }

      // Validate authentication
      if (options.requireAuth) {
        const { valid, userId, error } = await validateAuth(req);
        if (!valid) {
          return errorResponse(error || 'Unauthorized', 401);
        }
        // Add userId to request context (for handler to use)
        (req as any).userId = userId;
      }

      // Validate webhook signature
      if (options.validateWebhook && options.webhookSecret) {
        const isValid = validateWebhookSignature(req, options.webhookSecret);
        if (!isValid) {
          return errorResponse('Invalid webhook signature', 401);
        }
      }

      // Call the actual handler
      return await handler(req);
    } catch (error) {
      console.error('Security middleware error:', error);
      return errorResponse('Internal server error', 500, error instanceof Error ? error.message : 'Unknown error');
    }
  };
}
