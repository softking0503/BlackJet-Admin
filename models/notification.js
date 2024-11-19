const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let notificationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false,
    },
    notification_title: {
        type: String,
        default: ""
    },
    notification_body: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        default: "",
    },
    flight_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'flights',
        required: false,
    },
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'booking',
        required: false,
    },
    other_id: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    extra_data: {
        type: [mongoose.Schema.Types.Mixed],
        default: null
    }
}, { versionKey: false, timestamps: true });
notificationSchema.index({ user_id: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ flight_id: 1 });

module.exports = User = conn.model('notification', notificationSchema);
