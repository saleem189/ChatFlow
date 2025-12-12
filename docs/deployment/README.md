# Deployment Guide

This guide covers deploying Synapse to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Deployment Options](#deployment-options)
4. [Production Checklist](#production-checklist)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ PostgreSQL database (14.x or higher)
- ✅ Redis instance (optional, recommended for rate limiting)
- ✅ File storage (S3 or compatible)
- ✅ Domain name with SSL certificate
- ✅ STUN/TURN servers for WebRTC (optional, improves connectivity)

---

## Environment Variables

Create a `.env.production` file with the following variables:

### Database
```bash
DATABASE_URL="postgresql://user:password@host:5432/chatflow"
```

### Authentication
```bash
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
```

### File Upload
```bash
# AWS S3
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="synapse-uploads"

# Or Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET="synapse-uploads"
```

### Socket.io Server
```bash
NEXT_PUBLIC_SOCKET_URL="https://socket.your-domain.com"
SOCKET_PORT="3001"
```

### Redis (Optional)
```bash
REDIS_URL="redis://user:password@host:6379"
```

### Sentry (Monitoring)
```bash
SENTRY_DSN="your-sentry-dsn"
SENTRY_AUTH_TOKEN="your-auth-token"
```

### Email (Optional)
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="ChatFlow <noreply@your-domain.com>"
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Frontend)

**Pros:** Easy setup, automatic deployments, great performance  
**Cons:** Serverless limitations, cold starts

#### Steps:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Configure project:**
   ```bash
   vercel
   ```

4. **Set environment variables in Vercel dashboard**

5. **Deploy:**
   ```bash
   vercel --prod
   ```

#### Configuration

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "NEXTAUTH_URL": "@nextauth-url"
  }
}
```

**Note:** Socket.io server must be deployed separately (see below).

---

### Option 2: Docker + VPS

**Pros:** Full control, no cold starts, cost-effective  
**Cons:** More maintenance, require DevOps knowledge

#### Docker Compose Setup

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  socket:
    build:
      context: .
      dockerfile: Dockerfile.socket
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=chatflow
      - POSTGRES_USER=chatflow
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
      - socket
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY . .

RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]
```

#### Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### Option 3: Separate Services (Recommended for Scale)

Deploy components separately for better scalability:

| Component | Platform | Purpose |
|-----------|----------|---------|
| Next.js App | Vercel/Railway | Frontend + API |
| Socket.io | Railway/Heroku | WebSocket server |
| Worker | Railway/Heroku | Background jobs |
| Database | Supabase/Railway | PostgreSQL |
| Redis | Upstash/Railway | Cache/Queue |
| File Storage | AWS S3/R2 | File uploads |

---

## Production Checklist

### Before Deployment

- [ ] **Database Setup**
  - [ ] Run migrations: `npm run db:migrate`
  - [ ] Set up database backups
  - [ ] Configure connection pooling

- [ ] **Security**
  - [ ] Set strong `NEXTAUTH_SECRET`
  - [ ] Enable HTTPS/WSS
  - [ ] Configure CORS properly
  - [ ] Review security headers
  - [ ] Set up rate limiting

- [ ] **Performance**
  - [ ] Run bundle analyzer: `npm run analyze`
  - [ ] Enable compression
  - [ ] Configure CDN
  - [ ] Set up caching headers

- [ ] **Monitoring**
  - [ ] Configure Sentry
  - [ ] Set up uptime monitoring
  - [ ] Configure error alerts
  - [ ] Set up performance monitoring

- [ ] **Testing**
  - [ ] Run all tests: `npm test`
  - [ ] Manual testing in staging
  - [ ] Load testing
  - [ ] Security audit

### After Deployment

- [ ] **Verification**
  - [ ] Test authentication flow
  - [ ] Test message sending
  - [ ] Test file uploads
  - [ ] Test video calls
  - [ ] Test on multiple browsers

- [ ] **Monitoring**
  - [ ] Check error rates
  - [ ] Monitor response times
  - [ ] Check database performance
  - [ ] Verify WebSocket connections

