-- Insert dummy forms data for testing Events API
-- This will create various types of registration forms for different sports

-- Individual Sports Forms
INSERT INTO forms (
    "formName", 
    header, 
    "organizationId", 
    form_values, 
    type, 
    "minPlayers", 
    "maxPlayers"
) VALUES
-- Marathon Registration Form (Elite Sports Academy)
(
    'Marathon Registration Form',
    'Complete this form to register for our marathon events. Please provide accurate information for safety and emergency purposes.',
    1,
    '{
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
            },
            {
                "id": "dietaryRestrictions",
                "label": "Dietary Restrictions",
                "type": "textarea",
                "required": false,
                "placeholder": "Any dietary restrictions for event meals"
            },
            {
                "id": "previousExperience",
                "label": "Previous Marathon Experience",
                "type": "select",
                "required": true,
                "options": ["First Time", "1-3 Marathons", "4-10 Marathons", "10+ Marathons"]
            },
            {
                "id": "tshirtSize",
                "label": "T-Shirt Size",
                "type": "select",
                "required": true,
                "options": ["XS", "S", "M", "L", "XL", "XXL"]
            }
        ]
    }',
    'Individual Play',
    1,
    1
),

-- Tennis Tournament Form (Elite Sports Academy)
(
    'Tennis Tournament Registration',
    'Register for our tennis tournaments. Singles and doubles categories available.',
    1,
    '{
        "fields": [
            {
                "id": "fullName",
                "label": "Player Name",
                "type": "text",
                "required": true
            },
            {
                "id": "age",
                "label": "Age",
                "type": "number",
                "required": true,
                "min": 12,
                "max": 70
            },
            {
                "id": "category",
                "label": "Tournament Category",
                "type": "select",
                "required": true,
                "options": ["Men Singles", "Women Singles", "Men Doubles", "Women Doubles", "Mixed Doubles"]
            },
            {
                "id": "partnerName",
                "label": "Partner Name (For Doubles)",
                "type": "text",
                "required": false,
                "placeholder": "Required only for doubles categories"
            },
            {
                "id": "skillLevel",
                "label": "Skill Level",
                "type": "select",
                "required": true,
                "options": ["Beginner", "Intermediate", "Advanced", "Professional"]
            },
            {
                "id": "emergencyContact",
                "label": "Emergency Contact",
                "type": "tel",
                "required": true
            },
            {
                "id": "medicalInfo",
                "label": "Medical Information",
                "type": "textarea",
                "required": false
            }
        ]
    }',
    'Individual Play',
    1,
    2
),

-- Cricket Tournament Form (Elite Sports Academy)
(
    'Cricket Tournament Registration',
    'Team registration for cricket tournaments. Please provide complete team details.',
    1,
    '{
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
                "id": "coachName",
                "label": "Coach Name",
                "type": "text",
                "required": false
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
            },
            {
                "id": "emergencyContact",
                "label": "Team Emergency Contact",
                "type": "tel",
                "required": true
            },
            {
                "id": "specialRequirements",
                "label": "Special Requirements",
                "type": "textarea",
                "required": false,
                "placeholder": "Any special accommodation needs"
            }
        ]
    }',
    'Team Sports',
    11,
    15
),

-- Football Tournament Form (Champions Training Center)
(
    'Football Tournament Registration',
    'Register your football team for our inter-city championship.',
    2,
    '{
        "fields": [
            {
                "id": "teamName",
                "label": "Team Name",
                "type": "text",
                "required": true
            },
            {
                "id": "managerName",
                "label": "Team Manager Name",
                "type": "text",
                "required": true
            },
            {
                "id": "managerContact",
                "label": "Manager Contact",
                "type": "tel",
                "required": true
            },
            {
                "id": "coachName",
                "label": "Head Coach Name",
                "type": "text",
                "required": true
            },
            {
                "id": "division",
                "label": "Division",
                "type": "select",
                "required": true,
                "options": ["Youth (U-18)", "Senior", "Veterans (35+)", "Women"]
            },
            {
                "id": "squadList",
                "label": "Squad List (22 players max)",
                "type": "textarea",
                "required": true,
                "placeholder": "Player Name, Position, Age (one per line)"
            },
            {
                "id": "homeGround",
                "label": "Home Ground",
                "type": "text",
                "required": true
            },
            {
                "id": "kitColors",
                "label": "Kit Colors (Home/Away)",
                "type": "text",
                "required": true,
                "placeholder": "e.g., Blue/White, Red/Black"
            }
        ]
    }',
    'Team Sports',
    11,
    22
),

-- Swimming Competition Form (Champions Training Center)
(
    'Swimming Competition Registration',
    'Individual swimming competition registration form.',
    2,
    '{
        "fields": [
            {
                "id": "swimmerName",
                "label": "Swimmer Name",
                "type": "text",
                "required": true
            },
            {
                "id": "age",
                "label": "Age",
                "type": "number",
                "required": true,
                "min": 8,
                "max": 60
            },
            {
                "id": "ageGroup",
                "label": "Age Group Category",
                "type": "select",
                "required": true,
                "options": ["8-10 years", "11-12 years", "13-14 years", "15-17 years", "18+ years", "Masters (25+)"]
            },
            {
                "id": "events",
                "label": "Swimming Events",
                "type": "checkbox",
                "required": true,
                "options": ["50m Freestyle", "100m Freestyle", "200m Freestyle", "50m Backstroke", "100m Backstroke", "50m Breaststroke", "100m Breaststroke", "50m Butterfly", "100m Butterfly", "200m Individual Medley"]
            },
            {
                "id": "personalBest",
                "label": "Personal Best Times",
                "type": "textarea",
                "required": false,
                "placeholder": "List your best times for selected events"
            },
            {
                "id": "coachName",
                "label": "Coach Name",
                "type": "text",
                "required": false
            },
            {
                "id": "emergencyContact",
                "label": "Emergency Contact",
                "type": "tel",
                "required": true
            },
            {
                "id": "medicalConditions",
                "label": "Medical Conditions",
                "type": "textarea",
                "required": false
            }
        ]
    }',
    'Individual Play',
    1,
    1
),

-- Multi-Sport Event Form (Elite Sports Academy)
(
    'Multi-Sport Event Registration',
    'General registration form for multi-sport events and competitions.',
    1,
    '{
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
                "id": "certifications",
                "label": "Relevant Certifications",
                "type": "textarea",
                "required": false,
                "placeholder": "List any sports-related certifications"
            },
            {
                "id": "emergencyContact",
                "label": "Emergency Contact",
                "type": "tel",
                "required": true
            },
            {
                "id": "specialization",
                "label": "Area of Specialization",
                "type": "text",
                "required": false,
                "placeholder": "e.g., Batting Coach, Sports Psychology, etc."
            },
            {
                "id": "availability",
                "label": "Availability",
                "type": "checkbox",
                "required": true,
                "options": ["Full Event", "Day 1 Only", "Day 2 Only", "Weekends Only", "Specific Sessions"]
            }
        ]
    }',
    'Individual Play',
    1,
    1
)
ON CONFLICT DO NOTHING;

-- Reset the forms sequence
SELECT setval('forms_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM forms));
