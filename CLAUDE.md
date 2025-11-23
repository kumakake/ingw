# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Instagram OAuth service for WordPress integration. Retrieves Instagram Business Account IG_USER_ID through Facebook OAuth 2.0 flow and provides REST API endpoints for external services.

**Tech Stack**: Node.js + Express + PostgreSQL + Facebook Graph API v18.0

## Development Commands

### Docker Compose (Recommended)
```bash
# Setup and run
cp .env.docker .env                  # Create environment config for Docker
docker-compose up -d                 # Start all services
make up                              # Alternative using Makefile

# Useful commands
make logs                            # View all logs
make logs-app                        # View app logs only
make shell                           # Enter app container
make db-shell                        # Connect to PostgreSQL
make down                            # Stop services
make db-reset                        # Reset database (deletes all data)
```

### Local Development (Without Docker)
```bash
# Setup
npm install                          # Install dependencies
cp .env.example .env                 # Create environment config
psql -U postgres -d instagram_oauth -f db/schema.sql  # Initialize database

# Running
npm start                            # Production mode
npm run dev                          # Development mode with nodemon

# Database
npm run db:init                      # Initialize/reset database schema
psql -U postgres -d instagram_oauth  # Connect to database
```

## Architecture

### OAuth Flow (src/services/instagramService.js)

The service implements Facebook OAuth 2.0 to retrieve Instagram Business Account credentials:

1. **User Authorization** → Generate Facebook OAuth URL with required scopes
2. **Code Exchange** → Convert authorization code to short-lived token
3. **Token Extension** → Convert to long-lived token (60-day validity)
4. **Page Retrieval** → Fetch user's Facebook pages
5. **Instagram Connection** → Get Instagram Business Account linked to each page
6. **Data Persistence** → Store credentials in PostgreSQL

**Critical**: The service handles multiple Facebook pages per user. Each page may have an Instagram Business Account. All valid accounts are stored.

### Data Layer (src/models/InstagramUser.js)

PostgreSQL model with upsert pattern. Key fields:
- `facebook_user_id` - Unique identifier for Facebook user
- `access_token` - Long-lived page access token
- `token_expires_at` - Token expiration timestamp
- `facebook_page_id` - Facebook page ID
- `instagram_user_id` - **Primary output** for WordPress integration

### API Endpoints

**Authentication Routes** (src/routes/auth.js):
- `GET /auth/login` - Initiates OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/status` - Lists all authenticated accounts

**External API Routes** (src/routes/api.js):
- `GET /api/instagram/user/:facebookUserId` - Get IG_USER_ID by Facebook user
- `GET /api/instagram/page/:facebookPageId` - Get IG_USER_ID by Facebook page
- `GET /api/instagram/users` - List all accounts

All API endpoints return JSON with `{success, data}` or `{success, error}` structure.

### Frontend (public/index.html)

Single-page HTML interface with:
- OAuth initiation button
- Result display with copy-to-clipboard
- Error/success messaging
- URL parameter handling for callback data

## Key Patterns

### Error Handling

Service layer throws descriptive errors. Controllers catch and return user-friendly messages. OAuth errors redirect to frontend with error messages in query params.

### Token Management

Long-lived tokens expire after 60 days. API responses include `tokenExpiresAt`. Expired tokens return `401` with `tokenExpired: true` flag.

### Multi-Account Support

Users may have multiple Facebook pages, each with separate Instagram accounts. All accounts are stored and accessible via different query parameters.

## Environment Variables

Required in `.env`:
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` - Meta app credentials
- `REDIRECT_URI` - OAuth callback URL (must match Meta app settings)
- `DB_*` - PostgreSQL connection parameters
- `ALLOWED_ORIGINS` - CORS whitelist (comma-separated)

**Docker Compose**: Use `.env.docker` as template. `DB_HOST` is automatically set to `db` (service name) in docker-compose.yml.

## Meta App Configuration

In Meta Developer Console:
1. Add redirect URI to "Valid OAuth Redirect URIs"
2. Enable required permissions: `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`, `pages_manage_metadata`
3. Products: Facebook Login + Instagram Graph API

## Database Schema

Single table `instagram_users` with automatic `updated_at` trigger. Indexed on `facebook_user_id`, `instagram_user_id`, and `facebook_page_id` for fast lookups.

**Docker**: Schema is automatically initialized on first startup via `docker-entrypoint-initdb.d`.

## WordPress Integration Pattern

WordPress plugin should:
1. Initiate OAuth flow or use API endpoints directly
2. Store `instagramUserId` and `facebookPageId` in WordPress database
3. Use `GET /api/instagram/page/:facebookPageId` to retrieve access token when publishing
4. Handle `tokenExpired: true` responses by triggering re-authentication

## Common Issues

**"No Instagram Business Accounts found"**: Facebook page not linked to Instagram Business Account. Verify in Facebook Business Settings.

**Token expiration**: Long-lived tokens last 60 days. Implement refresh logic or re-authentication prompt.

**CORS errors**: Add WordPress domain to `ALLOWED_ORIGINS` in `.env`.
