"""
Pytest configuration and fixtures for API testing
"""

import pytest
import requests
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from unittest.mock import Mock, patch, MagicMock
# ANJ from test_data import (
from tests.test_data import (
    SAMPLE_USER_DATA, SAMPLE_ADMIN_DATA, SAMPLE_TEACHER_PLUS_DATA,
    MOCK_FIRESTORE_RESPONSE, MOCK_ADMIN_FIRESTORE_RESPONSE,
    MOCK_NON_EXISTENT_RESPONSE, MOCK_USERS_COLLECTION,
    TEST_USER_ID, ADMIN_USER_ID, NON_EXISTENT_USER_ID
)


@pytest.fixture
def api_base_url():
    """Base URL for the API server"""
    return os.getenv("API_BASE_URL", "http://localhost:3001/api")


@pytest.fixture
def mock_firestore_db():
    """Mock Firestore database for testing"""
    db_mock = Mock()

    # Mock collection method
    def mock_collection(collection_name):
        collection_mock = Mock()

        # Mock doc method
        def mock_doc(doc_id):
            doc_mock = Mock()

            # Mock get method for different scenarios
            async def mock_get():
                if collection_name == "teachers":
                    if doc_id == TEST_USER_ID:
                        return type('obj', (object,), MOCK_FIRESTORE_RESPONSE)
                    elif doc_id == ADMIN_USER_ID:
                        return type('obj', (object,), MOCK_ADMIN_FIRESTORE_RESPONSE)
                    else:
                        return type('obj', (object,), MOCK_NON_EXISTENT_RESPONSE)

                elif collection_name == "students":
                    if doc_id == TEST_USER_ID:
                        return type('obj', (object,), MOCK_FIRESTORE_RESPONSE)
                    else:
                        return type('obj', (object,), MOCK_NON_EXISTENT_RESPONSE)

                elif collection_name.endswith("users"):  # Unified users collection
                    if doc_id == TEST_USER_ID:
                        return type('obj', (object,), MOCK_FIRESTORE_RESPONSE)
                    elif doc_id == ADMIN_USER_ID:
                        return type('obj', (object,), MOCK_ADMIN_FIRESTORE_RESPONSE)
                    else:
                        return type('obj', (object,), MOCK_NON_EXISTENT_RESPONSE)

                return type('obj', (object,), MOCK_NON_EXISTENT_RESPONSE)

            # Mock set method for user registration
            async def mock_set(data):
                return True

            # Mock update method for user updates
            async def mock_update(data):
                return True

            doc_mock.get.return_value = mock_get()
            doc_mock.set.return_value = mock_set({})
            doc_mock.update.return_value = mock_update({})
            return doc_mock

        # Mock get method for collection queries (for /users endpoint)
        async def mock_collection_get():
            # Mock query snapshot
            docs_mock = []
            for user_data in MOCK_USERS_COLLECTION:
                doc_mock = Mock()
                doc_mock.id = user_data["id"]
                doc_mock.data.return_value = {k: v for k, v in user_data.items() if k != "id"}
                docs_mock.append(doc_mock)

            return type('obj', (object,), {'docs': docs_mock})

        collection_mock.doc = mock_doc
        collection_mock.get.return_value = mock_collection_get()
        return collection_mock

    db_mock.collection = mock_collection
    return db_mock


@pytest.fixture
def mock_firebase_admin(mock_firestore_db):
    """Mock Firebase Admin SDK"""
    with patch('firebase_admin') as firebase_admin_mock:
        # Mock the admin.firestore() method to return our mock database
        firebase_admin_mock.firestore.return_value = mock_firestore_db
        yield firebase_admin_mock


@pytest.fixture
def mock_auth_middleware():
    """Mock authentication middleware behavior"""
    def mock_authenticateUser(req, res, next):
        # Extract token from headers
        auth_header = req.get('headers', {}).get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return {'status': 401, 'json': {'message': 'No token provided'}}

        token = auth_header.replace('Bearer ', '')

        # Mock valid tokens
        if token == "valid_user_token":
            req['user'] = {'uid': TEST_USER_ID}
            return next()
        elif token == "valid_admin_token":
            req['user'] = {'uid': ADMIN_USER_ID}
            return next()
        else:
            return {'status': 401, 'json': {'message': 'Invalid token'}}

    return mock_authenticateUser


@pytest.fixture
def authenticated_headers():
    """Headers with valid authentication token"""
    return {
        'Authorization': 'Bearer valid_user_token',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def admin_authenticated_headers():
    """Headers with valid admin authentication token"""
    return {
        'Authorization': 'Bearer valid_admin_token',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def unauthenticated_headers():
    """Headers without authentication token"""
    return {
        'Content-Type': 'application/json'
    }


@pytest.fixture
def invalid_auth_headers():
    """Headers with invalid authentication token"""
    return {
        'Authorization': 'Bearer invalid_token',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def registration_data():
    """Sample user registration data"""
    return {
        "email": "newuser@example.com",
        "fullName": "New User",
        "firstName": "New",
        "lastName": "User",
        "institution": "New University",
        "userType": "educator",
        "jobTitle": "New Teacher",
        "subjects": ["Biology"]
    }


@pytest.fixture
def update_data():
    """Sample user update data"""
    return {
        "firstName": "Updated",
        "lastName": "Name",
        "institution": "Updated University",
        "userType": "educator",
        "jobTitle": "Senior Teacher",
        "subjects": ["Advanced Math"]
    }


@pytest.fixture
def role_update_data():
    """Sample role update data"""
    return {
        "userId": TEST_USER_ID,
        "newRole": "teacherPlus"
    }
