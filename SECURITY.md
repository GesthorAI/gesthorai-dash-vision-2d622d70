# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of GesthorAI seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@gesthorai.com**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., SQL injection, XSS, authentication bypass, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

### What to Expect

- **Acknowledgment**: We will acknowledge your email within 48 hours.
- **Investigation**: We will investigate the issue and keep you informed of our progress.
- **Resolution**: We will work to resolve the issue as quickly as possible.
- **Credit**: We will credit you in our release notes (unless you prefer to remain anonymous).

## Security Best Practices

### For Users

1. **Keep Your Credentials Safe**
   - Never share your password with anyone
   - Use a strong, unique password
   - Enable two-factor authentication (2FA) when available
   - Regularly rotate your API keys

2. **Be Cautious with Integrations**
   - Only connect trusted third-party services
   - Review permissions requested by integrations
   - Regularly audit connected services

3. **Monitor Your Account**
   - Review login history regularly
   - Check for unusual activity
   - Report suspicious behavior immediately

### For Developers

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use `.env.example` for documentation
   - Rotate secrets regularly
   - Use different secrets for each environment

2. **Dependencies**
   - Run `npm audit` regularly
   - Keep dependencies up to date
   - Review dependency changes before updating

3. **Code Review**
   - Always review code for security issues
   - Use tools like ESLint with security plugins
   - Follow the principle of least privilege

4. **Data Protection**
   - Encrypt sensitive data at rest and in transit
   - Implement proper access controls
   - Follow LGPD/GDPR guidelines

## Security Measures Implemented

### Authentication & Authorization
- JWT-based authentication via Supabase
- Row-level security (RLS) policies
- Role-based access control (RBAC)
- Session management with automatic expiration

### Data Protection
- SSL/TLS encryption for all connections
- Encrypted database at rest (Supabase)
- Secure storage for sensitive data
- Data anonymization for analytics

### Application Security
- Input validation using Zod schemas
- Parameterized queries (SQL injection prevention)
- XSS protection via React's built-in sanitization
- CSRF protection
- Content Security Policy (CSP) headers

### API Security
- Rate limiting on critical endpoints
- API key authentication
- CORS configuration
- Request validation
- JWT verification on Edge Functions

### Monitoring & Logging
- Error tracking with Sentry
- Security event logging
- Automated security scanning
- Dependency vulnerability scanning

### Infrastructure Security
- Supabase managed infrastructure
- Automated backups
- DDoS protection (Cloudflare)
- Regular security updates

## Vulnerability Disclosure Policy

We follow coordinated vulnerability disclosure:

1. **Report**: Security researcher reports vulnerability privately
2. **Acknowledge**: We acknowledge receipt within 48 hours
3. **Investigate**: We investigate and validate the issue
4. **Fix**: We develop and test a fix
5. **Release**: We release the fix and publish a security advisory
6. **Disclose**: Public disclosure after fix is deployed

We ask security researchers to:
- Give us reasonable time to fix the issue before public disclosure
- Not exploit the vulnerability beyond what is necessary to demonstrate it
- Not access, modify, or delete data that doesn't belong to you

## Bug Bounty Program

We currently do not have a formal bug bounty program, but we deeply appreciate security researchers who help us keep GesthorAI secure. We will:

- Publicly acknowledge your contribution (with your permission)
- Keep you informed throughout the resolution process
- Consider financial compensation for critical vulnerabilities (case by case)

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. We will:

- Publish a security advisory on GitHub
- Notify affected users via email
- Update this document with mitigation steps

## Contact

For security-related questions or concerns:

- **Email**: security@gesthorai.com
- **PGP Key**: Available upon request

For general support:
- **Email**: support@gesthorai.com
- **GitHub Issues**: For non-security bugs only

---

**Last Updated**: November 5, 2025
**Version**: 1.0
