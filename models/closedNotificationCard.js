const { mongoose, conn } = require('../config/connection');

let closedNotificationCardSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    other_id: {
        type: String,
        default:""
    },
    type: {
        type: String,
        default: 'booking'
    }
}, { versionKey: false, timestamps: true });
closedNotificationCardSchema.index({ user_id: 1 });
closedNotificationCardSchema.index({ other_id: 1 });

module.exports = conn.model('closedNotificationCard', closedNotificationCardSchema);