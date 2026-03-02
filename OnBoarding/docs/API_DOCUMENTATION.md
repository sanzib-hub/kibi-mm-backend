# KIBI Affiliate OnBoarding API Documentation

Complete API reference with all endpoints, request/response formats, and examples.

## Base URL
```
http://localhost:4000
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Health Check

### GET /health
Check service health status.

**Authentication:** None required

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-09-10T18:03:26.301Z",
  "uptime": 20.839229917
}
```

---

## Super Admin API

### POST /api/super-admin/login
Authenticate super admin and get JWT token (cached for 1 hour).

**Authentication:** None required

**Request Body:**
```json
{
  "email": "admin@kibisports.com",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "superAdmin": {
      "id": 1,
      "name": "KIBI Super Admin",
      "email": "admin@kibisports.com"
    }
  }
}
```

**Error Responses:**
```json
// Invalid credentials (401)
{
  "success": false,
  "message": "Invalid credentials"
}

// Validation error (400)
{
  "success": false,
  "message": "\"email\" is required"
}
```

### POST /api/super-admin/organizations
Onboard a new sports organization.

**Authentication:** Super Admin required

**Request Body:**
```json
{
  "name": "Elite Sports Academy",
  "email": "admin@elitesports.com",
  "phone": "+919876543210",
  "password": "securepass123",
  "address": "123 Sports Complex, Mumbai",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "pincode": "400001",
  "website": "https://elitesports.com",
  "description": "Premier sports training academy"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Sports organization onboarded successfully",
  "data": {
    "organization": {
      "id": 2,
      "name": "Elite Sports Academy",
      "email": "admin@elitesports.com",
      "phone": "+919876543210",
      "status": "PENDING",
      "createdAt": "2025-09-10T18:00:00.000Z"
    }
  }
}
```

**Error Responses:**
```json
// Organization already exists (409)
{
  "success": false,
  "message": "Organization with this email already exists"
}

// Validation error (400)
{
  "success": false,
  "message": "\"name\" is required"
}
```

### GET /api/super-admin/organizations
Get all organizations with pagination and filters.

**Authentication:** Super Admin required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED, SUSPENDED)
- `search` (optional): Search by name or email

**Example Request:**
```
GET /api/super-admin/organizations?page=1&limit=10&status=PENDING&search=elite
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Organizations retrieved successfully",
  "data": {
    "organizations": [
      {
        "id": 1,
        "name": "Elite Sports Academy",
        "email": "admin@elitesports.com",
        "phone": "+919876543210",
        "status": "PENDING",
        "city": "Mumbai",
        "state": "Maharashtra",
        "createdAt": "2025-09-10T18:00:00.000Z",
        "updatedAt": "2025-09-10T18:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
```

### PATCH /api/super-admin/organizations/:id/status
Update organization status (approve/reject/suspend).

**Authentication:** Super Admin required

**Request Body:**
```json
{
  "status": "APPROVED",
  "comments": "Organization verified and approved"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Organization status updated successfully",
  "data": {
    "organization": {
      "id": 1,
      "name": "Elite Sports Academy",
      "status": "APPROVED",
      "updatedAt": "2025-09-10T18:05:00.000Z"
    }
  }
}
```

### GET /api/super-admin/non-affiliate-requests
Get pending non-affiliate invitation requests.

