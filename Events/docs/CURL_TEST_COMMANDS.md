# KIBI Events Microservice - Complete cURL Test Commands

This document contains comprehensive cURL commands to test all endpoints of the KIBI Events microservice.

## Prerequisites

1. Start the service: `npm run dev` (runs on port 4001)
2. Ensure PostgreSQL and Redis are running via Docker: `docker-compose up -d`
3. Replace `<JWT_TOKEN>` with actual tokens received from login responses
4. Ensure OnBoarding service is running for authentication (port 4000)

---

## 1. Health Check

```bash
# Basic health check
curl -X GET http://localhost:4001/health

# Service information
curl -X GET http://localhost:4001/
```

---

## 2. Authentication Setup (OnBoarding Service)

### 2.1 Super Admin Login (for event approval)
```bash
# Login as Super Admin (OnBoarding service)
curl -X POST http://localhost:4000/api/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kibisports.com",
    "password": "Admin@123"
  }'
```

### 2.2 Organization Login (for event management)
```bash
# Login as Organization (OnBoarding service)
curl -X POST http://localhost:4000/api/organization/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elitesports.com",
    "password": "Admin@123"
  }'
```

### 2.3 Affiliate Login (for event registration)
```bash
# Login as Affiliate (OnBoarding service)
curl -X POST http://localhost:4000/api/affiliate/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543220",
    "password": "Admin@123"
  }'
```

---

## 3. Event Management (Organization Endpoints)

### 3.1 Create Event
```bash
# Create a new event
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
  -d '{
    "name": "Annual Marathon 2024",
    "description": "City-wide marathon event for all age groups",
    "startDate": "2024-12-01T00:00:00.000Z",
    "endDate": "2024-12-01T00:00:00.000Z",
    "startTime": "06:00",
    "organizerEmail": "organizer@elitesports.com",
    "mapLink": "https://maps.google.com/location",
    "organizationId": 1,
    "participationFee": 500,
    "address": "123 Sports Street, Mumbai",
    "eventType": "State",
    "organizerPhoneNumber": "+919876543210",
    "venue": "Sports Complex",
    "organizationName": "Elite Sports Academy",
    "formId": 1,
    "imageUrl": "https://example.com/event-image.jpg"
  }'

# Create cricket tournament
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
  -d '{
    "name": "Inter-City Cricket Championship",
    "description": "Professional cricket tournament for registered teams",
    "startDate": "2024-11-15T00:00:00.000Z",
    "endDate": "2024-11-20T00:00:00.000Z",
    "startTime": "09:00",
    "organizerEmail": "cricket@elitesports.com",
    "mapLink": "https://maps.google.com/cricket-ground",
    "organizationId": 1,
    "participationFee": 2000,
    "address": "456 Cricket Ground, Mumbai",
    "eventType": "National",
    "organizerPhoneNumber": "+919876543211",
    "venue": "Elite Cricket Stadium",
    "organizationName": "Elite Sports Academy",
    "formId": 1,
    "imageUrl": "https://example.com/cricket-tournament.jpg"
  }'
```

### 3.2 Update Event
```bash
# Update event details
curl -X PUT http://localhost:4001/api/events/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
  -d '{
    "name": "Updated Annual Marathon 2024",
    "description": "Updated description for the marathon event",
    "participationFee": 600,
    "venue": "Updated Sports Complex"
  }'

# Update event with form remapping
curl -X PUT http://localhost:4001/api/events/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
  -d '{
    "name": "Marathon with New Registration Form",
    "oldFormId": 1,
    "newFormId": 2
  }'
```

### 3.3 Delete Event
```bash
# Soft delete an event
curl -X DELETE http://localhost:4001/api/events/1 \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"
```

### 3.4 Get Registered Affiliates for Event
```bash
# Get all affiliates registered for an event
curl -X GET http://localhost:4001/api/events/1/affiliates \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"
```

---

## 4. Event Approval (Super Admin Endpoints)

### 4.1 Approve Event
```bash
# Approve an event for registration
curl -X PUT http://localhost:4001/api/events/1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>" \
  -d '{
    "isApprovedByAdmin": true
  }'

# Reject/Unapprove an event
curl -X PUT http://localhost:4001/api/events/2/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>" \
  -d '{
    "isApprovedByAdmin": false
  }'
```

