# REST API Documentation

## Base URL

/api

## Endpoints

### Units

1. Get All Units

- URL: /units
- Method: GET
- Description: Retrieve all content information.
- Request Parameters: None
- Response:
  - 200 OK: Returns an array of content information.

## Authentication

Authentication is handled using JWT (JSON Web Token). Users need to provide a valid JWT token in the Authorization header of their requests.

## Error Responses

- 400 Bad Request: The request format is incorrect.
- 401 Unauthorized: The user is not authenticated or authentication fails.
- 404 Not Found: The requested resource does not exist.
- 500 Internal Server Error: An internal server error occurred.
