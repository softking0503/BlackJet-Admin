const { mongoose, conn } = require('../config/connection');

const activityLogSchema = new mongoose.Schema({
    subadmin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    ip: { type: String, required: true },
    action: { type: String, required: true },
    menu: { type: String, required: true },
}, { versionKey: false, timestamps: true });

module.exports = conn.model('activityLog', activityLogSchema);
