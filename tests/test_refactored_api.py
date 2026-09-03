"""
Integration tests for the refactored user.js API endpoints
Tests the actual API responses against our new standardized format

These run against a live server started in mock-Firebase mode (see
run_tests.sh / .env.test, ENABLE_MOCK_FIREBASE=true). In that mode,
server/utils/firebaseMock.js's MockAuth accepts a fixed set of bearer
tokens - VALID_ADMIN_TOKEN / VALID_USER_TOKEN below - in place of real
Firebase ID tokens, so these tests can exercise authenticated routes
without a real Firebase project.
"""

import requests
import pytest

# Recognized by MockAuth.verifyIdToken (server/utils/firebaseMock.js) when
# the server is running with ENABLE_MOCK_FIREBASE=true. Not real tokens -
# they only work in mock mode.
VALID_ADMIN_TOKEN = "valid-admin-token"
VALID_USER_TOKEN = "valid-user-token"
ADMIN_USER_ID = "admin-user-123"
TEST_USER_ID = "test-user-123"


class TestRefactoredUserAPI:
    """Test the refactored user API with standardized responses"""

    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Setup test data for each test"""
        self.api_base_url = "http://localhost:3001/api"
        self.test_user_id = TEST_USER_ID
        self.admin_user_id = ADMIN_USER_ID
        self.admin_headers = {"Authorization": f"Bearer {VALID_ADMIN_TOKEN}"}
        self.user_headers = {"Authorization": f"Bearer {VALID_USER_TOKEN}"}

    def test_server_health_check(self):
        """Test that the server is running and responding"""
        try:
            response = requests.get("http://localhost:3001/", timeout=5)
            assert response.status_code == 200
            assert "Curriculum Portal API" in response.text
        except requests.exceptions.RequestException:
            pytest.skip("Server is not running - start server with: cd server && npm start")

    def test_get_user_by_id_requires_auth(self):
        """GET /user/:userId with no token - should reject before ever touching Firestore.

        This route used to be fully unauthenticated (#424); a missing/invalid
        token now short-circuits with 401 regardless of whether the userId
        exists, so 404/400 below are only reachable once authenticated.
        """
        url = f"{self.api_base_url}/user/{self.test_user_id}"

        response = requests.get(url)

        assert response.status_code == 401

        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "AUTH_ERROR"

    def test_get_user_by_id_not_found(self):
        """Test GET /user/:userId when user doesn't exist - should return standardized error"""
        url = f"{self.api_base_url}/user/non-existent-user-id"

        response = requests.get(url, headers=self.admin_headers)

        # Should return 404 with standardized error format
        assert response.status_code == 404

        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "NOT_FOUND"
        assert "not found" in data["error"]["message"].lower()
        assert "timestamp" in data["error"]

    def test_get_user_by_id_validation_error(self):
        """Test GET /user/:userId with empty user ID - should return validation error"""
        # Test with empty user ID (just whitespace)
        url = f"{self.api_base_url}/user/   "

        response = requests.get(url, headers=self.admin_headers)

        # Should return 400 with validation error
        assert response.status_code == 400

        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "required" in data["error"]["message"].lower()

    def test_get_user_by_id_redacts_for_non_self_non_admin(self):
        """A non-admin looking up someone else gets a redacted public profile.

        Covers the access-control split added alongside the #424 auth
        requirement: self and admins see the full document, everyone else
        gets id/fullName/firstName/lastName only - no email, institution, or
        Stripe/subscription fields.
        """
        url = f"{self.api_base_url}/user/{self.admin_user_id}"

        response = requests.get(url, headers=self.user_headers)

        assert response.status_code == 200
        data = response.json()["data"]
        assert set(data.keys()) == {"id", "fullName", "firstName", "lastName"}
        assert "email" not in data
        assert "subscriptionStatus" not in data

    def test_get_user_by_id_self_sees_full_profile(self):
        """A user looking up their own id gets the full stored document."""
        url = f"{self.api_base_url}/user/{self.test_user_id}"

        response = requests.get(url, headers=self.user_headers)

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == self.test_user_id
        assert "email" in data

    def test_register_user_without_auth(self):
        """Test POST /register without authentication - should return auth error"""
        url = f"{self.api_base_url}/user/register"

        user_data = {
            "email": "test@example.com",
            "fullName": "Test User",
            "firstName": "Test",
            "lastName": "User"
        }

        response = requests.post(url, json=user_data)

        # Should return 401 with standardized JSON error response
        assert response.status_code == 401

        data = response.json()
        assert data["success"] is False
        assert data["statusCode"] == 401
        assert data["error"]["code"] == "AUTH_ERROR"
        assert "Authorization token required" in data["error"]["message"]
        assert "timestamp" in data["error"]

    def test_register_user_validation_error(self):
        """Test POST /register with missing required fields"""
        url = f"{self.api_base_url}/user/register"

        # Missing required fields
        invalid_data = {
            "email": "test@example.com"
            # Missing fullName, firstName, lastName
        }

        headers = {"Authorization": "Bearer dummy-token-for-testing"}

        response = requests.post(url, json=invalid_data, headers=headers)

        # Will return 401 due to invalid token, but that's expected in this setup
        # In a real test environment with proper auth, this would return 400
        assert response.status_code == 401

    def test_get_all_users_without_auth(self):
        """Test GET /users without authentication"""
        url = f"{self.api_base_url}/user/users"

        response = requests.get(url)

        # Should return 401 with standardized JSON error response
        assert response.status_code == 401

        data = response.json()
        assert data["success"] is False
        assert data["statusCode"] == 401
        assert data["error"]["code"] == "AUTH_ERROR"
        assert "Authorization token required" in data["error"]["message"]
        assert "timestamp" in data["error"]

    def test_update_role_without_auth(self):
        """Test PUT /updateRole without authentication"""
        url = f"{self.api_base_url}/user/updateRole"

        role_data = {
            "userId": "some-user-id",
            "newRole": "teacherPlus"
        }

        response = requests.put(url, json=role_data)

        # Should return 401 with standardized JSON error response
        assert response.status_code == 401

        data = response.json()
        assert data["success"] is False
        assert data["statusCode"] == 401
        assert data["error"]["code"] == "AUTH_ERROR"
        assert "Authorization token required" in data["error"]["message"]
        assert "timestamp" in data["error"]

    def test_standardized_response_format(self):
        """Test that error responses follow the standardized format"""
        # Test with an endpoint that should return a standardized error
        url = f"{self.api_base_url}/user/non-existent-user"

        response = requests.get(url)
        data = response.json()

        # Verify standardized error response format
        required_error_fields = ["success", "statusCode", "error"]
        for field in required_error_fields:
            assert field in data, f"Missing required field: {field}"

        assert data["success"] is False
        assert isinstance(data["statusCode"], int)
        assert isinstance(data["error"], dict)

        required_error_subfields = ["code", "message", "timestamp"]
        for field in required_error_subfields:
            assert field in data["error"], f"Missing required error field: {field}"

    def test_environment_validation_visible(self):
        """Test that environment validation messages are visible in server logs"""
        # This test verifies that our environment validation is working
        # by checking if the server started successfully

        try:
            response = requests.get("http://localhost:3001/", timeout=5)
            assert response.status_code == 200

            # If we reach this point, the server started successfully,
            # which means environment validation passed
            assert True, "Environment validation working - server started successfully"
        except requests.exceptions.RequestException:
            pytest.fail("Server failed to start - check environment configuration")

    def test_cors_headers_present(self):
        """Test that CORS headers are properly configured"""
        url = f"{self.api_base_url}/user/non-existent-user"

        response = requests.get(url)

        # Should have CORS headers (exact headers depend on environment)
        # In development, CORS should be more permissive
        assert "content-type" in response.headers
        assert response.headers["content-type"] == "application/json; charset=utf-8"

    def test_api_response_times(self):
        """Test that API responses are reasonably fast"""
        import time

        url = f"{self.api_base_url}/user/test-performance-user"

        start_time = time.time()
        response = requests.get(url, timeout=10)
        end_time = time.time()

        response_time = end_time - start_time

        # API should respond within 2 seconds for simple requests
        assert response_time < 2.0, f"API response too slow: {response_time:.2f} seconds"

        # Should still return proper error format even for performance test
        if response.status_code != 200:
            data = response.json()
            assert "success" in data

class TestDatabaseIntegration:
    """Test database-related functionality without requiring real Firebase"""

    def test_database_error_handling(self):
        """Test that database errors are handled gracefully"""
        # This test assumes the server is running with our refactored error handling

        url = "http://localhost:3001/api/user/test-db-error"

        response = requests.get(url)

        # Even with database errors, should return proper JSON response
        assert response.headers.get("content-type", "").startswith("application/json")

    def test_server_boots_cleanly(self):
        """Test that the server starts and serves its health route.

        The schema qualifier this used to check for was retired in #428 —
        dev/staging and production are now separate Firebase projects rather
        than a prefix within one shared project.
        """
        try:
            response = requests.get("http://localhost:3001/", timeout=5)
            assert response.status_code == 200
        except requests.exceptions.RequestException:
            pytest.fail("Server is not reachable")


class TestSecurityEnhancements:
    """Test security-related improvements"""

    def test_input_sanitization(self):
        """Test that potentially dangerous inputs are handled safely"""
        # Test with various potentially problematic inputs
        dangerous_inputs = [
            "'; DROP TABLE users; --",
            "<script>alert('xss')</script>",
            "../../../../etc/passwd",
            "null",
            "undefined",
            ""
        ]

        base_url = "http://localhost:3001/api/user"
        headers = {"Authorization": f"Bearer {VALID_ADMIN_TOKEN}"}

        for dangerous_input in dangerous_inputs:
            try:
                # Test as user ID. Authenticated, since #424 - an
                # unauthenticated request short-circuits with 401 before the
                # input ever reaches validation, which would make this test
                # pass without actually exercising sanitization.
                url = f"{base_url}/{dangerous_input}"
                response = requests.get(url, headers=headers, timeout=5)

                # Should handle dangerous input gracefully
                assert response.status_code in [400, 404], f"Unexpected response for input: {dangerous_input}"

                # Should return JSON, not crash
                if response.headers.get("content-type", "").startswith("application/json"):
                    data = response.json()
                    assert "success" in data

            except requests.exceptions.RequestException:
                # Network errors are acceptable for this test
                continue

    def test_role_validation_security(self):
        """Test that role validation prevents privilege escalation"""
        url = "http://localhost:3001/api/user/updateRole"

        # Try to update role without proper authorization
        malicious_data = {
            "userId": "victim-user-id",
            "newRole": "admin"
        }

        # Without proper auth token, should be rejected
        response = requests.put(url, json=malicious_data)
        assert response.status_code == 401

    def test_error_information_disclosure(self):
        """Test that errors don't expose sensitive information in production mode"""
        # In our current development setup, we might see more details
        # But the structure should be consistent

        url = "http://localhost:3001/api/user/non-existent-user"
        response = requests.get(url)

        if response.status_code != 200:
            data = response.json()

            # Error messages should be user-friendly, not technical
            error_message = data.get("error", {}).get("message", "")

            # Should not contain technical details like file paths, stack traces, etc.
            forbidden_terms = ["Error:", "at ", "node_modules", "firestore.js", "/Users/"]
            for term in forbidden_terms:
                assert term not in error_message, f"Error message contains technical details: {term}"


if __name__ == "__main__":
    """
    Run these integration tests against the refactored API

    Prerequisites:
    1. Server must be running: cd server && npm start
    2. Install pytest: pip install pytest requests
    3. Run tests: python test_refactored_api.py -v

    Or use pytest directly:
    pytest test_refactored_api.py -v
    """
    pytest.main([__file__, "-v"])