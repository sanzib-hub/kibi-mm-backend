# KIBI BrandCampaign Service - cURL Test Commands

This document provides comprehensive cURL commands for testing all endpoints of the KIBI BrandCampaign microservice.

## Prerequisites

1. **Service Running**: Ensure the BrandCampaign service is running on port 4002
2. **Database Setup**: PostgreSQL with unified schema initialized
3. **Redis Running**: Redis server for JWT caching
4. **Authentication Tokens**: Valid JWT tokens for different user types

## Base URL
```bash
BASE_URL="http://localhost:4002"
```

## Authentication Setup

### Get Super Admin Token (from OnBoarding service)
```bash
# Login as Super Admin
curl -X POST http://localhost:4000/api/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kibisports.com",
    "password": "admin123"
  }'

# Save the token
ADMIN_TOKEN="your_admin_jwt_token_here"
```

### Get Affiliate Token (from OnBoarding service)
```bash
# Login as Affiliate
curl -X POST http://localhost:4000/api/affiliate/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "password": "affiliate123"
  }'

# Save the token
AFFILIATE_TOKEN="your_affiliate_jwt_token_here"
```

---

## 1. Health Check & Service Info

### Service Information
```bash
curl -X GET $BASE_URL/
```

### Health Check
```bash
curl -X GET $BASE_URL/health
```

---

## 2. Campaign Management (Admin Only)

### Create Campaign
```bash
curl -X POST $BASE_URL/api/campaigns \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logo": "https://example.com/nike-logo.png",
    "description": "Nike is looking for talented athletes to promote our new running shoe line. Join our campaign and showcase your athletic prowess while representing one of the world'\''s leading sports brands.",
    "brandName": "Nike",
    "product": "Air Max Running Shoes",
    "sportsCategory": "Running",
    "ageRange": "18-35",
    "gender": "OTHER",
    "geography": "India",
    "followersRange": "1K-10K",
    "dealType": "PAID",
    "deliverables": "3 Instagram posts, 2 Instagram stories, 1 YouTube video review",
    "budget": "₹50,000",
    "active": true
  }'
```

### Create Multiple Test Campaigns
```bash
# Adidas Campaign
curl -X POST $BASE_URL/api/campaigns \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logo": "https://example.com/adidas-logo.png",
    "description": "Adidas seeks passionate football players to represent our latest cleat collection.",
    "brandName": "Adidas",
    "product": "Predator Football Cleats",
    "sportsCategory": "Football",
    "ageRange": "16-30",
    "gender": "MALE",
    "geography": "Mumbai, Delhi",
    "followersRange": "5K-50K",
    "dealType": "BARTER",
    "deliverables": "2 Instagram posts, 5 Instagram stories, product review",
    "budget": "₹25,000"
  }'

# Red Bull Campaign
curl -X POST $BASE_URL/api/campaigns \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Red Bull energy drink campaign for extreme sports athletes.",
    "brandName": "Red Bull",
    "product": "Energy Drink",
    "sportsCategory": "Extreme Sports",
    "ageRange": "20-40",
    "gender": "OTHER",
    "geography": "Pan India",
    "followersRange": "10K+",
    "dealType": "HYBRID",
    "deliverables": "Event participation, social media content, brand ambassador role",
    "budget": "₹1,00,000"
  }'
```

### Update Campaign
```bash
# Update campaign with ID 1
curl -X PUT $BASE_URL/api/campaigns/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": "₹75,000",
    "deliverables": "4 Instagram posts, 3 Instagram stories, 1 YouTube video review, 1 blog post",
    "active": true
  }'
```

### Delete Campaign
```bash
# Soft delete campaign with ID 3
curl -X DELETE $BASE_URL/api/campaigns/3 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 3. Campaign Retrieval (Public/Authenticated)

### Get All Campaigns (Basic Pagination)
```bash
curl -X GET $BASE_URL/api/campaigns \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"
```

### Get Campaigns with Pagination
```bash
curl -X GET "$BASE_URL/api/campaigns?page=1&limit=5" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"
```

### Get Campaigns with Filters
```bash
# Filter by brand name
curl -X GET "$BASE_URL/api/campaigns?brandName=Nike" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Filter by sports category
curl -X GET "$BASE_URL/api/campaigns?sportsCategory=Running" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Filter by gender
curl -X GET "$BASE_URL/api/campaigns?gender=MALE" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Filter by deal type
curl -X GET "$BASE_URL/api/campaigns?dealType=PAID" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Multiple filters
curl -X GET "$BASE_URL/api/campaigns?sportsCategory=Football&gender=MALE&dealType=BARTER&page=1&limit=10" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Filter by geography
curl -X GET "$BASE_URL/api/campaigns?geography=Mumbai" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Filter by followers range
curl -X GET "$BASE_URL/api/campaigns?followersRange=5K-50K" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Filter by age range
curl -X GET "$BASE_URL/api/campaigns?ageRange=18-35" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Filter by active status
curl -X GET "$BASE_URL/api/campaigns?active=true" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"
```

### Get Campaign by ID
```bash
curl -X GET $BASE_URL/api/campaigns/1 \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"
```

### Get Active Campaigns Only
```bash
curl -X GET $BASE_URL/api/campaigns/active \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"
```

### Get Sports Categories
```bash
curl -X GET $BASE_URL/api/campaigns/sports-categories \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"
```

---

## 4. Campaign Registration (Affiliate Only)

### Register Affiliate for Campaign
```bash
curl -X POST $BASE_URL/api/campaigns/register \
  -H "Authorization: Bearer $AFFILIATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "affiliate_id": 1,
    "status": "REGISTERED",
    "additionalData": {
      "portfolioUrl": "https://instagram.com/athlete_profile",
      "experience": "5 years in competitive running",
      "achievements": "State level marathon winner 2023"
    }
  }'
