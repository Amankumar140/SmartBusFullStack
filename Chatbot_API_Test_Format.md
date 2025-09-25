# Chatbot API Integration - Test Format

## API Endpoint
```
POST https://transport-bot-8651.onrender.com/chat
```

## Request Format (FIXED)

### Headers:
```json
{
  "Content-Type": "application/json"
}
```

### Body Format (WORKING):
```json
{
  "user_id": 1,
  "message": "What buses run from Chandigarh to Ludhiana?"
}
```

**✅ FIXED**: user_id must be INTEGER, not string!

## Example Requests

### 1. Logged-in User:
```json
{
  "user_id": "4",
  "message": "Show me bus routes"
}
```

### 2. Guest User (fallback):
```json
{
  "user_id": "guest_1726739521234",
  "message": "What time do buses start?"
}
```

## Expected Response Format:
```json
{
  "response": "Here are the available buses from Chandigarh to Ludhiana..."
}
```

## Implementation Details

### User ID Logic:
- **Logged-in users**: Uses actual user ID from AsyncStorage (e.g., "4")
- **Guest users**: Generates unique ID like "guest_1726739521234"

### Error Handling:
- Network errors → "Network error. Please check your internet connection"
- HTTP errors → "The chatbot service is currently unavailable"
- Timeout errors → "Connection timeout. Please try again"
- Generic errors → "Sorry, I'm having trouble connecting right now"

### Console Logging:
- Request body is logged for debugging
- Response status and data are logged
- Errors are logged with full details

## Testing Commands

You can test the API directly using curl:

```bash
curl -X POST https://transport-bot-8651.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "message": "Hello, tell me about bus routes"
  }'
```

The chatbot integration is now correctly formatted to match your API requirements!