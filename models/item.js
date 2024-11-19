const { mongoose, conn } = require('../config/connection');

var itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: 'Name can\'t be empty'
    },
    gst: {
        type: String,
        required: false
    },
    count: {
        type: String
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
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false });
itemSchema.index({ name: 1 });
itemSchema.index({ status: 1 });
itemSchema.index({ flash_sale: 1 });
itemSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = items = conn.model('item', itemSchema);