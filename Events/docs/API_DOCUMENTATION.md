# KIBI Events Microservice API Documentation

## Overview
The KIBI Events Microservice handles event management and affiliate registrations for the KIBI Sports Platform. This service provides comprehensive event lifecycle management including creation, updates, affiliate registration, and administrative controls.

## Base URL
```
http://localhost:4001
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## User Types
- **ORGANIZATION**: Sports organizations that create and manage events
- **AFFILIATE**: All sports professionals (athletes, coaches, staff, etc.) who register for events
- **ATHLETE**: Legacy user type, now handled as AFFILIATE
- **SUPER_ADMIN**: System administrators who approve events

---

## Endpoints

### Health Check

#### GET /
Get service information
- **Authentication**: None required
- **Response**: Service metadata

#### GET /health
Health check endpoint
- **Authentication**: None required
- **Response**: Service health status

---

### Events Management

#### GET /api/events
Retrieve all events with optional filtering

**Authentication**: None required (public endpoint)

**Query Parameters**:
- `name` (string): Filter by event name (partial match)
- `organizationId` (number): Filter by organization ID
- `participationFee` (number): Filter by participation fee
- `organizerPhoneNumber` (string): Filter by organizer phone
- `venue` (string): Filter by venue (partial match)
- `organizationName` (string): Filter by organization name (partial match)
- `address` (string): Filter by address (partial match)
- `isApprovedByAdmin` (boolean): Filter by admin approval status
- `deleted` (boolean): Include deleted events (default: false)
- `eventType` (string): Filter by event type (International, National, State, League, District)

**Response**:
```json
{
  "success": true,
  "message": "Events fetched successfully",
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Annual Marathon 2024",
      "description": "City-wide marathon event",
      "startDate": "2024-12-01",
      "endDate": "2024-12-01",
      "startTime": "06:00",
      "participationFee": 500,
      "venue": "Sports Complex",
      "address": "123 Sports Street, City",
      "mapLink": "https://maps.google.com/location",
      "organizerEmail": "organizer@club.com",
      "organizationName": "City Sports Club",
      "organizationId": 1,
      "organizerPhoneNumber": "+919876543210",
      "imageUrl": "https://example.com/event-image.jpg",
      "isApprovedByAdmin": true,
      "deleted": false,
      "eventType": "State",
      "formId": 1
    }
  ]
}
```

#### POST /api/events
Create a new event

**Authentication**: Organization only

**Request Body**:
```json
{
  "name": "Annual Marathon 2024",
  "description": "City-wide marathon event for all age groups",
  "startDate": "2024-12-01T00:00:00.000Z",
  "endDate": "2024-12-01T00:00:00.000Z",
  "startTime": "06:00",
  "organizerEmail": "organizer@club.com",
  "mapLink": "https://maps.google.com/location",
  "organizationId": 1,
  "participationFee": 500,
  "address": "123 Sports Street, City",
  "eventType": "State",
  "organizerPhoneNumber": "+919876543210",
  "venue": "Sports Complex",
  "organizationName": "City Sports Club",
  "formId": 1,
  "imageUrl": "https://example.com/event-image.jpg"
}
```

**Validation Rules**:
- `name`: Required, max 255 characters
- `description`: Required, max 1500 characters
- `startDate`: Required, must be in the future
- `endDate`: Required, must be in the future and >= startDate
- `startTime`: Required
- `organizerEmail`: Required, valid email format
- `organizerPhoneNumber`: Required, valid Indian mobile number format
- `eventType`: Required, one of: International, National, State, League, District
- `participationFee`: Required, numeric
- All other fields are required

**Response**:
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": 1
  }
}
```

#### PUT /api/events/:eventId
Update an existing event

**Authentication**: Organization only

**Path Parameters**:
- `eventId` (number): Event ID to update

**Request Body**: Same as create event, but all fields are optional

**Response**:
```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Marathon 2024",
    // ... other event fields
  }
}
```

#### DELETE /api/events/:eventId
Soft delete an event

**Authentication**: Organization only

**Path Parameters**:
- `eventId` (number): Event ID to delete

**Response**:
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

#### PUT /api/events/:eventId/approve
Approve an event (Admin only)

