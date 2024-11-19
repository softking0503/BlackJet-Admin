const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let bookingSchema = new mongoose.Schema({
    flight_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'flight',
        required: false
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
    },
    booking_status: {
        type: String,
        enum: ['pending', 'confirmed', 'canceled', 'purchase-pending'],
        default: 'pending'
    },
    canceled_datetime: {
        type: Date,
        default: ''
    },
    Total_pet_price_with_gst: {
        type: String,
        default: ""
    },
    otherSeatBooking_status: {
        type: String,
        default: ''
    },
    isPenalty: {//0-> No penalty, 1-> Penalty, 2-> Penalty reset completed
        type: Number,
        default: 0
    },
    between12to24hr: {
        type: Boolean,
        default: false
    },
    within12hr: {
        type: Boolean,
        default: false
    },
    guest_pass_used: {
        type: Number,
        default: 0
    },
    reusable_booking_used: {
        type: Number,
        default: 0
    },
    pet_pass_used: {
        type: Number,
        default: 0
    },
    total_reset_passes_left: {
        type: Number,
        default: 0
    },
    petOnBoardRequestStarts: {
        type: Date,
        default: null
    },
    requested_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false,
        // default:""
    },
    round_trip_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'booking',
        required: false,
        // default:""
    },
    isRoundTrip: {
        type: Boolean,
        default: false
    },
    decision_taken: {
        type: Boolean,
        default: false
    },
    reset_pet_pass: {
        type: Boolean,
        default: false
    },
    reset_guest_pass: {
        type: Boolean,
        default: false
    },
    reset_reusable_booking: {
        type: Boolean,
        default: false
    },
    is_journey_completed: {
        type: Boolean,
        default: false
    },
    canceled_seat_details: {
        type: [],
        default: []
    },
    guest_penalty: {
        type: Number,
        default: 0
    },
    pet_penalty: {
        type: Number,
        default: 0
    },
    reusable_penalty: {
        type: Number,
        default: 0
    },
    checked_in: {
        type: Boolean,
        default: false
    },
    is_demo: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    guest_pass_to_pet_pass: {
        type: Number,
        default: 0
    },
    requested_booking_details: [
        {
            user_id: {
                type: String,
                default: ''
            },
            booking_id: {
                type: String,
                default: ''
            }
        }
    ],
}, { versionKey: false, timestamps: true });
bookingSchema.index({ flight_id: 1 });
bookingSchema.index({ user_id: 1 });
// bookingSchema.pre('save', function (next) {
//     this.updated_at = new Date();
//     next();
// });
module.exports = User = conn.model('booking', bookingSchema);
