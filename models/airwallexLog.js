const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var airwallexLogSchema = new mongoose.Schema({
    cardId: {
        type: String,
        default: ""
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        default: ""
    },
    price: {
        type: String,
        default: ""
    },
    transactionId: {
        type: String,
        default: ""
    },
    paymentStatus: {
        type: String,
        default: ""
    },
    paymentType: {
        type: String,
        default: ""
    },
    airwallexData: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });

module.exports = conn.model('airwallexLog', airwallexLogSchema);
