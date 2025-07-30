# Swagger Authentication Guide

## 401 Unauthorized Error - SOLVED ✅

Password hashing issue telah diperbaiki! Database akan otomatis di-seed dengan password hash yang benar saat startup.

Swagger sekarang sudah dikonfigurasi dengan JWT authentication. Ikuti langkah berikut untuk test API:

### Step 1: Login untuk Mendapatkan Token

1. Buka Swagger UI: `http://localhost:5005/swagger`
2. Expand endpoint `POST /api/auth/login`
3. Click **"Try it out"**
4. Masukkan credentials salah satu user default:

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

5. Click **"Execute"**
6. Copy **token** dari response

### Step 2: Authorize di Swagger

1. Click tombol **"Authorize"** (icon gembok) di bagian atas Swagger UI
2. Masukkan token dengan format: `Bearer YOUR_TOKEN_HERE`
   
   Contoh:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Click **"Authorize"**
4. Click **"Close"**

### Step 3: Test Protected Endpoints

Sekarang Anda bisa test semua protected endpoints:

- User Management endpoints (`/api/users/*`)
- MQTT endpoints (`/api/mqtt/*`) 
- Current user info (`GET /api/auth/me`)

## Default Test Users

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@example.com | password123 | Admin | Full access |
| dev@example.com | password123 | Developer | Development access |
| user@example.com | password123 | User | Basic access |

## Public Endpoints (No Token Required)

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user

## Protected Endpoints (Token Required)

- All `/api/users/*` endpoints
- All `/api/mqtt/*` endpoints  
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Token Expiry

- JWT tokens expire after **24 hours**
- If you get 401 error, login again to get fresh token
- Token contains user info: ID, Name, Email, Role

## Troubleshooting

1. **Token format error**: Pastikan format `Bearer TOKEN_HERE`
2. **Token expired**: Login ulang untuk mendapatkan token baru
3. **Wrong credentials**: Pastikan email/password benar
4. **Port mismatch**: Pastikan mengakses `http://localhost:5005`