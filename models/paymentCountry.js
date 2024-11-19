const { mongoose, conn } = require('../config/connection');

const paymentCountrySchema = new mongoose.Schema({
    country_name: {
        type: String,
        default: ""
    },
    country_code: {
        type: String,
        default: ""
    }

}, { versionKey: false, timestamps: true })

module.exports = conn.model('paymentCounty', paymentCountrySchema);