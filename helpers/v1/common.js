const dotenv = require('dotenv');
const crypto = require("crypto");
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const secretManagerAws = require('../../helpers/secretManagerAws');
const adminModal = require("../../models/admin");
const userModal = require("../../models/users.model");
const tempUserModal = require("../../models/tempUsers");
const userMembershipModal = require('../../models/userMembership');
const rolesModel = require("../../models/roles");
const jwt = require('jsonwebtoken');
const momentTimeZone = require('moment-timezone');
const discountModal = require("../../models/discount");
const membership_settings = require("../../models/membership_settings");
const { decode } = require("punycode");
const algorithm = 'aes-256-cbc';
const dayjs = require('dayjs');
const twilioCountryModel = require("../../models/twilioCountry");
const { createPayment } = require('../../controllers/v1/payment'); // Update with correct path

// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../../config', '.envs') });
const key = crypto.randomBytes(32);

const iv = crypto.randomBytes(16); // Initialization Vector
const { errorResponse, successResponse,
    emptyResponse,
    successResponseWithoutData,
    trimParams,
    requiredIdResponse,
    Unauthorized,
    Forbidden,
    randomResponse,
    customResponse,
    tokenError
} = require("../../helpers/response");
// const mailer = require("./mailer");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// HOC for common error handling
exports.HOD = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
}
exports.encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted };
};
exports.decrypt = (encryptedData, iv) => {
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
exports.generateToken = () => {
    return crypto.randomBytes(32).toString("hex");
}
exports.convertTimestampInDateTime = (timestamp) => {
    // Create a new Date object from the timestamp (in milliseconds)
    const date = new Date(timestamp * 1000);

    // Use Date methods to format the date
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Months are 0-indexed, so add 1
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // Format the date as a string
    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return formattedDate
}

// // function to generate random digits 
// exports.generateOTP = (number) => {
//     var digits = '0123456789';
//     let OTP = '';
//     for (let i = 0; i < number; i++) {
//         OTP += digits[Math.floor(Math.random() * 10)];
//     }
//     return OTP;
// }
exports.generateOTP = () => {
    const min = 100000; // Minimum value (inclusive)
    const max = 999999; // Maximum value (inclusive)
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// To add minutes to the current time
exports.getExpirationTime = () => {
    const currentDate = moment().add(10, 'minutes');
    return currentDate.valueOf();
}

exports.getCurrentTime = () => {
    const timeInMilliseconds = moment().valueOf();
    return timeInMilliseconds;
}

exports.timeDiffCalc = async (expireTime) => {
    var endDate = new Date();
    var startDate = new Date(parseInt(expireTime));
    var diffInMilliSeconds = (endDate.getTime() - startDate.getTime()) / 1000;

    // calculate hours
    const hours = Math.floor(diffInMilliSeconds / 3600) % 24;
    diffInMilliSeconds -= hours * 3600;

    // calculate minutes
    const minutes = Math.floor(diffInMilliSeconds / 60) % 60;
    diffInMilliSeconds -= minutes * 60;

    return {
        hours,
        minutes
    }
}

exports.removeUploadFile = async (path) => {
    await fs.unlink(path, function (err) {
        if (err) return console.log(err);
        console.log('file deleted successfully');
    });
}

exports.getDays = (assetsInstallDate) => {
    let days = 0;
    if (!!assetsInstallDate) {
        const currentDate = new Date();
        const installDate = new Date(parseInt(assetsInstallDate));
        const current = moment(currentDate, 'DD-MM-YYYY');
        const enter = moment(installDate, 'DD-MM-YYYY');
        days = current.diff(enter, 'days');
    }

    return days;
}

exports.getHours = (assetsInstallDate) => {
    let hours = 0;
    if (!!assetsInstallDate) {
        const currentDate = new Date();
        const installDate = new Date(parseInt(assetsInstallDate));
        const current = moment(currentDate, 'DD-MM-YYYY');
        const enter = moment(installDate, 'DD-MM-YYYY');
        hours = current.diff(enter, 'hours');
    }

    return hours;
}

exports.addDays = (date, days) => {
    const installDate = new Date(parseInt(date));
    const addedDate = moment(installDate, "DD-MM-YYYY").add(days, 'days');
    return addedDate.valueOf()
}

exports.addDaysForDash = (date, days) => {
    const installDate = new Date(parseInt(date));
    const addedDate = moment(installDate).add(days, 'days');
    return addedDate.valueOf()
}

exports.removeDaysForDash = (date, days) => {
    const installDate = new Date(parseInt(date));
    const addedDate = moment(installDate).subtract(days, 'days');
    return addedDate.valueOf()
}

exports.getDaysForAddAlert = (maintenanceDate) => {
    let days = -0;
    if (!!maintenanceDate) {
        const currentDate = new Date();
        const installDate = new Date(parseInt(maintenanceDate));
        const current = moment(currentDate, 'DD-MM-YYYY');
        const enter = moment(installDate, 'DD-MM-YYYY');
        days = enter.diff(current, 'days');
    }

    return days;
}

exports.convertDate = (date, formate = "D MMMM Y") => {
    return moment(parseInt(date)).format(formate);
};

exports.convertDateToUTC = (date, formate = "D MMMM Y", timezone) => {
    // const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // const offset = moment().tz(zone).format('Z');
    const newDate = momentTimeZone(date).tz(timezone).format(formate);
    return newDate;
};

exports.getMonth = (date) => {
    let month = -0;
    if (!!date) {
        const currentDate = new Date();
        const installDate = new Date(parseInt(date));
        const current = moment(currentDate, 'DD-MM-YYYY');
        const enter = moment(installDate, 'DD-MM-YYYY');
        month = enter.diff(current, 'months');
    }
    return month;
}

exports.addHours = (numOfHours) => {
    const date = new Date();
    date.setTime(date.getTime() + numOfHours * 60 * 60 * 1000);
    return date.getTime();
}

exports.unique = (values) => {
    var setObj = new Set(); // create key value pair from array of array

    return values.reduce((acc, item) => {
        if (!setObj.has(item._id)) {
            setObj.add(item._id, item)
            acc.push(item)
        }
        return acc;
    }, []);
}

exports.changeDateFormate = (milliseconds) => {
    // return moment(milliseconds, 'x').subtract(1, "month").startOf("month").format('MMMM');
    return moment(milliseconds, 'x').format("D MMMM Y");
}

exports.convertDateToMilliseconds = (date) => {
    const timeInMilliseconds = moment(date).valueOf();
    return timeInMilliseconds;
}

exports.getCurrentDateMilliseconds = () => {
    const currentDate = moment().format("D MMMM Y");
    const milliseconds = moment(currentDate).valueOf();
    return milliseconds;
}

exports.sendMailToSubUser = (response) => {
    var template = path.join(__dirname, '../templates/welcome.html')
    var templateHtml = fs.readFileSync(template, 'utf8');

    //if user create for assigned password will be set default (email + @123)
    const splitMail = response.email.split('@')[0];
    const userPassword = splitMail + '@123';

    templateHtml = templateHtml.replace('{{name}}', response.name);
    templateHtml = templateHtml.replace('{{email}}', response.email);
    templateHtml = templateHtml.replace('{{password}}', userPassword);

    const toAddress = response.email;
    const subject = 'Welcome';
    const content = templateHtml;

    mailer.send(toAddress, subject, content);
}

exports.addMinutes = (date, minutes) => {
    date.setMinutes(date.getMinutes() + minutes);
    return date;
};

exports.verifyPermission = (section, operation) => {
    return async (req, res, next) => {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            return randomResponse('Unauthorized', res);
        }
        const token = authorizationHeader.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token is missing' });
        }
        let JWT_SECRET = process.env.JWT_SECRET;
        
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            let checkAdmin = await adminModal.findOne({ _id: decoded._id })
            if (checkAdmin.type === 'admin') {
                return next();
            }
            if (checkAdmin.type === 'subadmin') {
                try {
                    let roleAndPermissionUser = await adminModal.findOne({ email: checkAdmin.email });
                    const sectionPermissions = roleAndPermissionUser.roles_array.find(permission => permission.role_name === section);

                    if (sectionPermissions) {
                        const permissionStatus = sectionPermissions.role_status;

                        if (permissionStatus === operation || operation === 'read') {
                            return next();
                        } else {
                            return res.status(403).json({ message: `Forbidden: You do not have permission to ${operation} in ${section}.` });
                        }
                    } else {
                        return res.status(403).json({ message: `Forbidden: You do not have permission to ${operation} in ${section}.` });
                    }
                } catch (error) {
                    console.error(error);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
            }
        });
    };
};
exports.checkAdminOrSubadmin = async (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return randomResponse('Unauthorized', res);
    }
    const token = authorizationHeader.split('Bearer ')[1];
    try {
        let JWT_SECRET = process.env.JWT_SECRET;
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const adminId = await adminModal.findOne({ _id: decoded._id })

        if (!adminId || !adminId.token) {
            return randomResponse('Admin not found', res);

        }
        if (adminId.type === 'admin' || adminId.type === 'subadmin') {
            req.payload = decoded;
            next();
        } else {
            return Forbidden('Forbidden', res);
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        return randomResponse('Unauthorized', res);
    }
};
exports.checkTokenAndStatus = async (req, res, next) => {
    if (!req.headers.authorization) {
        next()
    } else {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            return randomResponse('Unauthorized', res);
        }
        const token = authorizationHeader.split('Bearer ')[1];
        try {
            let checkRegType = '';
            //checking checkRegType from post request
            if (Object.keys(req.body).length !== 0) {
                if (req.body.checkRegType != undefined) {
                    checkRegType = req.body.checkRegType;
                }
            }
            //checking checkRegType from get request
            if (Object.keys(req.query).length !== 0) {
                if (req.query.checkRegType != undefined) {
                    checkRegType = req.query.checkRegType;
                }
            }
            // if(//JSON.stringify(req.query) !== '{}'){
            // }
            let JWT_SECRET = process.env.JWT_SECRET;
            
            const decoded = jwt.verify(token, JWT_SECRET);
            let userId = await userModal.findOne({ _id: decoded._id })
            if (checkRegType != '' && checkRegType == 'registered') {
                userId = await tempUserModal.findOne({ _id: decoded._id })
            }

            if (!userId) {
                return randomResponse('User not found', res);

            }
            if (userId) {
                if (!userId.token) {
                    return randomResponse('Token expired!', res);
                }
                req.payload = userId;
            } else {
                return Forbidden('Forbidden', res);
            }
            const status = req.payload.status;
            if (status == 'inactive') {
                return randomResponse('User is Inactive!', res)
            }
            if (status == 'active') {
                next()
            }
            else {
                return Forbidden('Forbidden', res);
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            return randomResponse('Unauthorized', res);
        }
    }

};