---

## 5. Event Registration (Affiliate Endpoints)

### 5.1 Register Affiliate for Event
```bash
# Register athlete for marathon
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AFFILIATE_JWT_TOKEN>" \
  -d '{
    "affiliate_id": 123,
    "event_id": 1,
    "form_id": 1,
    "response_data": {
      "fullName": "John Doe",
      "role": "ATHLETE",
      "age": 25,
      "emergencyContact": "+919876543210",
      "medicalConditions": "None",
      "dietaryRestrictions": "Vegetarian"
    },
    "payment_id": "pay_abc123",
    "order_id": "order_xyz789",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "01-12-2024, 10:30:00"
  }'

# Register coach for cricket tournament
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AFFILIATE_JWT_TOKEN>" \
  -d '{
    "affiliate_id": 124,
    "event_id": 2,
    "form_id": 1,
    "response_data": {
      "fullName": "Mike Johnson",
      "role": "COACH",
      "experience": "10 years",
      "specialization": "Batting Coach",
      "emergencyContact": "+919876543211",
      "certifications": ["Level 3 Coaching", "Sports Psychology"]
    },
    "payment_id": "pay_def456",
    "order_id": "order_abc123",
    "amount_paid": 2000,
    "payment_status": "captured",
    "payment_time": "15-11-2024, 14:45:30"
  }'

# Register sports staff for event
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AFFILIATE_JWT_TOKEN>" \
  -d '{
    "affiliate_id": 125,
    "event_id": 1,
    "form_id": 1,
    "response_data": {
      "fullName": "Sarah Wilson",
      "role": "SPORTS STAFF",
      "department": "Event Management",
      "responsibilities": "Registration and coordination",
      "emergencyContact": "+919876543212"
    },
    "payment_id": "pay_ghi789",
    "order_id": "order_def456",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "01-12-2024, 09:15:45"
  }'
```

---

## 6. Public Event Queries

### 6.1 Get All Events (Public)
```bash
# Get all approved events
curl -X GET http://localhost:4001/api/events

# Get events with pagination and filters
curl -X GET "http://localhost:4001/api/events?isApprovedByAdmin=true&eventType=State&limit=10"

# Filter by organization
curl -X GET "http://localhost:4001/api/events?organizationId=1&isApprovedByAdmin=true"

# Search by name
curl -X GET "http://localhost:4001/api/events?name=marathon&isApprovedByAdmin=true"

# Filter by venue
curl -X GET "http://localhost:4001/api/events?venue=Sports%20Complex"

# Filter by participation fee
curl -X GET "http://localhost:4001/api/events?participationFee=500"

# Filter by event type
curl -X GET "http://localhost:4001/api/events?eventType=National"

# Get all events including deleted (admin view)
curl -X GET "http://localhost:4001/api/events?deleted=true"

# Complex filter combination
curl -X GET "http://localhost:4001/api/events?organizationName=Elite&eventType=State&isApprovedByAdmin=true"
```

### 6.2 Get Events by Organization (Organization Protected)
```bash
# Get all events for a specific organization
curl -X GET http://localhost:4001/api/events/organization/1 \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Get events with pagination
curl -X GET "http://localhost:4001/api/events/organization/1?page=1&limit=5" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Filter by event type
curl -X GET "http://localhost:4001/api/events/organization/1?eventType=State" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Filter by approval status
curl -X GET "http://localhost:4001/api/events/organization/1?isApprovedByAdmin=true" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Search by event name
curl -X GET "http://localhost:4001/api/events/organization/1?name=marathon" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Filter by venue
curl -X GET "http://localhost:4001/api/events/organization/1?venue=Sports%20Complex" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Complex filter combination
curl -X GET "http://localhost:4001/api/events/organization/1?eventType=State&isApprovedByAdmin=true&page=1&limit=10" \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Get events for organization that doesn't exist (404 test)
curl -X GET http://localhost:4001/api/events/organization/999 \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Get events for organization with no events
curl -X GET http://localhost:4001/api/events/organization/2 \
  -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

# Test cross-organization access (should fail with 403)
curl -X GET http://localhost:4001/api/events/organization/2 \
  -H "Authorization: Bearer <ORGANIZATION_1_JWT_TOKEN>"
```

