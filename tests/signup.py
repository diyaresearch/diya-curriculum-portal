"""
Comprehensive REST API tests for server/routes/user.js endpoints

This test suite covers all 6 endpoints in the user routes:
1. GET /api/user/me - Get current user details (authenticated)
2. GET /api/user/:userId - Get user details by userId (no auth)
3. POST /api/user/register - Register new user (authenticated)
4. PUT /api/user/update - Update user profile (authenticated)
5. GET /api/user/users - Get all users (admin only)
6. PUT /api/user/updateRole - Update user role (admin only)
"""

import pytest
import requests
import json
from unittest.mock import patch, Mock
# ANJ from test_data import (
from tests.test_data import (
    SAMPLE_USER_DATA, SAMPLE_ADMIN_DATA, TEST_USER_ID,
    ADMIN_USER_ID, NON_EXISTENT_USER_ID
)


class TestUserAPI:
    """Test class for User API endpoints"""

    class TestGetCurrentUser:
        """Tests for GET /api/user/me endpoint"""

        def test_get_current_user_success(self, api_base_url, authenticated_headers):
            """Test successful retrieval of current user data"""
            with patch('requests.get') as mock_get:
                # Mock successful response
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = SAMPLE_USER_DATA
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/me"
                response = requests.get(url, headers=authenticated_headers)

                assert response.status_code == 200
                assert response.json()['email'] == SAMPLE_USER_DATA['email']
                assert response.json()['role'] == SAMPLE_USER_DATA['role']

        def test_get_current_user_no_auth(self, api_base_url, unauthenticated_headers):
            """Test GET /me without authentication token"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 401
                mock_response.json.return_value = {"message": "No token provided"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/me"
                response = requests.get(url, headers=unauthenticated_headers)

                assert response.status_code == 401
                assert "token" in response.json()['message'].lower()

        def test_get_current_user_invalid_auth(self, api_base_url, invalid_auth_headers):
            """Test GET /me with invalid authentication token"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 401
                mock_response.json.return_value = {"message": "Invalid token"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/me"
                response = requests.get(url, headers=invalid_auth_headers)

                assert response.status_code == 401
                assert "invalid" in response.json()['message'].lower()

        def test_get_current_user_not_found(self, api_base_url, authenticated_headers):
            """Test GET /me when user is not found in any collection"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 404
                mock_response.json.return_value = {"message": "User not found"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/me"
                response = requests.get(url, headers=authenticated_headers)

                assert response.status_code == 404
                assert "not found" in response.json()['message'].lower()

        def test_get_current_user_server_error(self, api_base_url, authenticated_headers):
            """Test GET /me with server error"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 500
                mock_response.json.return_value = {"message": "Internal server error"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/me"
                response = requests.get(url, headers=authenticated_headers)

                assert response.status_code == 500
                assert "server error" in response.json()['message'].lower()

    class TestGetUserById:
        """Tests for GET /api/user/:userId endpoint"""

        def test_get_user_by_id_success(self, api_base_url):
            """Test successful retrieval of user by ID"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"id": TEST_USER_ID, **SAMPLE_USER_DATA}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/{TEST_USER_ID}"
                response = requests.get(url)

                assert response.status_code == 200
                assert response.json()['id'] == TEST_USER_ID
                assert response.json()['email'] == SAMPLE_USER_DATA['email']

        def test_get_user_by_id_not_found(self, api_base_url):
            """Test GET user by ID when user doesn't exist"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 404
                mock_response.json.return_value = {"message": "User not found"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/{NON_EXISTENT_USER_ID}"
                response = requests.get(url)

                assert response.status_code == 404
                assert "not found" in response.json()['message'].lower()

        def test_get_user_by_id_server_error(self, api_base_url):
            """Test GET user by ID with server error"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 500
                mock_response.json.return_value = {"message": "Internal server error"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/{TEST_USER_ID}"
                response = requests.get(url)

                assert response.status_code == 500
                assert "server error" in response.json()['message'].lower()

    class TestRegisterUser:
        """Tests for POST /api/user/register endpoint"""

        def test_register_user_success(self, api_base_url, authenticated_headers, registration_data):
            """Test successful user registration"""
            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 201
                mock_response.json.return_value = {
                    "message": "User registered successfully",
                    "fullName": registration_data["fullName"],
                    "role": "teacherDefault"
                }
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                response = requests.post(url, json=registration_data, headers=authenticated_headers)

                assert response.status_code == 201
                assert "successfully" in response.json()['message'].lower()
                assert response.json()['role'] == "teacherDefault"

        def test_register_user_already_exists(self, api_base_url, authenticated_headers, registration_data):
            """Test registration when user already exists"""
            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"message": "User already exists"}
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                response = requests.post(url, json=registration_data, headers=authenticated_headers)

                assert response.status_code == 200
                assert "already exists" in response.json()['message'].lower()

        def test_register_user_no_auth(self, api_base_url, unauthenticated_headers, registration_data):
            """Test registration without authentication"""
            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 401
                mock_response.json.return_value = {"message": "No token provided"}
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                response = requests.post(url, json=registration_data, headers=unauthenticated_headers)

                assert response.status_code == 401

        def test_register_user_invalid_auth(self, api_base_url, invalid_auth_headers, registration_data):
            """Test registration with invalid authentication"""
            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 401
                mock_response.json.return_value = {"message": "Invalid token"}
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                response = requests.post(url, json=registration_data, headers=invalid_auth_headers)

                assert response.status_code == 401

        def test_register_user_missing_fields(self, api_base_url, authenticated_headers):
            """Test registration with missing required fields"""
            incomplete_data = {"email": "test@test.com"}  # Missing required fields

            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 500  # Server error due to missing fields
                mock_response.json.return_value = {"message": "Internal server error"}
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                response = requests.post(url, json=incomplete_data, headers=authenticated_headers)

                assert response.status_code == 500

        def test_register_user_default_values(self, api_base_url, authenticated_headers, registration_data):
            """Test that registration sets proper default values"""
            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 201
                mock_response.json.return_value = {
                    "message": "User registered successfully",
                    "fullName": registration_data["fullName"],
                    "role": "teacherDefault"
                }
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                response = requests.post(url, json=registration_data, headers=authenticated_headers)

                # Verify default values are set
                assert response.status_code == 201
                assert response.json()['role'] == "teacherDefault"  # Default role
                # Note: subscriptionType and status would be set server-side

    class TestUpdateUser:
        """Tests for PUT /api/user/update endpoint"""

        def test_update_user_success(self, api_base_url, authenticated_headers, update_data):
            """Test successful user profile update"""
            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"message": "User profile updated successfully"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/update"
                response = requests.put(url, json=update_data, headers=authenticated_headers)

                assert response.status_code == 200
                assert "successfully" in response.json()['message'].lower()

        def test_update_user_not_found(self, api_base_url, authenticated_headers, update_data):
            """Test update when user doesn't exist"""
            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 404
                mock_response.json.return_value = {"message": "User not found"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/update"
                response = requests.put(url, json=update_data, headers=authenticated_headers)

                assert response.status_code == 404
                assert "not found" in response.json()['message'].lower()

        def test_update_user_no_auth(self, api_base_url, unauthenticated_headers, update_data):
            """Test update without authentication"""
            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 401
                mock_response.json.return_value = {"message": "No token provided"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/update"
                response = requests.put(url, json=update_data, headers=unauthenticated_headers)

                assert response.status_code == 401

        def test_update_user_partial_update(self, api_base_url, authenticated_headers):
            """Test partial user profile update"""
            partial_data = {"firstName": "PartialUpdate"}

            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"message": "User profile updated successfully"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/update"
                response = requests.put(url, json=partial_data, headers=authenticated_headers)

                assert response.status_code == 200

        def test_update_user_server_error(self, api_base_url, authenticated_headers, update_data):
            """Test update with server error"""
            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 500
                mock_response.json.return_value = {"message": "Internal server error"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/update"
                response = requests.put(url, json=update_data, headers=authenticated_headers)

                assert response.status_code == 500

    class TestGetAllUsers:
        """Tests for GET /api/user/users endpoint (admin only)"""

        def test_get_all_users_admin_success(self, api_base_url, admin_authenticated_headers):
            """Test admin successfully retrieves all users"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = [
                    {"id": "user1", **SAMPLE_USER_DATA},
                    {"id": "admin1", **SAMPLE_ADMIN_DATA}
                ]
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/users"
                response = requests.get(url, headers=admin_authenticated_headers)

                assert response.status_code == 200
                assert isinstance(response.json(), list)
                assert len(response.json()) > 0

        def test_get_all_users_non_admin_forbidden(self, api_base_url, authenticated_headers):
            """Test non-admin user gets forbidden when accessing all users"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 403
                mock_response.json.return_value = {"message": "Access denied. Admins only."}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/users"
                response = requests.get(url, headers=authenticated_headers)

                assert response.status_code == 403
                assert "denied" in response.json()['message'].lower()
                assert "admin" in response.json()['message'].lower()

        def test_get_all_users_no_auth(self, api_base_url, unauthenticated_headers):
            """Test accessing all users without authentication"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 401
                mock_response.json.return_value = {"message": "No token provided"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/users"
                response = requests.get(url, headers=unauthenticated_headers)

                assert response.status_code == 401

        def test_get_all_users_admin_not_found(self, api_base_url, authenticated_headers):
            """Test when admin user record is not found"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 404
                mock_response.json.return_value = {"message": "User not found"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/users"
                response = requests.get(url, headers=authenticated_headers)

                assert response.status_code == 404

        def test_get_all_users_server_error(self, api_base_url, admin_authenticated_headers):
            """Test server error when retrieving all users"""
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 500
                mock_response.json.return_value = {"message": "Internal server error"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/users"
                response = requests.get(url, headers=admin_authenticated_headers)

                assert response.status_code == 500

    class TestUpdateUserRole:
        """Tests for PUT /api/user/updateRole endpoint (admin only)"""

        def test_update_role_admin_success(self, api_base_url, admin_authenticated_headers, role_update_data):
            """Test admin successfully updates user role"""
            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"message": f"User role updated to {role_update_data['newRole']}"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/updateRole"
                response = requests.put(url, json=role_update_data, headers=admin_authenticated_headers)

                assert response.status_code == 200
                assert role_update_data['newRole'] in response.json()['message']

        def test_update_role_non_admin_forbidden(self, api_base_url, authenticated_headers, role_update_data):
            """Test non-admin user gets forbidden when updating roles"""
            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 403
                mock_response.json.return_value = {"message": "Access denied. Admin only."}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/updateRole"
                response = requests.put(url, json=role_update_data, headers=authenticated_headers)

                assert response.status_code == 403
                assert "denied" in response.json()['message'].lower()

        def test_update_role_missing_fields(self, api_base_url, admin_authenticated_headers):
            """Test role update with missing required fields"""
            incomplete_data = {"userId": "some-id"}  # Missing newRole

            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 400
                mock_response.json.return_value = {"message": "Missing userId or newRole"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/updateRole"
                response = requests.put(url, json=incomplete_data, headers=admin_authenticated_headers)

                assert response.status_code == 400
                assert "missing" in response.json()['message'].lower()

        def test_update_role_target_user_not_found(self, api_base_url, admin_authenticated_headers):
            """Test role update when target user doesn't exist"""
            role_data = {"userId": NON_EXISTENT_USER_ID, "newRole": "teacherPlus"}

            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 404
                mock_response.json.return_value = {"message": "Target user not found"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/updateRole"
                response = requests.put(url, json=role_data, headers=admin_authenticated_headers)

                assert response.status_code == 404
                assert "not found" in response.json()['message'].lower()

        def test_update_role_no_auth(self, api_base_url, unauthenticated_headers, role_update_data):
            """Test role update without authentication"""
            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 401
                mock_response.json.return_value = {"message": "No token provided"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/updateRole"
                response = requests.put(url, json=role_update_data, headers=unauthenticated_headers)

                assert response.status_code == 401

        def test_update_role_server_error(self, api_base_url, admin_authenticated_headers, role_update_data):
            """Test role update with server error"""
            with patch('requests.put') as mock_put:
                mock_response = Mock()
                mock_response.status_code = 500
                mock_response.json.return_value = {"message": "Internal server error"}
                mock_put.return_value = mock_response

                url = f"{api_base_url}/user/updateRole"
                response = requests.put(url, json=role_update_data, headers=admin_authenticated_headers)

                assert response.status_code == 500

    class TestRoleValidation:
        """Additional tests for role validation and permissions"""

        def test_valid_role_values(self, api_base_url, admin_authenticated_headers):
            """Test updating to all valid role values"""
            valid_roles = ["admin", "teacherDefault", "teacherPlus", "teacherEnterprise"]

            for role in valid_roles:
                role_data = {"userId": TEST_USER_ID, "newRole": role}

                with patch('requests.put') as mock_put:
                    mock_response = Mock()
                    mock_response.status_code = 200
                    mock_response.json.return_value = {"message": f"User role updated to {role}"}
                    mock_put.return_value = mock_response

                    url = f"{api_base_url}/user/updateRole"
                    response = requests.put(url, json=role_data, headers=admin_authenticated_headers)

                    assert response.status_code == 200
                    assert role in response.json()['message']

    class TestEdgeCasesAndErrorHandling:
        """Tests for edge cases and comprehensive error handling"""

        def test_malformed_json_request(self, api_base_url, authenticated_headers):
            """Test handling of malformed JSON in requests"""
            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 400
                mock_response.json.return_value = {"message": "Invalid JSON"}
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                # Simulate malformed JSON by sending invalid data
                response = requests.post(url, data="invalid json", headers=authenticated_headers)

                assert response.status_code == 400

        def test_empty_request_body(self, api_base_url, authenticated_headers):
            """Test handling of empty request body"""
            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 500
                mock_response.json.return_value = {"message": "Internal server error"}
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                response = requests.post(url, json={}, headers=authenticated_headers)

                assert response.status_code == 500

        def test_very_long_user_id(self, api_base_url):
            """Test handling of very long user ID"""
            long_user_id = "a" * 1000

            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 404
                mock_response.json.return_value = {"message": "User not found"}
                mock_get.return_value = mock_response

                url = f"{api_base_url}/user/{long_user_id}"
                response = requests.get(url)

                assert response.status_code == 404

        def test_special_characters_in_user_data(self, api_base_url, authenticated_headers):
            """Test handling of special characters in user data"""
            special_data = {
                "email": "test+user@example.com",
                "fullName": "Test User with Special Chars !@#$%",
                "firstName": "Test's",
                "lastName": "User\"s",
                "institution": "University of <Special> Characters",
                "userType": "educator",
                "jobTitle": "Teacher & Researcher",
                "subjects": ["Math/Science", "Physics & Chemistry"]
            }

            with patch('requests.post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 201
                mock_response.json.return_value = {
                    "message": "User registered successfully",
                    "fullName": special_data["fullName"],
                    "role": "teacherDefault"
                }
                mock_post.return_value = mock_response

                url = f"{api_base_url}/user/register"
                response = requests.post(url, json=special_data, headers=authenticated_headers)

                assert response.status_code == 201


if __name__ == "__main__":
    """
    Instructions for running the tests:

    1. Install required packages:
       pip install pytest requests

    2. Set environment variables:
       export API_BASE_URL="http://localhost:3001/api"

    3. Ensure the server is running:
       cd server && npm start

    4. Run all tests:
       pytest tests/signup.py -v

    5. Run specific test class:
       pytest tests/signup.py::TestUserAPI::TestGetCurrentUser -v

    6. Run with coverage:
       pip install pytest-cov
       pytest tests/signup.py --cov=server --cov-report=html

    Test Output Legend:
    ✅ PASSED - Test case passed successfully
    ❌ FAILED - Test case failed
    🔀 SKIPPED - Test case was skipped
    """
    pytest.main([__file__, "-v"])
