const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  vehicle_type: { type: String, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: String, required: true },
  registration_number: { type: String }, // Optional as per original schema logic
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);
