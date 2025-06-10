{
  "name": "clinic-scheduling-backend",
  "version": "1.0.0",
  "description": "Backend API for clinic patient scheduling with Athena integration",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "rate-limiter-flexible": "^3.0.8"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  },
  "keywords": [
    "healthcare",
    "scheduling",
    "athena",
    "clinic",
    "appointments"
  ],
  "author": "Your Clinic",
  "license": "MIT",
  "engines": {
    "node": ">=14.0.0"
  }
}
