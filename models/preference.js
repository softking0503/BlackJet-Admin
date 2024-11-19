const { mongoose, conn } = require('../config/connection');


let preferencesSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    pushNotifications: {
        type: Boolean,
        default: false
    },
    locationFeature: {
        type: Boolean,
        default: false
    },
    SyncFlightWithCalendar: {
        type: Boolean,
        default: false
    },
    automaticInvoiceToMail: {
        type: Boolean,
        default: false
    },
    automaticMail: {
        type: String,
        default: ""
    },
    displayPreferences: {
        type: String,
        enum: ["Default", "Dark", "Light"],
        default: "Default"
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }

}, { versionKey: false, timestamps: true });
preferencesSchema.index({ user_id: 1 });

module.exports = User = conn.model('preference', preferencesSchema);
