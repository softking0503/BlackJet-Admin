const { mongoose, conn } = require('../config/connection');

var inviteLinkSchema = new mongoose.Schema({
    guest_phone_code: {
        type: String,
        default: ''
    },
    guest_phone: {
        type: String,
        default: ''
    },
    guest_name: {
        type: String,
        default:''
    },
    guest_id: {
        type: String,
        default: ''
    },
    invited_by_user_id: {
        type: String,
        default: ''
    },
    booking_id: {
        type: String,
        default: ''
    },
    link_used_by_user_id: {
        type: String,
        default: ''
    },
    temp_user_id: {
        type: String,
        default: ''
    },
    round_trip: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: new Date()
    },
    updated_at: {
        type: Date,
        default: new Date()
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    booking_assigned: {
        type: Boolean,
        default: false
    }
}, { versionKey: false });
inviteLinkSchema.index({ guest_id: 1 });
inviteLinkSchema.index({ status: 1 });
inviteLinkSchema.index({ booking_id: 1 });
inviteLinkSchema.index({ invited_by_user_id: 1 });
module.exports = conn.model('inviteLink', inviteLinkSchema);