**Authentication**: Super Admin only

**Path Parameters**:
- `eventId` (number): Event ID to approve

**Request Body**:
```json
{
  "isApprovedByAdmin": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    "id": 1,
    "isApprovedByAdmin": true,
    // ... other event fields
  }
}
```

---

### Affiliate Registration

#### POST /api/events/register
Register an affiliate (athlete, coach, staff, etc.) for an event

**Authentication**: Affiliate only

**Request Body**:
```json
{
  "affiliate_id": 123,
  "event_id": 1,
  "form_id": 1,
  "response_data": {
    "fullName": "John Doe",
    "role": "ATHLETE",
    "age": 25,
    "emergencyContact": "+919876543210",
    "medicalConditions": "None"
  },
  "payment_id": "pay_abc123",
  "order_id": "order_xyz789",
  "amount_paid": 500,
  "payment_status": "captured",
  "payment_time": "01-12-2024, 10:30:00"
}
```

**Validation Rules**:
- All fields are required
- `payment_time` format: "dd-MM-yyyy, HH:mm:ss"
- Affiliate must exist and be active
- Event must exist and be approved
- Form must exist and be associated with the event
- No duplicate registrations allowed
- Supports all affiliate roles: ATHLETE, COACH, SPORTS STAFF, NUTRITIONIST, PHYSIOTHERAPIST, PSYCHOLOGIST, SPORTS JOURNALIST, SPORTS MANAGEMENT PROFESSIONAL

**Response**:
```json
{
  "success": true,
  "message": "athlete registered successfully",
  "data": {
    "affiliate_id": 123,
    "event_id": 1,
    "form_id": 1,
    "response_data": { /* form response */ },
    "status": "submitted",
    "submitted_at": "2024-11-15T10:30:00.000Z",
    "payment_id": "pay_abc123",
    "order_id": "order_xyz789",
    "amount_paid": 500,
    "payment_status": "captured",
    "payment_time": "2024-12-01T10:30:00.000Z"
  }
}
```

#### GET /api/events/:eventId/affiliates
Get all affiliates registered for an event

**Authentication**: Organization only

**Path Parameters**:
- `eventId` (number): Event ID

**Response**:
```json
{
  "success": true,
  "message": "Registered affiliates fetched successfully",
  "count": 2,
  "data": [
    {
      "affiliate_id": 123,
      "event_id": 1,
      "form_id": 1,
      "response_data": { /* form response */ },
      "status": "submitted",
      "submitted_at": "2024-11-15T10:30:00.000Z",
      "payment_id": "pay_abc123",
      "order_id": "order_xyz789",
      "amount_paid": 500,
      "payment_status": "captured",
      "payment_time": "2024-12-01T10:30:00.000Z",
      "affiliate_name": "John Doe",
      "affiliate_email": "john@example.com",
      "affiliate_phone": "+919876543210",
      "affiliate_role": "ATHLETE",
      "affiliate_sports_category": "Football",
      "affiliate_position": "Forward"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Organization access required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Event not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Business Logic Notes

### Event Creation Flow
1. Validate request data against schema
2. Check for duplicate event names within organization
3. Verify organization exists and is approved
4. Verify form exists and belongs to organization
5. Create event with `isApprovedByAdmin: false`
6. Create event-form mapping
7. Return success response

### Event Approval Process
- Events require admin approval before affiliates can register
- Only Super Admins can approve events
- Approved events are visible to affiliates for registration

### Affiliate Registration Flow
1. Validate registration data
2. Parse and validate payment timestamp
3. Verify affiliate exists and is active
4. Verify event exists and is approved
5. Verify form is associated with event
6. Check for duplicate registrations
7. Create registration record
8. Return success response with role-specific message

### Security Measures
- JWT-based authentication with Redis caching
- Role-based access control (Organization, Affiliate, Admin)
- Support for multiple affiliate roles (athletes, coaches, staff, etc.)
- Input validation using Joi schemas
- Soft deletes for data integrity
- Payment verification for registrations
- Organization ownership validation for events

### Performance Optimizations
- Database indexing on frequently queried fields
- Redis caching for JWT tokens and sessions
- Selective field updates to minimize database operations
- Efficient joins for event-form associations
