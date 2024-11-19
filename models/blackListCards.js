const { mongoose, conn } = require('../config/connection');

const blackListCardSchema = new mongoose.Schema({
    cardNumber: {
        type: String, // Store sender ID as string
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { versionKey: false, timestamps: true });

module.exports = conn.model('blackListCard', blackListCardSchema);
