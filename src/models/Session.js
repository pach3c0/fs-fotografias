const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    name: String,
    type: String, // Família, Casamento, Evento, etc
    date: Date,
    accessCode: String,
    photos: [{
        id: String,
        filename: String,
        url: String,
        uploadedAt: Date
    }],
    // Modo da sessao
    mode: { type: String, enum: ['selection', 'gallery'], default: 'selection' },
    packageLimit: { type: Number, default: 30 },
    extraPhotoPrice: { type: Number, default: 25 },
    // Fluxo de selecao
    selectionStatus: { type: String, enum: ['pending', 'in_progress', 'submitted', 'delivered'], default: 'pending' },
    selectedPhotos: [String],
    selectionSubmittedAt: Date,
    deliveredAt: Date,
    // Config
    watermark: { type: Boolean, default: true },
    canShare: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
