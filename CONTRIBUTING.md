# Contributing to EventSync

Thank you for your interest in contributing to EventSync!

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/EventSync.git
   cd EventSync
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` and populate the credentials.
   ```bash
   cp .env.example .env.local
   ```

4. **Sync Prisma Database Schema:**
   ```bash
   npm run db:push
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```

## Pull Request Checklist

Before submitting a PR, please ensure:
- [ ] TypeScript checks pass cleanly (`npm run typecheck`)
- [ ] All unit and integration tests pass (`npm test`)
- [ ] Database schema changes include Prisma migrations or push verification
- [ ] Code follows existing styling patterns and conventions