---

## 7. Complete Testing Flows

### Flow 1: Organization Creates Event → Admin Approves → Affiliate Registers
```bash
# Step 1: Organization login
curl -X POST http://localhost:4000/api/organization/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@elitesports.com", "password": "password123"}'

# Step 2: Create event
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
  -d '{
    "name": "Test Marathon 2024",
    "description": "Test marathon event",
    "startDate": "2024-12-01T00:00:00.000Z",
    "endDate": "2024-12-01T00:00:00.000Z",
    "startTime": "06:00",
    "organizerEmail": "test@elitesports.com",
    "organizationId": 1,
    "participationFee": 300,
    "address": "Test Address",
    "eventType": "District",
    "organizerPhoneNumber": "+919876543210",
    "venue": "Test Venue",
    "organizationName": "Elite Sports Academy",
    "formId": 1
  }'

# Step 3: Super admin login
curl -X POST http://localhost:4000/api/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@kibisports.com", "password": "admin123"}'

# Step 4: Approve event
curl -X PUT http://localhost:4001/api/events/1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -d '{"isApprovedByAdmin": true}'

# Step 5: Affiliate login
curl -X POST http://localhost:4000/api/affiliate/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543220", "password": "mypassword123"}'

# Step 6: Register for event
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AFFILIATE_TOKEN>" \
  -d '{
    "affiliate_id": 123,
    "event_id": 1,
    "form_id": 1,
    "response_data": {"fullName": "Test User", "role": "ATHLETE"},
    "payment_id": "pay_test123",
    "order_id": "order_test123",
    "amount_paid": 300,
    "payment_status": "captured",
    "payment_time": "01-12-2024, 10:00:00"
  }'

# Step 7: Organization views registrations
curl -X GET http://localhost:4001/api/events/1/affiliates \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>"
```

### Flow 2: Multiple Affiliate Types Registration
```bash
# Register different types of affiliates for the same event

# Athlete registration
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ATHLETE_TOKEN>" \
  -d '{
    "affiliate_id": 101,
    "event_id": 1,
    "form_id": 1,
    "response_data": {"fullName": "Athlete One", "role": "ATHLETE", "category": "Senior"},
    "payment_id": "pay_athlete01",
    "order_id": "order_athlete01",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "01-12-2024, 08:00:00"
  }'

# Coach registration
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <COACH_TOKEN>" \
  -d '{
    "affiliate_id": 102,
    "event_id": 1,
    "form_id": 1,
    "response_data": {"fullName": "Coach One", "role": "COACH", "specialization": "Endurance"},
    "payment_id": "pay_coach01",
    "order_id": "order_coach01",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "01-12-2024, 09:00:00"
  }'

# Nutritionist registration
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <NUTRITIONIST_TOKEN>" \
  -d '{
    "affiliate_id": 103,
    "event_id": 1,
    "form_id": 1,
    "response_data": {"fullName": "Nutritionist One", "role": "NUTRITIONIST", "certification": "Sports Nutrition"},
    "payment_id": "pay_nutri01",
    "order_id": "order_nutri01",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "01-12-2024, 10:00:00"
  }'
```

---

## 8. Error Testing

### 8.1 Authentication Errors
```bash
# No authorization header
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Event"}'

# Invalid token
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -d '{"name": "Test Event"}'

# Wrong user type (affiliate trying to create event)
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AFFILIATE_TOKEN>" \
  -d '{"name": "Test Event"}'

# Cross-organization access attempt (should return 403)
curl -X GET http://localhost:4001/api/events/organization/2 \
  -H "Authorization: Bearer <ORGANIZATION_1_JWT_TOKEN>"
```

### 8.2 Validation Errors
```bash
# Missing required fields
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
  -d '{"name": "Incomplete Event"}'

# Invalid date format
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
  -d '{
    "name": "Invalid Date Event",
    "startDate": "invalid-date",
    "endDate": "2024-12-01T00:00:00.000Z"
  }'

# Invalid event type
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
  -d '{
    "name": "Invalid Type Event",
    "eventType": "InvalidType"
  }'
```

