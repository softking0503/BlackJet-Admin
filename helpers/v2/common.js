const dotenv = require('dotenv');
const crypto = require("crypto");
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const transactionModal = require("../../models/payment");
const faqModal = require("../../models/faq");
const discountModal = require("../../models/discount");
const blogModal = require("../../models/blog");
const legalModal = require("../../models/legal");
const contactModal = require("../../models/contactUs");
const boutiqueModal = require('../../models/boutique');
const secretManagerAws = require('../../helpers/secretManagerAws');
const adminModal = require("../../models/admin");
const userModal = require("../../models/users.model");
const prefernceModal = require("../../models/preference");
const tempUserModal = require("../../models/tempUsers");
const ActivityLog = require("../../models/activityLog");
const userMembershipModal = require('../../models/userMembership');
const rolesModel = require("../../models/roles");
const jwt = require('jsonwebtoken');
const momentTimeZone = require('moment-timezone');
const booking_modal = require("../../models/booking");
const priceModal = require("../../models/price");
const cardModal = require("../../models/card");
const { generateInvoiceNumber } = require('../upload');
const membership_settings = require("../../models/membership_settings");
const { decode } = require("punycode");
const eliteRenewal = require('../../helpers/eliteMembership');
const itemPurchasePdf = require('../../helpers/itemPurchase');
const normalMembershipPdf = require('../../helpers/normalMembership');
const algorithm = 'aes-256-cbc';
const dayjs = require('dayjs');
const twilioCountryModel = require("../../models/twilioCountry");
const { createPayment } = require('../../controllers/v2/payment'); // Update with correct path
const { default: mongoose } = require('mongoose');
const AWS = require('aws-sdk');
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
const mail = require('../../helpers/mailer');
// const mailer = require("./mailer");


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
// List of models to check
const models = [
    faqModal,
    discountModal,
    blogModal,
    legalModal,
    contactModal,
    boutiqueModal
];
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
exports.logActivity = (menu, action) => async (req, res, next) => {
    try {
        // Extract the client's IP address
        const ip = req.headers['x-forwarded-for']
            ? req.headers['x-forwarded-for'].split(',')[0].trim()
            : req.connection.remoteAddress || req.socket.remoteAddress;

        // Check if action is login or logout and handle it
        if (action === 'login' || action === 'logout') {
            if (req.body.email) {
                // Fetch admin details based on email
                const checkAdmin = await adminModal.findOne({ email: req.body.email });
                if (checkAdmin) {
                    // Log the activity
                    await ActivityLog.create({
                        subadmin_id: checkAdmin._id,
                        name: `${checkAdmin.first_name} ${checkAdmin.last_name}`,
                        email: checkAdmin.email,
                        ip: ip,
                        action: action,
                        menu: menu
                    });
                }
            }
            // Proceed to the next middleware or route handler
            return next();
        }

        // Authorization header check
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Token is missing' });
        }

        const token = authorizationHeader.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token is missing' });
        }

        let JWT_SECRET = process.env.JWT_SECRET;

        // Verify the JWT token
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Invalid token' });
            }

            // Check if subadmin exists in the database
            const checkAdmin = await adminModal.findOne({ _id: decoded._id });
            if (!checkAdmin) {
                return res.status(404).json({ error: 'Sub-admin not found' });
            }

            // Log the activity
            await ActivityLog.create({
                subadmin_id: checkAdmin._id,
                name: `${checkAdmin.first_name} ${checkAdmin.last_name}`,
                email: checkAdmin.email,
                ip: ip,
                action: action,
                menu: menu
            });

            // Proceed to the next middleware or route handler
            next();
        });
    } catch (err) {
        console.error('Failed to log activity:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
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
        // console.log('header==',JWT_SECRET)
        // console.log('token header==',token)
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
};
// Function to generate invoice number
exports.generateInvoiceNumber = async () => {
    const date = new Date();
    const year = date.getFullYear().toString(); // Full 4-digit year
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month and pad with leading zero if necessary
    const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary

    // Concatenate the year, month, and day (format: YYYYMMDD)
    const formattedDate = `${year}${month}${day}`;

    // Query to get today's invoice count
    const todayStart = new Date(date.setHours(0, 0, 0, 0)); // Start of the day
    const todayEnd = new Date(date.setHours(23, 59, 59, 999)); // End of the day

    const todayInvoiceCount = await transactionModal.countDocuments({
        createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    console.log(todayInvoiceCount, 'todayInvoiceCount')
    // The next invoice number is the count + 1
    const nextInvoiceNo = (todayInvoiceCount).toString().padStart(3, '0'); // Ensure it's 3 digits
    console.log(nextInvoiceNo, 'nextInvoiceNo')
    // Concatenate the formatted date and invoice number to form the final invoice number
    return `${formattedDate}-${nextInvoiceNo}`;
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
            if (userVerifyStatus == 'not verified' || userVerifyStatus == 'in progress') {
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

// Schedule the cron job to run at midnight every day for Membership Renewal
cron.schedule('0 0 * * *', async () => {
    try {
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true, preOrder: true });

        if (checkDemoSettings) {
            // Find all active memberships that need to be renewed
            const memberships = await userMembershipModal.find({
                user_id: '6731dfb3ac40146d9e794adf',
                renewal_date: { $lte: currentTime },
                status: 'active',
            }).sort({ _id: -1 });
        }
        let currentTime = new Date();
        let timezone = 'Australia/Sydney';
        const currentDateTime = new Date();

        // Convert to UTC based on the desired timezone
        const options = {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Ensures 24-hour format
        };

        // Get the date and time formatted as a string in the specified timezone
        const formattedDateTime = currentDateTime.toLocaleString('en-US', options);

        // Create a new Date object using the formatted string
        const [datePart, timePart] = formattedDateTime.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');

        // Construct the ISO format string
        let ISOformat = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
        currentTime = new Date(ISOformat);
        // Find all active memberships that need to be renewed
        const memberships = await userMembershipModal.find({
            user_id: '6731dfb3ac40146d9e794adf',
            renewal_date: { $lte: currentTime },
            status: 'active',
            is_activate: true
        }).sort({ _id: -1 });

        if (!memberships.length) {
            console.log("No memberships to renew at this time.");
            return;
        }

        // Loop through each membership and process the payment
        for (const membership of memberships) {
            // Create a payment for the membership renewal
            const paymentResult = await createPayment({
                userId: membership.user_id,
                id: membership.membership_id,
                price: membership.price,
                currency: "AUD",
                type: membership.type === 2 ? "Renewed Unlimited Elite Membership" : "Renewed Unlimited Membership",
                name: membership.name,
                method: 'cron'
            });
            console.log(paymentResult, 'paymentResult')
            // Check if the payment was successful
            if (paymentResult?.data?.paymentStatus === 'SUCCEEDED' || paymentResult?.data?.paymentStatus === 'completed') {

                const renewalDate = new Date(membership.renewal_date);
                const memPurchaseDate = new Date(membership.membershipPurchaseDate);
                const nextRenewalDates = getNextRenewalDate(renewalDate, memPurchaseDate); // Call original function to get next renewal date// Update the renewal date of the membership to the next renewal date
                membership.renewal_date = nextRenewalDates;

                // Save the updated membership
                const savedMembership = await membership.save();
                console.log("Updated membership:", savedMembership);
                // Check if the membership was purchased today
                const purchaseDate = new Date(membership.createdAt);
                let userData = await userModal.findOne({ _id: membership.user_id });

                // Send email with refund if necessary
                const result = await sendMailFunction(
                    paymentResult?.data?.cardId,
                    purchaseDate,
                    membership.renewal_date,
                    userData,
                    membership.price,
                    membership.normalPrice,
                    paymentResult?.data?._id,
                    membership.type === 2 ? "Unlimited Elite" : "Unlimited",
                    membership.type,
                    membership.type === 2 ? "Renewed Unlimited Elite Membership" : "Renewed Unlimited Membership",
                );

                if (!result.success) {
                    console.error("Failed to send email:", result.message);
                }
            } else {
                // If payment fails, update grace period
                const gracePeriod = new Date(membership.renewal_date);
                gracePeriod.setHours(gracePeriod.getHours() + 24); // Add 24 hours to the renewal date

                // Update membership with the grace period date
                await userMembershipModal.findByIdAndUpdate(membership._id, {
                    gracePeriod: gracePeriod
                });

                console.log("Grace period set to:", gracePeriod);
                console.log("Grace period set to:", membership.user_id);


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
// Schedule the cron job to run at midnight every day for check the membership should be not renewal In demo mode
cron.schedule('0 0 * * *', async () => {
    try {
        let currentTime = new Date();
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true, preOrder: true });

        if (checkDemoSettings) {
            // Find all active memberships that need to be renewed
            let memberships = await userMembershipModal.find({
                renewal_date: { $lte: currentTime },
                is_activate: false,
                status: 'active',
            }).sort({ _id: -1 });
            console.log(memberships, 'memberships')
            // Loop through each membership and process the payment
            for (const membership of memberships) {
                // Update the status of the membership to inactive
                await userMembershipModal.findByIdAndUpdate(membership._id, {
                    purchased_in_preOrder: true
                }, { new: true });
            }
        }
    } catch (error) {
        // Log any errors that occur during the process
        console.error('Error processing payments:', error);
    }
});
function getNextRenewalDate(purchaseDate, originalDate) {
    // Parse the input dates
    const purchase = new Date(purchaseDate);
    let days = purchase.getDate();
    //console.log(days)
    const lastDayOfNewMonth = new Date(purchase.getFullYear(), purchase.getMonth() + 2, 0).getDate();
    //console.log('lastDayOfNewMonth==',lastDayOfNewMonth)
    const original = new Date(originalDate);
    console.log(original, 'originalDay')
    // Get the day from the original date
    const originalDay = original.getDate();
    console.log(originalDay, 'originalDay')

    let nextMonth = purchase.getMonth() + 2;
    console.log(nextMonth, 'nextMonth')
    //console.log(nextMonth);
    let upcommingYear = purchase.getFullYear();
    // Handle overflow if the month exceeds 12
    if (nextMonth > 12) {
        nextMonth -= 12; // Reset to a valid month (e.g., 13 becomes 1 for January)
        upcommingYear += 1; // Move to the next year
    }
    //console.log(upcommingYear)
    // If the original day exceeds the last day of the new month, set to the last day of that month
    console.log(originalDay, '>', days)
    let newDate = days;
    if (days >= lastDayOfNewMonth) {
        //purchase.setDate(lastDayOfNewMonth);
        newDate = lastDayOfNewMonth;
    } else if (days < lastDayOfNewMonth && days < originalDay && lastDayOfNewMonth >= originalDay) {
        newDate = originalDay;
    }
    else {
        newDate = days;
    }

    // Format the date to YYYY-MM-DD
    // const year = purchase.getFullYear();
    const month = String(nextMonth).padStart(2, '0'); // Months are zero-indexed
    const day = String(newDate).padStart(2, '0');

    return `${upcommingYear}-${month}-${day}`;
};
// Schedule the cron job to run at midnight every day for Membership Termination
cron.schedule('0 0 * * *', async () => {
    try {
        let currentTime = new Date();
        let timezone = 'Australia/Sydney';
        const currentDateTime = new Date();

        // Convert to UTC based on the desired timezone
        const options = {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Ensures 24-hour format
        };

        // Get the date and time formatted as a string in the specified timezone
        const formattedDateTime = currentDateTime.toLocaleString('en-US', options);

        // Create a new Date object using the formatted string
        const [datePart, timePart] = formattedDateTime.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');

        // Construct the ISO format string
        let ISOformat = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
        currentTime = new Date(ISOformat);
        // Find all active memberships that need to be renewed and have a valid terminationDate
        const memberships = await userMembershipModal.find({
            terminationDate: { $lte: currentTime, $ne: null }, // Exclude null terminationDate values
            status: 'active',
            isAutoRenew: false,
            is_activate: true
        }).sort({ _id: -1 });

        console.log(memberships, "memberships");

        // Loop through each membership and process the payment
        for (const membership of memberships) {
            // Inactivate the current membership and reset terminationDate to null
            await userMembershipModal.findByIdAndUpdate(membership._id, {
                status: "inactive",
            }, { new: true });

            // Cancel all bookings for the user
            await booking_modal.updateMany(
                { user_id: membership.user_id, status: 'active' },
                { status: 'canceled', canceled_datetime: new Date() }
            );
        }
    } catch (error) {
        // Log any errors that occur during the process
        console.error('Error processing memberships:', error);
    }
});
// Schedule the cron job to run at midnight every day Membership expired with grace period
cron.schedule('0 0 * * *', async () => {
    try {
        let currentTime = new Date();
        let timezone = 'Australia/Sydney';
        const currentDateTime = new Date();

        // Convert to UTC based on the desired timezone
        const options = {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Ensures 24-hour format
        };

        // Get the date and time formatted as a string in the specified timezone
        const formattedDateTime = currentDateTime.toLocaleString('en-US', options);

        // Create a new Date object using the formatted string
        const [datePart, timePart] = formattedDateTime.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');

        // Construct the ISO format string
        let ISOformat = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
        currentTime = new Date(ISOformat);
        console.log(currentTime, 'currentTime')
        // Find all active memberships with an expired grace period
        const memberships = await userMembershipModal.find({
            // user_id: '66962c5d8a3a3e56b69fe32f',
            gracePeriod: { $lte: currentTime, $ne: null }, // Exclude null grace period values
            status: 'active',
        }).sort({ _id: -1 });

        console.log(memberships, 'memberships with expired grace period');
        if (!memberships.length) {
            console.log("No memberships with expired grace period at this time.");
            return;
        }

        console.log(memberships.length, "memberships found with expired grace period.");

        // Loop through each membership and update the status to inactive
        for (const membership of memberships) {
            // Update the status of the membership to inactive
            await userMembershipModal.findByIdAndUpdate(membership._id, {
                status: "inactive"
            }, { new: true });

            console.log(`Membership ${membership._id} status updated to inactive due to expired grace period.`);
        }
    } catch (error) {
        // Log any errors that occur during the process
        console.error('Error processing memberships with expired grace period:', error);
    }
});
// Schedule the cron job to run at midnight every day for Downgrade Membership
cron.schedule('0 0 * * *', async () => {
    try {
        let currentTime = new Date();
        let timezone = 'Australia/Sydney';
        const currentDateTime = new Date();

        // Convert to UTC based on the desired timezone
        const options = {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Ensures 24-hour format
        };

        // Get the date and time formatted as a string in the specified timezone
        const formattedDateTime = currentDateTime.toLocaleString('en-US', options);

        // Create a new Date object using the formatted string
        const [datePart, timePart] = formattedDateTime.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');

        // Construct the ISO format string
        let ISOformat = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
        currentTime = new Date(ISOformat);
        console.log(currentTime, 'currentTime')
        // Find all active memberships for downgrade
        const memberships = await userMembershipModal.find({
            downgradeDate: { $lte: currentTime, $ne: null }, // Exclude null downgrade values
            status: 'active',
        }).sort({ _id: -1 });

        console.log(memberships, 'memberships with downgrade');
        if (!memberships.length) {
            console.log("No memberships for downgrade.");
            return;
        }

        console.log(memberships.length, "memberships found for downgrade.");

        // Loop through each membership and update the status to inactive
        for (const membership of memberships) {
            let data1 = await userMembershipModal.findOne({ user_id: membership.user_id.valueOf(), type: 1 }, { name: 1, price: 1, normalPrice: 1, renewal_date: 1, _id: 1, is_activate: 1, isDowngraded: 1, membershipPurchaseDate: 1, type: 1, payIntId: 1, membership_id: 1, paymentType: 1, purchased_in_preOrder: 1, membershipActivationDate: 1 }).sort({ createdAt: -1 }).limit(1);
            if (membership.isDowngraded && membership.isDowngradeRequested) {
                let priceVal = data1.normalPrice;
                if (membership.price != membership.normalPrice) {
                    // Find the prices with effective dates after the current UTC date and time
                    const unlimitedPrices = await priceModal.find({
                        status: "active",
                        membership: data1.membership_id,
                        effectiveDate: { $lte: currentTime }, // Only select prices with effective dates less than or equal to the current UTC time
                        $or: [
                            { effectiveEndDate: null }, // Select prices with no effective end date
                            { effectiveEndDate: { $gt: currentTime } } // Select prices with effective end dates greater than the current UTC time
                        ]
                    }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date

                    const unlimitedPrice = unlimitedPrices[0];
                    priceVal = unlimitedPrice.price;

                }
                await userMembershipModal.findByIdAndUpdate(
                    { _id: membership._id },
                    { status: "inactive" }
                );
                let is_activate = false
                if (membership.is_activate) is_activate = true
                await userMembershipModal.create({
                    user_id: membership.user_id,
                    membership_id: data1.membership_id,
                    name: data1.name,
                    type: data1.type,
                    price: data1.price,
                    payIntId: data1.payIntId,
                    paymentType: data1.paymentType,
                    normalPrice: priceVal,
                    renewal_date: data1.renewal_date,
                    membershipPurchaseDate: data1.membershipPurchaseDate || membership.membershipPurchaseDate,
                    membershipActivationDate: data1.membershipActivationDate || membership.membershipActivationDate,
                    purchased_in_preOrder: data1.purchased_in_preOrder || membership.purchased_in_preOrder,
                    is_activate,
                    isDowngraded: false,
                    isDowngradeRequested: false
                });

                // Update user data with reusable bookings and guest passes
                await userModal.findOneAndUpdate({ _id: membership.user_id, status: "active" }, {
                    reusable_bookings: 2,
                    guest_passes: 1
                }, { new: true });

                console.log(`Membership ${membership._id} downgrade successfully.`);
            }

            console.log(`Membership ${membership._id} downgrade successfully.`);
        }
    } catch (error) {
        // Log any errors that occur during the process
        console.error('Error processing in downgrade memberships', error);
    }
});
// Common function to delete old records
async function deleteOldRecords() {
    const thresholdDate = moment().subtract(31, 'days').toDate(); // 31 days ago

    for (const model of models) {
        try {
            // Delete documents with status "delete" and createdAt or created_at older than 31 days
            const result = await model.deleteMany({
                status: "delete",
                $or: [
                    { createdAt: { $lte: thresholdDate } },
                    { created_at: { $lte: thresholdDate } }
                ]
            });

            console.log(`Deleted ${result.deletedCount} records from ${model.modelName}`);
        } catch (error) {
            console.error(`Error deleting records from ${model.modelName}:`, error);
        }
    }
}

// Schedule the cron job to run at 12:00 AM (midnight) every day which is used to delete data after 31 days
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily deletion cron job...');
    await deleteOldRecords();
    console.log('Daily deletion job completed.');
});
exports.findSmallestDiscount = async (discounts) => {
    let smallestDiscount = null;
    let discountId = null;
    let smallestTierId = null;
    let discountInitiationFees;
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
        discountInitiationFees = await discountModal.findOne({ _id: discountId, 'tier._id': smallestTierId })
        if (discountInitiationFees.indefinite_seats) {
            discountInitiationFees = await discountModal.findOne(
                { _id: discountId, 'tier._id': smallestTierId },
                { 'initiation_fees': 1, 'tracked_seats': 1 }
            ).exec();
            initiation_fees = discountInitiationFees?.initiation_fees;
        } else {
            discountInitiationFees = await discountModal.findOne(
                { _id: discountId, 'tier._id': smallestTierId },
                { 'initiation_fees': 1, 'tracked_seats': 1 }
            ).exec();
            initiation_fees = discountInitiationFees?.initiation_fees;
            if (discountInitiationFees.tracked_seats == 0) {
                console.log("inisde the conditon")
                initiation_fees = '';
            }
        }
    }

    return { discountId, smallestTierId, smallestDiscount, initiation_fees };
};
/**
 * Updates highlights based on matching short code names and their corresponding values.
 *
 * @param {Array} shortCodes - Array of short codes with details.
 * @param {Array} highlights - Array of highlights to be updated.
 * @param {Object} responseKeyMapping - Object mapping response keys to their values.
 * @returns {Array} - Updated array of highlights.
 */
exports.updateHighlightsWithValues = async (shortCodes, highlights, responseKeyMapping) => {
    const highlightsArray = [];

    for (const highlight of highlights) {
        let newHighlight = highlight.highlight;

        for (const shortCode of shortCodes) {
            if (newHighlight.includes(shortCode.shortCodeName)) {
                for (const detail of shortCode.details) {
                    if (detail.tableName === 'unused') {
                        if (responseKeyMapping.hasOwnProperty(detail.keyName)) {
                            newHighlight = newHighlight.replace(shortCode.shortCodeName, responseKeyMapping[detail.keyName] || '0');
                        }
                    } else {
                        try {
                            const modelPath = path.join('../../', detail.tableName);
                            const Model = require(modelPath);

                            const data = await Model.findOne({ _id: detail.value });
                            if (data && data[detail.keyName]) {
                                newHighlight = newHighlight.replace(shortCode.shortCodeName, data[detail.keyName] || '0');
                            } else {
                                console.log(`Data not found for model ${detail.tableName} and ID ${detail.value}`);
                            }
                        } catch (error) {
                            console.error(`Error loading model or querying data for table ${detail.tableName}:`, error);
                        }
                    }
                }
            }
        }

        const updatedHighlight = {
            highlight: newHighlight,
            strikeThroughHighlight: highlight.strikeThroughHighlight,
            check: highlight.check,
            _id: highlight._id
        };

        highlightsArray.push(updatedHighlight);
    }

    return highlightsArray;
};
// exports.updateHighlightsWithValues = async (shortCodes, highlights, responseKeyMapping) => {
//     // Initialize highlightsArray to hold updated highlights
//     const highlightsArray = [];
//     // Iterate through each highlight
//     highlights.forEach(highlight => {
//         let newHighlight = highlight.highlight; // Start with the original highlight text

//         // Check if any short code matches the highlight
//         shortCodes.forEach(shortCode => {
//             // Check if highlight matches short code name
//             if (newHighlight.includes(shortCode.shortCodeName)) {
//                 // Replace the shortCodeName directly in the highlight text
//                 shortCode.details.forEach(detail => {
//                     // Ensure that the responseKeyMapping contains the detail key
//                     if (responseKeyMapping.hasOwnProperty(detail.keyName)) {
//                         newHighlight = newHighlight.replace(shortCode.shortCodeName, responseKeyMapping[detail.keyName] || '0'); // Use '0' if not found
//                     }
//                 });
//             }
//         });

//         // Create an updated highlight object, retaining existing properties
//         const updatedHighlight = {
//             highlight: newHighlight, // Update the highlight text
//             strikeThroughHighlight: highlight.strikeThroughHighlight, // Retain existing property
//             check: highlight.check, // Retain existing property
//             _id: highlight._id // Retain existing property
//         };

//         // Push the updated highlight object to highlightsArray
//         highlightsArray.push(updatedHighlight);
//     });

//     console.log(highlightsArray, 'highlightsArray');
//     // Return the updated highlights array
//     return highlightsArray;
// };
const sendMailFunction = async (cardId, purchaseDate, renewal_date, userData, discountPrice, priceValue, transactionId, membershipName, type, description) => {
    try {
        const formatDate = (date) => new Date(date).toLocaleString('en-au', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        // const invoiceNo = generateInvoiceNumber();
        const invoiceNo = await generateInvoiceNumber();
        // Construct the URL using the generated invoice number
        console.log(invoiceNo, 'invoiceNo')
        const gst = calculateGST(discountPrice, priceValue);

        const cardInfo = await cardModal.findOne({ _id: cardId });
        //discount price
        let discountPriceVal = parseFloat(priceValue) - parseFloat(discountPrice);
        const invoiceData = {
            purchaseDate: formatDate(purchaseDate),
            renewal_date: formatDate(renewal_date),
            price: priceValue,// without discount price
            discountPrice: priceValue == discountPrice ? 0 : discountPriceVal,
            discountPriceVal: priceValue == discountPrice ? priceValue : discountPrice,
            currdate: new Date().toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' }),
            gst,
            name: membershipName,
            invoiceNo,
            businessName: cardInfo?.businessName || '',
            abn: cardInfo?.abn || ''
        };

        let renewalMembership;
        if (type === 2) {
            renewalMembership = await eliteRenewal.generateEliteMembershipInvoicePdf(invoiceData, userData);
        } else {
            renewalMembership = await normalMembershipPdf.generateNormalMembershipInvoicePdf(invoiceData, userData);
        }
        console.log(renewalMembership, 'renewalMembership')

        await transactionModal.findByIdAndUpdate(transactionId, {
            invoiceNumber: invoiceNo,
            emailSubject: description,
            invoiceUrl: renewalMembership
        }, { new: true });

        let preference = await prefernceModal.findOne({ user_id: userData._id, status: "active" })
        if (preference && preference.automaticInvoiceToMail) {
            await mail.sendMailMembershipInvoice({
                email: userData.email,
                subject: description,
                file: renewalMembership
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error in sendMailFunction:', error);
        return { success: false, message: 'Failed to send mail' };
    }
};

// Function to calculate GST
const calculateGST = (discountPrice, priceValue) => {
    const reverseGST = parseFloat(discountPrice ? discountPrice : priceValue) * 100 / (100 + 10);
    return (parseFloat(discountPrice ? discountPrice : priceValue) - parseFloat(reverseGST)).toFixed(2);
};

/**
 * Convert string to mongoose ObjectId
 * @param {String} id - The string id to convert
 * @returns {ObjectId} - The mongoose ObjectId
 */
exports.toObjectId = (id) => {
    if (mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
    } else {
        throw new Error('Invalid ObjectId');
    }
};

exports.processPayment = async (user, Total_pet_price_with_gst, pet_pass_used) => {
    try {
        if (Number(Total_pet_price_with_gst) > 0) {
            const name = `${pet_pass_used} Pet Pass${pet_pass_used > 1 ? 'es' : ''}`;
            const result = await createPayment({
                userId: user._id,
                name,
                price: Total_pet_price_with_gst,
                normalPrice: '',
                normalInitiationFees: '',
                initiationFees: '',
                pet_id: [],
                currency: "AUD",
                image: process.env.PETPASSLOGO,
                type: "Pet Passes" // Static type for API calls
            });

            if (!result.success) {
                return { success: false, message: result.message };
            }

            const userCardInfo = await cardModal.findOne({ _id: result?.data?.cardId });
            const businessName = userCardInfo?.businessName || '';
            const abn = userCardInfo?.abn || '';
            const invoiceNo = await generateInvoiceNumber();

            const reverseGST = parseFloat(Total_pet_price_with_gst) * 100 / (100 + 10);
            const gst = (parseFloat(Total_pet_price_with_gst) - reverseGST).toFixed(2);
            const currdate = new Date().toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
            const unitPrice = Number(Total_pet_price_with_gst) / Number(pet_pass_used);

            const invoiceData = {
                priceValue: Total_pet_price_with_gst,
                quantity: pet_pass_used,
                unitPrice,
                currdate,
                gst,
                name,
                invoiceNo,
                businessName,
                abn
            };

            let generatedFileName = await itemPurchasePdf.generateItemPurchaseInvoicePdf(invoiceData, user);

            await transactionModal.findByIdAndUpdate({ _id: result?.data?._id }, {
                invoiceNumber: invoiceNo,
                emailSubject: invoiceNo,
                invoiceUrl: generatedFileName
            }, { new: true });

            const preference = await prefernceModal.findOne({ user_id: user._id, status: "active" });
            if (preference?.automaticInvoiceToMail) {
                const getUserData = await userModal.findOne({ _id: user._id });
                const fullName = getUserData?.fullName;

                //getting invoice url
                // const credentials = new AWS.SharedIniFileCredentials({ profile: "s3" });
                // AWS.config.credentials = credentials;
                // aws config
                // AWS.config.update({
                //     region: process.env.S3_REGION
                // });
                const s3 = new AWS.S3();
                // Decode the URI component
                const decodedFileName = decodeURIComponent(generatedFileName);
                const params = {
                    Bucket: process.env.INVOICE_CONTRACT_FILE_BUCKET,
                    Key: decodedFileName
                };

                generatedFileName = new Promise((resolve, reject) => {
                    s3.getSignedUrl('getObject', params, (err, url) => {
                        if (err) {
                            console.error('Error generating signed URL', err);
                            return reject(); // Reject the promise with the error
                        }
                        console.log('The URL is', url);
                        resolve(url); // Resolve the promise with the signed URL
                    });
                });

                await mail.sendMailMembershipInvoice({
                    email: getUserData.email,
                    subject: invoiceNo,
                    file: generatedFileName,
                    fullName
                });
            }

            return { success: true, data: result.data };
        } else {
            return { success: false, message: "Total price must be greater than zero." };
        }
    } catch (error) {
        console.error("Payment processing error:", error);
        return { success: false, message: "An error occurred during payment processing." };
    }
}

exports.fetchS3file = (s3url, BUCKET_NAME) => {
    // const credentials = new AWS.SharedIniFileCredentials({ profile: "s3" });
    // AWS.config.credentials = credentials;
    // aws config
    // AWS.config.update({
    //     region: process.env.S3_REGION,
    // });
    const s3 = new AWS.S3();
    // Remove the protocol
    const urlWithoutProtocol = s3url.replace(/^https?:\/\//, '');
    // Split the URL into parts
    const [bucketAndDomain, ...pathParts] = urlWithoutProtocol.split('/');
    const bucketName = bucketAndDomain.split('.')[0]; // Extract bucket name
    const filePath = '/' + pathParts.join('/'); // Full file path
    const fileName = pathParts[pathParts.length - 1]; // Last part is the file name
    console.log('bucketName==', bucketName)
    // Decode the URI component
    const decodedFileName = decodeURIComponent(fileName);
    const params = {
        Bucket: BUCKET_NAME,
        Key: decodedFileName
    };

    return new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', params, (err, url) => {
            if (err) {
                console.error('Error generating signed URL', err);
                return reject(); // Reject the promise with the error
            }
            //console.log('The URL is', url);
            resolve(url); // Resolve the promise with the signed URL
        });
    });
}

exports.fetchS3fileByKey = (key, BUCKET_NAME) => {
    // const credentials = new AWS.SharedIniFileCredentials({ profile: "s3" });
    // AWS.config.credentials = credentials;

    const s3 = new AWS.S3();
    // Decode the URI component
    const decodedFileName = decodeURIComponent(key);
    const params = {
        Bucket: BUCKET_NAME,
        Key: decodedFileName
    };

    return new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', params, (err, url) => {
            if (err) {
                console.error('Error generating signed URL', err);
                return reject(); // Reject the promise with the error
            }
            //console.log('The URL is', url);
            resolve(url); // Resolve the promise with the signed URL
        });
    });
}


exports.isValidUrl = (data) => {
    return new Promise((resolve, reject) => {
        const regex = /^(ftp|http|https):\/\/[^ "]+$/; // Simple regex for validation
        let result = regex.test(data);
        resolve(result)
    });

};

exports.checkBucketName = (s3url) => {
    // Remove the protocol
    const urlWithoutProtocol = s3url.replace(/^https?:\/\//, '');
    // Split the URL into parts
    const [bucketAndDomain, ...pathParts] = urlWithoutProtocol.split('/');
    const bucketName = bucketAndDomain.split('.')[0]; // Extract bucket name
    const filePath = '/' + pathParts.join('/'); // Full file path
    const fileName = pathParts[pathParts.length - 1]; // Last part is the file name
    return bucketName;
}

exports.getCurrentDateInTimezone = async (timezone) => {
    const current_Date = new Date();

    const options = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };

    const formattedDateTime = current_Date.toLocaleString('en-US', options);

    const [datePart, timePart] = formattedDateTime.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');

    const ISOformat = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
    return new Date(ISOformat);
};