const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let membershipSettingsSchema = new mongoose.Schema({
    activate_membership_button: {
        type: Boolean,
        default: false
    },
    is_demo_process: {
        type: Boolean,
        default: false
    },
    preOrder: {
        type: Boolean,
        default: false
    },
    launch_season: {
        type: String,
        default: 'Spring'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { versionKey: false, timestamps: true });
membershipSettingsSchema.index({ activate_membership_button: 1 });
membershipSettingsSchema.index({ is_demo_process: 1 });
membershipSettingsSchema.index({ launch_season: 1 });
membershipSettingsSchema.index({ status: 1 });
module.exports = User = conn.model('membership_settings', membershipSettingsSchema);
