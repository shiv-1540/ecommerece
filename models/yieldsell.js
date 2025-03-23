const mongoose = require('mongoose');

const yieldSellSchema = new mongoose.Schema({
    farmer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',   // Reference to Farmer
        required: true
    },
    crop_name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price_per_kg: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    state: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    images: {
        type: [String],  // Array of image URLs
        default: []
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const YieldSell = mongoose.model('YieldSell', yieldSellSchema);
module.exports = YieldSell;
