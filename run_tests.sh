#!/bin/bash

# Test runner script for DIYA Curriculum Portal API tests
#
# Runs the real integration suite (tests/test_refactored_api.py) against a
# live server. If nothing is already listening on the target port, this
# script boots the server itself in mock-Firebase mode (NODE_ENV=test,
# ENABLE_MOCK_FIREBASE=true — see server/utils/firebaseMock.js) so the
# suite needs no real Firebase project or credentials, and tears it down
# on exit. This mirrors the api-integration job in .github/workflows/ci.yml
# (#436) — keep the two in sync if either changes.

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
pip3 install -q -r tests/requirements.txt

API_URL="${API_BASE_URL:-http://localhost:3001/api}"
SERVER_ORIGIN="${API_URL%/api}"
SERVER_PID=""

cleanup() {
    if [ -n "$SERVER_PID" ]; then
        echo "🛑 Stopping the server we started (pid $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
    deactivate 2>/dev/null || true
}
trap cleanup EXIT

echo "🔍 Checking if API server is running..."
if curl -s -f "$SERVER_ORIGIN/" > /dev/null 2>&1; then
    echo "✅ API server is already running at $SERVER_ORIGIN — using it as-is."
else
    echo "⚠️  No server at $SERVER_ORIGIN — starting one in mock-Firebase mode."
    if [ ! -d "server/node_modules" ]; then
        echo "📥 Installing server dependencies..."
        (cd server && npm install)
    fi

    (
      cd server
      NODE_ENV=test \
      ENABLE_MOCK_FIREBASE=true \
      PORT="${PORT:-3001}" \
      SERVER_ALLOW_ORIGIN="${SERVER_ALLOW_ORIGIN:-http://localhost:3000}" \
      nohup node index.js > ../server-test.log 2>&1 &
      echo $! > ../.server_test.pid
    )
    SERVER_PID=$(cat .server_test.pid)
    rm -f .server_test.pid

    echo "⏳ Waiting for it to become healthy..."
    ready=false
    for _ in $(seq 1 30); do
        if curl -s -f "$SERVER_ORIGIN/" > /dev/null 2>&1; then
            ready=true
            break
        fi
        sleep 1
    done

    if [ "$ready" != true ]; then
        echo "❌ Server did not become healthy in time. Log follows:"
        cat server-test.log
        exit 1
    fi
    echo "✅ Mock server is running at $SERVER_ORIGIN (pid $SERVER_PID)"
fi

echo ""
echo "🧪 Running API tests..."
echo "========================"

export API_BASE_URL="$API_URL"

# Run tests with different options based on arguments
case "${1:-default}" in
    "coverage")
        echo "📊 Running tests with coverage report..."
        pytest --cov=server --cov-report=html --cov-report=term
        echo ""
        echo "📊 Coverage report generated in htmlcov/index.html"
        ;;
    "html")
        echo "📄 Running tests with HTML report..."
        pytest --html=test-report.html --self-contained-html
        echo ""
        echo "📄 Test report generated: test-report.html"
        ;;
    "verbose")
        echo "🔍 Running tests in verbose mode..."
        pytest -v -s --tb=long
        ;;
    "quick")
        echo "⚡ Running tests in quick mode..."
        pytest -x --tb=short
        ;;
    *)
        echo "🏃 Running standard test suite..."
        pytest
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
echo "   pytest -v                                          # Verbose output"
echo "   pytest tests/test_refactored_api.py -v              # This file only"
echo "   pytest -k \"user_by_id\" -v                          # Tests matching pattern"
