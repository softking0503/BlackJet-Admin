const { mongoose, conn } = require('../config/connection');

var enquiryListSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            unique: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    { versionKey: false, timestamps: true }
);
enquiryListSchema.index({ name: 1 });
enquiryListSchema.index({ type: 1 });
enquiryListSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = enQuiryList = conn.model('enQuiryList', enquiryListSchema);
