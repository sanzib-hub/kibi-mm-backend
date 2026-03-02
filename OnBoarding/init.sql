-- Database initialization for KIBI Affiliate OnBoarding Service
-- This creates the complete schema for the affiliate onboarding flow
-- Super Admin table
CREATE TABLE
    IF NOT EXISTS super_admin (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'SUPER_ADMIN',
        active BOOLEAN DEFAULT TRUE,
        deleted BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Sports Organizations table
CREATE TABLE IF NOT EXISTS sports_organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    address TEXT,
    "displayName" VARCHAR(32), 
    "organizationType" VARCHAR(64) 
    CHECK (
        "organizationType" IS NULL 
        OR "organizationType" IN ('Federation', 'Associations', 'Club', 'Academy', 'League')
    ),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(10),
    logo TEXT,
    description TEXT,
    website VARCHAR(255),
    "registrationNumber" VARCHAR(100),
    "establishedYear" INTEGER,
    "sportsCategories" TEXT, -- JSON array
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    "isVerified" BOOLEAN DEFAULT FALSE,
    "onboardedBy" INTEGER REFERENCES super_admin(id),
    deleted BOOLEAN DEFAULT FALSE,
    "isFirstLogin" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "account_id" VARCHAR(64)
);

-- Affiliates table
CREATE TABLE
    IF NOT EXISTS affiliates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "role" VARCHAR(30) DEFAULT 'ATHLETE' CHECK (
            "role" IN (
                'ATHLETE',
                'COACH',
                'SPORTS STAFF',
                'NUTRITIONIST',
                'PHYSIOTHERAPIST',
                'PSYCHOLOGIST',
                'SPORTS JOURNALIST',
                'SPORTS MANAGEMENT PROFESSIONAL'
            )
        ),
        email VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255),
        "dateOfBirth" DATE,
        gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
        "sportsCategoryId" INTEGER REFERENCES sports_category (id),
        position VARCHAR(100),
        "profilePicture" TEXT,
        "coverPhoto" TEXT,
        bio TEXT,
        achievements TEXT,
        "invitationCode" VARCHAR(50),
        "invitationStatus" VARCHAR(20) DEFAULT 'PENDING' CHECK (
            "invitationStatus" IN ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED')
        ),
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (
            status IN ('PENDING', 'VERIFIED', 'BANNED', 'FLAGGED')
        ),
        "addedBy" INTEGER NOT NULL,
        deleted BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE 
    IF NOT EXISTS affiliate_organization (
        id SERIAL PRIMARY KEY,
        "affiliatId" INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
        "organizationId" INTEGER NOT NULL REFERENCES sports_organizations(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (
            status IN ('PENDING', 'VERIFIED', 'BANNED', 'FLAGGED')
        ),
        "addedBy" INTEGER NULL,
        deleted BOOLEAN DEFAULT FALSE,
        "statusReason" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("affiliateId", "organizationId") 
);

-- Invitation Codes table
CREATE TABLE
    IF NOT EXISTS invitation_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('AFFILIATE', 'NON_AFFILIATE')),
        "role" VARCHAR(30) DEFAULT 'ATHLETE' CHECK (
            "role" IN (
                'ATHLETE',
                'COACH',
                'SPORTS STAFF',
                'NUTRITIONIST',
                'PHYSIOTHERAPIST',
                'PSYCHOLOGIST',
                'SPORTS JOURNALIST',
                'SPORTS MANAGEMENT PROFESSIONAL'
            )
        ),
        "organizationId" INTEGER REFERENCES sports_organizations (id),
        "generatedBy" INTEGER NOT NULL,
        "recipientPhone" VARCHAR(20),
        "recipientEmail" VARCHAR(255),
        "recipientName" VARCHAR(255),
        status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (
            status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')
        ),
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "usedBy" INTEGER,
        metadata TEXT, -- JSON for additional data
        deleted BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Non-Affiliate Requests table
CREATE TABLE
    IF NOT EXISTS non_affiliate_requests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "role" VARCHAR(30) DEFAULT 'ATHLETE' CHECK (
            "role" IN (
                'ATHLETE',
                'COACH',
                'SPORTS STAFF',
                'NUTRITIONIST',
                'PHYSIOTHERAPIST',
                'PSYCHOLOGIST',
                'SPORTS JOURNALIST',
                'SPORTS MANAGEMENT PROFESSIONAL'
            )
        ),
        email VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        "sportsCategoryId" INTEGER REFERENCES sports_category (id),
        experience TEXT,
        reason TEXT,
        documents TEXT, -- JSON array of document URLs
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        "reviewedBy" INTEGER REFERENCES super_admin (id),
        "reviewedAt" TIMESTAMP,
        "reviewComments" TEXT,
        "invitationCodeId" INTEGER REFERENCES invitation_codes (id),
        deleted BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- OTP Verification table
