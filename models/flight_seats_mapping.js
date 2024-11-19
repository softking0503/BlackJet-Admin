const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');
/*0 - empty seat,
  1 - Booked seat,
  2 - Booked seat with Baby,
  3 - Booked seat with pet on lap,
  4 - Booked seat for member’s pet
*/

let flight_seats_mapping_Schema = new mongoose.Schema({
    flight_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'flight',
        required: true
    },
    seat1: {
        type: Number,
        enum: [1, 0, 2, 3, 4],
        default: 0  //0 means empty seat and 1 means seat is full
    },
    seat2: {
        type: Number,
        enum: [1, 0, 2, 3, 4],
        default: 0  //0 means empty seat and 1 means seat is full
    },
    seat3: {
        type: Number,
        enum: [1, 0, 2, 3, 4],
        default: 0  //0 means empty seat and 1 means seat is full
    },
    seat4: {
        type: Number,
        enum: [1, 0, 2, 3, 4],
        default: 0  //0 means empty seat and 1 means seat is full
    },
    seat5: {
        type: Number,
        enum: [1, 0, 2, 3, 4],
        default: 0  //0 means empty seat and 1 means seat is full
    },
    seat6: {
        type: Number,
        enum: [1, 0, 2, 3, 4],
        default: 0  //0 means empty seat and 1 means seat is full
    },
    seat7: {
        type: Number,
        enum: [1, 0, 2, 3, 4],
        default: 0  //0 means empty seat and 1 means seat is full
    },
    seat8: {
        type: Number,
        enum: [1, 0, 2, 3, 4],
        default: 0  //0 means empty seat and 1 means seat is full
    },
    seat1_details: {
        type: {}
    },
    seat2_details: {
        type: {}

    },
    seat3_details: {
        type: {}

    },
    seat4_details: {
        type: {}

    },
    seat5_details: {
        type: {}

    },
    seat6_details: {
        type: {}

    },
    seat7_details: {
        type: {}

    },
    seat8_details: {
        type: {}

    },
    seat1_timeoutId: {
        type: Number,
        default: 0
    },
    seat2_timeoutId: {
        type: Number,
        default: 0

    },
    seat3_timeoutId: {
        type: Number,
        default: 0

    },
    seat4_timeoutId: {
        type: Number,
        default: 0

    },
    seat5_timeoutId: {
        type: Number,
        default: 0

    },
    seat6_timeoutId: {
        type: Number,
        default: 0

    },
    seat7_timeoutId: {
        type: Number,
        default: 0

    },
    seat8_timeoutId: {
        type: Number,
        default: 0

    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

}, { versionKey: false, timestamps: true });
flight_seats_mapping_Schema.index({ flight_id: 1 });

// flight_seats_mapping_Schema.pre('save', function (next) {
//     this.updated_at = new Date();
//     next();
// });
module.exports = User = conn.model('flight_seats_mapping', flight_seats_mapping_Schema);