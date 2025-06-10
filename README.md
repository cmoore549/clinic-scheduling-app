# Clinic Scheduling Backend

A comprehensive backend API for patient self-scheduling with Athena Health integration.

## Features

- **Athena Health Integration**: Real-time appointment availability and booking
- **Admin Interface**: Easy management of appointment types and provider mappings
- **RESTful API**: Clean endpoints for frontend integration
- **Security**: Rate limiting, CORS protection, and input validation
- **Scalable**: Designed for easy database integration and horizontal scaling

## Quick Start

### Prerequisites

- Node.js 14+ 
- Athena Health API credentials
- (Optional) Database (PostgreSQL, MongoDB, or MySQL)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd clinic-scheduling-backend
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your Athena API credentials
```

3. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

4. **Access the admin interface:**
Open `http://localhost:3001/admin` in your browser

## API Endpoints

### Public API (for frontend)

- `GET /api/appointment-types` - Get all active appointment types
- `GET /api/appointments/available` - Get available time slots
- `POST /api/appointments/book` - Book an appointment

### Admin API

- `GET /api/admin/appointment-types` - Get all appointment types
- `POST /api/admin/appointment-types` - Create new appointment type
- `PUT /api/admin/appointment-types/:id` - Update appointment type
- `DELETE /api/admin/appointment-types/:id` - Deactivate appointment type
- `GET /api/admin/providers` - Get all providers
- `PUT /api/admin/providers/:id` - Update provider mapping
- `GET /api/admin/test-athena` - Test Athena API connection
- `POST /api/admin/sync-providers` - Sync providers from Athena

## Athena API Integration

### Required Athena Endpoints

The backend integrates with these Athena API endpoints:

1. **Authentication:**
   - `POST /oauth2/v1/token` - Get access token

2. **Providers:**
   - `GET /v1/{practiceId}/providers` - List all providers

3. **Appointment Types:**
   - `GET /v1/{practiceId}/appointmenttypes` - Get appointment types

4. **Appointments:**
   - `GET /v1/{practiceId}/appointments/open` - Get available slots
   - `POST /v1/{practiceId}/appointments` - Book appointment

5. **Patients:**
   - `GET /v1/{practiceId}/patients` - Search patients
   - `POST /v1/{practiceId}/patients` - Create patient

### Authentication Flow

1. Server authenticates with Athena using client credentials
2. Access token is cached and refreshed automatically
3. All API calls include Bearer token in Authorization header

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ATHENA_BASE_URL` | Athena API base URL | Yes |
| `ATHENA_CLIENT_ID` | Your Athena client ID | Yes |
| `ATHENA_CLIENT_SECRET` | Your Athena client secret | Yes |
| `ATHENA_PRACTICE_ID` | Your practice ID in Athena | Yes |
| `PORT` | Server port (default: 3001) | No |

### Appointment Type Mapping

Each appointment type in the admin interface maps to:
- **Display Information**: Name, description, icon, color
- **Athena Mapping**: `athenaAppointmentTypeId` 
- **Provider Assignment**: Which providers offer this service
- **Scheduling Rules**: Duration, availability

## Admin Interface Features

### Appointment Types Management
- ✅ Add/edit/deactivate appointment types
- ✅ Map to Athena appointment type IDs
- ✅ Assign providers to services
- ✅ Customize display (icons, colors, descriptions)

### Provider Management
- ✅ View all providers
- ✅ Map to Athena provider IDs
- ✅ Sync from Athena automatically

### System Management
- ✅ Test Athena API connection
- ✅ View system status
- ✅ Sync data from Athena

## Data Storage

Currently uses in-memory storage for simplicity. For production, integrate with:

### PostgreSQL Example:
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

### MongoDB Example:
```javascript
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
```

## Security Features

- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Restricts cross-origin requests
- **Input Validation**: Sanitizes all inputs
- **Error Handling**: Prevents information leakage

## Error Handling

All errors are handled gracefully:
- Athena API failures fall back to cached data
- Invalid requests return descriptive error messages
- System errors are logged but don't expose sensitive information

## Deployment

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use secure secrets for JWT and client credentials
- Configure proper CORS origins
- Set up proper logging

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Monitoring

Monitor these key metrics:
- Athena API response times
- Authentication token refresh frequency
- Appointment booking success rate
- Error rates by endpoint

## Support

For Athena API documentation and support:
- [Athena Developer Portal](https://docs.athenahealth.com/)
- [API Reference](https://docs.athenahealth.com/api/api-ref)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
