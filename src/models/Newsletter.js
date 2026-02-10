const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    // Unique constraint already creates an index
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

// Índice para busca rápida (não repetir email pois já é unique)
newsletterSchema.index({ active: 1, subscribedAt: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