### 8.3 Business Logic Errors
```bash
# Duplicate event name in same organization
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
  -d '{
    "name": "Annual Marathon 2024",
    "description": "Duplicate event name test"
  }'

# Register for non-approved event
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AFFILIATE_TOKEN>" \
  -d '{
    "affiliate_id": 123,
    "event_id": 999,
    "form_id": 1,
    "response_data": {"fullName": "Test User"},
    "payment_id": "pay_test",
    "order_id": "order_test",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "01-12-2024, 10:00:00"
  }'

# Duplicate registration
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AFFILIATE_TOKEN>" \
  -d '{
    "affiliate_id": 123,
    "event_id": 1,
    "form_id": 1,
    "response_data": {"fullName": "Duplicate Registration"},
    "payment_id": "pay_duplicate",
    "order_id": "order_duplicate",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "01-12-2024, 11:00:00"
  }'

# Invalid payment time format
curl -X POST http://localhost:4001/api/events/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AFFILIATE_TOKEN>" \
  -d '{
    "affiliate_id": 124,
    "event_id": 1,
    "form_id": 1,
    "response_data": {"fullName": "Invalid Payment Time"},
    "payment_id": "pay_invalid",
    "order_id": "order_invalid",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "invalid-time-format"
  }'
```

---

## 9. Forms Management (Organization Endpoints)

  ### 9.1 Create Form
  ```bash
  # Create Individual Play form (Marathon Registration)
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "formName": "Marathon Registration Form 2024",
      "header": "Complete this form to register for our marathon events. Please provide accurate information for safety and emergency purposes.",
      "form_values": {
        "fields": [
          {
            "id": "fullName",
            "label": "Full Name",
            "type": "text",
            "required": true,
            "placeholder": "Enter your full name"
          },
          {
            "id": "age",
            "label": "Age",
            "type": "number",
            "required": true,
            "min": 16,
            "max": 80
          },
          {
            "id": "gender",
            "label": "Gender",
            "type": "select",
            "required": true,
            "options": ["Male", "Female", "Other"]
          },
          {
            "id": "emergencyContact",
            "label": "Emergency Contact Number",
            "type": "tel",
            "required": true,
            "placeholder": "+91XXXXXXXXXX"
          },
          {
            "id": "medicalConditions",
            "label": "Medical Conditions",
            "type": "textarea",
            "required": false,
            "placeholder": "Any medical conditions we should be aware of"
          }
        ]
      },
      "type": "Individual Play",
      "minPlayers": 1,
      "maxPlayers": 1
    }'

  # Create Team Sports form (Cricket Tournament)
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "formName": "Cricket Tournament Registration",
      "header": "Team registration for cricket tournaments. Please provide complete team details.",
      "organizationId": 1,
      "form_values": {
        "fields": [
          {
            "id": "teamName",
            "label": "Team Name",
            "type": "text",
            "required": true
          },
          {
            "id": "captainName",
            "label": "Team Captain Name",
            "type": "text",
            "required": true
          },
          {
            "id": "captainContact",
            "label": "Captain Contact Number",
            "type": "tel",
            "required": true
          },
          {
            "id": "teamCategory",
            "label": "Team Category",
            "type": "select",
            "required": true,
            "options": ["Under-16", "Under-19", "Senior", "Veterans (35+)"]
          },
          {
            "id": "players",
            "label": "Player Details",
            "type": "textarea",
            "required": true,
            "placeholder": "List all 15 players with their names and ages (one per line)"
          }
        ]
      },
      "type": "Team Sports",
      "minPlayers": 11,
      "maxPlayers": 15
    }'

  # Create Multi-Sport Event form
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "formName": "Multi-Sport Event Registration",
      "header": "General registration form for multi-sport events and competitions.",
      "organizationId": 1,
      "form_values": {
        "fields": [
          {
            "id": "participantName",
            "label": "Participant Name",
            "type": "text",
            "required": true
          },
          {
            "id": "role",
            "label": "Participation Role",
            "type": "select",
            "required": true,
            "options": ["Athlete", "Coach", "Sports Staff", "Nutritionist", "Physiotherapist", "Sports Journalist", "Volunteer"]
          },
          {
            "id": "primarySport",
            "label": "Primary Sport",
            "type": "select",
            "required": true,
            "options": ["Cricket", "Football", "Tennis", "Badminton", "Swimming", "Athletics", "Basketball", "Volleyball", "Hockey", "Other"]
          },
          {
            "id": "experience",
            "label": "Experience Level",
            "type": "select",
            "required": true,
            "options": ["Beginner (0-2 years)", "Intermediate (3-5 years)", "Advanced (6-10 years)", "Professional (10+ years)"]
          },
          {
            "id": "emergencyContact",
            "label": "Emergency Contact",
            "type": "tel",
            "required": true
          }
        ]
      },
      "type": "Individual Play",
      "minPlayers": 1,
      "maxPlayers": 1
    }'
  ```

  ### 9.2 Update Form
  ```bash
  # Update form details
  curl -X PUT http://localhost:4001/api/forms/1 \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "formName": "Updated Marathon Registration Form 2024",
      "header": "Updated registration form with enhanced safety requirements.",
      "form_values": {
        "fields": [
          {
            "id": "fullName",
            "label": "Full Name",
            "type": "text",
            "required": true,
            "placeholder": "Enter your complete legal name"
          },
          {
            "id": "age",
            "label": "Age",
            "type": "number",
            "required": true,
            "min": 18,
            "max": 75
          },
          {
            "id": "emergencyContact",
            "label": "Emergency Contact Number",
            "type": "tel",
            "required": true,
            "placeholder": "+91XXXXXXXXXX"
          },
          {
            "id": "medicalClearance",
            "label": "Medical Clearance Certificate",
            "type": "checkbox",
            "required": true,
            "options": ["I have a valid medical clearance certificate"]
          }
        ]
      }
    }'

  # Update only form name and header
  curl -X PUT http://localhost:4001/api/forms/2 \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>" \
    -d '{
      "formName": "Premier Cricket Championship Registration",
      "header": "Elite cricket tournament registration - Professional teams only."
    }'
  ```

  ### 9.3 Delete Form
  ```bash
  # Delete a form (will fail if used by active events)
  curl -X DELETE http://localhost:4001/api/forms/3 \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"

  # Delete unused form
  curl -X DELETE http://localhost:4001/api/forms/4 \
    -H "Authorization: Bearer <ORGANIZATION_JWT_TOKEN>"
  ```

  ---

