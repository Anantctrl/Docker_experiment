# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it to us responsibly.

### How to Report

Please email security@your-org.org with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide regular updates on our progress toward a fix.

## Security Best Practices

### For Developers

1. **Never commit secrets**: Use `.env.example` for placeholders, never `.env` with real credentials
2. **Use strong secrets**: Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production
3. **Password hashing**: All passwords are hashed with bcrypt (configurable salt rounds)
4. **Authorization**: Resource-level authorization is enforced on all endpoints
5. **Input validation**: All inputs are validated using class-validator
6. **Rate limiting**: Configure `RATE_LIMIT_TTL` and `RATE_LIMIT_MAX` to prevent abuse

### For Deployments

1. Use environment variables for all secrets
2. Enable HTTPS in production
3. Restrict database access to the API container only
4. Regularly update dependencies: `npm audit` and `npm audit fix`
5. Rotate JWT secrets periodically

## Vulnerability Disclosure

We follow responsible disclosure practices. Security researchers will be credited in our release notes (if desired) and we will work with you to resolve issues before public disclosure.

## Contact

- Security email: security@your-org.org
- PGP key: [link to PGP key]
