const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let demoFlightSchema = new mongoose.Schema({
    flight_name: {
        type: String,
        default: ""
    },
    route: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'route',
        required: false
    },
    flight_takeoff_date: {
        type: Date,
    },
    takeoff_time: {
        type: String,
        default: ""
    },
    landing_time: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    pet_on_board: {
        type: Boolean,
        default: false
    }

}, { versionKey: false, timestamps: true });

module.exports = demo_flight = conn.model('demo_flight', demoFlightSchema);