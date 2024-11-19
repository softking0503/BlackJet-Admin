const { mongoose, conn } = require('../config/connection');

let petRequestActionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'booking',
        required: true
    },
    requested_booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'booking',
        required: true
    },
    status: {
        type: String,
        default: ''
    }
}, { versionKey: false, timestamps: true });
petRequestActionSchema.index({ user_id: 1 });
petRequestActionSchema.index({ booking_id: 1 });
petRequestActionSchema.index({ requested_booking_id: 1 });

module.exports = conn.model('petRequestAction', petRequestActionSchema);