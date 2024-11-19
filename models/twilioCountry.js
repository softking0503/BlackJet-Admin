const { mongoose, conn } = require('../config/connection');

const twilioCountrySchema = new mongoose.Schema({
    country_code: {
        type: String,
        default: ""
    },
    colour: {
        type: String,
        default: ""
    }

}, { versionKey: false, timestamps: true })

module.exports = conn.model('twilioCounty', twilioCountrySchema);