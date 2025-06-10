// server.js - Complete Backend Server with Real Athena Health API Integration
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Athena API Configuration
const ATHENA_CONFIG = {
  baseURL: process.env.ATHENA_BASE_URL || 'https://api.athenahealth.com',
  clientId: process.env.ATHENA_CLIENT_ID,
  clientSecret: process.env.ATHENA_CLIENT_SECRET,
  practiceId: process.env.ATHENA_PRACTICE_ID,
  // Use sandbox for testing, production for live
  environment: process.env.ATHENA_ENVIRONMENT || 'preview1' // 'preview1' for sandbox, 'api' for production
};

// Validate required environment variables
if (!ATHENA_CONFIG.clientId || !ATHENA_CONFIG.clientSecret || !ATHENA_CONFIG.practiceId) {
  console.error('❌ Missing required Athena API credentials in environment variables');
  console.error('Please check your .env file contains:');
  console.error('- ATHENA_CLIENT_ID');
  console.error('- ATHENA_CLIENT_SECRET'); 
  console.error('- ATHENA_PRACTICE_ID');
}

// In-memory storage (replace with database in production)
let appointmentTypes = [
  {
    id: 1,
    name: 'Annual Physical Exam',
    description: 'Comprehensive yearly health checkup including vital signs, lab work, and preventive screenings',
    duration: 60,
    icon: 'Heart',
    color: 'bg-blue-500',
    athenaAppointmentTypeId: '2', // Map to your actual Athena appointment type ID
    providers: [1, 2],
    active: true
  },
  {
    id: 2,
    name: 'Sick Visit',
    description: 'Treatment for acute illness, infections, minor injuries, and urgent health concerns',
    duration: 20,
    icon: 'Stethoscope',
    color: 'bg-red-500',
    athenaAppointmentTypeId: '1', // Map to your actual Athena appointment type ID
    providers: [1, 2, 4],
    active: true
  },
  {
    id: 3,
    name: 'Follow-up Visit',
    description: 'Review test results, monitor treatment progress, and adjust care plans',
    duration: 30,
    icon: 'Activity',
    color: 'bg-green-500',
    athenaAppointmentTypeId: '3', // Map to your actual Athena appointment type ID
    providers: [1, 2, 5],
    active: true
  },
  {
    id: 4,
    name: 'Pediatric Checkup',
    description: 'Well-child visits, vaccinations, growth monitoring, and developmental assessments',
    duration: 45,
    icon: 'Baby',
    color: 'bg-purple-500',
    athenaAppointmentTypeId: '4', // Map to your actual Athena appointment type ID
    providers: [3],
    active: true
  },
  {
    id: 5,
    name: 'Consultation',
    description: 'Specialist consultation for complex conditions and second opinions',
    duration: 45,
    icon: 'UserCheck',
    color: 'bg-indigo-500',
    athenaAppointmentTypeId: '5', // Map to your actual Athena appointment type ID
    providers: [2, 5, 6],
    active: true
  },
  {
    id: 6,
    name: 'Eye Exam',
    description: 'Comprehensive vision screening, eye health assessment, and prescription updates',
    duration: 30,
    icon: 'Eye',
    color: 'bg-teal-500',
    athenaAppointmentTypeId: '6', // Map to your actual Athena appointment type ID
    providers: [7],
    active: true
  }
];

