const { mongoose, conn } = require('../config/connection');


let industrySchema = new mongoose.Schema({
    name: {
        type: String,
        default: ""
    },

}, { versionKey: false, timestamps: true });
industrySchema.index({ name: 1 });


module.exports = User = conn.model('Industries', industrySchema);
