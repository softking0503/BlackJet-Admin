const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let state_Schema = new mongoose.Schema({
    state_name: {
        type: String,
        default: ""
    },
    city_name: {
        type: String,
        default: ""
    },
    airport_abbreviation: {
        type: String,
        default: ""
    },
    airport_name: {
        type: String,
        default: ""
    },
    lat: {
        type: String,
        default: ""
    },
    long: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    order: {
        type: Number,
        default: 0
    },
    location: {
        type: Object
    },
    timezone: {
        type: String,
        default: ""
    },
    iata_code: {
        type: String,
        default: ""
    },
    icao_code: {
        type: String,
        default: ""
    },
    address: {
        type: String,
        default: ""
    },
    image_type: {
        type: String,
        default: ""
    }

}, { versionKey: false, timestamps: true });
state_Schema.index({ state_name: 1 });
state_Schema.index({ city_name: 1 });
state_Schema.index({ status: 1 });
state_Schema.index({ location: "2dsphere" });
module.exports = User = conn.model('location', state_Schema);