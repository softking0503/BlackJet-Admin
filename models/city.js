const { mongoose, conn } = require('../config/connection');

let citySchema = new mongoose.Schema({
    city_name: {
        type: String,
        default: ""
    },
    airport_abbreviation: {
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

}, { versionKey: false, timestamps: true });
citySchema.index({ city_name: 1, airport_abbreviation: 1 });

// citySchema.pre('save', function (next) {
//     this.updated_at = new Date();
//     next();
// });
module.exports = User = conn.model('city', citySchema);