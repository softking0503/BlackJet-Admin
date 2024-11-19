const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var payment_method_schema = new mongoose.Schema({
    name: {
        type: String,
        default: ""
    },
    image: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });
payment_method_schema.index({ name: 1 });

module.exports = conn.model('payment_method', payment_method_schema);