## 10. Public Forms Queries

  ### 10.1 Get All Forms (Public)
  ```bash
  # Get all forms
  curl -X GET http://localhost:4001/api/forms

  # Get forms with pagination
  curl -X GET "http://localhost:4001/api/forms?page=1&limit=5"

  # Filter by organization
  curl -X GET "http://localhost:4001/api/forms?organizationId=1"

  # Filter by form type
  curl -X GET "http://localhost:4001/api/forms?type=Team%20Sports"

  # Complex filter combination
  curl -X GET "http://localhost:4001/api/forms?organizationId=1&type=Individual%20Play&page=1&limit=10"
  ```

  ### 10.2 Get Form by ID (Public)
  ```bash
  # Get specific form details
  curl -X GET http://localhost:4001/api/forms/1

  # Get form that doesn't exist (404 test)
  curl -X GET http://localhost:4001/api/forms/999
  ```

  ### 10.3 Get Organization Forms (Public)
```bash
# Get all forms for a specific organization
curl -X GET http://localhost:4001/api/forms/organization/1

# Get forms for organization that doesn't exist
curl -X GET http://localhost:4001/api/forms/organization/999
```

---

## 11. Complete Forms Testing Flows

  ### Flow 1: Organization Creates Form → Uses in Event → Tries to Delete
  ```bash
  # Step 1: Organization login
  curl -X POST http://localhost:4000/api/organization/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@elitesports.com", "password": "Admin@123"}'

  # Step 2: Create form
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "formName": "Test Event Form",
      "header": "Test form for event creation",
      "organizationId": 1,
      "form_values": {
        "fields": [
          {
            "id": "name",
            "label": "Name",
            "type": "text",
            "required": true
          }
        ]
      },
      "type": "Individual Play",
      "minPlayers": 1,
      "maxPlayers": 1
    }'

  # Step 3: Create event using the form
  curl -X POST http://localhost:4001/api/events \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "name": "Test Event with Form",
      "description": "Event using the test form",
      "startDate": "2024-12-01T00:00:00.000Z",
      "endDate": "2024-12-01T00:00:00.000Z",
      "startTime": "10:00",
      "organizerEmail": "test@elitesports.com",
      "organizationId": 1,
      "participationFee": 100,
      "address": "Test Address",
      "eventType": "District",
      "organizerPhoneNumber": "+919876543210",
      "venue": "Test Venue",
      "organizationName": "Elite Sports Academy",
      "formId": 1,
      "imageUrl": "https://example.com/test.jpg"
    }'

  # Step 4: Try to delete form (should fail)
  curl -X DELETE http://localhost:4001/api/forms/1 \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>"

  # Step 5: Delete event first
  curl -X DELETE http://localhost:4001/api/events/1 \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>"

  # Step 6: Now delete form (should succeed)
  curl -X DELETE http://localhost:4001/api/forms/1 \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>"
  ```

  ### Flow 2: Create Multiple Form Types and Test Validation
  ```bash
  # Create Individual Play form with validation
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "formName": "Swimming Competition Form",
      "header": "Individual swimming competition registration",
      "organizationId": 1,
      "form_values": {
        "fields": [
          {
            "id": "swimmerName",
            "label": "Swimmer Name",
            "type": "text",
            "required": true
          },
          {
            "id": "events",
            "label": "Swimming Events",
            "type": "checkbox",
            "required": true,
            "options": ["50m Freestyle", "100m Freestyle", "50m Backstroke", "100m Breaststroke"]
          }
        ]
      },
      "type": "Individual Play",
      "minPlayers": 1,
      "maxPlayers": 1
    }'

  # Create Team Sports form with proper min/max players
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "formName": "Football Tournament Registration",
      "header": "Team registration for football tournaments",
      "organizationId": 1,
      "form_values": {
        "fields": [
          {
            "id": "teamName",
            "label": "Team Name",
            "type": "text",
            "required": true
          },
          {
            "id": "squadList",
            "label": "Squad List",
            "type": "textarea",
            "required": true,
            "placeholder": "List all players (max 22)"
          }
        ]
      },
      "type": "Team Sports",
      "minPlayers": 11,
      "maxPlayers": 22
    }'
```