**Authentication:** Super Admin required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Non-affiliate requests retrieved successfully",
  "data": {
    "requests": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919876543220",
        "sportsCategory": "Cricket",
        "experience": "5 years",
        "reason": "Want to join KIBI platform",
        "status": "PENDING",
        "submittedAt": "2025-09-10T17:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

### PATCH /api/super-admin/non-affiliate-requests/:id/review
Approve or reject non-affiliate invitation request.

**Authentication:** Super Admin required

**Request Body:**
```json
{
  "status": "APPROVED",
  "comments": "Good profile, approved for invitation",
  "organizationId": 1
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Non-affiliate request approved and invitation code generated",
  "data": {
    "request": {
      "id": 1,
      "status": "APPROVED",
      "reviewedAt": "2025-09-10T18:10:00.000Z"
    },
    "invitationCode": "NAF-001"
  }
}
```

### GET /api/super-admin/affiliates
Get all affiliates across all organizations with pagination and filters.

**Authentication:** Super Admin required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `status` (optional): Filter by status (ACTIVE, INACTIVE, SUSPENDED)
- `role` (optional): Filter by role (ATHLETE, COACH, SPORTS STAFF, etc.)
- `organizationId` (optional): Filter by specific organization ID
- `invitationStatus` (optional): Filter by invitation status (PENDING, SENT, ACCEPTED, EXPIRED)
- `search` (optional): Search by affiliate name, email, or organization name

**Example Request:**
```
GET /api/super-admin/affiliates?page=1&limit=10&status=ACTIVE&role=ATHLETE&search=john
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Affiliates retrieved successfully",
  "data": {
    "affiliates": [
      {
        "id": 1,
        "name": "John Doe",
        "role": "ATHLETE",
        "email": "john@example.com",
        "phone": "+919876543220",
        "dateOfBirth": "1995-06-15",
        "gender": "MALE",
        "sportsCategory": "Cricket",
        "position": "Batsman",
        "invitationStatus": "ACCEPTED",
        "status": "ACTIVE",
        "organizationId": 1,
        "organizationName": "Elite Sports Academy",
        "organizationEmail": "admin@elitesports.com",
        "createdAt": "2025-09-10T18:00:00.000Z",
        "updatedAt": "2025-09-10T18:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
```json
// Unauthorized access (401)
{
  "success": false,
  "message": "Access denied. Super Admin required."
}

// Internal server error (500)
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Organization API

### POST /api/organization/login
Authenticate organization and get JWT token (cached for 1 hour).

**Authentication:** None required

**Request Body:**
```json
{
  "email": "admin@elitesports.com",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "organization": {
      "id": 1,
      "name": "Elite Sports Academy",
      "email": "admin@elitesports.com",
      "status": "APPROVED",
      "isFirstLogin": false
    }
  }
}
```

**Error Responses:**
```json
// Invalid credentials (401)
{
  "success": false,
  "message": "Invalid credentials"
}

// Organization not approved (403)
{
  "success": false,
  "message": "Organization not approved yet"
}
```

### POST /api/organization/affiliates
Add a single affiliate with automatic invitation code generation.

**Authentication:** Organization required

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543220",
  "dateOfBirth": "1995-06-15",
  "gender": "MALE",
  "sportsCategory": "Cricket",
  "position": "Batsman",
  "experience": "5 years",
  "bio": "Experienced cricket player"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Affiliate added successfully and invitation sent",
  "data": {
    "affiliate": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543220",
      "sportsCategory": "Cricket",
      "invitationStatus": "SENT",
      "status": "PENDING"
    },
    "invitationCode": "ELITE001"
  }
}
```

**Error Responses:**
```json
// Affiliate already exists (409)
{
  "success": false,
  "message": "Affiliate with this phone number already exists"
}

