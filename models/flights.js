const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let flightSchema = new mongoose.Schema({
    flight_name: {
        type: String,
        default: ""
    },
    route: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'route',
        required: false
    },
    day: {
        type: [],
        default: []
    },
    isRecurr: {
        type: Boolean,
        default: false
    },
    recurrLastDate: {
        type: Date
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
    actual_takeoff_time: {
        type: String,
        default: ""
    },
    actual_landing_time: {
        type: String,
        default: ""
    },
    pilot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'pilot',
        required: false
    },
    copilot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'pilot',
        required: false
    },
    aircraftAssignment: {
        type: String,
        default: ""
    },
    lastMaintenanceDate: {
        type: Date
    },
    NextMaintenanceIn: {
        type: Number,
        default: 0
    },
    flight_delayed: {
        type: Boolean,
        default: false
    },
    flight_delayed_time: {
        type: Date,
        default: null
    },
    flight_delayed_reason: {
        type: String,
        default: ""
    },
    flight_canceled: {
        type: Boolean,
        default: false
    },
    flight_canceled_time: {
        type: Date,
        default: null
    },
    flight_canceled_reason: {
        type: String,
        default: ""
    },
    boarding: {
        type: Boolean,
        default: false
    },
    boarding_time: {
        type: String,
        default: '30'
    },
    checkedIn: {
        type: Boolean,
        default: false
    },
    checkedIn_time: {
        type: Date,
        default: new Date()
    },
    departure: {
        type: Boolean,
        default: false
    },
    departure_time: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    pet_on_board: {
        type: Boolean,
        default: false
    },
    is_demo: {
        type: Boolean,
        default: false
    },
    flight_takeoff_utcdatetime: {
        type: Date,
        default: null
    },
    flight_landing_utcdatetime: {
        type: Date,
        default: null
    },

}, { versionKey: false, timestamps: true });
flightSchema.index({ flight_name: 1 });
flightSchema.index({ flight_takeoff_date: 1 });
flightSchema.index({ status: 1 });
flightSchema.index({
    is_demo: 1// flightSchema.pre('save', function (next) {
    //     this.updated_at = new Date();
    //     next();
});
module.exports = User = conn.model('flight', flightSchema);