# Code Style and Conventions

## Language
- JavaScript (ES6+)
- No TypeScript (despite Serena detecting it from package structure)

## Naming Conventions
- **Files**: camelCase (e.g., `instagramService.js`, `apiController.js`)
- **Classes**: PascalCase (e.g., `InstagramService`, `InstagramUser`)
- **Functions/Methods**: camelCase (e.g., `findByFacebookUserId`, `getOAuthUrl`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `FACEBOOK_GRAPH_URL`, `PORT`)
- **Variables**: camelCase

## Code Patterns

### Module Exports
```javascript
// Class-based services
class InstagramService {
  static async methodName() { }
}
module.exports = InstagramService;

// Express routes
const router = express.Router();
module.exports = router;
```

### Async/Await
- Prefer async/await over callbacks/promises
- Use try/catch for error handling in controllers

### Database
- PostgreSQL with `pg` library
- Static methods on model classes
- Parameterized queries ($1, $2, etc.)
- Upsert pattern for data persistence

### Error Handling
- Service layer throws descriptive errors
- Controllers catch and return JSON `{success: false, error: message}`
- OAuth errors redirect to frontend with query params

### API Response Format
```javascript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "Error message" }
```

## Project Structure
```
src/
├── app.js              # Express app entry point
├── config/             # Database configuration
├── controllers/        # Request handlers
├── middleware/         # Express middleware
├── models/             # Data access layer
├── routes/             # API route definitions
└── services/           # Business logic
public/                 # Static frontend files
db/                     # Database schema
scripts/                # Shell scripts
```

## Comments
- Minimal inline comments
- No JSDoc required
- README and CLAUDE.md for documentation
