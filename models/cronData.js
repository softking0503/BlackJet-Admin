const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var contactUsSchema = new mongoose.Schema({
    cron_ends: {
        type: Date
    },
    booking_id: {
        type: []
    },
    membership_id: {
        type: []
    },
    demo_flight_id: {
        type: []
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { versionKey: false, timestamps: true });
contactUsSchema.index({ cron_ends: 1 });
contactUsSchema.index({ booking_id: 1 });
contactUsSchema.index({ membership_id: 1 });
contactUsSchema.index({ demo_flight_id: 1 });
module.exports = contactUs = conn.model('cron', contactUsSchema);
