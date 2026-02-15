const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    default: 'website'
  }
}, {
  timestamps: true
});

newsletterSchema.index({ active: 1, subscribedAt: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
