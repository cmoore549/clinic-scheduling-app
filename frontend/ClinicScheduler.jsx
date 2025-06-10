import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, AlertCircle, Heart, Baby, Stethoscope, Activity, Eye, UserCheck } from 'lucide-react';

const ClinicScheduler = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientInfo, setPatientInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    reason: ''
  });

  // API base URL - update this to match your backend server
  const API_BASE_URL = 'http://localhost:3001';

  // Load services from backend API
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointment-types`);
      if (response.ok) {
        const servicesData = await response.json();
        setServices(servicesData);
      } else {
        console.error('Failed to load services');
        // Fallback to mock data if API fails
        setServices([
          {
            id: 1,
            name: 'Annual Physical Exam',
            description: 'Comprehensive yearly health checkup including vital signs, lab work, and preventive screenings',
            duration: 60,
            icon: 'Heart',
            color: 'bg-blue-500',
            providers: [
              { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Family Medicine' },
              { id: 2, name: 'Dr. Michael Chen', specialty: 'Internal Medicine' }
            ]
          },
          {
            id: 2,
            name: 'Sick Visit',
            description: 'Treatment for acute illness, infections, minor injuries, and urgent health concerns',
            duration: 20,
            icon: 'Stethoscope',
            color: 'bg-red-500',
            providers: [
              { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Family Medicine' },
              { id: 2, name: 'Dr. Michael Chen', specialty: 'Internal Medicine' },
              { id: 4, name: 'Dr. Lisa Park', specialty: 'Urgent Care' }
            ]
          },
          {
            id: 3,
            name: 'Follow-up Visit',
            description: 'Review test results, monitor treatment progress, and adjust care plans',
            duration: 30,
            icon: 'Activity',
            color: 'bg-green-500',
            providers: [
              { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Family Medicine' },
              { id: 2, name: 'Dr. Michael Chen', specialty: 'Internal Medicine' },
              { id: 5, name: 'Dr. Amanda White', specialty: 'Cardiology' }
            ]
          },
          {
            id: 4,
            name: 'Pediatric Checkup',
            description: 'Well-child visits, vaccinations, growth monitoring, and developmental assessments',
            duration: 45,
            icon: 'Baby',
            color: 'bg-purple-500',
            providers: [
              { id: 3, name: 'Dr. Emily Rodriguez', specialty: 'Pediatrics' }
            ]
          },
          {
            id: 5,
            name: 'Consultation',
            description: 'Specialist consultation for complex conditions and second opinions',
            duration: 45,
            icon: 'UserCheck',
            color: 'bg-indigo-500',
            providers: [
              { id: 2, name: 'Dr. Michael Chen', specialty: 'Internal Medicine' },
              { id: 5, name: 'Dr. Amanda White', specialty: 'Cardiology' },
              { id: 6, name: 'Dr. Robert Kim', specialty: 'Dermatology' }
            ]
          },
          {
            id: 6,
            name: 'Eye Exam',
            description: 'Comprehensive vision screening, eye health assessment, and prescription updates',
            duration: 30,
            icon: 'Eye',
            color: 'bg-teal-500',
            providers: [
              { id: 7, name: 'Dr. Jennifer Lee', specialty: 'Ophthalmology' }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      setError('Failed to load services. Please refresh the page.');
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setAvailableProviders(service.providers);
    setSelectedProvider('');
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlots([]);
  };

  // Fetch available slots from backend API
  const fetchAvailableSlots = async (providerId, date, serviceId) => {
    if (!providerId || !date || !serviceId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/available?providerId=${providerId}&date=${date}&appointmentTypeId=${serviceId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
      } else {
        // Fallback to mock data if API fails
        const mockSlots = [
          '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
          '11:00 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM'
        ];
        setAvailableSlots(mockSlots);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setError('Failed to load available appointments. Please try again.');
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
    if (selectedProvider && selectedService) {
      fetchAvailableSlots(selectedProvider, date, selectedService.id);
    }
  };

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);
    setSelectedTime('');
    if (selectedDate && selectedService) {
      fetchAvailableSlots(providerId, selectedDate, selectedService.id);
    }
  };

  const handlePatientInfoChange = (field, value) => {
    setPatientInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: selectedProvider,
          date: selectedDate,
          time: selectedTime,
          appointmentTypeId: selectedService.id,
          patient: patientInfo
        })
      });

      if (response.ok) {
        setCurrentStep(4);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to book appointment. Please try again.');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError('Failed to book appointment. Please try again.');
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return selectedService && selectedProvider && selectedDate && selectedTime;
      case 2:
        return patientInfo.firstName && patientInfo.lastName && patientInfo.email && 
               patientInfo.phone && patientInfo.dateOfBirth;
      default:
        return false;
    }
  };

  // Icon mapping for dynamic icons
  const getIconComponent = (iconName) => {
    const iconMap = {
      Heart,
      Stethoscope,
      Activity,
      Baby,
      UserCheck,
      Eye
    };
    return iconMap[iconName] || Heart;
  };

  if (currentStep === 4) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h2>
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-green-800 font-medium">
              Your appointment has been successfully scheduled.
            </p>
          </div>
          
          <div className="text-left bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Appointment Details:</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Service:</span> {selectedService.name}</p>
              <p><span className="font-medium">Provider:</span> {availableProviders.find(p => p.id == selectedProvider)?.name}</p>
              <p><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString()}</p>
              <p><span className="font-medium">Time:</span> {selectedTime}</p>
              <p><span className="font-medium">Duration:</span> {selectedService.duration} minutes</p>
              <p><span className="font-medium">Patient:</span> {patientInfo.firstName} {patientInfo.lastName}</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>A confirmation email has been sent to {patientInfo.email}</p>
            <p className="mt-2">Please arrive 15 minutes early for your appointment.</p>
          </div>
          
          <button 
            onClick={() => {
              setCurrentStep(1);
              setSelectedService(null);
              setSelectedDate('');
              setSelectedTime('');
              setSelectedProvider('');
              setAvailableProviders([]);
              setPatientInfo({
                firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', reason: ''
              });
            }}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Schedule Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Schedule Your Appointment</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2 ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}>1</div>
            Select Service
          </div>
          <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2 ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}>2</div>
            Patient Information
          </div>
          <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2 ${
              currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}>3</div>
            Confirm
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Step 1: Select Service and Schedule */}
      {currentStep === 1 && (
        <div className="space-y-8">
          {/* Service Selection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Choose Your Service</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(service => {
                const IconComponent = getIconComponent(service.icon);
                return (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedService?.id === service.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${service.color} text-white flex-shrink-0`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-2">{service.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{service.duration} minutes</span>
                          <span className="text-xs text-gray-500">{service.providers.length} provider{service.providers.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Provider and Scheduling Section */}
          {selectedService && (
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Schedule Your {selectedService.name}
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Available Providers
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a provider...</option>
                    {availableProviders.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} - {provider.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={getMinDate()}
                    max={getMaxDate()}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {selectedProvider && selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Available Times
                  </label>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600">Loading available times...</p>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`p-3 text-sm border-2 rounded-lg transition-all duration-200 font-medium ${
                            selectedTime === slot
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-600">No available appointments for the selected date.</p>
                      <p className="text-sm text-gray-500 mt-1">Please choose a different date.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedService && selectedProvider && selectedDate && selectedTime && (
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Continue to Patient Information
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Patient Information */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-1">Selected Service: {selectedService.name}</h3>
            <p className="text-sm text-blue-600">
              {availableProviders.find(p => p.id == selectedProvider)?.name} • {new Date(selectedDate).toLocaleDateString()} • {selectedTime}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
              <input
                type="text"
                value={patientInfo.firstName}
                onChange={(e) => handlePatientInfoChange('firstName', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
              <input
                type="text"
                value={patientInfo.lastName}
                onChange={(e) => handlePatientInfoChange('lastName', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                value={patientInfo.email}
                onChange={(e) => handlePatientInfoChange('email', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number *
              </label>
              <input
                type="tel"
                value={patientInfo.phone}
                onChange={(e) => handlePatientInfoChange('phone', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
            <input
              type="date"
              value={patientInfo.dateOfBirth}
              onChange={(e) => handlePatientInfoChange('dateOfBirth', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
            <textarea
              value={patientInfo.reason}
              onChange={(e) => handlePatientInfoChange('reason', e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information or specific concerns you'd like to share..."
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={!canProceedToNext()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Review & Confirm
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Please Review Your Appointment</h2>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Appointment Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Service:</span> {selectedService.name}</p>
                  <p><span className="font-medium">Provider:</span> {availableProviders.find(p => p.id == selectedProvider)?.name}</p>
                  <p><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Time:</span> {selectedTime}</p>
                  <p><span className="font-medium">Duration:</span> {selectedService.duration} minutes</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Patient Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {patientInfo.firstName} {patientInfo.lastName}</p>
                  <p><span className="font-medium">Email:</span> {patientInfo.email}</p>
                  <p><span className="font-medium">Phone:</span> {patientInfo.phone}</p>
                  <p><span className="font-medium">Date of Birth:</span> {new Date(patientInfo.dateOfBirth).toLocaleDateString()}</p>
                  {patientInfo.reason && (
                    <p><span className="font-medium">Notes:</span> {patientInfo.reason}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Please arrive 15 minutes early for your appointment</li>
              <li>Bring a valid photo ID and insurance card</li>
              <li>A confirmation email will be sent to your provided email address</li>
              <li>You can cancel or reschedule up to 24 hours before your appointment</li>
            </ul>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Booking...
                </>
              ) : (
                'Confirm Appointment'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicScheduler;