- [ ] **Documentation**
  - [ ] Update deployment notes
  - [ ] Document any issues found
  - [ ] Share credentials securely

---

## Monitoring

### Sentry Setup

1. **Create Sentry project:**
   - Go to sentry.io
   - Create new Next.js project
   - Copy DSN

2. **Configure Sentry:**
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Set environment variables:**
   ```bash
   SENTRY_DSN="your-dsn"
   SENTRY_AUTH_TOKEN="your-token"
   ```

### Performance Monitoring

Access performance dashboard:
```
https://your-domain.com/admin/performance
```

Monitor:
- API response times
- Database query performance
- Memory usage
- WebSocket connections

### Uptime Monitoring

Recommended services:
- **UptimeRobot** (free tier available)
- **StatusCake** (free tier available)
- **Better Uptime** (paid, more features)

### Log Aggregation

Consider using:
- **Logtail** (simple, affordable)
- **DataDog** (enterprise-grade)
- **New Relic** (full observability)

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Symptom:** "Can't reach database server"

**Solutions:**
- Check `DATABASE_URL` format
- Verify database is running
- Check firewall rules
- Verify SSL settings

```bash
# Test connection
psql $DATABASE_URL
```

#### 2. WebSocket Connection Fails

**Symptom:** "WebSocket connection failed"

**Solutions:**
- Check `NEXT_PUBLIC_SOCKET_URL`
- Verify Socket.io server is running
- Check CORS configuration
- Verify firewall allows WebSocket

```bash
# Test Socket.io server
curl http://your-socket-server:3001/socket.io/
```

#### 3. File Upload Fails

**Symptom:** "Failed to upload file"

**Solutions:**
- Check AWS/R2 credentials
- Verify bucket exists and is accessible
- Check CORS configuration
- Verify file size limits

```bash
# Test S3 access
aws s3 ls s3://your-bucket
```

#### 4. High Memory Usage

**Symptom:** Server crashes or slow performance

**Solutions:**
- Check for memory leaks
- Increase server memory
- Enable connection pooling
- Review database query efficiency

```bash
# Monitor memory
node --inspect index.js
```

#### 5. Rate Limiting Too Aggressive

**Symptom:** Users getting 429 errors

**Solutions:**
- Review rate limit settings in `lib/middleware/rate-limit.ts`
- Consider implementing Redis for distributed rate limiting
- Add user-specific limits

---

## Scaling

### Horizontal Scaling

When to scale:
- CPU usage consistently > 70%
- Response times > 500ms
- Database connections maxed out

**Options:**
- Add more Next.js instances (Vercel does this automatically)
- Load balance Socket.io servers
- Database read replicas

### Vertical Scaling

When to scale:
- Memory usage > 80%
- Database query times increasing
- File processing slow

**Options:**
- Upgrade server tier
- Increase database resources
- Add more Redis memory

---

## Backup Strategy

### Database Backups

**Automated backups (daily):**
```bash
# Cron job
0 2 * * * pg_dump $DATABASE_URL > /backups/chatflow-$(date +\%Y\%m\%d).sql
```

**Retention:**
- Daily: 7 days
- Weekly: 4 weeks
- Monthly: 12 months

### File Storage Backups

Enable versioning on S3/R2 bucket to prevent accidental deletions.

### Configuration Backups

Store environment variables securely:
- Use secret management service (AWS Secrets Manager, Doppler)
- Keep encrypted backups offline
- Document all configuration changes

---

## Rollback Procedure

If deployment fails:

1. **Vercel:**
   ```bash
   vercel rollback
   ```

2. **Docker:**
   ```bash
   docker-compose down
   git checkout previous-tag
   docker-compose up -d
   ```

3. **Database migrations:**
   ```bash
   npm run db:migrate:rollback
   ```

---

## Support

For deployment help:
- Check [Troubleshooting Guide](./troubleshooting.md)
- Search [GitHub Discussions](https://github.com/your-repo/discussions)
- Open an issue on GitHub

---

**Deployment Checklist:** [Download PDF](./deployment-checklist.pdf)

