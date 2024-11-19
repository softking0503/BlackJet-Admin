const { mongoose, conn } = require('../config/connection');

var legalSchema = new mongoose.Schema({
    legalTitle: {
        type: String,
        required: true
    },
    legalContent: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'delete'],
        default: 'active'
    },
    order: {
        type: Number,
        default: 0
    },
    delta_text: {
        type: String,
        default: ""
    }
}, { versionKey: false, timestamps: true });

module.exports = legals = conn.model('legal', legalSchema);