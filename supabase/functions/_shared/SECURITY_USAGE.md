# Security Middleware Usage Guide

This guide explains how to use the security middleware in your Edge Functions.

## Basic Usage

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSecurity, successResponse, errorResponse } from "../_shared/security.ts";

serve(
  withSecurity(
    async (req: Request) => {
      // Your function logic here
      const data = { message: "Hello World" };
      return successResponse(data);
    },
    {
      requireAuth: true, // Require JWT authentication
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000, // 1 minute
      },
    }
  )
);
```

## Configuration Options

### 1. Require Authentication

```typescript
{
  requireAuth: true  // Validates JWT token from Authorization header
}
```

The authenticated user ID will be available as `req.userId`.

### 2. Rate Limiting

```typescript
{
  rateLimit: {
    maxRequests: 100,      // Max requests per window
    windowMs: 60000,       // Time window in milliseconds
    keyPrefix: 'my-func'   // Optional: prefix for rate limit keys
  }
}
```

### 3. Allowed Origins (CORS)

```typescript
{
  allowedOrigins: [
    'https://app.gesthorai.com',
    'https://staging.gesthorai.com'
  ]
}
```

### 4. Webhook Signature Validation

```typescript
{
  validateWebhook: true,
  webhookSecret: Deno.env.get('WEBHOOK_SECRET')
}
```

## Complete Example

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withSecurity,
  successResponse,
  errorResponse,
  validateRequestBody,
} from "../_shared/security.ts";

// Define your request schema
interface CreateLeadRequest {
  name: string;
  email: string;
  phone: string;
}

serve(
  withSecurity(
    async (req: Request) => {
      // Parse request body
      const body = await req.json();

      // Validate required fields
      const validation = validateRequestBody<CreateLeadRequest>(
        body,
        ['name', 'email', 'phone']
      );

      if (!validation.valid) {
        return errorResponse(validation.error!, 400);
      }

      // Access authenticated user ID
      const userId = (req as any).userId;

      // Your business logic here
      const result = {
        leadId: '123',
        userId,
        created: new Date().toISOString(),
      };

      return successResponse(result, 201);
    },
    {
      requireAuth: true,
      rateLimit: {
        maxRequests: 50,
        windowMs: 60000,
      },
      allowedOrigins: [
        'https://app.gesthorai.com',
        'https://staging.gesthorai.com',
      ],
    }
  )
);
```

## Response Helpers

### Success Response

```typescript
import { successResponse } from "../_shared/security.ts";

// Default 200 status
return successResponse({ message: "Success" });

// Custom status
return successResponse({ id: "123" }, 201);
```

### Error Response

```typescript
import { errorResponse } from "../_shared/security.ts";

// Default 400 status
return errorResponse("Invalid input");

// Custom status
return errorResponse("Not found", 404);

// With details
return errorResponse("Validation failed", 400, { field: "email" });
```

## Request Validation

```typescript
import { validateRequestBody } from "../_shared/security.ts";

const body = await req.json();

const validation = validateRequestBody<MyType>(
  body,
  ['requiredField1', 'requiredField2']
);

if (!validation.valid) {
  return errorResponse(validation.error!, 400);
}

// Use validated data
const data = validation.data!;
```

## Input Sanitization

```typescript
import { sanitizeString } from "../_shared/security.ts";

const userInput = sanitizeString(body.message);
```

## Migrating Existing Functions

### Before

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Your logic
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### After

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSecurity, successResponse, errorResponse } from "../_shared/security.ts";

serve(
  withSecurity(
    async (req) => {
      // Your logic (no try-catch needed, handled by middleware)
      return successResponse({ data });
    },
    {
      requireAuth: true,
      rateLimit: { maxRequests: 100, windowMs: 60000 }
    }
  )
);
```

## Rate Limit Headers

When rate limiting is enabled, responses include:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-11-05T12:00:00Z
```

When rate limit is exceeded (429 response):

```
Retry-After: 45
```

## Security Headers

All responses automatically include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## TODO: Database-backed Rate Limiting

Current implementation uses in-memory rate limiting. For production, implement:

1. Create `rate_limits` table:

```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, window_start)
);

CREATE INDEX idx_rate_limits_key ON rate_limits(key, window_start);
```

2. Update RateLimiter class in `security.ts` to use this table.

## Environment Variables

Required for security middleware:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # For rate limiting storage
```

## Best Practices

1. **Always use `withSecurity` wrapper** for new functions
2. **Enable `requireAuth` for user-facing endpoints**
3. **Set appropriate rate limits** based on function purpose:
   - Public webhooks: 1000/min
   - User actions: 100/min
   - Heavy operations: 10/min
4. **Restrict `allowedOrigins` in production**
5. **Validate all input** using `validateRequestBody`
6. **Sanitize user input** before storing or displaying
7. **Use `errorResponse` and `successResponse`** for consistent API

## Testing

```bash
# Test with curl
curl -X POST https://xxx.supabase.co/functions/v1/my-function \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

## Support

For questions or issues with the security middleware, contact the DevOps team.
