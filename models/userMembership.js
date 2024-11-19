const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var userMembershipSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    membership_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'membership',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true, // Remove leading/trailing whitespaces
    },
    type: {
        type: Number,
        default: 0 //1- Unlimited membership and 2 for Unlimited elite
    },
    price: {
        type: String,
        // required: true,
    },
    normalPrice: {
        type: String,
        default: ""
    },
    changed_price: {
        type: String,
        default: '',
    },
    payIntId: {
        type: String,
        default: '',
    },
    //Create this key for handle refund between both payment gateways
    paymentType: {
        type: String,
        default: '',
    },
    change_date: {
        type: Date,
        default: ''
    },
    updated_purchase_date: {
        type: Date,
        default: ''
    },
    renewal_date: {
        type: Date
    },
    membershipPurchaseDate: {
        type: Date, // Change data type to Date for storing date and time
    },
    isAutoRenew: {
        type: Boolean,
        default: true
    },
    rewardDate: {
        type: Date
    },
    isReward: {
        type: Boolean,
        default: false
    },
    autoRenewCheck: {
        type: Boolean,
        default: false
    },
    isDowngraded: {
        type: Boolean,
        default: false
    },
    isDowngradeRequested: {
        type: Boolean,
        default: false
    },
    // snooze_till: {
    //     type: Date,
    //     default: ''
    // },//Not used anywhere in project telling by anamika during kt
    is_activate: {
        type: Boolean,
        default: false
    },
    price_updated: {
        type: Boolean,
        default: false
    },
    purchased_in_preOrder: {
        type: Boolean,
        default: false
    },
    membershipActivationDate: {
        type: Date, // Change data type to Date for storing date and time
        default: null, // Default to null to allow it to be empty
    },
    timeoutId: {
        type: {},
    },
    gracePeriod: {
        type: Date, // Change data type to Date for storing date and time
        default: null, // Default to null to allow it to be empty
    },
    terminationDate: {
        type: Date, // Change data type to Date for storing date and time
        default: null, // Default to null to allow it to be empty
    },
    downgradeDate: {
        type: Date, // Change data type to Date for storing date and time
        default: null, // Default to null to allow it to be empty
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { versionKey: false, timestamps: true });
userMembershipSchema.index({ user_id: 1 });
userMembershipSchema.index({ membership_id: 1 });
userMembershipSchema.index({ name: 1 });
userMembershipSchema.index({ status: 1 });
module.exports = contactUs = conn.model('userMembership', userMembershipSchema);