---

## 12. Forms Error Testing

  ### 12.1 Authentication Errors
  ```bash
  # No authorization header for protected endpoints
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -d '{"formName": "Test Form"}'

  # Invalid token
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid_token" \
    -d '{"formName": "Test Form"}'

  # Wrong user type (affiliate trying to create form)
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <AFFILIATE_TOKEN>" \
    -d '{"formName": "Test Form"}'
  ```

  ### 12.2 Validation Errors
  ```bash
  # Missing required fields
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{"formName": "Incomplete Form"}'

  # Invalid form type
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "formName": "Invalid Type Form",
      "header": "Test header",
      "organizationId": 1,
      "form_values": {"fields": []},
      "type": "InvalidType"
    }'

  # Team Sports without min/max players
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "formName": "Team Form Without Players",
      "header": "Test header",
      "organizationId": 1,
      "form_values": {"fields": [{"id": "test", "label": "Test", "type": "text", "required": true}]},
      "type": "Team Sports"
    }'

  # Invalid minPlayers > maxPlayers
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "formName": "Invalid Player Range",
      "header": "Test header",
      "organizationId": 1,
      "form_values": {"fields": [{"id": "test", "label": "Test", "type": "text", "required": true}]},
      "type": "Team Sports",
      "minPlayers": 15,
      "maxPlayers": 10
    }'

  # Empty form fields array
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "formName": "Empty Fields Form",
      "header": "Test header",
      "organizationId": 1,
      "form_values": {"fields": []},
      "type": "Individual Play"
    }'

  # Invalid field type
  curl -X POST http://localhost:4001/api/forms \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
    -d '{
      "formName": "Invalid Field Type",
      "header": "Test header",
      "organizationId": 1,
      "form_values": {
        "fields": [
          {
            "id": "test",
            "label": "Test",
            "type": "invalid_type",
            "required": true
          }
        ]
      },
      "type": "Individual Play"
    }'
```

