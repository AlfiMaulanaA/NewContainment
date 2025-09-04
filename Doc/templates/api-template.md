# {{project.name}} - API Documentation

**Base URL:** `{{api.baseUrl}}`  
**Version:** {{project.version}}  
**Generated:** {{generation.date}}

## 🔐 Authentication

{{#if api.authentication.enabled}}
All API endpoints require authentication unless specified otherwise.

**Authentication Type:** {{api.authentication.type}}

**Headers Required:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Login Endpoint:**
```http
POST {{api.baseUrl}}/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```
{{/if}}

## 📋 Controllers Overview

{{#each controllers}}
### {{name}}
**Description:** {{description}}  
**Endpoints:** {{endpoints.length}}  
**Authentication Required:** {{#if requiresAuth}}✅ Yes{{else}}❌ No{{/if}}

{{#if roles.length}}
**Required Roles:** {{#each roles}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{/each}}

## 🔗 API Endpoints

{{#each endpoints}}
### {{method}} {{path}}

{{#if description}}
**Description:** {{description}}
{{/if}}

{{#if requiresAuth}}
🔒 **Requires Authentication**
{{else}}
🌐 **Public Endpoint**
{{/if}}

{{#if roles.length}}
**Required Roles:** {{#each roles}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

**Request Example:**
```http
{{method}} {{../api.baseUrl}}{{path}}
{{#if requiresAuth}}Authorization: Bearer <token>{{/if}}
Content-Type: application/json

{{#if requestBody}}
{{requestBody}}
{{/if}}
```

**Response Example:**
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

{{#unless @last}}
---
{{/unless}}
{{/each}}

## 📝 Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "errors": string[] // (optional)
}
```

## ⚠️ Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200  | Success | Request processed successfully |
| 400  | Bad Request | Invalid request parameters |
| 401  | Unauthorized | Missing or invalid authentication |
| 403  | Forbidden | Insufficient permissions |
| 404  | Not Found | Resource does not exist |
| 422  | Validation Error | Request validation failed |
| 500  | Internal Server Error | Server-side error |

## 🔧 Testing

### Using curl
```bash
# Get authentication token
curl -X POST {{api.baseUrl}}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'

# Use the API with token
curl -X GET {{api.baseUrl}}/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman
1. Import the API collection (if available)
2. Set up environment variables for base URL and token
3. Configure authorization header
4. Test endpoints individually

### Rate Limiting
{{#if api.rateLimiting}}
- **Requests per minute:** {{api.rateLimiting.rpm}}
- **Requests per hour:** {{api.rateLimiting.rph}}
- **Rate limit headers:** Included in responses
{{else}}
Currently no rate limiting is implemented.
{{/if}}