CREATE TABLE IF NOT EXISTS otp_verification (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('AFFILIATE_SIGNUP', 'ORG_SIGNUP', 'PASSWORD_RESET',"AFFILIATE_LOGIN")),
    "invitationCode" VARCHAR(50),
    attempts INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log table
CREATE TABLE
    IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "userType" VARCHAR(20) NOT NULL CHECK (
            "userType" IN ('SUPER_ADMIN', 'ORGANIZATION', 'AFFILIATE')
        ),
        action VARCHAR(100) NOT NULL,
        "entityType" VARCHAR(50) NOT NULL,
        "entityId" INTEGER,
        "oldValues" TEXT, -- JSON
        "newValues" TEXT, -- JSON
        "ipAddress" INET,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE affiliate_experience (
    id SERIAL PRIMARY KEY,
    affiliateId INTEGER NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
);

CREATE TABLE affiliate_award_recognitions (
    id SERIAL PRIMARY KEY,
    affiliateId INT NOT NULL,
    awardName VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    year VARCHAR(10),
    url TEXT,
    attachment VARCHAR(500),        
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (affiliateId) REFERENCES affiliates(id)
);

CREATE TABLE affiliate_educations (
    id SERIAL PRIMARY KEY,
    affiliateId INT NOT NULL,
    schoolName VARCHAR(255) NOT NULL,
    course VARCHAR(255),
    fromYear VARCHAR(10),
    toYear VARCHAR(10),                    
    description TEXT,
    certificate VARCHAR(500),              
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (affiliateId) REFERENCES affiliates(id)
);

CREATE TABLE affiliate_certificates (
    id SERIAL PRIMARY KEY,
    affiliateId INT NOT NULL,
    certificationName VARCHAR(255) NOT NULL,
    issuer VARCHAR(255),
    year VARCHAR(10),
    url TEXT,
    attachment VARCHAR(500),              -- uploaded file path / S3 URL
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (affiliateId) REFERENCES affiliates(id)
);

CREATE TABLE affiliate_publications (
    id SERIAL PRIMARY KEY,
    affiliateId INT NOT NULL,
    publicationName VARCHAR(255) NOT NULL,
    publisher VARCHAR(255),
    year VARCHAR(10),                    
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (affiliateId) REFERENCES affiliates(id)
);

