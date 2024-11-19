const { Schema, model } = require('mongoose');
const { mongoose, conn } = require('../config/connection');

const paymentGatewaySchema = new Schema({
  australiaRegion: {
    region: {
      type: String,
      enum: ['Australia', 'Non-Australia'],
      required: true
    },
    gatewayPercentages: [{
      percentages: {
        type: Map,
        of: Number,
        required: true
      },
      paymentType: {
        type: String,
        enum: ['Mastercard', 'Visa', 'Amex'],
        required: true
      },
      enabled: {
        type: Boolean,
        default: true
      }
    }]
  },
  nonAustraliaRegion: {
    region: {
      type: String,
      enum: ['Australia', 'Non-Australia'],
      required: true
    },
    gatewayPercentages: [{
      percentages: {
        type: Map,
        of: Number,
        required: true
      },
      paymentType: {
        type: String,
        enum: ['Mastercard', 'Visa', 'Amex'],
        required: true
      },
      enabled: {
        type: Boolean,
        default: true
      }
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { versionKey: false, timestamps: true });

module.exports = conn.model('Payment_gateway', paymentGatewaySchema);