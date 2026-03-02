# KIBI Affiliate OnBoarding - Complete cURL Test Commands

This document contains comprehensive cURL commands to test all endpoints of the KIBI Affiliate OnBoarding microservice.

## Prerequisites

1. Start the service: `npm run dev` (runs on port 4000)
2. Ensure PostgreSQL and Redis are running via Docker: `docker-compose up -d`
3. Replace `<JWT_TOKEN>` with actual tokens received from login responses

---

## 1. Health Check

```bash
# Basic health check
curl -X GET http://localhost:4000/health
```

---

## 2. Super Admin Endpoints

  ### 2.1 Super Admin Login
  ```bash
  # Login as Super Admin
  curl -X POST http://localhost:4000/api/super-admin/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@kibi.com",
      "password": "admin123"
    }'
  ```

  ### 2.2 Create/Onboard Sports Organization
  ```bash
  # Create a new sports organization
  curl -X POST http://localhost:4000/api/super-admin/organizations \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>" \
    -d '{
      "name": "Mumbai Cricket Academy",
      "email": "admin@mumbaiCA.com",
      "phone": "+919876543210",
      "password": "password123",
      "address": "Marine Drive, Mumbai",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "pincode": "400001",
      "description": "Premier cricket academy in Mumbai",
      "website": "https://mumbaiCA.com",
      "registrationNumber": "MCA2024001",
      "establishedYear": 2010,
      "sportsCategories": ["Cricket", "Tennis"]
    }'
  ```

  ### 2.3 Get All Organizations
  ```bash
  # Get all organizations with pagination
  curl -X GET "http://localhost:4000/api/super-admin/organizations?page=1&limit=10" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>"

  # Filter by status
  curl -X GET "http://localhost:4000/api/super-admin/organizations?status=PENDING&page=1&limit=10" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>"
  ```

  ### 2.4 Update Organization Status
  ```bash
  # Approve an organization
  curl -X PUT http://localhost:4000/api/super-admin/organizations/1/status \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>" \
    -d '{
      "status": "APPROVED",
      "comments": "Organization verified and approved"
    }'

  # Reject an organization
  curl -X PUT http://localhost:4000/api/super-admin/organizations/2/status \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>" \
    -d '{
      "status": "REJECTED",
      "comments": "Incomplete documentation"
    }'
  ```

  ### 2.5 Get Non-Affiliate Requests
  ```bash
  # Get all non-affiliate requests
  curl -X GET "http://localhost:4000/api/super-admin/non-affiliate-requests?page=1&limit=10" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>"

  # Filter by status
  curl -X GET "http://localhost:4000/api/super-admin/non-affiliate-requests?status=PENDING&page=1&limit=10" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>"
  ```

  ### 2.6 Approve/Reject Non-Affiliate Request
  ```bash
  # Approve non-affiliate request
  curl -X PUT http://localhost:4000/api/super-admin/non-affiliate-requests/1/approve \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>" \
    -d '{
      "comments": "Request approved after verification"
    }'

  # Reject non-affiliate request
  curl -X PUT http://localhost:4000/api/super-admin/non-affiliate-requests/2/reject \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>" \
    -d '{
      "comments": "Insufficient information provided"
    }'
  ```

---