CREATE TABLE campaign_collaborator(
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    position_name VARCHAR(255) NOT NULL,
    details TEXT,
    affiliate_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sports_organizations_email ON sports_organizations (email);

CREATE INDEX IF NOT EXISTS idx_sports_organizations_status ON sports_organizations (status);

CREATE INDEX IF NOT EXISTS idx_affiliates_phone ON affiliates (phone);

CREATE INDEX IF NOT EXISTS idx_affiliates_invitation_code ON affiliates ("invitationCode");

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes (code);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes (status);

CREATE INDEX IF NOT EXISTS idx_otp_verification_phone ON otp_verification (phone);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs ("userId", "userType");

-- Insert default super admin (password: admin123)
INSERT INTO
    super_admin (name, email, password, role, active)
VALUES
    (
        'Super Admin',
        'admin@kibisports.com',
        '$2b$12$rqW1LiGcmrvk.81bqW5QmOXv0pR1vFx2bRo0WpgJ1LQMYq4Mbo/g6',
        'SUPER_ADMIN',
        TRUE
    ) ON CONFLICT (email) DO NOTHING;

INSERT INTO
    super_admin (name, email, password, role, active, deleted)
VALUES
    (
        'test admin1',
        'testadm1@example.com',
        '$2b$12$QlCMpPl5gpQLblFJNwal5OkUnYUKcuCMzipOjEYA1Df4rlbmnCmCm',
        'SUPER_ADMIN',
        TRUE,
        FALSE
    );

-- Insert sample sports organizations
INSERT INTO
    sports_organizations (
        name,
        email,
        phone,
        password,
        address,
        city,
        state,
        country,
        description,
        status,
        "isVerified",
        "onboardedBy",
        "isFirstLogin",
        "organizationType"
    )
VALUES
    (
        'Elite Sports Academy',
        'admin@elitesports.com',
        '+919876543210',
        '$2b$12$LQv3c1yqBwEHFl5aysHdsOHiP40WJ0H7OvuUUwLD9vkfVhAqaRYHC',
        '123 Sports Complex, Sector 1',
        'Mumbai',
        'Maharashtra',
        'India',
        'Premier sports training academy focusing on cricket and football',
        'APPROVED',
        TRUE,
        1,
        FALSE,
        "ATHLETE"
    ),
    (
        'Champions Sports Club',
        'info@champions.com',
        '+919876543211',
        '$2b$12$LQv3c1yqBwEHFl5aysHdsOHiP40WJ0H7OvuUUwLD9vkfVhAqaRYHC',
        '456 Athletic Ground, Zone 2',
        'Delhi',
        'Delhi',
        'India',
        'Multi-sport club specializing in athletics and swimming',
        'APPROVED',
        TRUE,
        1,
        TRUE,
        "COACH"
    ) ON CONFLICT (email) DO NOTHING;

-- Insert sample affiliates (case-insensitive role values)
-- Use UPPER() to ensure values match the CHECK constraint
INSERT INTO
    affiliates (
        name,
        "role",
        email,
        phone,
        gender,
        "sportsCategoryId",
        position,
        "invitationCode",
        "invitationStatus",
        status,
        "addedBy"
    )
VALUES
    (
        'Rahul Sharma',
        UPPER('athlete'),
        'rahul@example.com',
        '+919876543220',
        'MALE',
        1,
        'Batsman',
        'ELITE001',
        'ACCEPTED',
        'ACTIVE',
        1
    ),
    (
        'Priya Patel',
        UPPER('coach'),
        'priya@example.com',
        '+919876543221',
        'FEMALE',
        'Football',
        '',
        'ELITE002',
        'SENT',
        'INACTIVE',
        1
    ),
    (
        'Amit Kumar',
        UPPER('nutritionist'),
        'amit@example.com',
        '+919876543222',
        'MALE',
        'Swimming',
        '',
        'CHAMP001',
        'ACCEPTED',
        'ACTIVE',
        2
    ) ON CONFLICT DO NOTHING;

-- Insert sample invitation codes
INSERT INTO
    invitation_codes (
        code,
        type,
        "organizationId",
        "generatedBy",
        "recipientPhone",
        "recipientEmail",
        "recipientName",
        status,
        "expiresAt",
        metadata
    )
VALUES
    (
        'ELITE003',
        'AFFILIATE',
        1,
        1,
        '+919876543223',
        'newplayer@example.com',
        'New Player',
        'ACTIVE',
        CURRENT_TIMESTAMP + INTERVAL '7 days',
        '{"sportsCategory": "Tennis", "position": "Singles Player"}'
    ),
    (
        'NAF-001',
        'NON_AFFILIATE',
        NULL,
        1,
        '+919876543224',
        'independent@example.com',
        'Independent Athlete',
        'ACTIVE',
        CURRENT_TIMESTAMP + INTERVAL '30 days',
        '{"sportsCategory": "Basketball", "experience": "5 years"}'
    ) ON CONFLICT (code) DO NOTHING;

-- Insert sample non-affiliate requests
INSERT INTO
    non_affiliate_requests (
        name,
        email,
        phone,
        "sportsCategoryId",
        experience,
        reason,
        status
    )
VALUES
    (
        'Sneha Reddy',
        'sneha@example.com',
        '+919876543225',
        1,
        '3 years of competitive badminton',
        'Want to join KIBI platform to showcase my skills and find opportunities',
        'PENDING'
    ),
    (
        'Arjun Singh',
        'arjun@example.com',
        '+919876543226',
        'Hockey',
        '5 years state level hockey player',
        'Looking for professional opportunities and sponsorships',
        'APPROVED'
    ) ON CONFLICT DO NOTHING;

-- Update sequences to avoid conflicts
SELECT
    setval (
        'super_admin_id_seq',
        (
            SELECT
                MAX(id)
            FROM
                super_admin
        )
    );

SELECT
    setval (
        'sports_organizations_id_seq',
        (
            SELECT
                MAX(id)
            FROM
                sports_organizations
        )
    );

SELECT
    setval (
        'affiliates_id_seq',
        (
            SELECT
                MAX(id)
            FROM
                affiliates
        )
    );

SELECT
    setval (
        'invitation_codes_id_seq',
        (
            SELECT
                MAX(id)
            FROM
                invitation_codes
        )
    );

SELECT
    setval (
        'non_affiliate_requests_id_seq',
        (
            SELECT
                MAX(id)
            FROM
                non_affiliate_requests
        )
    );

-- ============================================================
-- KYC DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS kyc_documents (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id),
  document_type VARCHAR(50) NOT NULL,
  document_url VARCHAR(500) NOT NULL,
  document_number VARCHAR(50),
  ocr_data JSONB,
  status VARCHAR(20) DEFAULT 'PENDING',
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED';
CREATE INDEX IF NOT EXISTS idx_kyc_documents_affiliate ON kyc_documents(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);

-- ============================================================
-- AFFILIATE FOLLOWS
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_follows (
  follower_id INTEGER REFERENCES affiliates(id),
  following_id INTEGER REFERENCES affiliates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON affiliate_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON affiliate_follows(following_id);