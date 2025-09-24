#!/bin/bash

# Test runner script for DIYA Curriculum Portal API tests
# This script sets up the environment and runs the test suite

set -e  # Exit on any error

echo "🚀 DIYA Curriculum Portal API Test Runner"
echo "========================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.7+ to run tests."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip to manage Python packages."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install test dependencies
echo "📥 Installing test dependencies..."
pip3 install -r tests/requirements.txt

# Check if server is running
echo "🔍 Checking if API server is running..."
# ANJ: API_URL="${API_BASE_URL:-http://localhost:3001/api}"
API_URL="${API_BASE_URL:-http://localhost:3001}"

if curl -s -f "$API_URL" > /dev/null 2>&1; then
    echo "✅ API server is running at $API_URL"
else
    echo "⚠️  API server is not running at $API_URL"
    echo "   Please start the server first:"
    echo "   cd server && npm start"
    echo ""
    echo "   Or run tests in mock mode (recommended for development):"
    echo "   The tests are designed to work with mocked responses."
fi

echo ""
echo "🧪 Running API tests..."
echo "========================"

# Set default API URL if not provided
export API_BASE_URL="${API_BASE_URL:-http://localhost:3001/api}"

# Run tests with different options based on arguments
case "${1:-default}" in
    "coverage")
        echo "📊 Running tests with coverage report..."
        pytest tests/signup.py --cov=server --cov-report=html --cov-report=term
        echo ""
        echo "📊 Coverage report generated in htmlcov/index.html"
        ;;
    "html")
        echo "📄 Running tests with HTML report..."
        pytest tests/signup.py --html=test-report.html --self-contained-html
        echo ""
        echo "📄 Test report generated: test-report.html"
        ;;
    "verbose")
        echo "🔍 Running tests in verbose mode..."
        pytest tests/signup.py -v -s --tb=long
        ;;
    "quick")
        echo "⚡ Running tests in quick mode..."
        pytest tests/signup.py -x --tb=short
        ;;
    *)
        echo "🏃 Running standard test suite..."
        pytest tests/signup.py
        ;;
esac

echo ""
echo "✅ Test execution completed!"
echo ""
echo "📋 Available test commands:"
echo "   ./run_tests.sh              # Standard test run"
echo "   ./run_tests.sh coverage     # Run with coverage report"
echo "   ./run_tests.sh html         # Generate HTML test report"
echo "   ./run_tests.sh verbose      # Verbose output with full tracebacks"
echo "   ./run_tests.sh quick        # Stop on first failure"
echo ""
echo "🔧 Manual test commands:"
echo "   pytest tests/signup.py -v                                    # Verbose output"
echo "   pytest tests/signup.py::TestUserAPI::TestGetCurrentUser -v   # Specific test class"
echo "   pytest tests/signup.py -k \"test_register\" -v                # Tests matching pattern"
echo ""

# Deactivate virtual environment
deactivate
