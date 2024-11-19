const { mongoose, conn } = require('../config/connection');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

var adminSchema = new mongoose.Schema({
    first_name: {
        type: String,
        trim: true,
        required: 'First Name can\'t be empty'
    },
    last_name: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        trim: true,
        unique: true,
    },
    phone: {
        unique: [false, "Mobile Number already available"],
        type: String,
        required: false,
    },
    country_code: {
        type: String,
    },
    password: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['admin', 'subadmin'],
        default: 'subadmin'
    },
    token: {
        type: String,
        trim: true,
        default: ''
    },
    roles_array: [{
        role_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'roles',
            required: true
        },
        role_status: {
            type: String,
            enum: ['read', 'write'],
            default: 'read'
        },
        role_name: {
            type: String
        }
    }],
    socket_id: {
        type: String,
        default: ""
    },
    chat_with: {
        type: String,
        default: ""
    },
    internal_socket_id: {
        type: String,
        default: ""
    },
    internal_chat_with: {
        type: String,
        default: ""
    },
    request_count: {
        type: Number,
        default: 0
    },
    chat_status: {
        type: String,
        enum: ['online', 'offline', 'idle', 'busy'],
        default: 'busy'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { versionKey: false, timestamps: true });

// Custom validation for email
adminSchema.path('email').validate((val) => {
    emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,13}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(val);
}, 'Invalid e-mail.');

adminSchema.pre('save', async function (next) {
    const matchEmail = await Admin.countDocuments({ email: this.email.toLowerCase() });
    if (!!matchEmail) {
        next(new Error("Email id is already exists!"));
    }
    if (this.phone) {
        const checkPhone = await Admin.countDocuments({ phone: this.phone.toLowerCase() });
        if (!!checkPhone) {
            next(new Error("Phone Number is already exists!"));
        }
    }

    if (!!this.password) {
        try {
            const hashed = await argon2.hash(this.password);
            this.password = hashed;
            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});

adminSchema.methods.verifyPassword = async function (password) {
    if (!!this.password) {
        try {
            return await argon2.verify(this.password, password);
        } catch (err) {
            return false;
        }
    }
    return false;
};

adminSchema.methods.generateJWT = function () {
    return jwt.sign({
        _id: this._id
    }, process.env.JWT_SECRET
    );
}

adminSchema.methods.toAuthJSON = async function () {
    return {
        _id: this._id,
        email: this.email,
        name: this.name,
        token: this.generateJWT()
    };
};

adminSchema.methods.deletePassword = function () {
    var obj = this.toObject();
    delete obj.password;
    return obj;
}

module.exports = Admin = conn.model('admin', adminSchema);