## 3. Organization Endpoints

  ### 3.1 Organization Login
  ```bash
  # Login as Organization
  curl -X POST http://localhost:4000/api/organization/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@mumbaiCA.com",
      "password": "password123"
    }'
  ```

  ### 3.2 Add Affiliate
  ```bash
  # Add a new affiliate
  curl -X POST http://localhost:4000/api/organization/affiliates \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ORGANISATION_TOKEN" \
    -d '{
      "name": "Rohit Sharma",
      "email": "rohit@example.com",
      "phone": "+919876543221",
      "role": "ATHLETE",
      "position": "Senior Team"
    }'
  ```

  ### 3.3 Get All Affiliates
  ```bash
  # Get all affiliates for the organization
  curl -X GET "http://localhost:4000/api/organization/affiliates?page=1&limit=10" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

  # Filter by status
  curl -X GET "http://localhost:4000/api/organization/affiliates?status=PENDING&page=1&limit=10" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"
  ```

  ### 3.4 Send Invitation to Affiliate
  ```bash
  # Send invitation to affiliate
  curl -X POST http://localhost:4000/api/organization/affiliates/1/invite \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"
  ```

  ### 3.5 Update Affiliate Status
  ```bash
  # Verify affiliate
  curl -X PATCH http://localhost:4000/api/organization/affiliates/1/status \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "status": "VERIFIED",
      "reason": "Completed verification process successfully"
    }'

  # Flag affiliate for review
  curl -X PATCH http://localhost:4000/api/organization/affiliates/2/status \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "status": "FLAGGED",
      "reason": "Requires additional documentation review"
    }'

  # Ban affiliate
  curl -X PATCH http://localhost:4000/api/organization/affiliates/3/status \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "status": "BANNED",
      "reason": "Violation of platform policies"
    }'

  # Set affiliate to pending
  curl -X PATCH http://localhost:4000/api/organization/affiliates/4/status \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "status": "PENDING",
      "reason": "Awaiting initial verification"
    }'
  ```

  ### 3.6 Get Organization Details
  ```bash
  # Get organization profile details
  curl -X GET http://localhost:4000/api/organization/details \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"
  ```

  ### 3.7 Update Organization Details
  ```bash
  # Update organization profile (name cannot be updated)
  curl -X PUT http://localhost:4000/api/organization/details \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "phone": "+919876543211",
      "address": "456 New Sports Complex, Mumbai",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "pincode": "400002",
      "website": "https://newmumbaiCA.com",
      "description": "Updated premier cricket academy in Mumbai"
    }'

  # Test error case - trying to update name (should fail)
  curl -X PUT http://localhost:4000/api/organization/details \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "name": "New Organization Name",
      "phone": "+919876543211"
    }'
  ```

  ### 3.8 Get Dashboard Stats
  ```bash
  # Get organization dashboard statistics
  curl -X GET http://localhost:4000/api/organization/dashboard/stats \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"
  ```

---

## 4. Affiliate Endpoints

  ### 4.1 Request OTP
  ```bash
  # Request OTP for phone verification
  curl -X POST http://localhost:4000/api/affiliate/request-otp \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543221"
    }'
  ```

  ### 4.2 Verify OTP and Signup (With Invitation Code)
  ```bash
  # Signup with invitation code
  curl -X POST http://localhost:4000/api/affiliate/verify-otp-signup \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543221",
      "otp": "123456",
      "invitationCode": "INV123456789",
      "password": "securePassword123",
      "name": "Rohit Sharma",
      "email": "rohit@example.com"
    }'
  ```

  ### 4.3 Request Invitation (Non-Affiliate)
  ```bash
  # Request invitation for non-affiliate
  curl -X POST http://localhost:4000/api/affiliate/request-invitation \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543222",
      "otp": "654321",
      "name": "Virat Kohli",
      "email": "virat@example.com",
      "reason": "Professional cricket player seeking to join KIBI Sports platform",
      "sportsCategory": "Cricket",
      "experience": "15 years of professional cricket"
    }'
  ```

  ### 4.4 Affiliate Login
  ```bash
  # Login as Affiliate
  curl -X POST http://localhost:4000/api/affiliate/login \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543221",
      "password": "securePassword123"
    }'
  ```

  ### 4.5 Get Affiliate Profile
  ```bash
  # Get affiliate profile
  curl -X GET http://localhost:4000/api/affiliate/profile \
    -H "Authorization: Bearer <AFFILIATE_JWT_TOKEN>"
  ```

---

## 5. Testing Redis Caching

  ### 5.1 Test OTP Caching
  ```bash
  # 1. Request OTP (should cache for 5 minutes)
  curl -X POST http://localhost:4000/api/affiliate/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "+919876543223"}'

  # 2. Request OTP again immediately (should return cached OTP)
  curl -X POST http://localhost:4000/api/affiliate/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "+919876543223"}'

  # 3. Verify OTP (should invalidate cache)
  curl -X POST http://localhost:4000/api/affiliate/verify-otp-signup \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543223",
      "otp": "CACHED_OTP_VALUE",
      "invitationCode": "INV123456789",
      "password": "testPassword123"
    }'
  ```

  ### 5.2 Test JWT Caching
  ```bash
  # 1. Login (should cache JWT for 1 hour)
  curl -X POST http://localhost:4000/api/super-admin/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@kibi.com",
      "password": "admin123"
    }'

  # 2. Login again immediately (should return cached JWT)
  curl -X POST http://localhost:4000/api/super-admin/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@kibi.com",
      "password": "admin123"
    }'
  ```