exports.check_user_identity_verification = async (req, res, next) => {
    const passport_verified = req.payload.passportVerified;
    const driver_license_verified = req.payload.driverlicenseVerified;
    const userVerifyStatus = req.payload.userVerifyStatus;

    try {
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
        if (checkDemoSettings?.is_demo_process) {
            next();
        } else {
            if(userVerifyStatus == 'not verified'){
                return randomResponse('User is not verified!', res)
            }
            // if (passport_verified == false || driver_license_verified == false) {
            //     return randomResponse('User is not verified!', res)
            // }
            // if (passport_verified == true && driver_license_verified == true) {
            //     next()
            // }
            if (userVerifyStatus == 'verified') {
                next()
            }
            else {
                return Forbidden('Forbidden', res);
            }
        }

    } catch (error) {
        console.error('User identity verification failed:', error);
        return randomResponse('User is not verified', res);
    }
};

exports.getTimeDifference = async (date, time1, time2) => {
    const dateRef = date
    let time1Ref = time1
    let time2Ref = time2
    let time1Timestamp = new Date(dateRef)
    let [time1Hours, time1Minutes] = time1Ref.split(':').map(Number);

    time1Timestamp = time1Timestamp.setHours(time1Hours, time1Minutes)
    let [time2Hours, time2Minutes] = time2Ref.split(':').map(Number);
    let time2Timestamp;

    if (time1Hours > 12 && time2Hours < 12) {
        let currentDate = dayjs(dateRef); // Get the current date
        let nextDay = currentDate.add(1, 'day'); // Add one day
        time2Timestamp = new Date(nextDay)

    } else {
        time2Timestamp = new Date(dateRef)

    }

    time2Timestamp = time2Timestamp.setHours(time2Hours, time2Minutes)


    let difference = Math.abs(time2Timestamp - time1Timestamp);
    const millisecondsPerMinute = 1000 * 60;
    const millisecondsPerHour = millisecondsPerMinute * 60;

    const hours = Math.floor(difference / millisecondsPerHour);
    const mins = Math.floor((difference % millisecondsPerHour) / millisecondsPerMinute);


    return { hours, mins };
}


