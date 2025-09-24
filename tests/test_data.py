"""
Test data and sample fixtures for API testing
"""

# Sample user data
SAMPLE_USER_DATA = {
    "email": "test@example.com",
    "fullName": "Test User",
    "firstName": "Test",
    "lastName": "User",
    "institution": "Test University",
    "userType": "educator",
    "jobTitle": "Teacher",
    "subjects": ["Math", "Science"],
    "role": "teacherDefault"
}

SAMPLE_ADMIN_DATA = {
    "email": "admin@example.com",
    "fullName": "Admin User",
    "firstName": "Admin",
    "lastName": "User",
    "institution": "DIYA Ed",
    "userType": "admin",
    "jobTitle": "Administrator",
    "subjects": [],
    "role": "admin"
}

SAMPLE_TEACHER_PLUS_DATA = {
    "email": "premium@example.com",
    "fullName": "Premium User",
    "firstName": "Premium",
    "lastName": "User",
    "institution": "Premium School",
    "userType": "educator",
    "jobTitle": "Senior Teacher",
    "subjects": ["Physics", "Chemistry"],
    "role": "teacherPlus"
}

# Sample Firebase document responses
MOCK_FIRESTORE_RESPONSE = {
    "exists": True,
    "data": lambda: SAMPLE_USER_DATA
}

MOCK_ADMIN_FIRESTORE_RESPONSE = {
    "exists": True,
    "data": lambda: SAMPLE_ADMIN_DATA
}

MOCK_NON_EXISTENT_RESPONSE = {
    "exists": False,
    "data": lambda: None
}

# Sample collection responses for /users endpoint
MOCK_USERS_COLLECTION = [
    {"id": "user1", **SAMPLE_USER_DATA},
    {"id": "user2", **SAMPLE_TEACHER_PLUS_DATA},
    {"id": "admin1", **SAMPLE_ADMIN_DATA}
]

# JWT tokens for testing (these are mock tokens, not real)
VALID_JWT_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.mock"
ADMIN_JWT_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJhZG1pbi11c2VyLWlkIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSJ9.mock"
INVALID_JWT_TOKEN = "Bearer invalid.token.here"

# Test user IDs
TEST_USER_ID = "test-user-id"
ADMIN_USER_ID = "admin-user-id"
NON_EXISTENT_USER_ID = "non-existent-user-id"