let providers = [
  { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Family Medicine', athenaProviderId: '1' },
  { id: 2, name: 'Dr. Michael Chen', specialty: 'Internal Medicine', athenaProviderId: '2' },
  { id: 3, name: 'Dr. Emily Rodriguez', specialty: 'Pediatrics', athenaProviderId: '3' },
  { id: 4, name: 'Dr. Lisa Park', specialty: 'Urgent Care', athenaProviderId: '4' },
  { id: 5, name: 'Dr. Amanda White', specialty: 'Cardiology', athenaProviderId: '5' },
  { id: 6, name: 'Dr. Robert Kim', specialty: 'Dermatology', athenaProviderId: '6' },
  { id: 7, name: 'Dr. Jennifer Lee', specialty: 'Ophthalmology', athenaProviderId: '7' }
];

// Athena API Authentication
let athenaAccessToken = null;
let tokenExpiry = null;

/**
 * Get Athena Health API Access Token
 * Uses OAuth2 client credentials flow as per Athena documentation
 */
async function getAthenaAccessToken() {
  if (athenaAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return athenaAccessToken;
  }

  try {
    console.log('🔐 Requesting new Athena access token...');
    
    // Athena OAuth2 endpoint
    const tokenUrl = `${ATHENA_CONFIG.baseURL}/oauth2/v1/token`;
    
    const credentials = Buffer.from(`${ATHENA_CONFIG.clientId}:${ATHENA_CONFIG.clientSecret}`).toString('base64');
    
    const response = await axios.post(tokenUrl, 
      'grant_type=client_credentials&scope=athena/service/Athenahealth.MDP.*',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        timeout: 10000
      }
    );

    athenaAccessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute early
    
    console.log('✅ Athena access token obtained successfully');
    return athenaAccessToken;
    
  } catch (error) {
    console.error('❌ Error getting Athena access token:', error.response?.data || error.message);
    throw new Error(`Athena authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Make authenticated requests to Athena Health API
 */
async function makeAthenaRequest(endpoint, method = 'GET', data = null, params = {}) {
  try {
    const token = await getAthenaAccessToken();
    
    const config = {
      method,
      url: `${ATHENA_CONFIG.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': method === 'GET' ? 'application/json' : 'application/x-www-form-urlencoded'
      },
      timeout: 15000,
      params: method === 'GET' ? params : undefined
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      if (method === 'POST') {
        // Athena expects form-encoded data for POST requests
        config.data = new URLSearchParams(data).toString();
      } else {
        config.data = data;
      }
    }

    console.log(`📡 Making Athena API request: ${method} ${endpoint}`);
    const response = await axios(config);
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Athena API request failed (${method} ${endpoint}):`, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Token expired, clear it and retry once
      athenaAccessToken = null;
      tokenExpiry = null;
      console.log('🔄 Token expired, retrying with new token...');
      
      try {
        const token = await getAthenaAccessToken();
        const retryConfig = { ...config };
        retryConfig.headers.Authorization = `Bearer ${token}`;
        const retryResponse = await axios(retryConfig);
        return retryResponse.data;
      } catch (retryError) {
        throw new Error(`Athena API authentication failed: ${retryError.response?.data?.error || retryError.message}`);
      }
    }
    
    throw new Error(`Athena API error: ${error.response?.data?.error || error.message}`);
  }
}

// ============================================================================
// PUBLIC API ROUTES (for frontend)
// ============================================================================

/**
 * GET /api/appointment-types
 * Returns all active appointment types for frontend display
 */
app.get('/api/appointment-types', (req, res) => {
  try {
    const activeTypes = appointmentTypes
      .filter(type => type.active)
      .map(type => ({
        ...type,
        providers: type.providers.map(providerId => 
          providers.find(p => p.id === providerId)
        ).filter(Boolean)
      }));
    
    console.log(`📋 Returning ${activeTypes.length} active appointment types`);
    res.json(activeTypes);
    
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    res.status(500).json({ error: 'Failed to fetch appointment types' });
  }
});

/**
 * GET /api/appointments/available
 * Get available appointment slots from Athena Health API
 * Query params: providerId, date, appointmentTypeId
 */
app.get('/api/appointments/available', async (req, res) => {
  try {
    const { providerId, date, appointmentTypeId } = req.query;
    
    // Validate required parameters
    if (!providerId || !date || !appointmentTypeId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: providerId, date, and appointmentTypeId are required' 
      });
    }

    // Find the appointment type to get Athena mapping
    const appointmentType = appointmentTypes.find(type => type.id == appointmentTypeId);
    if (!appointmentType) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }

    // Find the provider to get Athena mapping
    const provider = providers.find(p => p.id == providerId);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    console.log(`🔍 Fetching available appointments for provider ${provider.athenaProviderId} on ${date}`);

    // Athena API endpoint for open appointment slots
    const endpoint = `/v1/${ATHENA_CONFIG.practiceId}/appointments/open`;
    
    const params = {
      departmentid: '1', // You may need to configure this based on your practice setup
      providerid: provider.athenaProviderId,
      appointmenttypeid: appointmentType.athenaAppointmentTypeId,
      startdate: date,
      enddate: date,
      showfrozenslots: 'false', // Don't show frozen time slots
      ignoreschedulablepermission: 'false'
    };

    const athenaResponse = await makeAthenaRequest(endpoint, 'GET', null, params);
    
    // Transform Athena response to our format
    let availableSlots = [];
    
    if (athenaResponse.appointments && Array.isArray(athenaResponse.appointments)) {
      availableSlots = athenaResponse.appointments.map(apt => {
        // Convert Athena time format (e.g., "09:00") to display format (e.g., "9:00 AM")
        const time24 = apt.starttime;
        const [hours, minutes] = time24.split(':');
        const hour12 = hours % 12 || 12;
        const ampm = hours < 12 ? 'AM' : 'PM';
        return `${hour12}:${minutes} ${ampm}`;
      });
    }
    
    console.log(`✅ Found ${availableSlots.length} available slots`);
    res.json({ availableSlots });
    
  } catch (error) {
    console.error('Error fetching available appointments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available appointments. Please try again later.' 
    });
  }
});

/**
 * POST /api/appointments/book
 * Book an appointment through Athena Health API
 */
app.post('/api/appointments/book', async (req, res) => {
  try {
    const { providerId, date, time, appointmentTypeId, patient } = req.body;

    // Validate required fields
    if (!providerId || !date || !time || !appointmentTypeId || !patient) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }

    if (!patient.firstName || !patient.lastName || !patient.email || !patient.phone || !patient.dateOfBirth) {
      return res.status(400).json({ error: 'Missing required patient information' });
    }

    // Find mappings
    const appointmentType = appointmentTypes.find(type => type.id == appointmentTypeId);
    const provider = providers.find(p => p.id == providerId);
    
    if (!appointmentType || !provider) {
      return res.status(404).json({ error: 'Invalid appointment type or provider' });
    }

    console.log(`📅 Booking appointment for ${patient.firstName} ${patient.lastName}`);

    // Convert display time back to 24-hour format for Athena
    const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      return res.status(400).json({ error: 'Invalid time format' });
    }
    
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const ampm = timeMatch[3].toUpperCase();
    
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const appointmentTime = `${hours.toString().padStart(2, '0')}:${minutes}`;

    // Step 1: Search for existing patient or create new patient
    let patientId;
    
    try {
      console.log('🔍 Searching for existing patient...');
      
      // Search for existing patient by name and DOB
      const patientSearchEndpoint = `/v1/${ATHENA_CONFIG.practiceId}/patients`;
      const searchParams = {
        firstname: patient.firstName,
        lastname: patient.lastName,
        dob: patient.dateOfBirth
      };
      
      const patientSearchResponse = await makeAthenaRequest(patientSearchEndpoint, 'GET', null, searchParams);
      
      if (patientSearchResponse.patients && patientSearchResponse.patients.length > 0) {
        patientId = patientSearchResponse.patients[0].patientid;
        console.log(`✅ Found existing patient: ${patientId}`);
      } else {
        console.log('👤 Creating new patient...');
        
        // Create new patient
        const newPatientData = {
          firstname: patient.firstName,
          lastname: patient.lastName,
          dob: patient.dateOfBirth,
          email: patient.email,
          mobilephone: patient.phone.replace(/\D/g, ''), // Remove non-digits
          departmentid: '1', // You may need to configure this
          // Add additional required fields based on your Athena setup
          sex: 'U', // Unknown - you may want to add a gender field to your form
          countrycode3166: 'US', // Assuming US patients
          zip: '00000' // You may want to add address fields to your form
        };
        
        const newPatientResponse = await makeAthenaRequest(
          `/v1/${ATHENA_CONFIG.practiceId}/patients`, 
          'POST', 
          newPatientData
        );
        
        if (newPatientResponse && newPatientResponse[0] && newPatientResponse[0].patientid) {
          patientId = newPatientResponse[0].patientid;
          console.log(`✅ Created new patient: ${patientId}`);
        } else {
          throw new Error('Failed to create patient - no patient ID returned');
        }
      }
    } catch (patientError) {
      console.error('❌ Error handling patient:', patientError);
      return res.status(500).json({ 
        error: 'Failed to create or find patient record. Please try again.' 
      });
    }

    // Step 2: Book the appointment
    try {
      console.log('📅 Booking appointment...');
      
      const appointmentData = {
        appointmenttypeid: appointmentType.athenaAppointmentTypeId,
        departmentid: '1', // Configure based on your practice
        patientid: patientId,
        providerid: provider.athenaProviderId,
        appointmentdate: date,
        appointmenttime: appointmentTime,
        reasonforappt: patient.reason || appointmentType.name
      };

      const bookingResponse = await makeAthenaRequest(
        `/v1/${ATHENA_CONFIG.practiceId}/appointments`, 
        'POST', 
        appointmentData
      );

      if (bookingResponse && bookingResponse[0] && bookingResponse[0].appointmentid) {
        console.log(`✅ Appointment booked successfully: ${bookingResponse[0].appointmentid}`);
        
        res.json({ 
          success: true, 
          appointmentId: bookingResponse[0].appointmentid,
          patientId: patientId,
          message: 'Appointment booked successfully' 
        });
      } else {
        throw new Error('Booking failed - no appointment ID returned');
      }

    } catch (bookingError) {
      console.error('❌ Error booking appointment:', bookingError);
      return res.status(500).json({ 
        error: 'Failed to book appointment. The time slot may no longer be available.' 
      });
    }

  } catch (error) {
    console.error('❌ Error in booking process:', error);
    res.status(500).json({ error: 'Failed to book appointment. Please try again.' });
  }
});

// ============================================================================
// ADMIN API ROUTES
// ============================================================================

/**
 * GET /api/admin/appointment-types
 * Get all appointment types (including inactive) for admin management
 */
app.get('/api/admin/appointment-types', (req, res) => {
  res.json(appointmentTypes);
});

/**
 * POST /api/admin/appointment-types
 * Create new appointment type
 */
app.post('/api/admin/appointment-types', (req, res) => {
  try {
    const newType = {
      id: Math.max(...appointmentTypes.map(t => t.id), 0) + 1,
      ...req.body,
      active: true
    };
    
    appointmentTypes.push(newType);
    console.log(`➕ Created new appointment type: ${newType.name}`);
    res.json(newType);
    
  } catch (error) {
    console.error('Error creating appointment type:', error);
    res.status(500).json({ error: 'Failed to create appointment type' });
  }
});

/**
 * PUT /api/admin/appointment-types/:id
 * Update appointment type
 */
app.put('/api/admin/appointment-types/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = appointmentTypes.findIndex(type => type.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }
    
    appointmentTypes[index] = { ...appointmentTypes[index], ...req.body };
    console.log(`✏️ Updated appointment type: ${appointmentTypes[index].name}`);
    res.json(appointmentTypes[index]);
    
  } catch (error) {
    console.error('Error updating appointment type:', error);
    res.status(500).json({ error: 'Failed to update appointment type' });
  }
});

/**
 * DELETE /api/admin/appointment-types/:id
 * Deactivate appointment type (soft delete)
 */
app.delete('/api/admin/appointment-types/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = appointmentTypes.findIndex(type => type.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }
    
    appointmentTypes[index].active = false;
    console.log(`🗑️ Deactivated appointment type: ${appointmentTypes[index].name}`);
    res.json({ message: 'Appointment type deactivated' });
    
  } catch (error) {
    console.error('Error deactivating appointment type:', error);
    res.status(500).json({ error: 'Failed to deactivate appointment type' });
  }
});

/**
 * GET /api/admin/providers
 * Get all providers for admin management
 */
app.get('/api/admin/providers', (req, res) => {
  res.json(providers);
});

/**
 * PUT /api/admin/providers/:id
 * Update provider information and Athena mapping
 */
app.put('/api/admin/providers/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = providers.findIndex(provider => provider.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    providers[index] = { ...providers[index], ...req.body };
    console.log(`✏️ Updated provider: ${providers[index].name}`);
    res.json(providers[index]);
    
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

/**
 * GET /api/admin/test-athena
 * Test Athena API connection and credentials
 */
app.get('/api/admin/test-athena', async (req, res) => {
  try {
    console.log('🧪 Testing Athena API connection...');
    
    // Test authentication
    const token = await getAthenaAccessToken();
    
    // Test API call - get practice information
    const practiceResponse = await makeAthenaRequest(`/v1/${ATHENA_CONFIG.practiceId}/misc/practicestatus`);
    
    // Test providers endpoint
    const providersResponse = await makeAthenaRequest(`/v1/${ATHENA_CONFIG.practiceId}/providers`);
    
    console.log('✅ Athena API connection test successful');
    res.json({ 
      success: true, 
      message: 'Successfully connected to Athena API',
      practiceId: ATHENA_CONFIG.practiceId,
      environment: ATHENA_CONFIG.environment,
      providersCount: providersResponse.providers?.length || 0,
      practiceInfo: practiceResponse
    });
    
  } catch (error) {
    console.error('❌ Athena API connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to connect to Athena API',
      details: 'Check your credentials and network connection'
    });
  }
});

/**
 * POST /api/admin/sync-providers
 * Sync providers from Athena Health API
 */
app.post('/api/admin/sync-providers', async (req, res) => {
  try {
    console.log('🔄 Syncing providers from Athena...');
    
    const athenaProvidersResponse = await makeAthenaRequest(`/v1/${ATHENA_CONFIG.practiceId}/providers`);
    
    if (athenaProvidersResponse.providers && Array.isArray(athenaProvidersResponse.providers)) {
      let syncedCount = 0;
      let addedCount = 0;
      
      athenaProvidersResponse.providers.forEach(athenaProvider => {
        const existingProvider = providers.find(p => p.athenaProviderId === athenaProvider.providerid);
        
        if (existingProvider) {
          // Update existing provider
          existingProvider.name = `${athenaProvider.firstname} ${athenaProvider.lastname}`;
          existingProvider.specialty = athenaProvider.specialty || existingProvider.specialty;
          syncedCount++;
        } else {
          // Add new provider
          const newProvider = {
            id: Math.max(...providers.map(p => p.id), 0) + 1,
            name: `${athenaProvider.firstname} ${athenaProvider.lastname}`,
            specialty: athenaProvider.specialty || 'General Practice',
            athenaProviderId: athenaProvider.providerid
          };
          providers.push(newProvider);
          addedCount++;
        }
      });
      
      console.log(`✅ Provider sync completed: ${syncedCount} updated, ${addedCount} added`);
      
      res.json({ 
        success: true, 
        message: `Synced ${athenaProvidersResponse.providers.length} providers from Athena`,
        syncedCount,
        addedCount,
        totalProviders: providers.length
      });
    } else {
      throw new Error('No providers data received from Athena');
    }
    
  } catch (error) {
    console.error('❌ Provider sync failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync providers from Athena',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/athena/appointment-types
 * Get appointment types from Athena for mapping
 */
app.get('/api/admin/athena/appointment-types', async (req, res) => {
  try {
    console.log('📋 Fetching appointment types from Athena...');
    
    const athenaTypesResponse = await makeAthenaRequest(`/v1/${ATHENA_CONFIG.practiceId}/appointmenttypes`);
    
    res.json({
      success: true,
      appointmentTypes: athenaTypesResponse.appointmenttypes || []
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch Athena appointment types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment types from Athena',
      details: error.message
    });
  }
});

// ============================================================================
// STATIC ROUTES
// ============================================================================

/**
 * Serve admin interface
 */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

/**
 * Global error handler
 */
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log('🚀 =====================================');
  console.log(`🏥 Clinic Scheduling Server Started`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Admin Interface: http://localhost:${PORT}/admin`);
  console.log(`⚕️  Athena Environment: ${ATHENA_CONFIG.environment}`);
  console.log(`🏢 Practice ID: ${ATHENA_CONFIG.practiceId || 'NOT SET'}`);
  console.log('🚀 =====================================');
  
  // Test Athena connection on startup
  if (ATHENA_CONFIG.clientId && ATHENA_CONFIG.clientSecret && ATHENA_CONFIG.practiceId) {
    getAthenaAccessToken()
      .then(() => console.log('✅ Athena API connection verified'))
      .catch(error => console.error('❌ Athena API connection failed:', error.message));
  } else {
    console.warn('⚠️  Athena credentials not configured - API integration disabled');
  }
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

module.exports = app;