```

### Register Multiple Affiliates
```bash
# Register affiliate 2 for campaign 1
curl -X POST $BASE_URL/api/campaigns/register \
  -H "Authorization: Bearer $AFFILIATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "affiliate_id": 2,
    "additionalData": {
      "portfolioUrl": "https://youtube.com/sportscoach",
      "specialization": "Running technique and nutrition"
    }
  }'

# Register affiliate 1 for campaign 2
curl -X POST $BASE_URL/api/campaigns/register \
  -H "Authorization: Bearer $AFFILIATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 2,
    "affiliate_id": 1
  }'
```

---

## 5. Registration Management (Admin Only)

### Get Campaign Registrations
```bash
# Get all registrations for campaign 1
curl -X GET $BASE_URL/api/campaigns/1/registrations \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get registrations with pagination
curl -X GET "$BASE_URL/api/campaigns/1/registrations?page=1&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Filter by status
curl -X GET "$BASE_URL/api/campaigns/1/registrations?status=REGISTERED" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Filter by specific affiliate
curl -X GET "$BASE_URL/api/campaigns/1/registrations?affiliate_id=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get Eligible Unregistered Affiliates
```bash
# Get eligible affiliates for campaign 1
curl -X GET $BASE_URL/api/campaigns/1/eligible-affiliates \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get eligible affiliates with pagination
curl -X GET "$BASE_URL/api/campaigns/1/eligible-affiliates?page=1&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get eligible affiliates with larger page size
curl -X GET "$BASE_URL/api/campaigns/1/eligible-affiliates?page=2&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Update Registration Status
```bash
# Approve registration
curl -X PUT $BASE_URL/api/campaigns/registrations/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "additionalData": {
      "approvedBy": "Admin",
      "approvalDate": "2024-01-15",
      "notes": "Excellent portfolio and experience"
    }
  }'

# Reject registration
curl -X PUT $BASE_URL/api/campaigns/registrations/2 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED",
    "additionalData": {
      "rejectionReason": "Portfolio does not match campaign requirements"
    }
  }'

# Mark as completed
curl -X PUT $BASE_URL/api/campaigns/registrations/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "additionalData": {
      "completionDate": "2024-02-15",
      "deliverables": "All content delivered successfully",
      "rating": 5
    }
  }'
```

---

## 6. Error Testing

### Authentication Errors
```bash
# No token
curl -X GET $BASE_URL/api/campaigns

# Invalid token
curl -X GET $BASE_URL/api/campaigns \
  -H "Authorization: Bearer invalid_token"

# Wrong user type (affiliate trying admin endpoint)
curl -X POST $BASE_URL/api/campaigns \
  -H "Authorization: Bearer $AFFILIATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Test Brand",
    "description": "Test campaign"
  }'
```

### Validation Errors
```bash
# Missing required fields
curl -X POST $BASE_URL/api/campaigns \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Test Brand"
  }'

# Invalid enum values
curl -X POST $BASE_URL/api/campaigns \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test campaign",
    "brandName": "Test Brand",
    "product": "Test Product",
    "sportsCategory": "Test Sport",
    "ageRange": "18-35",
    "gender": "INVALID_GENDER",
    "geography": "Test Location",
    "followersRange": "1K-10K",
    "dealType": "INVALID_DEAL_TYPE",
    "deliverables": "Test deliverables",
    "budget": "₹10,000"
  }'

# Invalid campaign ID
curl -X GET $BASE_URL/api/campaigns/invalid_id \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"
```

### Resource Not Found Errors
```bash
# Non-existent campaign
curl -X GET $BASE_URL/api/campaigns/999 \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Update non-existent campaign
curl -X PUT $BASE_URL/api/campaigns/999 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"budget": "₹50,000"}'

# Delete non-existent campaign
curl -X DELETE $BASE_URL/api/campaigns/999 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Duplicate Registration Error
```bash
# Try to register same affiliate for same campaign twice
curl -X POST $BASE_URL/api/campaigns/register \
  -H "Authorization: Bearer $AFFILIATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "affiliate_id": 1
  }'
```

---

## 7. Performance Testing

