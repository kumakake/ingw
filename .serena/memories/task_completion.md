# Task Completion Checklist

## Before Completing a Task

### 1. Code Quality
- [ ] No syntax errors (app starts successfully)
- [ ] Follow existing code patterns in the file
- [ ] Use async/await consistently
- [ ] Proper error handling in controllers

### 2. Testing (Manual)
Since no test suite exists:
```bash
make up                           # Start services
make logs-app                     # Watch for errors
curl http://localhost:3000/health # Health check
```

### 3. Database Changes
If modifying schema:
```bash
make db-reset                     # Reset and apply new schema
```

### 4. Docker
If modifying dependencies:
```bash
make build                        # Rebuild image
make restart                      # Restart services
```

## Common Validation Steps

### API Changes
```bash
# Test endpoint (example)
curl http://localhost:3000/api/instagram/users
```

### OAuth Flow
1. Navigate to `http://localhost:3000/`
2. Click login button
3. Complete Facebook OAuth
4. Verify data in database: `make db-shell`

## No Automated Checks
- No linter configured
- No formatter configured
- No type checking
- No automated tests

## Recommended Manual Verification
1. `npm start` runs without errors
2. `http://localhost:3000/health` returns OK
3. Changed functionality works as expected