---

## 6. Complete Testing Flow

  ### Flow 1: Super Admin → Organization → Affiliate (With Invitation)
  ```bash
  # Step 1: Super Admin Login
  curl -X POST http://localhost:4000/api/super-admin/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@kibi.com", "password": "admin123"}'

  # Step 2: Create Organization
  curl -X POST http://localhost:4000/api/super-admin/organizations \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
    -d '{
      "name": "Test Sports Club",
      "email": "admin@testclub.com",
      "phone": "+919876543200",
      "password": "clubPassword123"
    }'

  # Step 3: Approve Organization
  curl -X PUT http://localhost:4000/api/super-admin/organizations/3/status \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
    -d '{"status": "APPROVED"}'

  # Step 4: Organization Login
  curl -X POST http://localhost:4000/api/organization/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@testclub.com", "password": "clubPassword123"}'

  # Step 5: Add Affiliate
  curl -X POST http://localhost:4000/api/organization/affiliates \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543201",
      "role": "Player"
    }'

  # Step 6: Send Invitation
  curl -X POST http://localhost:4000/api/organization/affiliates/1/invite \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>"

  # Step 7: Request OTP
  curl -X POST http://localhost:4000/api/affiliate/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "+919876543201"}'

  # Step 8: Affiliate Signup
  curl -X POST http://localhost:4000/api/affiliate/verify-otp-signup \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543201",
      "otp": "123456",
      "invitationCode": "RECEIVED_INVITATION_CODE",
      "password": "affiliatePassword123",
      "name": "John Doe",
      "email": "john@example.com"
    }'
  ```

  ### Flow 2: Non-Affiliate Request → Approval → Signup
  ```bash
  # Step 1: Request OTP
  curl -X POST http://localhost:4000/api/affiliate/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "+919876543202"}'

  # Step 2: Request Invitation
  curl -X POST http://localhost:4000/api/affiliate/request-invitation \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543202",
      "otp": "123456",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "reason": "Professional athlete seeking platform access"
    }'

  # Step 3: Super Admin Approve Request
  curl -X PUT http://localhost:4000/api/super-admin/non-affiliate-requests/1/approve \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
    -d '{"comments": "Approved after verification"}'

  # Step 4: Request OTP Again
  curl -X POST http://localhost:4000/api/affiliate/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "+919876543202"}'

  # Step 5: Signup with Approved Invitation
  curl -X POST http://localhost:4000/api/affiliate/verify-otp-signup \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543202",
      "otp": "654321",
      "invitationCode": "APPROVED_INVITATION_CODE",
      "password": "janePassword123",
      "name": "Jane Smith",
      "email": "jane@example.com"
    }'
  ```

---

## 7. Error Testing

  ### Test Invalid Requests
  ```bash
  # Invalid email format
  curl -X POST http://localhost:4000/api/super-admin/login \
    -H "Content-Type: application/json" \
    -d '{"email": "invalid-email", "password": "admin123"}'

  # Missing required fields
  curl -X POST http://localhost:4000/api/organization/affiliates \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{"name": "Test User"}'

  # Invalid phone format
  curl -X POST http://localhost:4000/api/affiliate/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "invalid-phone"}'

  # Expired/Invalid OTP
  curl -X POST http://localhost:4000/api/affiliate/verify-otp-signup \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+919876543203",
      "otp": "000000",
      "invitationCode": "INV123456789",
      "password": "testPassword123",
      "name": "Test User",
      "email": "test@example.com"
    }'
  ```

  ---

## Notes

1. **JWT Tokens**: Save tokens from login responses and use them in subsequent requests
2. **OTP Values**: Check server logs for OTP values in development (mock SMS service)
3. **Invitation Codes**: Get invitation codes from organization invite responses
4. **Redis Caching**: Monitor server logs to see cache hit/miss operations
5. **Database**: Check PostgreSQL for data persistence
6. **Error Handling**: All endpoints return consistent error response format

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/kibi_affiliate_onboarding

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-password

# SMS (Optional)
FAST2SMS_API_KEY=your-fast2sms-api-key
SENDER_ID=KIBISP
```
