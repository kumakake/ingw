# Instagram OAuth Service - Project Overview

## Purpose
Instagram OAuth service for WordPress integration. Retrieves Instagram Business Account IG_USER_ID through Facebook OAuth 2.0 flow and provides REST API endpoints for external services.

## Tech Stack
- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express 4.18.2
- **Database**: PostgreSQL (pg 8.11.3)
- **HTTP Client**: Axios 1.6.2
- **Environment**: dotenv 16.3.1
- **CORS**: cors 2.8.5
- **Dev Tools**: nodemon 3.0.2

## API Integration
- Facebook Graph API v18.0
- Instagram Graph API

## Architecture Pattern
- MVC-like structure with services, controllers, models, routes
- RESTful API design
- PostgreSQL for data persistence

## Key Data Flow
1. User initiates OAuth via `/auth/login`
2. Facebook OAuth callback at `/auth/callback`
3. Service exchanges code for long-lived token
4. Retrieves Facebook pages and linked Instagram Business Accounts
5. Stores credentials in PostgreSQL
6. External services access via REST API

## Primary Output
- `instagram_user_id` (IG_USER_ID) - Used by WordPress plugins for Instagram API calls
