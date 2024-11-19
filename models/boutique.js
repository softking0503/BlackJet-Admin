const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var boutiqueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    card_title: {
        type: String,
        default: ''
    },
    card_content: {
        type: String,
        default: ''
    },
    product_set: {
        type: String,
        default: ''
    },
    membership_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'membership',
        required: false
    },
    flash_sale: {
        type: Boolean,
        default: false
    },
    sale_start_date_time: {
        type: Date,
        default: new Date()
    },
    sale_end_date_time: {
        type: Date,
        default: new Date()
    },
    discount_price: {
        type: String,
        default: ''
    },
    snooze_till: {
        type: Date,
        default: ''
    },
    is_month: {
        type: Boolean,
        default: false
    },
    no_of_month: {
        type: String,
        default: ''
    },
    membership: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'membership',
        required: false
    },
    gift_card: {
        type: Boolean,
        default: false
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
    }
}, { versionKey: false });
boutiqueSchema.index({ name: 1 });

boutiqueSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('boutique', boutiqueSchema);
