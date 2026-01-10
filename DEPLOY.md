# MoAI Token Rank - Deployment Guide

This guide covers deploying MoAI Token Rank to Vercel with Neon PostgreSQL and Clerk authentication.

## Prerequisites

- [Vercel Account](https://vercel.com)
- [Neon Account](https://neon.tech)
- [Clerk Account](https://clerk.com)
- [GitHub Account](https://github.com) (for OAuth)

---

## 1. Neon Database Setup

### Create Database

1. Go to [Neon Console](https://console.neon.tech)
2. Click **Create Project**
3. Set project name: `moai-rank`
4. Select region: **Asia Pacific (Singapore)** for Korean users
5. Click **Create Project**

### Get Connection String

1. In your Neon project dashboard, click **Connection Details**
2. Copy the **Connection string** (starts with `postgresql://`)
3. Save this as your `DATABASE_URL`

### Run Migrations

After setting up environment variables locally:

```bash
cd apps/web
bun run db:push
```

This pushes the schema directly to the database. For production migrations:

```bash
bun run db:generate  # Generate migration files
bun run db:migrate   # Apply migrations
```

---

## 2. Clerk Authentication Setup

### Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click **Create application**
3. Set application name: `MoAI Token Rank`
4. Enable **GitHub** as a social connection
5. Click **Create application**

### Get API Keys

1. In your Clerk application, go to **API Keys**
2. Copy:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)

### Configure GitHub OAuth

1. In Clerk Dashboard, go to **User & Authentication** > **Social Connections**
2. Enable **GitHub**
3. For custom GitHub OAuth (recommended for production):
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create a new OAuth App:
     - **Application name**: MoAI Token Rank
     - **Homepage URL**: `https://rank.mo.ai.kr`
     - **Authorization callback URL**: `https://clerk.mo.ai.kr/v1/oauth_callback`
   - Copy Client ID and Client Secret
   - Enter these in Clerk's GitHub connection settings

### Configure Redirect URLs

In Clerk Dashboard, go to **Paths**:

- **Sign-in URL**: `/sign-in`
- **Sign-up URL**: `/sign-up`
- **After sign-in URL**: `/dashboard`
- **After sign-up URL**: `/dashboard`

---

## 3. Vercel Project Setup

### Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** > **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as is for monorepo)
   - **Build Command**: `turbo run build --filter=@moai-rank/web`
   - **Install Command**: `bun install`
   - **Output Directory**: `apps/web/.next`

### Environment Variables

Add these environment variables in Vercel:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | Your Neon connection string | Production, Preview |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Preview |
| `CLERK_SECRET_KEY` | `sk_live_...` | Production |
| `CLERK_SECRET_KEY` | `sk_test_...` | Preview |
| `NEXT_PUBLIC_APP_URL` | `https://rank.mo.ai.kr` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://preview.rank.mo.ai.kr` | Preview |

### Deploy

Click **Deploy** to start the initial deployment.

---

## 4. Custom Domain Setup

### Add Domain in Vercel

1. Go to your project's **Settings** > **Domains**
2. Add domain: `rank.mo.ai.kr`
3. Vercel will provide DNS records

### Configure DNS

Add these records at your DNS provider:

| Type | Name | Value |
|------|------|-------|
| A | rank | `76.76.21.21` |
| CNAME | www.rank | `cname.vercel-dns.com` |

Or for subdomain:

| Type | Name | Value |
|------|------|-------|
| CNAME | rank | `cname.vercel-dns.com` |

### SSL Certificate

Vercel automatically provisions SSL certificates. Wait 1-2 minutes after DNS propagation.

---

## 5. Post-Deployment Verification

### Health Checks

1. Visit `https://rank.mo.ai.kr` - should load homepage
2. Visit `https://rank.mo.ai.kr/sign-in` - should show Clerk sign-in
3. Sign in with GitHub - should redirect to dashboard
4. Check `/api/leaderboard` - should return JSON data

### Database Verification

```bash
cd apps/web
bun run db:studio
```

This opens Drizzle Studio to inspect your database.

---

## 6. CI/CD Pipeline

Vercel automatically deploys on push:

- **main branch** -> Production (`rank.mo.ai.kr`)
- **other branches** -> Preview (`*.vercel.app`)

### Manual Deployment

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## 7. Monitoring and Analytics

### Vercel Analytics

1. Go to project **Analytics** tab
2. Enable **Web Analytics** and **Speed Insights**
3. Add to `apps/web/src/app/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Error Monitoring

Consider adding Sentry for error tracking:

```bash
cd apps/web
bun add @sentry/nextjs
```

---

## 8. Troubleshooting

### Build Failures

**Error**: `Cannot find module '@moai-rank/shared'`

Solution: Ensure `packages/shared` is built first:
```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Error**: `DATABASE_URL is not set`

Solution: Add `DATABASE_URL` to Vercel environment variables.

### Authentication Issues

**Error**: `Clerk: Missing publishable key`

Solution: Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in Vercel.

**Error**: `OAuth callback URL mismatch`

Solution: Update Clerk's allowed redirect URLs to include your Vercel domain.

### Database Connection Issues

**Error**: `Connection refused` or `ECONNREFUSED`

Solutions:
1. Check Neon project is active (not suspended)
2. Verify DATABASE_URL format includes `?sslmode=require`
3. Check Neon's connection limits (free tier: 100 connections)

---

## 9. Security Checklist

- [ ] Use production Clerk keys for production environment
- [ ] Never commit `.env.local` files
- [ ] Enable Clerk's attack protection features
- [ ] Set up Neon IP allowlisting (optional)
- [ ] Enable Vercel's DDoS protection
- [ ] Review CORS settings in middleware
- [ ] Set `DEBUG=false` in production

---

## 10. Quick Reference

### Commands

```bash
# Development
bun run dev

# Build
bun run build

# Database
bun run db:push      # Push schema to database
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio

# Deploy
vercel               # Preview deployment
vercel --prod        # Production deployment
```

### Important URLs

- Production: `https://rank.mo.ai.kr`
- Vercel Dashboard: `https://vercel.com/dashboard`
- Neon Console: `https://console.neon.tech`
- Clerk Dashboard: `https://dashboard.clerk.com`

---

## Support

For issues, check:
1. Vercel deployment logs
2. Vercel function logs (for API routes)
3. Neon query logs
4. Clerk webhook logs
