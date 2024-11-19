const { mongoose, conn } = require('../config/connection');


let routeSchema = new mongoose.Schema({
    route_name: {
        type: String,
        default: ""
    },
    toCity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'location',
        required: false
    },
    fromCity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'location',
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    isDemo: {
        type: Boolean,
        default: false
    }

}, { versionKey: false, timestamps: true });
routeSchema.index({ toCity: 1 });
routeSchema.index({ fromCity: 1 });
routeSchema.index({ status: 1 });
module.exports = User = conn.model('route', routeSchema);