// SMS sending failed (500)
{
  "success": false,
  "message": "Failed to send invitation SMS"
}
```

### POST /api/organization/affiliates/bulk
Bulk add affiliates (maximum 50 at once).

**Authentication:** Organization required

**Request Body:**
```json
{
  "affiliates": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543220",
      "sportsCategory": "Cricket"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+919876543221",
      "sportsCategory": "Tennis"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Bulk affiliate addition completed",
  "data": {
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "name": "John Doe",
        "phone": "+919876543220",
        "status": "SUCCESS",
        "invitationCode": "ELITE001"
      },
      {
        "name": "Jane Smith",
        "phone": "+919876543221",
        "status": "SUCCESS",
        "invitationCode": "ELITE002"
      }
    ]
  }
}
```

### GET /api/organization/affiliates
Get organization's affiliates with pagination and filters.

**Authentication:** Organization required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (PENDING, ACTIVE, INACTIVE)
- `invitationStatus` (optional): Filter by invitation status (SENT, ACCEPTED, EXPIRED)
- `search` (optional): Search by name, email, or phone

**Success Response (200):**
```json
{
  "success": true,
  "message": "Affiliates retrieved successfully",
  "data": {
    "affiliates": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919876543220",
        "sportsCategory": "Cricket",
        "position": "Batsman",
        "status": "ACTIVE",
        "invitationStatus": "ACCEPTED",
        "createdAt": "2025-09-10T18:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

### POST /api/organization/affiliates/:id/resend-invitation
Resend invitation code to an affiliate.

**Authentication:** Organization required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Invitation resent successfully",
  "data": {
    "affiliate": {
      "id": 1,
      "name": "John Doe",
      "phone": "+919876543220"
    },
    "invitationCode": "ELITE001",
    "expiresAt": "2025-09-17T18:00:00.000Z"
  }
}
```

### PATCH /api/organization/affiliates/:id/status
Update affiliate status for compliance and management purposes.

**Authentication:** Organization required

**Request Body:**
```json
{
  "status": "VERIFIED",
  "reason": "Completed verification process successfully"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Affiliate status updated to VERIFIED",
  "data": {
    "id": 1,
    "name": "John Doe",
    "status": "VERIFIED",
    "updatedAt": "2025-09-17T01:30:00.000Z"
  }
}
```

**Error Responses:**
```json
// Affiliate not found or doesn't belong to organization (404)
{
  "success": false,
  "message": "Affiliate not found or does not belong to your organization"
}

// Status already set (400)
{
  "success": false,
  "message": "Affiliate status is already VERIFIED"
}

// Invalid status value (400)
{
  "success": false,
  "message": "\"status\" must be one of [PENDING, VERIFIED, BANNED, FLAGGED]"
}
```

### GET /api/organization/dashboard/stats
Get dashboard statistics and analytics.

**Authentication:** Organization required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totalAffiliates": 25,
    "activeAffiliates": 20,
    "pendingAffiliates": 3,
    "inactiveAffiliates": 2,
    "invitationsSent": 28,
    "invitationsAccepted": 22,
    "invitationsExpired": 3,
    "recentActivity": [
      {
        "type": "AFFILIATE_SIGNUP",
        "message": "John Doe completed signup",
        "timestamp": "2025-09-10T17:30:00.000Z"
      }
    ]
  }
}
```

### GET /api/organization/details
Get organization details and profile information.

**Authentication:** Organization required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Organization details retrieved successfully",
  "data": {
    "id": 1,
    "name": "Elite Sports Academy",
    "email": "admin@elitesports.com",
    "phone": "+919876543210",
    "address": "123 Sports Complex, Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001",
    "website": "https://elitesports.com",
    "description": "Premier sports training academy",
    "status": "APPROVED",
    "isFirstLogin": false,
    "createdAt": "2025-09-10T18:00:00.000Z",
    "updatedAt": "2025-09-10T18:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// Organization not found (404)
{
  "success": false,
  "message": "Organization not found"
}
```

### PUT /api/organization/details
Update organization details (name cannot be updated).

**Authentication:** Organization required

**Request Body:**
```json
{
  "phone": "+919876543211",
  "address": "456 New Sports Complex, Mumbai",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "pincode": "400002",
  "website": "https://newelitesports.com",
  "description": "Updated premier sports training academy"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Organization details updated successfully",
  "data": {
    "id": 1,
    "name": "Elite Sports Academy",
    "email": "admin@elitesports.com",
    "phone": "+919876543211",
    "address": "456 New Sports Complex, Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400002",
    "website": "https://newelitesports.com",
    "description": "Updated premier sports training academy",
    "status": "APPROVED",
    "isFirstLogin": false,
    "updatedAt": "2025-09-10T18:30:00.000Z"
  }
}
```

**Error Responses:**
```json
// Attempting to update name (400)
{
  "success": false,
  "message": "Organization name cannot be updated."
}

// Organization not found (404)
{
  "success": false,
  "message": "Organization not found or update failed."
}
```

---

## Affiliate API

### POST /api/affiliate/request-otp
Request OTP for signup using invitation code (Redis cached for 5 minutes).

**Authentication:** None required

**Request Body:**
```json
{
  "phone": "+919876543220",
  "invitationCode": "ELITE001"
}
```

**Success Response (200) - New OTP:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "+919876543220",
    "expiresIn": 600
  }
}
```

**Success Response (200) - Cached OTP:**
```json
{
  "success": true,
  "message": "OTP already sent. Please check your messages.",
  "data": {
    "phone": "+919876543220",
    "expiresIn": 289,
    "cached": true
  }
}
```

**Error Responses:**
```json
// Invalid invitation code (400)
{
  "success": false,
  "message": "Invalid or expired invitation code"
}

// Phone number mismatch (400)
{
  "success": false,
  "message": "Phone number does not match the invitation"
}

// SMS sending failed (500)
{
  "success": false,
  "message": "Failed to send OTP. Please try again."
}
```

### POST /api/affiliate/verify-otp-signup
Verify OTP and complete signup with password.

**Authentication:** None required

**Request Body:**
```json
{
  "phone": "+919876543220",
  "otp": "123456",
  "invitationCode": "ELITE001",
  "password": "mypassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Affiliate signup completed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "affiliate": {
      "id": 1,
      "name": "John Doe",
      "phone": "+919876543220",
      "email": "john@example.com",
      "organizationId": 1,
      "status": "ACTIVE"
    }
  }
}
```

**Error Responses:**
```json
// Invalid OTP (400)
{
  "success": false,
  "message": "Invalid or expired OTP"
}

// OTP expired (400)
{
  "success": false,
  "message": "OTP has expired. Please request a new one."
}

// Invalid invitation (400)
{
  "success": false,
  "message": "Invalid invitation data"
}
```

### POST /api/affiliate/request-invitation
Request invitation code (for non-affiliates).

**Authentication:** None required

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+919876543230",
  "sportsCategory": "Tennis",
  "experience": "3 years",
  "reason": "Want to join KIBI platform as a tennis player",
  "documents": ["https://example.com/certificate.pdf"]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Invitation request submitted successfully. You will be notified once reviewed.",
  "data": {
    "requestId": 1,
    "status": "PENDING",
    "submittedAt": "2025-09-10T18:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// Duplicate request (409)
{
  "success": false,
  "message": "Request already exists for this phone number"
}
```

### POST /api/affiliate/login
Authenticate affiliate and get JWT token (cached for 1 hour).

**Authentication:** None required

**Request Body:**
```json
{
  "phone": "+919876543220",
  "password": "mypassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "affiliate": {
      "id": 1,
      "name": "John Doe",
      "phone": "+919876543220",
      "organizationId": 1,
      "status": "ACTIVE"
    }
  }
}
```

**Error Responses:**
```json
// Invalid credentials (401)
{
  "success": false,
  "message": "Invalid credentials"
}

// Account inactive (403)
{
  "success": false,
  "message": "Account is inactive"
}
```

### GET /api/affiliate/profile
Get affiliate profile information.

**Authentication:** Affiliate required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543220",
    "dateOfBirth": "1995-06-15",
    "gender": "MALE",
    "sportsCategory": "Cricket",
    "position": "Batsman",
    "profilePicture": null,
    "bio": "Experienced cricket player",
    "experience": "5 years",
    "status": "ACTIVE",
    "organizationName": "Elite Sports Academy",
    "joinedAt": "2025-09-10T18:00:00.000Z"
  }
}
```

---

## Redis Caching Details

### OTP Caching
- **TTL**: 5 minutes (300 seconds)
- **Key Pattern**: `otp:<phone>`
- **Behavior**: 
  - First request generates and caches OTP
  - Subsequent requests return cached OTP with remaining TTL
  - Cache invalidated after successful verification
  - Automatic expiration after 5 minutes

### JWT Caching
- **TTL**: 1 hour (3600 seconds)
- **Key Pattern**: `jwt:<userType>:<userId>`
- **Behavior**:
  - Login checks cache before generating new token
  - Authentication middleware checks cache first
  - Token reuse within 1-hour window
  - Automatic expiration after 1 hour

### Cache Performance
- **Cache Hit**: Instant response from Redis
- **Cache Miss**: Fallback to database + cache update
- **Error Handling**: Graceful fallback if Redis unavailable
- **Monitoring**: Cache hit/miss logging for optimization

---

## Error Codes Summary

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad request / Validation error |
| 401 | Unauthorized / Invalid credentials |
| 403 | Forbidden / Access denied |
| 404 | Resource not found |
| 409 | Conflict / Resource already exists |
| 500 | Internal server error |

---

## Rate Limiting

Currently no rate limiting is implemented, but the Redis infrastructure supports future rate limiting implementation using cache counters.

---

## Testing Examples

### Complete Signup Flow
```bash
# 1. Request OTP
curl -X POST http://localhost:4000/api/affiliate/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543220", "invitationCode": "ELITE001"}'

# 2. Verify OTP and signup
curl -X POST http://localhost:4000/api/affiliate/verify-otp-signup \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543220", "otp": "123456", "invitationCode": "ELITE001", "password": "mypass123"}'

# 3. Login
curl -X POST http://localhost:4000/api/affiliate/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543220", "password": "mypass123"}'

# 4. Get profile
curl -X GET http://localhost:4000/api/affiliate/profile \
  -H "Authorization: Bearer <jwt_token>"
```

### Organization Management
```bash
# 1. Super admin login
curl -X POST http://localhost:4000/api/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@kibisports.com", "password": "admin123"}'

# 2. Add organization
curl -X POST http://localhost:4000/api/super-admin/organizations \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Sports Academy", "email": "admin@academy.com", "phone": "+919876543210", "password": "pass123"}'

# 3. Approve organization
curl -X PATCH http://localhost:4000/api/super-admin/organizations/1/status \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED", "comments": "Verified and approved"}'
```