exports.prepareUserData = (user, token, newUser, user_membership) => {
    return {
        _id: user._id,
        phone: user.phone,
        token: token,
        newUser: newUser,
        otp: user.otp,
        country_code: user.country_code,
        phone_code: user.phone_code,
        email: user.email,
        profile_pic: user.profile_pic,
        status: user.status,
        email_verified: user.email_verified,
        is_information_page_completed: user.is_information_page_completed,
        otp_verified: user.otp_verified,
        is_membership_payment_page_completed: user.is_membership_payment_page_completed,
        onboard_status: user.onboard_status,
        is_membership_purchased: !!user_membership
    };
}
exports.generateUniqueNumber = () => {
    const timestamp = Date.now().toString(); // Get current timestamp
    const random = crypto.randomBytes(6).toString('hex'); // Generate random bytes and convert to hexadecimal

    // Concatenate timestamp and random number, then slice to get 12 digits
    const uniqueNumber = timestamp + random;
    return uniqueNumber.slice(0, 12);
}

// Schedule the cron job to run at midnight every day
cron.schedule('0 0 * * *', async () => {
    
    try {
        const currentTime = new Date();

        // Find all active memberships that need to be renewed
        const memberships = await userMembershipModal.find({
            renewal_date: { $lte: currentTime },
            status: 'active',
            is_activate: true
        }).sort({ _id: -1 });

        console.log(memberships, "memberships");

        // Loop through each membership and process the payment
        for (const membership of memberships) {
            // Create a payment for the membership renewal
            const paymentResult = await createPayment({
                userId: membership.user_id,
                membershipId: membership.membership_id,
                price: membership.price,
                currency: "AUD",
                type: "cron"
            });

            // Check if the payment was successful
            if (paymentResult?.data?.paymentStatus === 'SUCCEEDED' || paymentResult?.data?.paymentStatus === 'complete') {
                console.log("Payment succeeded");

                // Extend renewal_date by 1 month
                const newRenewalDate = new Date(membership.renewal_date);
                newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);
                console.log("New renewal date:", newRenewalDate);

                // Update the renewal date of the membership
                membership.renewal_date = newRenewalDate;

                // Save the updated membership
                const savedMembership = await membership.save();
                console.log("Updated membership:", savedMembership);
            } else {
                // If payment fails, find the user details
                const userDetails = await userModal.findOne({
                    _id: membership.user_id,
                    status: 'active',
                });
                let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
                let toPhoneNumber = userDetails.phone_code + userDetails.phone_no; // The recipient's phone number

                //check valid country for twilio
                const twilioCountry = await twilioCountryModel.findOne({ country_code: userDetails.phone_code });
                if (twilioCountry) {
                    if (twilioCountry.colour == 'green') {
                        fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                    } else if (twilioCountry.colour == 'blue') {
                        fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                    } else if (twilioCountry.colour == 'yellow') {
                        fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                    }
                }
                if (userDetails) {
                    // Create a failure message for the user
                    let message = `Dear ${userDetails.preferredFirstName ? userDetails.preferredFirstName : userDetails.fullName}, Your BLACK JET membership renewal has failed. All saved payment methods were declined. As a courtesy, we’ve extended a 24-hour grace period until 5:27 AM for you to make a payment. Without payment, your membership will be terminated, resulting in the loss of all passes and vouchers.`;

                    // Send the failure message to the user
                    await client.messages
                        .create({
                            body: message,
                            from: fromPhoneNumber,
                            to: toPhoneNumber, // Ensure the correct phone number is used
                        })
                        .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                        .catch(error => console.error(`Error sending OTP: ${error.message}`));
                }

                console.log("Payment failed or incomplete");
            }
        }
    } catch (error) {
        // Log any errors that occur during the process
        console.error('Error processing payments:', error);
    }
});


exports.findSmallestDiscount = async (discounts) => {
    let smallestDiscount = null;
    let discountId = null;
    let smallestTierId = null;
    let initiation_fees = null;

    discounts.forEach(discount => {
        initiation_fees = discount.initiation_fees;

        discount.tier.forEach(tier => {
            let discountPrice = parseFloat(tier.discount_price);
            if (isNaN(discountPrice)) {
                console.error("Invalid discount_price:", tier.discount_price);
                return; // Skip this iteration if discount_price is invalid
            }

            if (tier.used_seats > 0) {
                if (smallestDiscount === null || discountPrice < parseFloat(smallestDiscount.discount_price)) {
                    smallestDiscount = tier;
                    discountId = discount._id;
                    smallestTierId = tier._id;
                }
            }
        });
    });

    if (discountId && smallestTierId) {
        const discountInitiationFees = await discountModal.findOne(
            { _id: discountId, 'tier._id': smallestTierId },
            { 'initiation_fees': 1 }
        ).exec();

        initiation_fees = discountInitiationFees?.initiation_fees;
    }

    return { discountId, smallestTierId, smallestDiscount, initiation_fees };
};

