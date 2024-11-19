const { Schema, model } = require('mongoose');
const { mongoose, conn } = require('../config/connection');


var discountSchema = new Schema({
    discount_alias_name: {
        type: String
    },
    membership_id: {
        type: Schema.Types.ObjectId,
        ref: 'membership',
        required: true
    },
    start_date: {
        type: Date,
        default: new Date()
    },
    end_date: {
        type: Date,
        default: ''
    },
    total_seats: {
        type: Number,
    },
    tracked_seats: {
        type: Number,
    },
    tier: [{
        discount_price: {
            type: String,
        },
        no_of_seats: {
            type: Number  // Use Number instead of 'number'
        },
        used_seats: {
            type: Number
        }
    }],
    initiation_fees: {
        type: String,
    },
    indefinite_end_date: {
        type: Boolean,
        default: 'false'
    },
    indefinite_seats: {
        type: Boolean,
        default: 'false'
    },
    created_at: {
        type: Date,
        default: new Date()
    },
    updated_at: {
        type: Date,
        default: new Date()
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'delete'],
        default: 'active'
    },
}, { versionKey: false });
discountSchema.index({ membership_id: 1 });

discountSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('discount', discountSchema);

