# Suggested Commands

## Docker Compose (Recommended)

```bash
# Setup
cp .env.docker .env              # Create environment config for Docker

# Start/Stop
make up                          # Start all services (app + db)
make down                        # Stop services
make restart                     # Restart services
docker-compose up                # Start with logs (dev mode)

# Logs
make logs                        # View all logs
make logs-app                    # View app logs only
make logs-db                     # View db logs only

# Database
make db-shell                    # Connect to PostgreSQL (psql)
make db-reset                    # Reset database (deletes all data)

# Container Access
make shell                       # Enter app container shell

# Cleanup
make clean                       # Remove all containers, images, volumes

# Status
make status                      # Check service status
```

## Local Development (Without Docker)

```bash
# Setup
npm install                      # Install dependencies
cp .env.example .env             # Create environment config

# Running
npm start                        # Production mode
npm run dev                      # Development mode with nodemon

# Database
npm run db:init                  # Initialize/reset database schema
psql -U postgres -d instagram_oauth  # Connect to database
```

## Testing
Currently no test suite configured (`npm test` not implemented).

## Endpoints (for testing)
- `http://localhost:3000/` - Frontend
- `http://localhost:3000/health` - Health check
- `http://localhost:3000/auth/login` - Start OAuth
- `http://localhost:3000/api/instagram/users` - List accounts
