const { mongoose, conn } = require('../config/connection');


let petsSchema = new mongoose.Schema({
    breed_name: {
        type: String,
        default: ""
    },
    pet_type: {
        type: String,
        enum: ['Dog', 'Cat', ''],
        default: ''
    },
    status: {
        type: String,
        enum: ["Restricted", "", "High-Risk"],
        default: ""
    }

}, { versionKey: false, timestamps: true });
petsSchema.index({ breed_name: 1 });

module.exports = User = conn.model('pet', petsSchema);
