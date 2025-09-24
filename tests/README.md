# API Test Suite for DIYA Curriculum Portal

This directory contains comprehensive REST API tests for the user management endpoints in `server/routes/user.js`.

## Test Coverage

The test suite covers all 6 endpoints in the user routes:

1. **GET /api/user/me** - Get current user details (authenticated)
2. **GET /api/user/:userId** - Get user details by userId (no authentication required)
3. **POST /api/user/register** - Register new user (authenticated)
4. **PUT /api/user/update** - Update user profile (authenticated)
5. **GET /api/user/users** - Get all users (admin only)
6. **PUT /api/user/updateRole** - Update user role (admin only)

## Test Scenarios

### Authentication & Authorization
- ✅ Valid JWT token authentication
- ❌ No authentication token (401 errors)
- ❌ Invalid authentication token (401 errors)
- ❌ Non-admin accessing admin endpoints (403 errors)
- ✅ Admin accessing admin endpoints

### Data Validation
- ✅ Valid request data
- ❌ Missing required fields
- ❌ Malformed JSON requests
- ❌ Empty request bodies
- ✅ Special characters in user data
- ✅ Partial updates

### Database Operations
- ✅ User exists scenarios
- ❌ User not found scenarios (404 errors)
- ✅ User registration (new users)
- ✅ User already exists scenarios
- ✅ User profile updates
- ✅ Role updates with proper permissions

### Error Handling
- ❌ Server errors (500 status codes)
- ❌ Database connection issues
- ❌ Firebase authentication failures
- ✅ Proper error messages returned

## File Structure

```
tests/
├── __init__.py              # Python package initialization
├── signup.py               # Main test file with all test cases
├── conftest.py             # Pytest fixtures and configuration
├── test_data.py            # Sample data and mock responses
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## Setup and Installation

### 1. Install Python Dependencies

```bash
# From the tests directory
pip install -r requirements.txt
```

### 2. Environment Variables

Set the API base URL (optional, defaults to localhost:3001):

```bash
export API_BASE_URL="http://localhost:3001/api"
```

### 3. Start the Server

Make sure your API server is running:

```bash
# From the project root
cd server
npm install
npm start
```

The server should be running on http://localhost:3001

## Running the Tests

### Run All Tests
```bash
# From the tests directory or project root
pytest tests/signup.py -v
```

### Run Specific Test Classes
```bash
# Test only the /me endpoint
pytest tests/signup.py::TestUserAPI::TestGetCurrentUser -v

# Test only admin endpoints
pytest tests/signup.py::TestUserAPI::TestGetAllUsers -v
pytest tests/signup.py::TestUserAPI::TestUpdateUserRole -v
```

### Run with Coverage Report
```bash
pytest tests/signup.py --cov=server --cov-report=html
```

This generates an HTML coverage report in `htmlcov/index.html`

### Run with HTML Test Report
```bash
pytest tests/signup.py --html=report.html --self-contained-html
```

## Test Architecture

### Mocking Strategy

The tests use Python's `unittest.mock` to mock:
- **HTTP requests** using `requests` library mocks
- **Firebase Admin SDK** to avoid real database calls
- **JWT authentication** for testing different user roles
- **Firestore database operations** with predictable responses

### Test Data

Sample test data is defined in `test_data.py`:
- Sample user profiles for different roles (admin, teacherDefault, teacherPlus)
- Mock JWT tokens for authentication
- Mock Firestore responses for different scenarios
- Test user IDs for consistent testing

### Fixtures

The `conftest.py` file provides pytest fixtures:
- `api_base_url` - Configurable API base URL
- `mock_firestore_db` - Mocked Firestore database
- `authenticated_headers` - Headers with valid JWT token
- `admin_authenticated_headers` - Headers with admin JWT token
- `registration_data` - Sample user registration data
- `update_data` - Sample user update data

## Test Results Interpretation

### Expected Test Outcomes

- **✅ PASSED**: Test scenario executed successfully
- **❌ FAILED**: Test found an issue that needs to be addressed
- **🔀 SKIPPED**: Test was skipped (not applicable in this suite)

### Common Failure Reasons

1. **Server not running**: Make sure `npm start` is running in the server directory
2. **Port conflicts**: Ensure port 3001 is available
3. **Missing dependencies**: Run `pip install -r requirements.txt`
4. **Environment issues**: Check Python version (requires 3.7+)

## Integration with CI/CD

To integrate with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Install Python dependencies
  run: pip install -r tests/requirements.txt

- name: Start API server
  run: |
    cd server
    npm install
    npm start &
    sleep 10  # Wait for server to start

- name: Run API tests
  run: pytest tests/signup.py --html=test-report.html --cov=server
```

## Extending the Tests

To add new test cases:

1. **Add test data** in `test_data.py`
2. **Create new test methods** in the appropriate test class in `signup.py`
3. **Add new fixtures** in `conftest.py` if needed
4. **Follow the naming convention**: `test_<endpoint>_<scenario>`

### Example New Test Case

```python
def test_register_user_with_emoji(self, api_base_url, authenticated_headers):
    """Test user registration with emoji characters"""
    emoji_data = {
        "fullName": "Test User 😀",
        "firstName": "Test 👤",
        # ... other fields
    }

    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"message": "User registered successfully"}
        mock_post.return_value = mock_response

        url = f"{api_base_url}/user/register"
        response = requests.post(url, json=emoji_data, headers=authenticated_headers)

        assert response.status_code == 201
```

## Troubleshooting

### Common Issues

1. **ModuleNotFoundError**: Make sure you're in the correct directory and have installed dependencies
2. **Connection refused**: Check if the server is running on the correct port
3. **Import errors**: Ensure Python path includes the tests directory

### Debug Mode

Run tests with more verbose output:

```bash
pytest tests/signup.py -v -s --tb=long
```

### Logging

Add logging to debug test issues:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Security Considerations

- Tests use mock JWT tokens - never use real authentication tokens in tests
- Firebase mocking prevents accidental writes to production databases
- All test data is synthetic and safe for testing environments
- No real user credentials are used in the test suite

---

For questions or issues with the test suite, please check the project documentation or create an issue in the project repository.