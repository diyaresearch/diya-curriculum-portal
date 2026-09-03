# API Test Suite for DIYA Curriculum Portal

This directory contains the real integration tests for the user management endpoints in
`server/routes/user.js`: `tests/test_refactored_api.py`. They run as HTTP requests against
a live server started in mock-Firebase mode — nothing here mocks the server itself.

For unit-level coverage (roles, payments, pagination, ownership checks, custom claims, etc.)
see `server/__tests__/` (Jest) and `functions/__tests__/` (Jest). Firestore security rules
have their own suite under `tests/rules/`, run against the Firebase emulator — see
`tests/rules/package.json`.

## What used to be here

This directory previously also held `tests/signup.py`: 35 tests that mocked
`requests.get`/`requests.post` and then asserted the mock returned what it was told to
return. No application code ran, and no server needed to be listening — `unittest.mock`
was the only thing under test. It was deleted in #436, along with `conftest.py` and
`test_data.py`, which existed only to support it (and had drifted from the real API by
then anyway — its mock user IDs and JWT tokens didn't match what the server's Firebase mock
actually accepts). `pytest.ini` also had `[tool:pytest]` instead of `[pytest]`, which is
only valid in `setup.cfg` — pytest silently ignored the whole file as a result, which is
part of how `signup.py` went unnoticed as long as it did (`testpaths` and `python_files`
never took effect, so bare `pytest` only ever collected the real suite already).

## Test Coverage

`test_refactored_api.py` covers:

1. **GET /api/user/:userId** — auth required, self/admin get the full document, everyone
   else gets a redacted public profile (fullName/firstName/lastName only), not-found and
   validation-error paths
2. **POST /api/user/register** — auth required, validation errors
3. **GET /api/user/users** — auth + admin required
4. **PUT /api/user/updateRole** — auth + admin required, privilege-escalation attempts
5. Response-shape conventions shared across endpoints: the `{success, statusCode, error:
   {code, message, timestamp}}` error envelope, CORS headers, response latency, and that
   error messages don't leak stack traces or file paths

It does not cover `GET /api/user/me` or `PUT /api/user/update` yet — both need only a
bearer token, no fixture data, so they're a reasonable next addition.

## Setup and Installation

```bash
pip install -r tests/requirements.txt
```

`API_BASE_URL` controls the target (defaults to `http://localhost:3001/api`).

## Running the Tests

`./run_tests.sh` (from the repo root) is the easiest path: it creates/reuses a venv,
installs dependencies, and — if nothing is already listening on the target port — boots
the server itself with `NODE_ENV=test ENABLE_MOCK_FIREBASE=true`, so no real Firebase
project or credentials are needed. It tears that server down again on exit. If a server is
already running at `API_BASE_URL`, it's used as-is (whatever mode it's in).

```bash
./run_tests.sh              # standard run
./run_tests.sh coverage     # + HTML coverage report in htmlcov/
./run_tests.sh html         # + self-contained HTML test report
./run_tests.sh verbose      # -v -s --tb=long
./run_tests.sh quick        # -x, stop on first failure
```

To run against a server you're already running yourself, point `pytest` at it directly:

```bash
cd server && npm start &                       # or however you normally run it
API_BASE_URL=http://localhost:3001/api pytest -v
```

Mock mode matters here beyond convenience: `server/utils/firebaseMock.js`'s `MockAuth`
accepts a fixed set of bearer tokens (`valid-admin-token`, `valid-user-token`, ...) in
place of real Firebase ID tokens, which is how these tests exercise authenticated routes
without minting real tokens. Run against a server in real-Firebase mode and every
authenticated test will get a genuine 401.

## CI

`.github/workflows/ci.yml`'s `api-integration` job runs this suite the same way
`run_tests.sh` does (boot with `NODE_ENV=test ENABLE_MOCK_FIREBASE=true`, then `pytest`) —
keep the two in sync if either changes. It also sets `FIRESTORE_EMULATOR_HOST` so the
legacy content/lesson/module controllers, which initialize Firebase Admin for real at
`require()` time regardless of `ENABLE_MOCK_FIREBASE` (#362), have somewhere to point
without needing real credentials; these tests never exercise those routes.

## File Structure

```
tests/
├── __init__.py              # Python package marker
├── test_refactored_api.py   # The test suite
├── requirements.txt         # Python dependencies
├── rules/                   # Firestore security rules tests (separate Jest/emulator suite)
└── README.md                # This file
```

## Adding a test

Give it a bearer token from the fixed set `MockAuth.verifyIdToken` accepts (see
`server/utils/firebaseMock.js`) rather than mocking the response — that's what makes these
tests worth having.
