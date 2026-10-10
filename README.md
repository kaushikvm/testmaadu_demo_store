# EventHub — Improved QA Practice Demo

A responsive event-booking demo inspired by the provided EventHub screenshot. Includes a home page, event search/filtering, sign-in/register modals, booking creation/cancellation, admin event management, and API documentation with live endpoint testing.

## Requirements
- Node.js 18+ recommended
- npm

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000

## Demo login
- Email: `demo@eventhub.test`
- Password: `Demo@123`

## Same-price test requirement
These two differently named events intentionally have the same price of **₹1,500**:
- Dilli Diwali Mela — ₹1,500
- Hollywood Monsoon Night — ₹1,500

This is useful for checking that the UI/API identifies products/events by unique IDs rather than price alone.

## API endpoints
- `GET /api/health`
- `GET /api/events?q=&category=&featured=`
- `GET /api/events/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/bookings?email=`
- `POST /api/bookings`
- `PATCH /api/bookings/:id/cancel`
- `GET /api/admin/summary`
- `POST /api/admin/events`
- `PATCH /api/admin/events/:id`
- `DELETE /api/admin/events/:id`

### Sample booking request
```json
{
  "eventId": "EVT-1001",
  "email": "demo@eventhub.test",
  "name": "Demo User",
  "quantity": 2
}
```

## QA scenarios to try
1. Search for a partial event name and then clear the search.
2. Filter by Concert and sort by price.
3. Book two seats and verify that available seats decrease by two.
4. Attempt to book more seats than remain and verify a `409` response.
5. Register with an invalid email or a password shorter than 8 characters.
6. Try logging in with a wrong password.
7. Cancel a booking and verify seats return to inventory.
8. Add an event with missing fields or a negative price and verify validation.
9. Compare the two ₹1,500 events; each has its own unique event ID.
10. Use the API Docs page to call live GET endpoints.

## Important demo limitations
- This is a QA practice/demo project, not production-ready ticketing software.
- Data is stored in server memory and resets when the server restarts.
- Authentication is intentionally simplified for test practice. Passwords are not hashed, sessions/tokens are not implemented, and admin routes are not protected. Do not deploy this version with real users or real payments.
- Event imagery is loaded from Unsplash and therefore needs internet access.
