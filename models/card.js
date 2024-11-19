const { mongoose, masterConn } = require('../config/connection');


let cardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    paymentMethod: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'payment_method',
        required: true
    },
    cardholderName: {
        type: String,
        required: true
    },
    cardNumber: {
        type: String,
        required: true
    },
    cardType: {
        type: String,
        required: true
    },
    expiry: {
        type: String,
        required: true
    },
    // cvv: {
    //     type: String,
    //     required: false
    // },
    billingAddress: {
        streetAddress: {
            type: String,
            default: ""
        },
        state: {
            type: String,
            default: ""
        },
        city: {
            type: String,
            default: ""
        },
        postCode: {
            type: String,
            default: ""
        },
        country: {
            type: String,
            default: "Australia"
        },
    },
    airwallexPaySrcId: {
        type: String,
        default: ""
    },
    hellozaiPaySrcId: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    businessName: {
        type: String,
        default: ""
    },
    abn: {
        type: String,
        default: ""
    }

}, { versionKey: false, timestamps: true });
cardSchema.index({ user_id: 1 });
cardSchema.index({ paymentMethod: 1 });
module.exports = User = masterConn.model('card', cardSchema);
