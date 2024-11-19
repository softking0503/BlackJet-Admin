const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var priceSchema = new mongoose.Schema({
    effectiveDate: {
        type: Date,
        default: new Date()
    },
    effectiveEndDate: {
        type: Date, // Change data type to Date for storing date and time
        default: null, // Default to null to allow it to be empty
    },
    price: {
        type: String,
        default: ''
    },
    initiationFees: {
        type: String,
        default: 0
    },
    membership: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'membership',
        required: false
    },
    items: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'item',
        required: false
    },
    boutique: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'boutique',
        required: false
    },
    no_of_month: {
        type: String,
        default: ''
    },
    discount_price: {
        type: String,
        default: ''
    },
    created_at: {
        type: Date,
        default: new Date()
    },
    updated_at: {
        type: Date,
        default: new Date()
    },
    type: {
        type: String,
        enum: ['membership', 'item', 'boutique'],
        default: 'membership'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false });
priceSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('price', priceSchema);