### 12.3 Business Logic Errors
```bash
# Duplicate form name in same organization
curl -X POST http://localhost:4001/api/forms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
  -d '{
    "formName": "Marathon Registration Form 2024",
    "header": "Duplicate form name test",
    "organizationId": 1,
    "form_values": {"fields": [{"id": "test", "label": "Test", "type": "text", "required": true}]},
    "type": "Individual Play"
  }'

# Non-existent organization
curl -X POST http://localhost:4001/api/forms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
  -d '{
    "formName": "Form for Non-existent Org",
    "header": "Test header",
    "organizationId": 999,
    "form_values": {"fields": [{"id": "test", "label": "Test", "type": "text", "required": true}]},
    "type": "Individual Play"
  }'

# Try to delete form used by active event
curl -X DELETE http://localhost:4001/api/forms/1 \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>"

# Update non-existent form
curl -X PUT http://localhost:4001/api/forms/999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
  -d '{"formName": "Updated Non-existent Form"}'
```

---

## 13. Performance Testing

  ### 13.1 Bulk Event Queries
  ```bash
  # Test pagination with large datasets
  for i in {1..10}; do
    curl -X GET "http://localhost:4001/api/events?page=$i&limit=50" &
  done
  wait

  # Test concurrent registrations
  for i in {1..5}; do
    curl -X POST http://localhost:4001/api/events/register \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <AFFILIATE_TOKEN>" \
      -d "{
        \"affiliate_id\": $((100 + i)),
        \"event_id\": 1,
        \"form_id\": 1,
        \"response_data\": {\"fullName\": \"Concurrent User $i\"},
        \"payment_id\": \"pay_concurrent$i\",
        \"order_id\": \"order_concurrent$i\",
        \"amount_paid\": 500,
        \"payment_status\": \"captured\",
        \"payment_time\": \"01-12-2024, 10:0$i:00\"
      }" &
  done
  wait

  ### 13.2 Bulk Forms Testing
  ```bash
  # Test concurrent form creation
  for i in {1..5}; do
    curl -X POST http://localhost:4001/api/forms \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <ORGANIZATION_TOKEN>" \
      -d "{
        \"formName\": \"Concurrent Form $i\",
        \"header\": \"Test form created concurrently\",
        \"organizationId\": 1,
        \"form_values\": {
          \"fields\": [
            {
              \"id\": \"name$i\",
              \"label\": \"Name $i\",
              \"type\": \"text\",
              \"required\": true
            }
          ]
        },
        \"type\": \"Individual Play\",
        \"minPlayers\": 1,
        \"maxPlayers\": 1
      }" &
  done
  wait

  # Test forms pagination performance
  for i in {1..10}; do
    curl -X GET "http://localhost:4001/api/forms?page=$i&limit=20" &
  done
  wait

  # Test organization forms queries
  for i in {1..5}; do
    curl -X GET "http://localhost:4001/api/forms/organization/1" &
  done
  wait
  ```

---

## Notes

1. **JWT Tokens**: Save tokens from OnBoarding service login responses
2. **Event IDs**: Use actual event IDs returned from create event responses
3. **Affiliate IDs**: Use valid affiliate IDs from OnBoarding service
4. **Form IDs**: Ensure form IDs exist and belong to the organization
5. **Payment Time Format**: Must be "dd-MM-yyyy, HH:mm:ss"
6. **Event Types**: International, National, State, League, District
7. **Affiliate Roles**: ATHLETE, COACH, SPORTS STAFF, NUTRITIONIST, PHYSIOTHERAPIST, PSYCHOLOGIST, SPORTS JOURNALIST, SPORTS MANAGEMENT PROFESSIONAL
8. **Form Types**: Team Sports, Individual Play
9. **Form Field Types**: text, number, email, tel, textarea, select, checkbox, radio, date
10. **Team Sports Requirements**: Must have minPlayers and maxPlayers defined

## Environment Variables Required

```bash
# Database (shared with OnBoarding)
DATABASE_URL=postgresql://username:password@localhost:5432/kibi_common_db

# JWT (same secret as OnBoarding service)
JWT_SECRET=your-super-secret-jwt-key

# Redis (shared with OnBoarding)
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-password

# Service Port
PORT=4001
```

## Service Dependencies

- **OnBoarding Service**: Required for authentication (port 4000)
- **PostgreSQL**: Shared database with OnBoarding service
- **Redis**: Shared cache with OnBoarding service for JWT tokens