### Bulk Campaign Creation
```bash
# Create multiple campaigns for load testing
for i in {1..10}; do
  curl -X POST $BASE_URL/api/campaigns \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"description\": \"Test campaign $i for performance testing\",
      \"brandName\": \"TestBrand$i\",
      \"product\": \"TestProduct$i\",
      \"sportsCategory\": \"TestSport$i\",
      \"ageRange\": \"18-35\",
      \"gender\": \"OTHER\",
      \"geography\": \"Test Location $i\",
      \"followersRange\": \"1K-10K\",
      \"dealType\": \"PAID\",
      \"deliverables\": \"Test deliverables for campaign $i\",
      \"budget\": \"₹$(($i * 10000))\"
    }"
done
```

### Pagination Performance Test
```bash
# Test large page sizes
curl -X GET "$BASE_URL/api/campaigns?page=1&limit=100" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"

# Test deep pagination
curl -X GET "$BASE_URL/api/campaigns?page=10&limit=10" \
  -H "Authorization: Bearer $AFFILIATE_TOKEN"
```

### Concurrent Request Testing
```bash
# Run multiple requests simultaneously
for i in {1..5}; do
  curl -X GET $BASE_URL/api/campaigns/active \
    -H "Authorization: Bearer $AFFILIATE_TOKEN" &
done
wait
```

---

## 8. Data Cleanup

### Clean Test Data
```bash
# Delete test campaigns (replace IDs with actual test campaign IDs)
for id in {4..13}; do
  curl -X DELETE $BASE_URL/api/campaigns/$id \
    -H "Authorization: Bearer $ADMIN_TOKEN"
done
```

---

## 9. Integration Testing Workflow

### Complete Campaign Lifecycle Test
```bash
#!/bin/bash

echo "=== KIBI BrandCampaign Service Integration Test ==="

# 1. Create campaign
echo "1. Creating campaign..."
CAMPAIGN_RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Integration test campaign",
    "brandName": "TestBrand",
    "product": "TestProduct",
    "sportsCategory": "TestSport",
    "ageRange": "18-35",
    "gender": "OTHER",
    "geography": "Test Location",
    "followersRange": "1K-10K",
    "dealType": "PAID",
    "deliverables": "Test deliverables",
    "budget": "₹25,000"
  }')

CAMPAIGN_ID=$(echo $CAMPAIGN_RESPONSE | jq -r '.data.id')
echo "Created campaign with ID: $CAMPAIGN_ID"

# 2. Get campaign details
echo "2. Retrieving campaign details..."
curl -s -X GET $BASE_URL/api/campaigns/$CAMPAIGN_ID \
  -H "Authorization: Bearer $AFFILIATE_TOKEN" | jq

# 3. Register affiliate
echo "3. Registering affiliate for campaign..."
REGISTRATION_RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/register \
  -H "Authorization: Bearer $AFFILIATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"campaign_id\": $CAMPAIGN_ID,
    \"affiliate_id\": 1
  }")

REGISTRATION_ID=$(echo $REGISTRATION_RESPONSE | jq -r '.data.registration.id')
echo "Created registration with ID: $REGISTRATION_ID"

# 4. Get campaign registrations
echo "4. Retrieving campaign registrations..."
curl -s -X GET $BASE_URL/api/campaigns/$CAMPAIGN_ID/registrations \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# 5. Get eligible unregistered affiliates
echo "5. Retrieving eligible unregistered affiliates..."
curl -s -X GET $BASE_URL/api/campaigns/$CAMPAIGN_ID/eligible-affiliates \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# 6. Update registration status
echo "6. Approving registration..."
curl -s -X PUT $BASE_URL/api/campaigns/registrations/$REGISTRATION_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED"
  }' | jq

# 7. Update campaign
echo "7. Updating campaign..."
curl -s -X PUT $BASE_URL/api/campaigns/$CAMPAIGN_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": "₹30,000"
  }' | jq

# 8. Clean up
echo "8. Cleaning up test data..."
curl -s -X DELETE $BASE_URL/api/campaigns/$CAMPAIGN_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"

echo "=== Integration test completed ==="
```

---

## Notes

1. **Token Expiry**: JWT tokens expire after 7 days. Refresh tokens as needed.
2. **Rate Limiting**: Service includes rate limiting. Avoid excessive concurrent requests.
3. **Database State**: Some tests depend on existing data. Ensure proper test data setup.
4. **Error Handling**: All endpoints return consistent error format with success/failure indicators.
5. **Pagination**: Default page size is 10, maximum is 100 per request.
6. **Soft Deletes**: Deleted campaigns are not permanently removed, just marked as deleted.

## Troubleshooting

- **Connection Refused**: Ensure service is running on port 4002
- **Database Errors**: Check PostgreSQL connection and schema initialization
- **Redis Errors**: Verify Redis server is running for JWT caching
- **Authentication Failures**: Ensure valid JWT tokens from OnBoarding service
- **Validation Errors**: Check request body format and required fields
