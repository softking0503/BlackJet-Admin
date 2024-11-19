const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var hellozaiSchema = new mongoose.Schema({
    cardId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
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
    hellozaiData: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });

module.exports = conn.model('hellozaiLog', hellozaiSchema);
