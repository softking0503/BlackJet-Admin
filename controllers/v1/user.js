const dotenv = require('dotenv');
const { successResponse,
    requiredIdResponse,
    internalServerError,
    failMessage,
    successResponseWithoutData,
    successResponseWithPagination,
    emptyResponse,
    notFoundResponse,
    errorResponse,
    customResponse,
    NotAcceptable,
    Forbidden
} = require("../../helpers/response");
const axios = require('axios');
const mail = require('../../helpers/mailer');
const chatTimeModal = require("../../models/chatTime");
const userModal = require("../../models/users.model");
const tempUserModal = require("../../models/tempUsers");
const industryModal = require("../../models/industries");
const blackListCardModel = require("../../models/blackListCards");
const deviceTokenModal = require("../../models/deviceToken");
const planAndpricingModal = require("../../models/membership");
const specialNeedsAndCondition = require("../../models/specialNeedsAndConditions")
const petsModal = require("../../models/pets");
const { createPayment } = require('../../controllers/v1/payment'); // Update with correct path
const referModal = require("../../models/refer");
const flightModal = require("../../models/flights")
const { default: mongoose } = require('mongoose');
const flight_seat_mapping = require("../../models/flight_seats_mapping")
const paymentModal = require("../../models/card");
const paymentGatewayModal = require("../../models/payment_gateway");
const userBoutiqueModal = require("../../models/user_boutique");
const paymentMethodModal = require("../../models/payment_method");
const user_guest_mapping_modal = require("../../models/user_guest_mapping")
const user_pet_mapping_modal = require("../../models/user_pet_mapping")
const items_modal = require("../../models/item")
const booking_modal = require("../../models/booking")
const state_modal = require("../../models/state")
const routeModal = require("../../models/route")
const adminModal = require("../../models/admin")
const prefernceModal = require("../../models/preference")
const commonservices = require("../../helpers/v1/common")
const surveyModal = require("../../models/survey")
const legalModal = require("../../models/legal");
const faqModal = require("../../models/faq");
const itemModal = require("../../models/item");
const newCategoryModal = require("../../models/category");
const cardModal = require("../../models/card");
const contactModal = require("../../models/contactUs");
const usercontactModal = require("../../models/userContactUs")
const userMembershipModal = require("../../models/userMembership")
const transactionModal = require("../../models/payment")
const boutiqueModal = require('../../models/boutique');
const app_static_contentModal = require("../../models/appStaticContent")
const membershipModal = require("../../models/membership");
const priceModal = require("../../models/price");
const discountModal = require("../../models/discount");
const enquiryListModal = require("../../models/enquiryList");
const announcementModal = require("../../models/userAnnouncement");
const announcementsModal = require("../../models/announcement");
const send_notification = require("../../helpers/third_party_function");
const membership_settings = require("../../models/membership_settings");
const userGiftCard = require("../../models/userGiftCards");
const twilioCountryModel = require("../../models/twilioCountry");
const paymentCountryModel = require("../../models/paymentCountry");
const enquiryModal = require("../../models/enquiry");
const failedCardModel = require('../../models/failedCards');
const airwallexLogModal = require('../../models/airwallexLog');
let ObjectID = require("mongodb").ObjectId
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const moment = require('moment');
const veriffModal = require("../../models/veriff")
const veriffWebhookResponseModal = require("../../models/veriffWebhookResponse")
const veriffEventResponseModal = require("../../models/veriffEventResponse")
const veriffPepResponseModal = require("../../models/veriffPepResponse")
const dayjs = require("dayjs")
const { createEvents } = require('ics');
const userGiftCards = require("../../models/userGiftCards");
const { log } = require("util");
const { v4: uuid } = require('uuid');
const { savePowerboardCustomer, modifyPaymentSource, archivePaymentSource } = require('../../helpers/v1/powerBoardPayment'); // Adjust the path to your utility file
const { saveAirwallexCustomer, refundPayment, createPaymentConsent, verifyPaymentConsent } = require('../../helpers/airwallexPayment'); // Adjust the path to your utility file

const genratePdf = require('../../helpers/genratePdf');
const refundPdf = require('../../helpers/refundPdf')
const secretManagerAws = require('../../helpers/secretManagerAws');
const randomize = require("randomatic");
const { UUID } = require("mongodb");
const usersModel = require("../../models/users.model");
const { date } = require("joi");
const human = require('humanparser');
const { encrypt, decrypt } = require('node-encryption');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../../config', '.envs') });
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const S3_REGION = process.env.S3_REGION;

//login or signup api 
exports.login = async (req, res) => {
    const { phone, country_code, email, phone_code } = req.body;
    // await userModal.updateMany({ otpValidTime: null });
    // await tempUserModal.updateMany({ otpValidTime: null });

    // Current date and time
    const currDateTime = new Date();
    let otpCurrentTime;

    try {
        let JWT_SECRET = process.env.JWT_SECRET;
        //Check for the phone validation
        if (phone && !Number(phone)) {
            return failMessage('Please Enter Valid Phone!', res)
        }
        let membershipSettings = {};
        membershipSettings = await membership_settings.findOne({ status: 'active' })
        let otp = 123456; //static otp
        if (process.env.NODE_ENV == 'production') {
            otp = randomize('0', 6); //dynamic otp
        }

        let user_membership;
        //Checking whether user enters phone number or not
        if (country_code && country_code.length > 0 && phone && phone_code) {
            const user = await userModal.findOne({ phone, country_code, phone_code, status: { $in: ['active', 'inactive'] } });//Find the user using his/her phone number with status active or inactive
            //check valid country for twilio
            const twilioCountry = await twilioCountryModel.findOne({ country_code: phone_code });
            if (!twilioCountry) {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
            }
            //twilio process
            let toPhoneNumber = phone_code + phone; // The recipient's phone number
            let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
            //otp message
            const otpMessage = `Your Black Jet code is ${otp}.  Never share it with anyone.`;
            //red mean we are not support phone code, green,blue and yellow means different sender number 
            if (twilioCountry.colour == 'red') {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
            } else if (twilioCountry.colour == 'green') {
                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
            } else if (twilioCountry.colour == 'blue') {
                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
            } else if (twilioCountry.colour == 'yellow') {
                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
            }
            //sending sms
            if (process.env.NODE_ENV == 'production') {
                client.messages
                    .create({
                        body: otpMessage,
                        from: fromPhoneNumber,
                        to: toPhoneNumber,
                    })
                    .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    .catch(error => console.error(`Error sending OTP: ${error.message}`));
            }
            //Check Otp Time For User Modal
            const checkOtpCallTimeUser = await userModal.findOne({
                phone,
                country_code,
                phone_code,
                otpValidTime: { $gte: currDateTime }
            }).sort({ createdAt: -1 });

            if (checkOtpCallTimeUser) {
                return failMessage("Request OTP after sometime.", res);
            }
            if (!user) {
                //Check Otp Time For Temp User Modal
                const checkOtpCallTimeTemp = await tempUserModal.findOne({
                    phone,
                    country_code,
                    phone_code,
                    otpValidTime: { $gte: currDateTime }
                }).sort({ createdAt: -1 });

                if (checkOtpCallTimeTemp) {
                    return failMessage("Request OTP after sometime.", res);
                }

                // If the user does not exist, create a new user
                //const newUser = new userModal({ phone, country_code, phone_code });
                const newUser = new tempUserModal({ phone, country_code, phone_code });
                const token = jwt.sign({ _id: newUser._id }, JWT_SECRET);//Generate JWT Token for newly created user
                newUser.token = token;//Generated token is inserted in the users table
                newUser.otp = otp;// OTP is added in the users table
                newUser.status = 'active'
                // Add otpValidTime with current date and time incremented by 10 seconds
                newUser.otpValidTime = moment(currDateTime).add(10, 'seconds').toDate();

                await newUser.save(); // Save the new user to the database
                otpCurrentTime = moment(currDateTime).add(10, 'seconds').toDate();
                user_membership = await userMembershipModal.findOne({ user_id: newUser._id, status: "active" });

                const userData = {
                    _id: newUser._id,
                    phone: newUser.phone,
                    token: newUser.token,
                    newUser: true,
                    otp: '',
                    country_code: newUser.country_code,
                    phone_code: newUser.phone_code,
                    email: newUser.email,
                    profile_pic: newUser.profile_pic,
                    status: newUser.status,
                    email_verified: newUser.email_verified,
                    phone_verified: newUser.phone_verified,
                    is_information_page_completed: newUser.is_information_page_completed,
                    otp_verified: newUser.otp_verified,
                    is_membership_payment_page_completed: newUser.is_membership_payment_page_completed,
                    onboard_status: newUser.onboard_status,
                    is_membership_purchased: !!user_membership,
                    is_demo_process: membershipSettings.is_demo_process,
                    preOrder: membershipSettings.preOrder
                };
                return successResponse(userData, 'Successfully logged in.', res);
            }
            //checking phone verified or not
            // if (user.phone_verified == false) {
            //     return failMessage('User phone not verified!', res)
            // }
            //If user is inactive then send error response
            if (user.status == 'inactive') {
                return failMessage('User is Inactive!', res)
            }
            //The user is already exists
            const token = jwt.sign({ _id: user._id }, JWT_SECRET);

            user_membership = await userMembershipModal.findOne({ user_id: user._id, status: "active" })

            // Update the existing user's token and add Otp
            const existeduser = await userModal.findOneAndUpdate({ phone, country_code, phone_code }, { token, otp: otp, ot_time: otpCurrentTime }, { new: true });

            const userData = {
                _id: existeduser._id,
                phone: existeduser.phone,
                token: token,
                newUser: false,
                otp: '',
                country_code: existeduser.country_code,
                phone_code: existeduser.phone_code,
                email: existeduser.email,
                profile_pic: existeduser.profile_pic,
                status: existeduser.status,
                email_verified: existeduser.email_verified,
                phone_verified: existeduser.phone_verified,
                is_information_page_completed: existeduser.is_information_page_completed,
                otp_verified: existeduser.otp_verified,
                is_membership_payment_page_completed: existeduser.is_membership_payment_page_completed,
                onboard_status: existeduser.onboard_status,
                is_membership_purchased: !!user_membership,
                is_demo_process: membershipSettings.is_demo_process,
                preOrder: membershipSettings.preOrder
            };

            return successResponse(userData, 'Successfully logged in.', res);
        }
        else if (email && email.length > 0) {
            //Check for the email validation
            if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email)) {
                return failMessage('Invalid Email Format!', res)
            }
            //Find the user by using his/her email id
            const user = await userModal.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') }, status: { $in: ['active', 'inactive'] } });//Find the user using his/her email with status active or inactive
            if (!user) {

                // If the user does not exist, create a new user
                //const newUser = new userModal({ email });
                const newUser = new tempUserModal({ email });
                const token = jwt.sign({ _id: newUser._id }, JWT_SECRET);
                newUser.token = token;
                newUser.status = 'active'
                await newUser.save();

                user_membership = await userMembershipModal.findOne({ user_id: newUser._id, status: "active" })

                // Save the new user to the database
                //For first time user registration through email, there will be no email verification
                const userData = {
                    _id: newUser._id,
                    phone: newUser.phone,
                    token: newUser.token,
                    newUser: true,
                    otp: "",
                    country_code: newUser.country_code,
                    phone_code: newUser.phone_code,
                    email: newUser.email,
                    profile_pic: newUser.profile_pic,
                    status: newUser.status,
                    email_verified: newUser.email_verified,
                    phone_verified: newUser.phone_verified,
                    is_information_page_completed: newUser.is_information_page_completed,
                    otp_verified: newUser.otp_verified,
                    is_membership_payment_page_completed: newUser.is_membership_payment_page_completed,
                    onboard_status: newUser.onboard_status,
                    is_membership_purchased: !!user_membership,
                    is_demo_process: membershipSettings.is_demo_process,
                    preOrder: membershipSettings.preOrder

                };

                //token for secure verification mail link
                const verificationtoken = jwt.sign({ _id: newUser._id, email: newUser.email }, process.env.JWT_EMAIL_SECRET);
                //create verification link
                let link = `${process.env.SERVER_URL}/v1/user/emailVerification?id=${verificationtoken}`;
                //Send mail verification 
                await mail.sendMailVerification({ email: newUser.email, body: `Email Verification`, fullName: newUser.email, link: link })
                //sending response
                return successResponse(userData, 'Successfully logged in.', res);
            }

            //checking phone verified or not
            // if (user.phone_verified == false) {
            //     return failMessage('User phone not verified!', res)
            // }

            if (user.status == 'inactive') {//Check for user is active or inactive
                return failMessage('User is Inactive!', res)
            }
            //If the user is already exists then send mail for verification. 
            await mail.sendMailOTPVerification({ email: user.email, body: `Your Black Jet code is ${otp}. Never share it with anyone.`, otp: otp, fullname: user.fullName })
            //await mail.sendMail({ email: user.email, body: `Your Black Jet code is ${otp}.  Never share this code.` })

            //creating jwt token for user authentication
            const token = jwt.sign({ _id: user._id }, JWT_SECRET);
            // Update the existing user's token and add Otp
            const existeduser = await userModal.findOneAndUpdate({ email: { $regex: new RegExp(`^${email}$`, 'i') } }, { token, otp: otp }, { new: true });

            user_membership = await userMembershipModal.findOne({ user_id: user._id, status: "active" })

            const userData = {
                _id: existeduser._id,
                phone: existeduser.phone,
                email: existeduser.email,
                token: token,
                newUser: false,
                otp: '',
                country_code: existeduser.country_code,
                phone_code: existeduser.phone_code,
                profile_pic: existeduser.profile_pic,
                status: existeduser.status,
                email_verified: existeduser.email_verified,
                phone_verified: existeduser.phone_verified,
                is_information_page_completed: existeduser.is_information_page_completed,
                otp_verified: existeduser.otp_verified,
                is_membership_payment_page_completed: existeduser.is_membership_payment_page_completed,
                onboard_status: existeduser.onboard_status,
                is_membership_purchased: !!user_membership,
                is_demo_process: membershipSettings.is_demo_process,
                preOrder: membershipSettings.preOrder

            };
            return successResponse(userData, 'Successfully logged in.', res);
        }
        else {
            return requiredIdResponse('Phone/Email is required!', res);
        }
    } catch (err) {
        //console.error(err);
        return internalServerError('Internal Server Error', res);
    }
}

exports.loginWithToken = async (req, res) => {
    const { phone, country_code, email, phone_code } = req.body;

    try {    
        let JWT_SECRET = process.env.JWT_SECRET;
        const currDateTime = new Date();
        const user = req.payload
        const _id = req.payload._id
        let otp = 123456; //static otp
        let otpCurrentTime;
        if (process.env.NODE_ENV == 'production') {
            otp = randomize('0', 6); //dynamic otp
        }
        let membershipSettings = {};
        membershipSettings = await membership_settings.findOne({ status: 'active' });
        if (country_code && country_code.length > 0 && phone && phone_code) {
            if (!Number(phone)) {
                return failMessage('Please Enter Valid Phone!', res)
            }
            //Check Otp Time For User Modal
            //Check Otp Time For Temp User Modal
            const checkOtpCallTimeTemp = await tempUserModal.findOne({
                phone,
                country_code,
                phone_code,
                otpValidTime: { $gte: currDateTime }
            }).sort({ createdAt: -1 });

            if (checkOtpCallTimeTemp) {
                return failMessage("Request OTP after sometime.", res);
            }
            const userPhoneStatus = await userModal.findOne({ phone, country_code, phone_code, status: 'active' });//Find the user using his/her phone number with status active
            if (userPhoneStatus) {
                return failMessage('Phone already exist', res)
            }
            const userPhone = await tempUserModal.findOne({ phone, country_code, phone_code, status: { $in: ['active', 'inactive'] } });//Find the user using his/her phone number with status active or inactive
            //check valid country for twilio
            const twilioCountry = await twilioCountryModel.findOne({ country_code: phone_code });
            if (!twilioCountry) {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
            }
            //twilio process
            let toPhoneNumber = phone_code + phone; // The recipient's phone number
            let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
            //otp message
            const otpMessage = `Your Black Jet code is ${otp}.  Never share it with anyone.`;
            //red mean we are not support phone code, green,blue and yellow means different sender number 
            if (twilioCountry.colour == 'red') {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
            } else if (twilioCountry.colour == 'green') {
                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
            } else if (twilioCountry.colour == 'blue') {
                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
            } else if (twilioCountry.colour == 'yellow') {
                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
            }
            //sending sms
            if (process.env.NODE_ENV == 'production') {
                client.messages
                    .create({
                        body: otpMessage,
                        from: fromPhoneNumber,
                        to: toPhoneNumber,
                    })
                    .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    .catch(error => console.error(`Error sending OTP: ${error.message}`));
            }
            if (userPhone && userPhone._id != _id) {
                if (userPhone.onboard_status) {
                    let user_membership = await userMembershipModal.findOne({ user_id: userPhone._id, status: "active" })

                    // const toPhoneNumber = phone_code + phone; // The recipient's phone number
                    // const fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number

                    // const otpMessage = `Your Black Jet code is ${otp}.  Never share this code.`;

                    // client.messages
                    //     .create({
                    //         body: otpMessage,
                    //         from: fromPhoneNumber,
                    //         to: toPhoneNumber,
                    //     })
                    //     .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    //     .catch(error => console.error(`Error sending OTP: ${error.message}`));
                    const token = jwt.sign({ _id: userPhone._id }, JWT_SECRET);//Generate JWT Token for newly created user
                    // let update_user = await userModal.findByIdAndUpdate({ _id: userPhone._id }, {
                    //     token, otp, status: "active"
                    // }, { new: true })
                    //newly created user in temp user model
                    otpCurrentTime = moment(currDateTime).add(10, 'seconds').toDate();

                    let update_user = await tempUserModal.findByIdAndUpdate({ _id: userPhone._id }, {
                        token, otp, otpValidTime: otpCurrentTime, status: "active", email_verified: user.email_verified
                    }, { new: true })

                    const userData = {
                        _id: update_user._id,
                        phone: update_user.phone,
                        newUser: false,
                        otp: '',
                        token: update_user.token,
                        country_code: update_user.country_code,
                        phone_code: update_user.phone_code,
                        email: update_user.email,
                        profile_pic: update_user.profile_pic,
                        status: update_user.status,
                        email_verified: update_user.email_verified,
                        phone_verified: update_user.phone_verified,
                        is_information_page_completed: update_user.is_information_page_completed,
                        otp_verified: update_user.otp_verified,
                        is_membership_payment_page_completed: update_user.is_membership_payment_page_completed,
                        onboard_status: update_user.onboard_status,
                        is_membership_purchased: !!user_membership,
                        is_demo_process: membershipSettings.is_demo_process,
                        preOrder: membershipSettings.preOrder
                    };
                    await tempUserModal.deleteOne({ _id: user._id.valueOf() })
                    //await userModal.deleteOne({ _id: user._id.valueOf() })

                    return successResponse(userData, 'Successfully logged in.', res);
                } else {
                    await tempUserModal.deleteOne({ _id: userPhone._id.valueOf() })
                    //await userModal.deleteOne({ _id: userPhone._id.valueOf() })
                }
            }
            //The user is already exists
            // const toPhoneNumber = phone_code + phone; // The recipient's phone number
            // const fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number

            // const otpMessage = `Your Black Jet code is ${otp}.  Never share this code.`;

            // client.messages
            //     .create({
            //         body: otpMessage,
            //         from: fromPhoneNumber,
            //         to: toPhoneNumber,
            //     })
            //     .then(message => console.log(`OTP sent with SID: ${message.sid}`))
            //     .catch(error => console.error(`Error sending OTP: ${error.message}`));

            // const existeduser = new userModal({
            //     email: user.email
            // });

            const existeduser = new tempUserModal({
                email: user.email
            });
            const token = jwt.sign({ _id: existeduser._id }, JWT_SECRET);//Generate JWT Token for newly created user
            existeduser.token = token;//Generated token is inserted in the users table
            existeduser.status = 'active'
            existeduser.phone = phone
            existeduser.country_code = country_code
            existeduser.phone_code = phone_code
            existeduser.otp = otp
            existeduser.email_verified = user.email_verified
            existeduser.otpValidTime = moment(currDateTime).add(10, 'seconds').toDate();


            await existeduser.save(); // Save the new user to the database
            let user_membership = await userMembershipModal.findOne({ user_id: existeduser._id, status: "active" })

            const userData = {
                _id: existeduser._id,
                phone: existeduser.phone,
                newUser: true,
                otp: '',
                token: existeduser.token,
                country_code: existeduser.country_code,
                phone_code: existeduser.phone_code,
                email: existeduser.email,
                profile_pic: existeduser.profile_pic,
                status: existeduser.status,
                email_verified: existeduser.email_verified,
                phone_verified: existeduser.phone_verified,
                is_information_page_completed: existeduser.is_information_page_completed,
                otp_verified: existeduser.otp_verified,
                is_membership_payment_page_completed: existeduser.is_membership_payment_page_completed,
                onboard_status: existeduser.onboard_status,
                is_membership_purchased: !!user_membership,
                is_demo_process: membershipSettings.is_demo_process,
                preOrder: membershipSettings.preOrder
            };
            await tempUserModal.deleteOne({ _id: user._id.valueOf() })
            //await userModal.deleteOne({ _id: user._id.valueOf() })

            return successResponse(userData, 'Successfully logged in.', res);
        }
        //when user enters email id
        else if (email && email.length > 0) {
            //Check for the email validation
            if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email)) {
                return failMessage('Invalid Email Format!', res)
            }
            //const userEmail = await userModal.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') }, status: { $in: ['active', 'inactive'] } });//Find the user using his/her email with status check active and inactive
            const userEmail = await tempUserModal.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') }, status: { $in: ['active', 'inactive'] } });//Find the user using his/her email with status check active and inactive
            //Check whether email is already exists or not
            if (userEmail && userEmail._id != _id) {
                if (userEmail.onboard_status) {
                    return failMessage('Email already exist', res)
                }
                await tempUserModal.deleteOne({ _id: userEmail._id.valueOf() })
                //await userModal.deleteOne({ _id: userEmail._id.valueOf() })
            }
            //let existeduser = await userModal.create({ phone: user.phone, phone_code: user.phone_code, country_code: user.country_code });
            let existeduser = await tempUserModal.create({ phone: user.phone, phone_code: user.phone_code, country_code: user.country_code });
            const token = jwt.sign({ _id: existeduser._id }, JWT_SECRET);//Generate JWT Token for newly created user
            existeduser.email = email
            existeduser.token = token;//Generated token is inserted in the users table
            existeduser.status = 'active'
            existeduser.otp = otp

            await existeduser.save();

            if (user.email != email) {
                //If email is entered first time then update the email and otp, there will be no otp storing -1
                await tempUserModal.findByIdAndUpdate({ _id: existeduser._id }, {
                    otp: -1
                })
                //await userModal.findByIdAndUpdate({ _id: existeduser._id }, {
                //    otp: -1
                //})
                let user_membership = await userMembershipModal.findOne({ user_id: existeduser._id, status: "active" })

                // Save the new user to the database
                const userData = {
                    _id: existeduser._id,
                    email: existeduser.email,
                    newUser: true,
                    otp: '',
                    token: existeduser.token,
                    phone: existeduser.phone,
                    country_code: existeduser.country_code,
                    phone_code: existeduser.phone_code,
                    profile_pic: existeduser.profile_pic,
                    status: existeduser.status,
                    email_verified: existeduser.email_verified,
                    phone_verified: existeduser.phone_verified,
                    is_information_page_completed: existeduser.is_information_page_completed,
                    otp_verified: existeduser.otp_verified,
                    is_membership_payment_page_completed: existeduser.is_membership_payment_page_completed,
                    onboard_status: existeduser.onboard_status,
                    is_membership_purchased: !!user_membership,
                    is_demo_process: membershipSettings.is_demo_process,
                    preOrder: membershipSettings.preOrder
                };
                await tempUserModal.deleteOne({ _id: user._id.valueOf() });
                //await userModal.deleteOne({ _id: user._id.valueOf() });
                return successResponse(userData, 'Successfully logged in.', res);
            }
            //If the user is already exists then send mail for verification. 
            await mail.sendMailOTPVerification({ email: user.email, body: `Your Black Jet code is ${otp}. Never share it with anyone.`, otp: otp, fullname: user.fullName })
            //await mail.sendMail({ email: user.email, body: `Your Black Jet code is ${otp}.  Never share this code.` })

            //Get the user and update the email and otp
            await tempUserModal.findByIdAndUpdate({ _id: existeduser._id }, {
                otp
            })
            // await userModal.findByIdAndUpdate({ _id: existeduser._id }, {
            //     otp
            // })
            let user_membership = await userMembershipModal.findOne({ user_id: existeduser._id, status: "active" })

            // Save the new user to the database
            const userData = {
                _id: existeduser._id,
                email: existeduser.email,
                newUser: true,
                otp: '',
                token: existeduser.token,
                phone: existeduser.phone,
                country_code: existeduser.country_code,
                phone_code: existeduser.phone_code,
                profile_pic: existeduser.profile_pic,
                status: existeduser.status,
                email_verified: existeduser.email_verified,
                phone_verified: existeduser.phone_verified,
                is_information_page_completed: existeduser.is_information_page_completed,
                otp_verified: existeduser.otp_verified,
                is_membership_payment_page_completed: existeduser.is_membership_payment_page_completed,
                onboard_status: existeduser.onboard_status,
                is_membership_purchased: !!user_membership,
                is_demo_process: membershipSettings.is_demo_process,
                preOrder: membershipSettings.preOrder
            };
            await tempUserModal.deleteOne({ _id: user._id.valueOf() })
            //await userModal.deleteOne({ _id: user._id.valueOf() })
            return successResponse(userData, 'Successfully logged in.', res);

        } else return requiredIdResponse('Phone/Email is required!', res);
    } catch (err) {
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
}
exports.resendOTP = async (req, res) => {

    try {
        const user = req.payload
        const currDateTime = new Date();
        const _id = req.payload._id
        const phone_code = req.payload.phone_code
        const phone = req.payload.phone
        let otp = 123456; //static otp
        let otpCurrentTime = moment(currDateTime).add(10, 'seconds').toDate();
        if (process.env.NODE_ENV == 'production') {
            otp = randomize('0', 6); //dynamic otp
        }

        if (req.query.checkRegType == undefined) {
            return requiredIdResponse('checkRegType is required', res)
        }
        if (checkRegType == 'registered') {
            //Check Otp Time For Temp User Modal
            const checkOtpCallTimeTemp = await tempUserModal.findOne({
                phone,
                phone_code,
                otpValidTime: { $gte: currDateTime }
            }).sort({ createdAt: -1 });

            if (checkOtpCallTimeTemp) {
                return failMessage("Request OTP after sometime.", res);
            }
        }
        //Check Otp Time For User Modal
        const checkOtpCallTimeUser = await userModal.findOne({
            phone,
            phone_code,
            otpValidTime: { $gte: currDateTime }
        }).sort({ createdAt: -1 });

        if (checkOtpCallTimeUser) {
            return failMessage("Request OTP after sometime.", res);
        }
        const checkRegType = req.query.checkRegType;
        //check valid country for twilio
        const twilioCountry = await twilioCountryModel.findOne({ country_code: phone_code });
        if (!twilioCountry) {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
        }
        //twilio process
        let toPhoneNumber = phone_code + phone; // The recipient's phone number
        let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
        //otp message
        const otpMessage = `Your Black Jet code is ${otp}. Never share it with anyone.`;
        //red mean we are not support phone code, green,blue and yellow means different sender number 
        if (twilioCountry.colour == 'red') {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
        } else if (twilioCountry.colour == 'green') {
            fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
        } else if (twilioCountry.colour == 'blue') {
            fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
        } else if (twilioCountry.colour == 'yellow') {
            fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
        }
        //sending sms
        if (process.env.NODE_ENV == 'production') {
            client.messages
                .create({
                    body: otpMessage,
                    from: fromPhoneNumber,
                    to: toPhoneNumber,
                })
                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                .catch(error => console.error(`Error sending OTP: ${error.message}`));
        }

        let data = {
            otp: ''
        }

        if (checkRegType == 'registered') {
            //If the temp user is exists then update the OTP by using temp user's id.
            await tempUserModal.findByIdAndUpdate({ _id }, { otp: otp, otpValidTime: otpCurrentTime, phone_verified: false }, { new: true });
            return successResponse(data, 'OTP sent successfully.', res);
        }
        //If the user is exists then update the OTP by using user's id.
        await userModal.findByIdAndUpdate({ _id }, { otp: otp, otpValidTime: otpCurrentTime, phone_verified: false }, { new: true });
        return successResponse(data, 'OTP sent successfully.', res);
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.sendCodeToEmail = async (req, res) => {
    try {
        const user = req.payload;
        const _id = req.payload._id;
        let otp = 123456; //static otp
        if (process.env.NODE_ENV == 'production') {
            otp = randomize('0', 6); //dynamic otp
        }
        //Send the verification code through email
        await mail.sendMailOTPVerification({ email: user.email, body: `Your Black Jet code is ${otp}. Never share it with anyone.`, otp: otp, fullname: user.fullName })
        //await mail.sendMail({ email: user.email, body: `Your Black Jet code is ${otp}.  Never share this code.` })

        //If the user exists then update the Static OTP by using user's id.
        await userModal.findByIdAndUpdate({ _id }, { otp: otp }, { new: true });

        let data = {
            otp: ''
        }
        return successResponse(data, 'OTP sent successfully.', res);
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.verifyOTP = async (req, res) => {
    try {
        const user = req.payload;
        // const firebaseDeviceTokenRegex = /^[a-zA-Z0-9:_-]{1,200}$/;

        // // Function to check for HTML tags
        // const containsHTMLTags = (str) => /<\/?[a-z][\s\S]*>/i.test(str);

        // // Function to validate Firebase device token length
        // const isValidFirebaseDeviceTokenLength = (str) => str.length > 20;
        let type = req.body.type;// type having login,register
        const { firebase_device_token, checkRegType, otp, verify_from } = req.body;
        // // Check for HTML tags in firebase_device_token
        // if (containsHTMLTags(firebase_device_token)) {
        //     return failMessage('Invalid firebase_device_token: HTML tags are not allowed.', res);
        // }

        // // Validate firebase_device_token format
        // if (!firebaseDeviceTokenRegex.test(firebase_device_token)) {
        //     return failMessage('Invalid firebase_device_token format.', res);

        // }
        // // Check if the firebase_device_token length is greater than 20 characters
        // if (!isValidFirebaseDeviceTokenLength(firebase_device_token)) {
        //     return failMessage('Invalid firebase_device_token: Must be greater than 20 characters.', res);
        // }
        //If type is registered then check otp in temp user collection else user collection
        if (checkRegType == 'registered') {
            //Storing Firebase device token in temp users table
            await tempUserModal.findByIdAndUpdate({ _id: user._id }, {
                firebase_device_token
            }, { new: true })
            //Compare the OTP getting from request body with the user's OTP stored in the temp users table
            if (otp == user.otp) {
                let email_verified = user.email_verified
                if (verify_from != 1) {
                    phone_verified = true;
                    await tempUserModal.findByIdAndUpdate({ _id: user._id }, {
                        otp_verified: true, phone_verified
                    })
                }

                if (verify_from == 1) {
                    //email require when user want to use registered email
                    if (req.body.email == undefined) {
                        return requiredIdResponse('Email is required!', res)
                    }
                    //email verify and add
                    email_verified = true;
                    await tempUserModal.findByIdAndUpdate({ _id: user._id }, {
                        otp_verified: true, email: req.body.email, email_verified
                    })

                    //removing email from registered user
                    await userModal.updateMany(
                        { email: { $regex: new RegExp(`^${req.body.email}$`, 'i') } },
                        { $set: { email: '', email_verified: false } }
                    );
                }

                return successResponseWithoutData('Otp verified successfully!', res)
            } else return failMessage('Wrong Otp!', res);
        }
        //Storing Firebase device token in users table
        await userModal.findByIdAndUpdate({ _id: user._id }, {
            firebase_device_token
        }, { new: true })
        //Compare the OTP getting from request body with the user's OTP stored in the users table
        if (otp == user.otp) {
            let email_verified = user.email_verified
            if (verify_from != 1) {
                phone_verified = true;
                await userModal.findByIdAndUpdate({ _id: user._id }, {
                    otp_verified: true, phone_verified
                })
            }

            if (verify_from == 1) {
                email_verified = true;
                await userModal.findByIdAndUpdate({ _id: user._id }, {
                    otp_verified: true, email_verified
                })
            }

            return successResponseWithoutData('Otp verified successfully!', res)
        }
        else return failMessage('Wrong Otp!', res)
    } catch (err) {
        console.log(err, "error")
        return internalServerError('Internal Server Error', res);
    }
};
exports.addEmail = async (req, res) => {
    try {
        const _id = req.payload._id
        try {
            //Find the user by using the email id, checking if the email is already exists verified or not.
            const existedmail = await userModal.findOne({
                email: { $regex: new RegExp(`^${req.body.email}$`, 'i') },
                email_verified: true
            })
            if (existedmail) {
                return failMessage("Email already exist", res)
            }
            // const existedmail = await tempUserModal.findOne({ email: req.body.email })
            // if (existedmail && existedmail._id.valueOf() != _id) {
            //     if (existedmail.onboard_status) {
            //         return failMessage("Email already exist", res)
            //     } else {
            //         await tempUserModal.deleteOne({ _id: existedmail._id.valueOf() })
            //         //await userModal.deleteOne({ _id: existedmail._id.valueOf() })
            //     }
            // }
            //Find the user by using id and update the email id in the users table.
            await tempUserModal.findByIdAndUpdate({ _id }, { email: req.body.email }, { new: true });
            //removing email from registered user if not verified email
            await userModal.updateMany(
                { email: { $regex: new RegExp(`^${req.body.email}$`, 'i') } },
                { $set: { email: '' } }
            );
            //token for secure verification mail link
            const verificationtoken = jwt.sign({ _id: _id, email: req.body.email }, process.env.JWT_EMAIL_SECRET);
            //create verification link
            let link = `${process.env.SERVER_URL}/v1/user/emailVerification?id=${verificationtoken}`;
            //Send mail verification 
            await mail.sendMailVerification({ email: req.body.email, body: `Email Verification`, fullName: req.body.email, link: link })
            //await userModal.findByIdAndUpdate({ _id }, { email: req.body.email }, { new: true });
            return successResponseWithoutData('Email Added Successfully!', res)
        } catch (err) {
            return failMessage("Email already exist", res)
        }

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
//api for send otp when add email on registration process 
exports.sendOtpEmailRegister = async (req, res) => {
    try {
        const user = req.payload
        const _id = req.payload._id
        const { email } = req.body
        let otp = 123456; //static otp
        if (process.env.NODE_ENV == 'production') {
            otp = randomize('0', 6); //dynamic otp
        }
        //If the temp user is exists then update the OTP by using temp user's id.
        await tempUserModal.findByIdAndUpdate({ _id }, { otp: otp }, { new: true });

        // Send mail for otp verification
        await mail.sendMailOTPVerification({ email: email, body: `Your Black Jet code is ${otp}. Never share it with anyone.`, otp: otp, fullname: email })

        return successResponseWithoutData("OTP sent on email successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.sendOtpPhone = async (req, res) => {

    try {
        const _id = req.payload._id
        const currDateTime = new Date();
        const { phone, phone_code } = req.body;
        let otp = 123456; //static otp
        let otpCurrentTime = moment(currDateTime).add(10, 'seconds').toDate();
        if (process.env.NODE_ENV == 'production') {
            otp = randomize('0', 6); //dynamic otp
        }
        //Check Otp Time For User Modal
        const checkOtpCallTimeUser = await userModal.findOne({
            phone,
            phone_code,
            otpValidTime: { $gte: currDateTime }
        }).sort({ createdAt: -1 });

        if (checkOtpCallTimeUser) {
            return failMessage("Request OTP after sometime.", res);
        }
        //check valid country for twilio
        const twilioCountry = await twilioCountryModel.findOne({ country_code: phone_code });
        if (!twilioCountry) {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
        }
        //twilio process
        let toPhoneNumber = phone_code + phone; // The recipient's phone number
        let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
        //otp message
        const otpMessage = `Your Black Jet code is ${otp}. Never share it with anyone.`;
        //red mean we are not support phone code, green,blue and yellow means different sender number 
        if (twilioCountry.colour == 'red') {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
        } else if (twilioCountry.colour == 'green') {
            fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
        } else if (twilioCountry.colour == 'blue') {
            fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
        } else if (twilioCountry.colour == 'yellow') {
            fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
        }
        //sending sms
        if (process.env.NODE_ENV == 'production') {
            client.messages
                .create({
                    body: otpMessage,
                    from: fromPhoneNumber,
                    to: toPhoneNumber,
                })
                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                .catch(error => console.error(`Error sending OTP: ${error.message}`));
        }
        //If the user is exists then update the OTP by using user's id.
        await userModal.findByIdAndUpdate({ _id }, { otp: otp, otpValidTime: otpCurrentTime, phone_verified: false }, { new: true });
        return successResponseWithoutData('OTP sent successfully.', res);
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.update_phone = async (req, res) => {

    try {
        const _id = req.payload._id;
        const user = req.payload;
        const phone = req.body.phone;
        const country_code = req.body.country_code;
        const phone_code = req.body.phone_code;
        const currDateTime = new Date();
        let otpCurrentTime = moment(currDateTime).add(10, 'seconds').toDate();

        try {
            //Check Otp Time For User Modal
            const checkOtpCallTimeUser = await userModal.findOne({
                phone,
                country_code,
                phone_code,
                otpValidTime: { $gte: currDateTime }
            }).sort({ createdAt: -1 });

            if (checkOtpCallTimeUser) {
                return failMessage("Request OTP after sometime.", res);
            }
            //check valid country for twilio
            const twilioCountry = await twilioCountryModel.findOne({ country_code: phone_code });
            if (!twilioCountry) {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
            }
            //IF OTP then verify 
            if (req.body.otp) {
                if (req.body.otp == req.payload.otp) {
                    //Find the user by using id and update the phone in the users table.
                    await userModal.findByIdAndUpdate({ _id }, { phone, country_code, phone_code, phone_verified: true }, { new: true });
                    //removing phone from existing user and softdelete
                    await userModal.updateMany(
                        { phone: phone, phone_code: phone_code, _id: { $ne: _id } },
                        { $set: { status: "disable", phone: phone + '.00', email: user.email + '.removed' } }
                    );
                    return successResponseWithoutData('Phone Added Successfully!', res)

                } else {
                    return failMessage('OTP is wrong!', res)

                }
            }

            let findPhone = await userModal.findOne({ phone })
            if (findPhone && findPhone._id != _id) {//Check if phone is already exists or not
                return failMessage("Phone Already exists!", res)
            }
            //Find the user by using the phone, checking if the phone is already exists or not.
            const existedmail = await userModal.findOne({ phone, country_code, phone_code })
            if (existedmail && existedmail._id.valueOf() != _id) {
                if (existedmail.onboard_status) {
                    return failMessage("Phone already exist", res)
                } else {
                    await userModal.deleteOne({ _id: existedmail._id.valueOf() })
                }
            }

            let otp = 123456; //static otp
            if (process.env.NODE_ENV == 'production') {
                otp = randomize('0', 6); //dynamic otp
            }

            //twilio process
            let toPhoneNumber = phone_code + phone; // The recipient's phone number
            let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
            //otp message
            const otpMessage = `Your Black Jet code is ${otp}. Never share it with anyone.`;
            //red mean we are not support phone code, green,blue and yellow means different sender number 
            if (twilioCountry.colour == 'red') {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
            } else if (twilioCountry.colour == 'green') {
                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
            } else if (twilioCountry.colour == 'blue') {
                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
            } else if (twilioCountry.colour == 'yellow') {
                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
            }
            //sending sms
            if (process.env.NODE_ENV == 'production') {
                client.messages
                    .create({
                        body: otpMessage,
                        from: fromPhoneNumber,
                        to: toPhoneNumber,
                    })
                    .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    .catch(error => console.error(`Error sending OTP: ${error.message}`));
            }
            //If the user is exists then update the OTP by using user's id.
            await userModal.findByIdAndUpdate({ _id }, { otp: otp, otpValidTime: otpCurrentTime, phone_verified: false }, { new: true });
            let data = {
                otp: otp
            }
            return successResponse(data, 'OTP sent successfully.', res);


        } catch (err) {
            console.log(err)
            return failMessage("Phone already exist", res)
        }

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.addInformation = async (req, res) => {
    try {
        const _id = req.payload._id;
        const { fullName, preferredFirstName, gender, birthday, privacyPolicyTermsofUse, uniqueCode } = req.body;
        let deviceInfo = {};
        if (req.body.deviceInfo) {
            deviceInfo = req.body.deviceInfo;
        }
        // Update temp user information
        await tempUserModal.findByIdAndUpdate(
            { _id },
            {
                fullName,
                preferredFirstName,
                gender,
                birthday,
                privacyPolicyTermsofUse,
                is_information_page_completed: true,
            },
            { new: true }
        );
        // Get temp user data
        const getTempUserData = await tempUserModal.findOne({ _id });
        if (!getTempUserData) {
            return failMessage("Information not added. Please try again.", res);
        }
        let JWT_SECRET = process.env.JWT_SECRET;
        //getting first middel last name from fullName
        const attrs = human.parseName(fullName);
        let middle_name = attrs.middleName ? ' ' + attrs.middleName : ''; //middel name
        let firstName = `${attrs.firstName}${middle_name}`; // first and middel name if exist
        let lastName = attrs.lastName ? attrs.lastName : ''; //last name

        // Prepare new user data
        const userData = {
            fullName: getTempUserData.fullName,
            preferredFirstName: getTempUserData.preferredFirstName,
            gender: getTempUserData.gender,
            country_code: getTempUserData.country_code,
            phone_code: getTempUserData.phone_code,
            phone: getTempUserData.phone,
            email: getTempUserData.email,
            birthday: getTempUserData.birthday,
            otp: getTempUserData.otp,
            status: getTempUserData.status,
            phone_verified: getTempUserData.phone_verified,
            email_verified: getTempUserData.email_verified,
            firebase_device_token: getTempUserData.firebase_device_token,
            is_information_page_completed: getTempUserData.is_information_page_completed,
            otp_verified: getTempUserData.otp_verified,
            is_membership_payment_page_completed: getTempUserData.is_membership_payment_page_completed,
            onboard_status: true,
            privacyPolicyTermsofUse: getTempUserData.privacyPolicyTermsofUse,
            given_name: firstName,
            last_name: lastName,
            deviceInfo: deviceInfo
        };
        console.log('userData==', userData)
        // Add new user data to user collection
        const newUser = new userModal(userData);
        const token = jwt.sign({ _id: newUser._id }, JWT_SECRET); // Generate JWT Token for newly created user
        newUser.token = token; // Insert generated token in the users table
        newUser.status = 'active';
        newUser.onboard_status = true;
        await newUser.save(); // Save the new user to the database

        userData.token = token;

        // Delete temp user data
        await tempUserModal.deleteOne({ _id: getTempUserData._id });
        // Find the referral document by unique code
        let referralDoc = {};
        if (uniqueCode) {
            referralDoc = await referModal.findOne({ refer_url: { $regex: uniqueCode } });
        }
        // Find the referred user by user_id in the referral document
        const getUserData = await userModal.findOne({ _id: referralDoc?.user_id });
        let membershipSettings = {};
        membershipSettings = await membership_settings.findOne({ status: 'active' });
        if (membershipSettings.preOrder) {
            // Increment underway field if onboard_status is true for both new user and referred user
            if (newUser?.onboard_status && getUserData?.onboard_status) {
                await userModal.findByIdAndUpdate(
                    { _id: newUser._id },
                    { $inc: { underway: 1 } },
                    { new: true }
                );
                await userModal.findByIdAndUpdate(
                    { _id: getUserData?._id },
                    { $inc: { underway: 1 } },
                    { new: true }
                );
            }
        }
        if (uniqueCode) {
            // Update referral status to 'complete'
            await referModal.findByIdAndUpdate(
                { _id: referralDoc?._id },
                { refer_status: 'complete', send_to_refer: 'complete', send_by_refer: 'complete', send_to: newUser._id },
                { new: true }
            );
        }
        return successResponse(userData, 'Information Added Successfully!', res);
    } catch (err) {
        console.log(err, "error")
        return internalServerError('Internal Server Error', res);
    }
};
exports.getPlansAndPricing = async (req, res) => {
    try {
        const current_Date = new Date();
        const startDate = new Date(current_Date);
        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        let PlansAndPricing = [];

        // Check membership toggle button
        const checkPreorderToggle = await planAndpricingModal.find({ status: "active", preorderOn: true });
        if (checkPreorderToggle.length > 0) {
            PlansAndPricing = await planAndpricingModal.find({
                status: "active",
                preorderOn: true,
                // type: 1
            });
        } else {
            PlansAndPricing = await planAndpricingModal.find({
                status: "active",
                preorderOn: false,
                // type: 1
            });
        }

        if (PlansAndPricing.length > 0) {
            let userCard = await paymentModal.find({ userId: req.payload._id, status: "active" });
            let isCardAdded = userCard.length > 0;

            const membershipIds = PlansAndPricing.map(data => data._id.valueOf());
            const currentDate = startDate;
            let responseObj = [];

            const promises = membershipIds.map(async (data) => {
                const membership = await planAndpricingModal.findOne({ _id: data });
                let noOfSeatsUsed = membership.noOfSeats || 0;

                const prices = await priceModal.find({
                    status: "active",
                    membership: data,
                    effectiveDate: { $lte: currentDate },
                    $or: [
                        { effectiveEndDate: null },
                        { effectiveEndDate: { $gt: currentDate } }
                    ]
                }).sort({ effectiveDate: -1 });

                if (!prices || prices.length === 0) {
                    return null;
                }

                const currentPrice = prices[0];
                let priceValue = currentPrice.price;
                let initiationFees = currentPrice.initiationFees;

                const activeDiscounts = await discountModal.find({
                    membership_id: data,
                    status: 'active',
                    $or: [
                        {
                            start_date: { $lte: currentDate },
                            end_date: { $gte: currentDate }
                        },
                        {
                            start_date: { $lte: currentDate },
                            end_date: null
                        }
                    ]
                }).sort({ start_date: -1 });

                let smallestDiscount = await commonservices.findSmallestDiscount(activeDiscounts);

                return {
                    ...membership.toObject(),
                    initiationFees: initiationFees?.toString() || "",
                    latestPrice: priceValue?.toString() || "",
                    discountInitiationFees: smallestDiscount?.initiation_fees || "",
                    discountPrice: smallestDiscount?.smallestDiscount?.discount_price || "",
                    usedSeats: smallestDiscount?.smallestDiscount?.used_seats || 0
                };
            });

            responseObj = await Promise.all(promises);
            responseObj = responseObj.filter(item => item !== null);

            return res.status(200).json({ status_code: 200, success: true, message: 'Data Fetched Successfully.', data: responseObj, isCardAdded });
        } else {
            return emptyResponse(PlansAndPricing, res);
        }
    } catch (err) {
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.logout = async (req, res) => {

    try {
        let _id = req.payload._id
        //empty the token 
        await userModal.findByIdAndUpdate({ _id }, {
            token: ""
        }, { new: true })
        //Send the LOGOUT message in the response body
        return successResponseWithoutData("Logout successfully!", res)

    } catch (err) {
        console.error(err);
        return internalServerError('Internal Server Error', res);

    }
}
exports.completionOfRegistration = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        const _id = req.payload._id

        const { occupation,
            annual_income,
            industries } = req.body
        if (industries && industries.length > 0) {
            //Insert the new industries in the database
            for (let i = 0; i < industries.length; i++) {
                if (!ObjectID.isValid(industries[i])) {
                    let objectIdForNewlyCreatedIndustry = await industryModal.create({
                        name: industries[i]
                    })
                    industries[i] = objectIdForNewlyCreatedIndustry._id.valueOf()
                }
            }
        }
        //Find the user using id and add the occupation,annual income and industries in users table
        await userModal.findByIdAndUpdate({ _id }, { occupation: occupation, annual_income: annual_income, industries: industries, onboard_status: true, is_member: true }, { new: true });


        let special_needs = await specialNeedsAndCondition.findOne({ user_id: _id })
        if (!special_needs) {
            await specialNeedsAndCondition.create({
                user_id: _id,
                blind: false,
                deaf: false,
                development_intellectual_disability: false,
                lap_held_infant_under_2_years: false,
                pregnant_30_weeks_or_less: false,
                pregnant_30_weeks_or_more: false,
                reduced_mobility: false,
                medical_condition: false,
                others: false,
                medical_conditions_details: "",
                others_details: "",
                name_of_infant: "",
                birthday_of_infant: startDate,
                proof_of_age: "",
                photo_of_infant: "",
                capable_of_brief_walks: false,
                reduced_mobility_details: ""
            })
        }

        return successResponseWithoutData('Data Added Successfully!', res)
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.AddIndustriesMaster = async (req, res) => {
    try {
        //Adding List of Industries Master Data in the database
        let fs = require('fs')
        let arr = []
        fs.readFile('Industries.txt', 'utf8', async function (err, data) {
            if (err) throw err;
            arr = data.split('\n')
            for (const item of arr) {
                await industryModal.create({ name: item });
            }
        });

        return successResponseWithoutData('Data Added Successfully!', res)
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.UpdateIndustriesMaster = async (req, res) => {
    try {
        //Removing the "\r" from all the names of industries in the database
        await industryModal.updateMany({}, [
            {
                $set: {
                    name: { $trim: { input: '$name', chars: '\r' } }
                }
            }
        ])
        const result = await industryModal.find()
        return successResponse(result, 'Data Updated Successfully!', res);

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.searchIndustries = async (req, res) => {
    try {
        const { search } = req.query
        //Searching the name of industries using regex
        let regex = new RegExp(search, 'i');
        //Get all the industries which has name contain values coming from "search" parameter
        let result = await industryModal.find({ name: regex }, { name: 1 });
        return successResponseWithPagination(result, result.length, 'Data Fetched Successfully!', res)
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.updateName = async (req, res) => {
    try {
        const user = req.payload
        const _id = req.payload._id
        let { legal_full_name, preferred_first_name } = req.body;//Get the request body parameters
        if (user.userVerifyStatus == "verified") {//If the user is verified member then he/she is unable to update full legal name           
            if (legal_full_name) {
                //getting first middel last name from fullName
                const attrs = human.parseName(legal_full_name);
                let middle_name = attrs.middleName ? ' ' + attrs.middleName : ''; //middel name
                let firstName = `${attrs.firstName}${middle_name}`; // first and middel name if exist
                let lastName = attrs.lastName ? attrs.lastName : ''; //last name
                await userModal.findByIdAndUpdate({ _id },
                    {
                        preferredFirstName: preferred_first_name,
                        fullName: legal_full_name,
                        userVerifyStatus: "not verified",
                        passportVerified: false,
                        driverlicenseVerified: false,
                        given_name: firstName,
                        last_name: lastName,
                        $inc: { profile_update_count: 1 }
                    }, { new: true });
                return successResponseWithoutData('Preferred first name and Legal full name is Updated Successfully!', res)

            } else {
                await userModal.findByIdAndUpdate({ _id }, { preferredFirstName: preferred_first_name }, { new: true });

                return successResponseWithoutData('Preferred first name is Updated Successfully!', res)

            }

        }
        else {//User is able to update legal full name when user is not verified
            if (!legal_full_name) {
                return requiredIdResponse('Legal Full Name is required!', res)
            }

            //getting first middel last name from fullName
            const attrs = human.parseName(legal_full_name);
            let middle_name = attrs.middleName ? ' ' + attrs.middleName : ''; //middel name
            let firstName = `${attrs.firstName}${middle_name}`; // first and middel name if exist
            let lastName = attrs.lastName ? attrs.lastName : ''; //last name

            await userModal.findByIdAndUpdate({ _id }, { fullName: legal_full_name, preferredFirstName: preferred_first_name, given_name: firstName, last_name: lastName }, { new: true });
            //If profile update count greater then 0 then plus 1 in profile update count
            if (user.profile_update_count > 0) {
                await userModal.findByIdAndUpdate({ _id }, { $inc: { profile_update_count: 1 } }, { new: true });
            }

            return successResponseWithoutData('Name Updated Successfully!', res)

        }
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
//update gender api
exports.updateGender = async (req, res) => {
    try {
        const user = req.payload
        const _id = req.payload._id
        let { gender } = req.body;//Get the request body parameters
        //update gender
        await userModal.findByIdAndUpdate({ _id }, { gender: gender }, { new: true });
        return successResponseWithoutData('Gender Updated Successfully!', res)
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.getUserProfile = async (req, res) => {
    try {

        let total_reusable = 0, is_membership_purchased = false
        let user_membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active" })
        if (user_membership) {
            is_membership_purchased = true
            if (user_membership.type == 1) total_reusable = 2
            if (user_membership.type == 2) total_reusable = 4
        }
        let users_pet = await user_pet_mapping_modal.aggregate([
            {
                $match: {
                    user_id: mongoose.Types.ObjectId(req.payload._id),
                    status: "active"
                }
            },
            {
                $project: {
                    _id: 1,
                    pet_image: 1,
                    pet_name: 1
                }
            }
        ]);

        let user_data = await userModal.findOne({ _id: req.payload._id }).populate('industries').exec();

        let userData = await userModal.findOne({ _id: req.payload._id, status: "active" });

        req.payload._doc.industry_data = user_data._doc.industries
        let membership_activated = false
        if (user_membership?.is_activate) membership_activated = true
        let membership_settings_model = await membership_settings.findOne({ "status": "active" })
        let show_activate_membership_button = false
        let is_demo_process = false
        if (membership_settings_model?.activate_membership_button) {
            show_activate_membership_button = true
        }
        if (membership_settings_model?.is_demo_process) {
            is_demo_process = true
        }

        req.payload = { ...req.payload._doc, users_pet, total_reusable, membership_activated, is_membership_purchased, show_activate_membership_button, is_demo_process, underway: userData.underway }
        return successResponse(req.payload, 'Data Fetched Successfully!', res)

    } catch (err) {
        console.log("Error in Get user profile api:", err)
        return internalServerError('Internal Server Error', res);
    }
};
exports.sendOtpEmail = async (req, res) => {
    try {
        const user = req.payload
        const _id = req.payload._id
        const { email } = req.body
        let otp = 123456; //static otp
        if (process.env.NODE_ENV == 'production') {
            otp = randomize('0', 6); //dynamic otp
        }
        //If the user is exists then update the OTP by using user's id.
        await userModal.findByIdAndUpdate({ _id }, { otp: otp }, { new: true });

        // Send mail for otp verification
        await mail.sendMailOTPVerification({ email: user.email, body: `Your Black Jet code is ${otp}. Never share it with anyone.`, otp: otp, fullname: user.fullName })

        return successResponseWithoutData("OTP sent on email successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.editEmail = async (req, res) => {
    try {
        const user = req.payload
        const _id = req.payload._id
        const { email } = req.body
        //IF OTP then verify 
        if (req.body.otp) {
            //checking otp valid or not
            if (req.body.otp == req.payload.otp) {
                //Find the user by using id and update the email id in the users table.
                await userModal.findByIdAndUpdate({ _id }, { email, email_verified: true }, { new: true });

                //removing email from existing user
                await userModal.updateMany(
                    { _id: { $ne: _id }, email: { $regex: new RegExp(`^${email}$`, 'i') } },
                    { $set: { email: '', email_verified: false } }
                );
                return successResponseWithoutData('Email Updated Successfully!', res)

            } else {
                return failMessage('OTP is wrong!', res)

            }
        }
        //Check if email is already exists or not
        let findEmail = await userModal.findOne({ email })
        if (findEmail && findEmail._id != _id) {
            return failMessage("Email Already exists!", res)
        }
        let otp = 123456; //static otp
        if (process.env.NODE_ENV == 'production') {
            otp = randomize('0', 6); //dynamic otp
        }
        //If the user is exists then update the OTP by using user's id.
        await userModal.findByIdAndUpdate({ _id }, { otp: otp }, { new: true });

        // Send mail for verification
        await mail.sendMailOTPVerification({ email: email, body: `Your Black Jet code is ${otp}. Never share it with anyone.`, otp: otp, fullname: user.fullName })

        //await mail.sendMailOTP({ name: user.fullName, otpMessage, email, body: `Email OTP`, _id })

        return successResponseWithoutData("Email updated successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
//email verification
exports.emailVerification = async (req, res) => {
    try {
        const id = req.query.id; // getting verification token from link
        //const email = req.query.email

        //verifing mail verification token
        const decoded = jwt.verify(id, process.env.JWT_EMAIL_SECRET);
        console.log('decoded==', decoded)
        //Find user by user's id and update email_verified to true
        let updateEmailStatus = await tempUserModal.findByIdAndUpdate({ _id: decoded._id, email: decoded.email }, { email_verified: true }, { new: true });
        let updateUserEmailStatus = await userModal.findOneAndUpdate({ email: decoded.email }, { email_verified: true }, { new: true });
        console.log('updateEmailStatus===', updateEmailStatus)
        console.log('updateUserEmailStatus===', updateUserEmailStatus)
        //HTML template for server error or email not verified
        let htmlResponse = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Blackjet</title>
    <link rel="stylesheet" href="${process.env.WEBSITELINK}/assets/css/style.css" />
  </head>

  <body>
    <div class="mail-vefication-wrap">
    <div class="mail-vefication-box">
        <img src="${process.env.WEBSITELINK}/assets/images/cross-mark.gif" alt="">
        <h2>Mail Verification Unsuccessful</h2>
        <p>Please try again.</p>
    </div>
  </div>
  </body>
  <script src="https://unpkg.com/@dotlottie/player-component@latest/dist/dotlottie-player.mjs" type="module"></script>

</html>`;

        //if email verified successfully
        if (updateEmailStatus != null || updateUserEmailStatus != null) {
            //HTML template for email verified successfully
            htmlResponse = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Blackjet</title>
    <link rel="stylesheet" href="${process.env.WEBSITELINK}/assets/css/style.css" />
  </head>

  <body>
    <div class="mail-vefication-wrap">
    <div class="mail-vefication-box">
        <img src="${process.env.WEBSITELINK}/assets/images/tick-mark.gif" alt="">
        <h2>Mail Verification Successful</h2>
        <p>Your email has been successfully verified.</p>
    </div>
  </div>
  </body>
  <script src="https://unpkg.com/@dotlottie/player-component@latest/dist/dotlottie-player.mjs" type="module"></script>

</html>`;
        }
        return res.send(htmlResponse);
    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};
exports.addSpecialNeedsAndConditions = async (req, res) => {
    try {
        const user = req.payload
        let {
            blind,
            deaf,
            development_intellectual_disability,
            lap_held_infant_under_2_years,
            pregnant_30_weeks_or_less,
            pregnant_30_weeks_or_more,
            reduced_mobility,
            medical_condition,
            others,
            medical_conditions_details,
            others_details,
            name_of_infant,
            birthday_of_infant,
            capable_of_brief_walks,
            reduced_mobility_details,
            photo_of_infant,
            proof_of_age
        } = req.body

        let specialNeedsAndConditionsRecord = await specialNeedsAndCondition.find({ user_id: user._id })
        if (specialNeedsAndConditionsRecord.length == 0) {//If user does not have special needs then create new record
            blind = blind || false
            deaf = deaf || false
            development_intellectual_disability = development_intellectual_disability || false
            lap_held_infant_under_2_years = lap_held_infant_under_2_years || false
            pregnant_30_weeks_or_less = pregnant_30_weeks_or_less || false
            pregnant_30_weeks_or_more = pregnant_30_weeks_or_more || false
            reduced_mobility = reduced_mobility || false
            medical_condition = medical_condition || false
            others = others || false
            medical_conditions_details = medical_conditions_details || ""
            others_details = others_details || ""
            name_of_infant = name_of_infant || ""
            capable_of_brief_walks = capable_of_brief_walks || false
            reduced_mobility_details = reduced_mobility_details || ""
            photo_of_infant = photo_of_infant || ""
            proof_of_age = proof_of_age || ""

            await specialNeedsAndCondition.create({
                user_id: user._id,
                blind,
                deaf,
                development_intellectual_disability,
                lap_held_infant_under_2_years,
                pregnant_30_weeks_or_less,
                pregnant_30_weeks_or_more,
                reduced_mobility,
                medical_condition,
                others,
                medical_conditions_details,
                others_details,
                name_of_infant,
                birthday_of_infant,
                capable_of_brief_walks,
                reduced_mobility_details,
                photo_of_infant,
                proof_of_age
            });
            return successResponseWithoutData('Data Added Successfully!', res)

        } else {//If user have special needs then update existed record
            blind = blind || false
            deaf = deaf || false
            development_intellectual_disability = development_intellectual_disability || false
            lap_held_infant_under_2_years = lap_held_infant_under_2_years || false
            pregnant_30_weeks_or_less = pregnant_30_weeks_or_less || false
            pregnant_30_weeks_or_more = pregnant_30_weeks_or_more || false
            reduced_mobility = reduced_mobility || false
            medical_condition = medical_condition || specialNeedsAndConditionsRecord.medical_condition
            others = others || specialNeedsAndConditionsRecord.others
            medical_conditions_details = medical_conditions_details || specialNeedsAndConditionsRecord.medical_conditions_details
            others_details = others_details || specialNeedsAndConditionsRecord.others_details
            name_of_infant = name_of_infant || specialNeedsAndConditionsRecord.name_of_infant
            birthday_of_infant = birthday_of_infant || specialNeedsAndConditionsRecord.birthday_of_infant
            capable_of_brief_walks = capable_of_brief_walks || false
            reduced_mobility_details = reduced_mobility_details || specialNeedsAndConditionsRecord.reduced_mobility_details
            photo_of_infant = photo_of_infant || specialNeedsAndConditionsRecord.photo_of_infant
            proof_of_age = proof_of_age || specialNeedsAndConditionsRecord.proof_of_age

            await specialNeedsAndCondition.findOneAndUpdate({ user_id: user._id }, {
                blind,
                deaf,
                development_intellectual_disability,
                lap_held_infant_under_2_years,
                pregnant_30_weeks_or_less,
                pregnant_30_weeks_or_more,
                reduced_mobility,
                medical_condition,
                others,
                medical_conditions_details,
                others_details,
                name_of_infant,
                birthday_of_infant,
                capable_of_brief_walks,
                reduced_mobility_details,
                photo_of_infant,
                proof_of_age
            }, { new: true });
            return successResponseWithoutData('Data Added Successfully!', res)
        }

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.getSpecialNeedsAndConditions = async (req, res) => {
    try {
        let specialNeedsAndConditionsRecord = await specialNeedsAndCondition.find({ user_id: req.payload._id })
        if (specialNeedsAndConditionsRecord.length > 0) {

            return successResponse(specialNeedsAndConditionsRecord, 'Data fetched Successfully!', res)

        } else {
            return emptyResponse(specialNeedsAndConditionsRecord, res)
        }

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.resendSignaturePDF = async (req, res) => {
    try {
        const user_pet_mapping = await user_pet_mapping_modal.findById({ _id: req.query.pet_id })

        if (user_pet_mapping?.pet_liability_signature) {
            const response = await axios.get(user_pet_mapping.pet_liability_signature, { responseType: 'arraybuffer' });
            let base64signature = Buffer.from(response.data, 'binary').toString('base64');

            const decodedData = Buffer.from(base64signature, 'base64');
            const writeStream = fs.createWriteStream('pet.pdf');

            // Create a PDF document
            const doc = new PDFDocument();
            // Add pet details to the PDF
            doc.fontSize(12).text('Pet Details:', { underline: true }).moveDown();
            doc.fontSize(10).text(`Pet Name: ${user_pet_mapping.pet_name}`).moveDown();
            doc.fontSize(10).text(`Pet Type: ${user_pet_mapping.pet_type}`).moveDown();
            doc.fontSize(10).text(`Pet Weight: ${user_pet_mapping.pet_weight}`).moveDown();
            doc.fontSize(10).text(`Pet Gender: ${user_pet_mapping.gender}`).moveDown();
            // Add more pet details as needed

            // Add signature to the PDF
            doc.text('Signature:', { underline: true }).moveDown();
            doc.image(decodedData, { fit: [500, 500] });  // Adjust width and height as needed
            doc.pipe(writeStream);

            doc.end();

            // Ensure the write stream is closed after the document is finished writing
            writeStream.on('finish', () => {
            });

            // Handle errors in case of any issues during writing
            writeStream.on('error', (err) => {
                console.error('Error writing PDF:', err);
            });
            const uploadBase64 = require("../../controllers/v1/upload")
            let pet_liability_signature = await uploadBase64.uploadBase64FileToS3(base64signature)

            await mail.sendMailPetLiabilitySign({ email: req.payload.email, body: `Your pet liability signature-> ${pet_liability_signature}`, pdf: 'pet.pdf' })

            return successResponseWithoutData('Resend PDF successfully.', res)
        } else {
            return failMessage('No pet found.', res)

        }

    } catch (err) {
        console.log("error=", err.message)
        return internalServerError('Internal Server Error', res);
    }
};
exports.addpetsMasterData = async (req, res) => {
    try {
        //Adding List of Industries Master Data in the database
        let fs = require('fs')
        let arr = []
        fs.readFile('pets.txt', 'utf8', async function (err, data) {
            if (err) throw err;
            arr = data.split('\n')
            for (const breed of arr) {
                await petsModal.create({ breed_name: breed });
            }
        });


        return successResponseWithoutData('Data Added Successfully!', res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.editDOB = async (req, res) => {
    try {
        const _id = req.payload._id
        const user = req.payload
        const { DOB } = req.query
        //checking user veriff status
        if (user.userVerifyStatus == "verified") {
            //Find user by user's id and update birthday
            await userModal.findByIdAndUpdate({ _id },
                {
                    birthday: DOB,
                    userVerifyStatus: "not verified",
                    passportVerified: false,
                    driverlicenseVerified: false,
                    $inc: { profile_update_count: 1 }
                }, { new: true });
        } else {
            //Find user by user's id and update birthday
            await userModal.findByIdAndUpdate({ _id },
                {
                    birthday: DOB,
                    userVerifyStatus: "not verified",
                    passportVerified: false,
                    driverlicenseVerified: false
                }, { new: true });
            //If profile update count greater then 0 then plus 1 in profile update count
            if (user.profile_update_count > 0) {
                await userModal.findByIdAndUpdate({ _id }, { $inc: { profile_update_count: 1 } }, { new: true });
            }
        }

        return successResponseWithoutData("DOB updated successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.softDeleteAccount = async (req, res) => {

    try {
        const user = req.payload
        const _id = req.payload._id

        const aws = require('aws-sdk');
        const s3 = new aws.S3({
            region: S3_REGION
        })
        //Find user by user's id and update token,otp,member_verified,passportVerified,driverlicenseVerified,passport_resubmission_requested,driver_license_resubmission_requested,status,email_verified,phone_verified,profile_pic
        await userModal.findByIdAndUpdate({ _id }, {
            token: "",
            otp: -1,
            passportVerified: false,
            driverlicenseVerified: false,
            passport_resubmission_requested: false,
            driver_license_resubmission_requested: false,
            status: "disable",
            phone: user.phone + '.00',
            email: user.email + '.removed',
            email_verified: false,
            phone_verified: false,
            profile_pic: "",
            otp_verified: false,
            is_information_page_completed: false,
            is_membership_payment_page_completed: false,
            firebase_device_token: ""

        }, { new: true });
        const bucketName = process.env.USER_MEDIA_BUCKET;
        const profilepic = 'Profile_pic' + user._id
        const ProfilePicparams = {
            Bucket: bucketName,
            Key: profilepic,
        };
        //Delete profile pic from aws S3 Bucket
        s3.deleteObject(ProfilePicparams, (err, data) => {
            if (err) {
                console.error('Error deleting file:', err);
            } else {
            }
        });
        return successResponseWithoutData("Account Deleted successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.resendEmailVerification = async (req, res) => {
    try {
        const user = req.payload
        const _id = req.payload._id
        //token for secure verification mail link
        const token = jwt.sign({ _id: _id, email: user.email }, process.env.JWT_EMAIL_SECRET);
        //create verification link
        let link = `${process.env.SERVER_URL}/v1/user/emailVerification?id=${token}`;
        //Send mail verification 
        await mail.sendMailVerification({ email: user.email, body: `Email Verification`, fullName: user.FullName, link: link })

        return successResponseWithoutData("Verification Link sent successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};

exports.veriffPepWebhookURL = async (req, res) => {
    try {
        let VERIFF_API_KEY = process.env.VERIFF_API_KEY;
        let encryptionKey = process.env.VERIFF_ENCRYPTIONKEY;
        const { headers, body } = req;
        // Validate headers
        if (headers['x-auth-client'] !== VERIFF_API_KEY || !headers['x-signature'] || !headers['x-hmac-signature']) {
            return failMessage("Invalid Headers Parameter!", res);
        }

        const vendorData = body.vendorData.split(" ");
        const user = await userModal.findById(vendorData[0]);

        if (!user) {
            return failMessage("User not found!", res);
        }

        //encryption
        const textString = JSON.stringify(body);
        // By using a buffer
        const encryptBuffer = encrypt(Buffer.from(textString), encryptionKey);
        //store veriff response
        const storeVeriffResponse = new veriffPepResponseModal({
            user_id: user._id, // user's ObjectId
            webhook_response: encryptBuffer
        });
        await storeVeriffResponse.save();

        return successResponseWithoutData('Success', res);
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};

exports.veriffEventWebhookURL = async (req, res) => {
    try {
        let VERIFF_API_KEY = process.env.VERIFF_API_KEY;
        let encryptionKey = process.env.VERIFF_ENCRYPTIONKEY;
        const { headers, body } = req;
        // Validate headers
        if (headers['x-auth-client'] !== VERIFF_API_KEY || !headers['x-signature'] || !headers['x-hmac-signature']) {
            return failMessage("Invalid Headers Parameter!", res);
        }

        let { id, code, action, feature, attemptId, vendorData } = body;
        const vendorId = vendorData.split(" ");
        const user = await userModal.findById(vendorId[0]);

        if (!user) {
            return failMessage("User not found!", res);
        }
        // encryption
        id = encrypt(id, encryptionKey);
        action = encrypt(action, encryptionKey);
        feature = encrypt(feature, encryptionKey);
        attemptId = encrypt(attemptId, encryptionKey);
        vendorData = encrypt(vendorData, encryptionKey);
        //store veriff response
        const storeVeriffResponse = new veriffEventResponseModal({
            user_id: user._id, // user's ObjectId
            id,
            code,
            action,
            feature,
            attemptId,
            vendorData
        });
        await storeVeriffResponse.save();
        return successResponseWithoutData('Success', res);
    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};

exports.veriffWebhookURL = async (req, res) => {
    try {
        let VERIFF_API_KEY = process.env.VERIFF_API_KEY;
        let encryptionKey = process.env.VERIFF_ENCRYPTIONKEY;
        const { headers, body } = req;
        // Validate headers
        if (headers['x-auth-client'] !== VERIFF_API_KEY || !headers['x-signature'] || !headers['x-hmac-signature']) {
            return failMessage("Invalid Headers Parameter!", res);
        }

        //const { verification } = body;
        const vendorData = body.vendorData.split(" ");
        const user = await userModal.findById(vendorData[0]);

        if (!user) {
            return failMessage("User not found!", res);
        }
        //encryption
        const textString = JSON.stringify(body);
        // By using a buffer
        const encryptBuffer = encrypt(Buffer.from(textString), encryptionKey);
        //store veriff response
        const storeVeriffResponse = new veriffWebhookResponseModal({
            user_id: user._id, // user's ObjectId
            webhook_response: encryptBuffer // `verification` data to be stored
        });
        await storeVeriffResponse.save();

        let message = ''
        //const status = verification.status;
        const status = body.data.verification.decision;
        let reason = body.data.verification.decision;
        // if (verification.reason != null) {
        //     reason = verification.reason;
        // }
        // Handle Passport verification
        if (vendorData[1] === 'PASSPORT') {
            if (status === 'approved') {
                message = await updateUserVerification(user, { veriff_reason: 'approved', passportVerified: true, passport_verification_date: new Date() });
            } else if (status === 'resubmission_requested') {
                message = await updateUserVerification(user, { veriff_reason: reason, passportVerified: false, passport_resubmission_requested: true });
            } else {
                message = await updateUserVerification(user, { veriff_reason: reason, passportVerified: false, passport_resubmission_requested: false });
            }
        }

        // Handle Driver License verification
        if (vendorData[1] === 'DRIVERS_LICENSE') {
            if (status === 'approved') {
                message = await updateUserVerification(user, { veriff_reason: 'approved', driverlicenseVerified: true, driver_license_verification_date: new Date() });
            } else if (status === 'resubmission_requested') {
                message = await updateUserVerification(user, { veriff_reason: reason, driverlicenseVerified: false, driver_license_resubmission_requested: true });
            } else {
                message = await updateUserVerification(user, { veriff_reason: reason, driverlicenseVerified: false, driver_license_resubmission_requested: false });
            }
        }

        return successResponseWithoutData(message, res);
    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};

async function updateUserVerification(user, updateFields) {
    let updatedUser = await userModal.findByIdAndUpdate(user._id, updateFields, { new: true });
    return 'Success.';
    // if (updatedUser.passportVerified && updatedUser.driverlicenseVerified) {
    //     await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: "verified" }, { new: true });
    //     return 'You are verified.'
    // }
    // if (updatedUser.passport_resubmission_requested && updatedUser.driver_license_resubmission_requested) {
    //     await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: "not verified" }, { new: true });
    //     return 'Your verification data has been resubmitted requested.'

    // }
}
//older one - > not using in latest build
exports.homePage = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
        let membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active", is_activate: true }, { updatedAt: 0, change_date: 0 })
        let membership_data = {}
        let showSafetyVideo = false
        const user = req.payload
        let show_profile_card = false
        let one_time_initiationFee = ""
        let user_veriff = await veriffModal.findOne({
            user_id: req.payload._id,
            status: "active",
            is_duplicated: true,
            payment_status: {
                $ne: "success"
            }
        })

        if (user_veriff) {
            if (user_veriff.duplicated_ids && user_veriff.duplicated_ids.length > 0) {
                let previous_membership = await userMembershipModal.findOne({
                    user_id:
                    {
                        $in: user_veriff.duplicated_ids
                    }, status: "active"
                })
                if (previous_membership) {
                    let prev_membership_id = previous_membership.membership_id
                    let price_table = await priceModal.findOne({
                        status: "active",
                        type: "membership",
                        membership: prev_membership_id,
                        effectiveDate: {
                            $lte: startDate
                        }
                    })
                    if (price_table) {
                        one_time_initiationFee = price_table.initiationFees
                    }

                }
            }

        }
        let membership_failedData = []
        let transaction = await transactionModal.find({
            userId: req.payload._id,
            type: "Membership",
            status: "active",
            is_failed: true
        })
        if (transaction && transaction.length > 0) {
            membership_failedData = transaction
        }
        if (user.show_profile_snooze_till < startDate) {
            show_profile_card = true
        }
        const endDate = new Date(currentDate);

        endDate.setHours(endDate.getHours() + 10);
        //endDate.setMinutes(endDate.getMinutes() + 30);
        endDate.setHours(endDate.getHours() + 24);
        let booking = await booking_modal.aggregate([
            {
                $match: {
                    user_id: mongoose.Types.ObjectId(user._id),
                    status: "active",
                    booking_status: 'confirmed',
                    is_demo: checkDemoSettings ? true : false
                }
            },
            {
                $lookup: {
                    from: 'flights',
                    let: { item_id: '$flight_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$item_id"] }
                            }
                        },
                        {
                            $lookup: {
                                from: "routes",
                                let: { fromCityId: "$route" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$fromCityId"] }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "locations",
                                            let: { fromCityId: "$fromCity" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        _id: 1,
                                                        city_name: 1,
                                                        airport_abbreviation: 1,
                                                        image: 1,
                                                        airport_name: 1,
                                                        lat: 1,
                                                        long: 1
                                                    }
                                                }
                                            ],
                                            as: "from_airport_abb",
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "locations",
                                            let: { fromCityId: "$toCity" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        _id: 1,
                                                        city_name: 1,
                                                        airport_abbreviation: 1,
                                                        image: 1,
                                                        airport_name: 1,
                                                        lat: 1,
                                                        long: 1
                                                    }
                                                }
                                            ],
                                            as: "to_airport_abb",
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            to_airport_abb: 1,
                                            from_airport_abb: 1
                                        }
                                    }
                                ],
                                as: "route",
                            }
                        },
                        {
                            $lookup: {
                                from: "pilots",
                                let: { pilotId: "$pilot" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$pilotId"] }
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            full_name: 1,
                                            Photo: 1
                                        }
                                    }
                                ],
                                as: "pilot"
                            }
                        },
                        {
                            $lookup: {
                                from: "pilots",
                                let: { pilotId: "$copilot" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$pilotId"] }
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            full_name: 1,
                                            Photo: 1
                                        }
                                    }
                                ],
                                as: "copilot"
                            }
                        },
                        {
                            $lookup: {
                                from: "flight_seats_mappings",
                                let: { fromCityId: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$flight_id", "$$fromCityId"] }
                                        }
                                    }
                                ],
                                as: "flight_seat",
                            }
                        },

                    ],
                    as: 'flight_data'
                }
            },
            {
                $unwind: "$flight_data"
            },
            {
                $addFields: {
                    combined_takeoff_datetime: {
                        $toDate: {
                            $concat: [
                                { $dateToString: { format: "%Y-%m-%d", date: "$flight_data.flight_takeoff_date" } },
                                "T",
                                "$flight_data.takeoff_time"
                            ]
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: ["$combined_takeoff_datetime", startDate] },
                            { $lte: ["$combined_takeoff_datetime", endDate] }
                        ]
                    }
                }
            },
            {
                $sort: {
                    "flight_data.takeoff_time": 1
                }
            },
            {
                $project: {
                    flight_id: 0
                }
            }

        ])

        if (booking && booking.length > 0) {

            let denied_user_obj = {}, pet_details_obj = {}, summedUpPet = [], guest_details_obj = {}, guest_ids = []
            booking.forEach((data) => {
                if (data.flight_data.checkedIn) showSafetyVideo = true
                if (!data.requested_id) data.requested_id = "";

                const flight_takeoff = new Date(data.flight_data['flight_takeoff_date']);
                const [takeoffHours, takeoffMinutes] = data.flight_data['takeoff_time'].split(':').map(Number);
                flight_takeoff.setHours(takeoffHours, takeoffMinutes);

                const currentTime = startDate;

                const timeDifference = flight_takeoff - currentTime;
                const minutesDifference = timeDifference / (1000 * 60);

                if (timeDifference >= 0) {
                    if (data.flight_data.flight_delayed && !data.flight_data.flight_canceled) {
                        // Flight delayed scenario
                        Object.assign(data.flight_data, {
                            departure: false,
                            departs_in: 0,
                            checked_in: 0,
                            checkedIn: false,
                            checkedIn_time_left: 0
                        });
                    } else {
                        // Flight on time scenario
                        if (minutesDifference <= 90 && !data.flight_data.flight_canceled) {
                            data.flight_data.departure = true;
                            data.flight_data.departs_in = Number(minutesDifference.toFixed(2));
                            data.flight_data.checkedIn_time_left = Number((minutesDifference - 10).toFixed(2));
                        } else {
                            data.flight_data.departure = false;
                            data.flight_data.departs_in = 0;
                            data.flight_data.checkedIn_time_left = 0;
                        }

                        data.flight_data.checked_in = (minutesDifference <= 10 && !data.flight_data.flight_canceled) ? Number(minutesDifference.toFixed(2)) : 0;
                        data.flight_data.checkedIn = (data.flight_data.checked_in > 0 && !data.flight_data.flight_canceled);
                    }
                } else {
                    // Flight already departed scenario
                    Object.assign(data.flight_data, {
                        departure: false,
                        departs_in: 0,
                        checked_in: 0,
                        checkedIn: false,
                        checkedIn_time_left: 0
                    });
                }

                // Initialize variables for pet requests
                let petOnBoardRequestDenied = false;
                let denied_userId = [];
                let pet_ids = [];

                // Iterate over seat details
                for (let i = 1; i <= 8; i++) {
                    const seat_details = data.flight_data?.flight_seat?.[0][`seat${i}_details`];
                    if (seat_details) {
                        if (seat_details.user_id && seat_details.user_id != req.payload._id.valueOf()) {
                            if (!seat_details.pet_request_accepted) {
                                petOnBoardRequestDenied = true;
                                denied_userId.push(seat_details.user_id);
                            }
                        }
                        if (seat_details.user_id && seat_details.user_id == req.payload._id.valueOf()) {
                            seat_details.is_same_user = true;
                            if (seat_details.pet_id && seat_details.pet_id.length > 0 && seat_details.booking_id.valueOf() == data._id) {
                                pet_ids.push(...seat_details.pet_id);
                            }
                        } else {
                            seat_details.is_same_user = false;
                        }
                        seat_details.seat_no = i;
                    }
                }

                // Check if pet requests are accepted
                if (timeDifference >= 0 && timeDifference <= 3600000 && !petOnBoardRequestDenied) {
                    data.petOnBoardRequestAccept = true;
                } else if (!petOnBoardRequestDenied && data.booking_status == "confirmed") {
                    data.petOnBoardRequestAccept = true;
                } else {
                    data.petOnBoardRequest = true;
                }

                // Update data object with pet-related properties
                denied_user_obj[data._id] = denied_userId;
                pet_details_obj[data._id] = pet_ids;
                data.petOnBoardRequestDenied = petOnBoardRequestDenied;
            });

            let guest_details_data = await user_guest_mapping_modal.find({
                _id: {
                    $in: guest_ids
                }
            })
            const valuescc = Object.values(guest_details_obj).flatMap(obj => Object.keys(obj));

            valuescc.forEach((data) => {
                guest_details_data.forEach((obj) => {
                    if (data == obj._id.valueOf()) {
                        guest_details_obj[`${data}`] = obj.guest_name;
                    }
                }
                );

            })

            let pet_data = await user_pet_mapping_modal.find({
                _id: {
                    $in: summedUpPet
                }
            }, { pet_name: 1 })

            // Create a mapping of pet IDs to pet names
            let petIdToNameMapping = {};
            pet_data.forEach(pet => {
                petIdToNameMapping[pet._id.toString()] = { pet_name: pet.pet_name, pet_image: pet.pet_image };
            });

            booking.forEach((data) => {
                const guest_name_arr = [];
                for (let i = 1; i <= 8; i++) {
                    const seat_details = data.flight_data.flight_seat[0][`seat${i}_details`];
                    if (guest_details_obj[data._id] && seat_details) {
                        const guest_id = seat_details.guest_id;
                        const guest_name = guest_details_obj[data._id][guest_id];
                        if (guest_name) {
                            seat_details.guest_name = guest_name;
                            guest_name_arr.push(guest_name);
                        }
                    }

                    if (seat_details?.pet_id && seat_details.pet_id.length > 0) {
                        seat_details.pet_data = seat_details.pet_id.map(pet_id => petIdToNameMapping[pet_id] || []);
                    }
                }

                data.guest_name = guest_name_arr;

                const pet_ids = pet_details_obj[data._id] || [];
                data.pet_name = [].concat(...pet_ids.map(petId => petIdToNameMapping[petId] || []));
            });
        }
        let show_activate_button = false

        if (membership && membership.snooze_till <= startDate) {
            membership_data = {
                _id: membership._id,
                user_id: membership.user_id,
                membership_id: membership.membership_id,
                name: membership.name,
                price: membership.changed_price || membership.price,
                renewal_date: membership.renewal_date,
                status: membership.status,
                isAutoRenew: membership.isAutoRenew,
                purchase_date: membership.createdAt
            };
        }

        if (membership && !membership.is_activate) {
            show_activate_button = true;
        }

        let payment_data = await paymentModal.aggregate([{
            $match: { userId: user._id, status: "active", isActive: true }
        }, {
            $lookup: {
                from: "payment_methods",
                let: { to_id: "$paymentMethod" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$to_id"] }
                        }
                    }
                ],
                as: "paymentMethod"
            }
        },])
        if (payment_data && payment_data.length > 0) {
            if (payment_data[0]['snooze_till'] > startDate) {
                payment_data = []
            }
        }
        let announcement = await announcementModal.find({
            status: "active",
            user_ids: req.payload._id
        })
        let announcement_data = []
        if (announcement && announcement.length > 0) {
            announcement.forEach((data) => {
                if (data.snooze_till < startDate) {
                    announcement_data.push(data)
                }
            })
        }
        let guest_pass_sale = await boutiqueModal.find({
            status: "active", flash_sale: true,
            sale_end_date_time: {
                $gte: startDate
            },
            sale_start_date_time: {
                $lte: startDate
            },
            name: { $regex: 'guest', $options: 'i' }
        }).select({
            _id: 1,
            sale_start_date_time: 1,
            sale_end_date_time: 1,
            snooze_till: 1
        });
        let user_boutique = await userBoutiqueModal.find({
            user_id: req.payload._id, status: "active", snooze_till: {
                $gte: startDate
            }
        })
        let user_boutique_obj = {}
        if (user_boutique && user_boutique.length > 0) {
            user_boutique.forEach((data) => {
                user_boutique_obj[`${data.boutique_id}`] = data
            })
        }
        let guest_pass_sale_arr = []
        guest_pass_sale.forEach((data, i) => {
            if (!user_boutique_obj[`${data._id}`]) {
                guest_pass_sale_arr.push(data)

            }

        })
        let survey_questions = await surveyModal.find({
            user_id: req.payload._id,
            status: "active"

        })
        let survey_data = []
        if (survey_questions && survey_questions.length > 0) {
            survey_questions.forEach((data) => {
                if (data.snooze_till && data.snooze_till < startDate) {
                    survey_data.push(data)
                }
                if (!data.snooze_till) {
                    survey_data.push(data)

                }
            })
        }
        if (membership && membership.isAutoRenew) {
            membership_data = {}
        }
        let data = {
            "safety_video": {
                "safety_video_url": process.env.SAFETY_VIDEO_URL,
                "video_watched_status": user.safety_video_seen,
                "thumbnail_image_url": process.env.SAFETY_THUMBNAIL_URL
            },
            "bookings": booking,
            "membership": checkDemoSettings ? {} : membership_data,
            "payments": payment_data,
            "announcements": announcement_data,
            "show_profile_card": show_profile_card,
            "guest_pass_sale": guest_pass_sale_arr,
            "show_activate_button": show_activate_button,
            "one_time_initiationFee": one_time_initiationFee,
            "membership_failedData": checkDemoSettings ? [] : membership_failedData,
            "survey": survey_data,
            "is_demo_process": checkDemoSettings ? checkDemoSettings.is_demo_process : false,
            "showSafetyVideo": showSafetyVideo

        }
        return successResponse(data, 'Data Fetched Successfully!', res)

    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};
//using in latest build
exports.homePagev2 = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
        let membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active", is_activate: true }, { updatedAt: 0, change_date: 0 })
        let membership_data = {}
        let payment_data = {}
        let showSafetyVideo = false
        const user = req.payload
        let show_profile_card = false
        let one_time_initiationFee = {};
        let user_veriff = await veriffModal.findOne({
            user_id: req.payload._id,
            status: "active",
            is_duplicated: true,
            payment_status: {
                $ne: "success"
            }
        })

        if (user_veriff) {
            if (user_veriff.duplicated_ids && user_veriff.duplicated_ids.length > 0) {
                let previous_membership = await userMembershipModal.findOne({
                    user_id:
                    {
                        $in: user_veriff.duplicated_ids
                    }, status: "active"
                })
                if (previous_membership) {
                    let prev_membership_id = previous_membership.membership_id
                    let price_table = await priceModal.findOne({
                        status: "active",
                        type: "membership",
                        membership: prev_membership_id,
                        effectiveDate: {
                            $lte: startDate
                        }
                    });

                    if (price_table) {
                        one_time_initiationFee = {
                            initiationFees: price_table.initiationFees,
                            sequence: 1,
                            animationType: "INITIATION"
                        };
                    }

                }
            }

        }
        let membership_failedData = {};
        let transaction = await failedCardModel.findOne({
            userId: req.payload._id,
            status: "active",
            statusCode: 400
        });
        console.log(transaction, 'transaction')
        if (transaction) {
            // transaction.map((data) => {
            //     data.sequence = 3
            //     data.animationType = "MEMBERSHIP_FAILED"
            //     membership_failedData.push(data)
            // })
            membership_failedData = {
                userId: transaction?.userId,
                cardIssue: transaction?.cardIssue,
                isActive: transaction?.isActive,
                statusCode: transaction?.statusCode,
                status: transaction?.status,
                sequence: 3,
                "animationType": "MEMBERSHIP_FAILED"
            }
        }
        if (user.show_profile_snooze_till < startDate) {
            show_profile_card = true
        }
        const endDate = new Date(currentDate);

        endDate.setHours(endDate.getHours() + 10);
        //endDate.setMinutes(endDate.getMinutes() + 30);
        endDate.setHours(endDate.getHours() + 24);
        console.log('startdate==', startDate)
        console.log('enddate==', endDate)
        let booking = await booking_modal.aggregate([
            {
                $match: {
                    user_id: mongoose.Types.ObjectId(user._id),
                    status: "active",
                    booking_status: 'confirmed',
                    is_demo: checkDemoSettings ? true : false
                }
            },
            {
                $lookup: {
                    from: 'flights',
                    let: { item_id: '$flight_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$item_id"] }
                            }
                        },
                        {
                            $lookup: {
                                from: "routes",
                                let: { fromCityId: "$route" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$fromCityId"] }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "locations",
                                            let: { fromCityId: "$fromCity" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        _id: 1,
                                                        city_name: 1,
                                                        airport_abbreviation: 1,
                                                        image: 1,
                                                        airport_name: 1,
                                                        lat: 1,
                                                        long: 1
                                                    }
                                                }
                                            ],
                                            as: "from_airport_abb",
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "locations",
                                            let: { fromCityId: "$toCity" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        _id: 1,
                                                        city_name: 1,
                                                        airport_abbreviation: 1,
                                                        image: 1,
                                                        airport_name: 1,
                                                        lat: 1,
                                                        long: 1
                                                    }
                                                }
                                            ],
                                            as: "to_airport_abb",
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            to_airport_abb: 1,
                                            from_airport_abb: 1
                                        }
                                    }
                                ],
                                as: "route",
                            }
                        },
                        {
                            $lookup: {
                                from: "pilots",
                                let: { pilotId: "$pilot" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$pilotId"] }
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            first_name: 1,
                                            last_name: 1,
                                            Photo: 1
                                        }
                                    }
                                ],
                                as: "pilot"
                            }
                        },
                        {
                            $lookup: {
                                from: "pilots",
                                let: { pilotId: "$copilot" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$pilotId"] }
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            first_name: 1,
                                            last_name: 1,
                                            Photo: 1
                                        }
                                    }
                                ],
                                as: "copilot"
                            }
                        },
                        {
                            $lookup: {
                                from: "flight_seats_mappings",
                                let: { fromCityId: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$flight_id", "$$fromCityId"] }
                                        }
                                    }
                                ],
                                as: "flight_seat",
                            }
                        },

                    ],
                    as: 'flight_data'
                }
            },
            {
                $unwind: "$flight_data"
            },
            {
                $addFields: {
                    combined_takeoff_datetime: {
                        $toDate: {
                            $concat: [
                                { $dateToString: { format: "%Y-%m-%d", date: "$flight_data.flight_takeoff_date" } },
                                "T",
                                "$flight_data.takeoff_time"
                            ]
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: ["$combined_takeoff_datetime", startDate] },
                            { $lte: ["$combined_takeoff_datetime", endDate] }
                        ]
                        // $or: [
                        //     {
                        //         $and: [
                        //             // { $lte: ["$petOnBoardRequestStarts", startDate] },
                        //             { $lte: ["$petOnBoardRequestStarts", { $add: [startDate, 3600000] }] }
                        //         ]
                        //     },
                        //     {
                        //         $and: [
                        //             { $gte: ["$combined_takeoff_datetime", startDate] },
                        //             { $lte: ["$combined_takeoff_datetime", endDate] }
                        //         ]
                        //     }
                        // ]
                    }

                }
            },
            {
                $sort: {
                    "combined_takeoff_datetime": 1
                }
            },
            { $limit: 1 },
            {
                $project: {
                    flight_id: 0
                }
            }

        ])
        if (booking && booking.length > 0) {
            let pet_ids = [];
            let denied_user_obj = {}, pet_details_obj = {}, summedUpPet = [], guest_details_obj = {}, guest_ids = []
            booking.forEach((data) => {
                data.flight_data.pilot[0].full_name = data.flight_data.pilot[0].first_name + ' ' + data.flight_data.pilot[0].last_name;
                data.flight_data.copilot[0].full_name = data.flight_data.copilot[0].first_name + ' ' + data.flight_data.copilot[0].last_name;
                if (data.flight_data.checkedIn) showSafetyVideo = true
                if (!data.requested_id) data.requested_id = "";
                const flight_takeoff = new Date(data.flight_data['flight_takeoff_date']);
                const [takeoffHours, takeoffMinutes] = data.flight_data['takeoff_time'].split(':').map(Number);
                console.log('flight_takeoff==', flight_takeoff)
                flight_takeoff.setHours(takeoffHours, takeoffMinutes);
                // flight_takeoff.setHours(takeoffHours + 5);
                // flight_takeoff.setMinutes(takeoffMinutes + 30);
                const currentTime = startDate;
                console.log('flight_takeoff==', flight_takeoff)
                console.log('currentTime==', currentTime)
                const timeDifference = flight_takeoff - currentTime;
                const minutesDifference = timeDifference / (1000 * 60);
                console.log('timeDifference==', timeDifference)
                console.log('minutesDifference==', minutesDifference)
                if (timeDifference >= 0) {
                    if (data.flight_data.flight_delayed && !data.flight_data.flight_canceled) {
                        // console.log('here i am')
                        // Flight delayed scenario
                        Object.assign(data.flight_data, {
                            departure: false,
                            departs_in: 0,
                            checked_in: 0,
                            checkedIn: false,
                            checkedIn_time_left: 0
                        });
                    } else {

                        // Flight on time scenario
                        if (minutesDifference >= 0 && minutesDifference <= 90 && !data.flight_data.flight_canceled) {//departure time left
                            console.log('there i am')
                            data.flight_data.departure = true
                            data.flight_data.departs_in = Number(minutesDifference.toFixed(2))
                            let time_left_for_checkin = Number((minutesDifference - 30).toFixed(2)); //deepak
                            data.flight_data.checkedIn_time_left = Number(time_left_for_checkin.toFixed(2))

                        } else {
                            console.log('theres i am')
                            data.flight_data.departure = false
                            data.flight_data.departs_in = 0
                            data.flight_data.checkedIn_time_left = 0

                        }
                        // if (minutesDifference <= 90) {
                        //     //console.log('where i am')
                        //     data.flight_data.departure = true;
                        //     data.flight_data.departs_in = Number(minutesDifference.toFixed(2));
                        //     data.flight_data.checkedIn_time_left = Number((minutesDifference - 30).toFixed(2)); //deepak
                        // } else {
                        //     //console.log('i am')
                        //     data.flight_data.departure = false;
                        //     data.flight_data.departs_in = 0;
                        //     data.flight_data.checkedIn_time_left = 0;
                        // }

                        if (minutesDifference >= 0 && minutesDifference <= 30 && !data.flight_data.flight_canceled) {
                            // chcek in time left
                            console.log('where i am')
                            data.flight_data.checked_in = Number(minutesDifference.toFixed(2))
                            data.flight_data.checkedIn = true
                            data.flight_data.departure = false
                            data.flight_data.departs_in = 0
                            data.flight_data.checkedIn_time_left = 0

                        } else {
                            console.log('wheres i am')
                            data.flight_data.checked_in = 0
                            data.flight_data.checkedIn = false
                        }
                        console.log('gggggggggggggggg==', data.flight_data)
                        // data.flight_data.checked_in = (minutesDifference <= 30) ? Number(minutesDifference.toFixed(2)) : 0;//deepak
                        // data.flight_data.checkedIn = (data.flight_data.checked_in > 0);
                    }
                } else {
                    console.log('end i am')
                    // Flight already departed scenario
                    Object.assign(data.flight_data, {
                        departure: false,
                        departs_in: 0,
                        checked_in: 0,
                        checkedIn: false,
                        checkedIn_time_left: 0
                    });
                }

                // Initialize variables for pet requests
                let petOnBoardRequestDenied = false;
                let denied_userId = [];

                // Iterate over seat details
                for (let i = 1; i <= 8; i++) {
                    const seat_details = data.flight_data?.flight_seat?.[0][`seat${i}_details`];
                    if (seat_details) {
                        if (seat_details.user_id && seat_details.user_id != req.payload._id.valueOf()) {
                            if (!seat_details.pet_request_accepted) {
                                petOnBoardRequestDenied = true;
                                denied_userId.push(seat_details.user_id);
                            }
                        }
                        if (seat_details.user_id && seat_details.user_id == req.payload._id.valueOf()) {
                            seat_details.is_same_user = true;
                            if (seat_details.pet_id && seat_details.pet_id.length > 0 && seat_details.booking_id && seat_details.booking_id.valueOf() == data._id) {
                                pet_ids.push(...seat_details.pet_id);
                            }
                            if (seat_details.guest_id && seat_details.booking_id && seat_details.booking_id.valueOf() == data._id) {
                                if (!guest_details_obj[data._id]) {
                                    guest_details_obj[data._id] = {};
                                }
                                guest_ids.push(seat_details.guest_id)
                                guest_details_obj[`${data._id}`][`${seat_details.guest_id}`] = { seat_no: i }
                            }
                        } else {
                            seat_details.is_same_user = false;
                        }
                        seat_details.seat_no = i;
                    }
                }

                // Check if pet requests are accepted
                if (timeDifference >= 0 && timeDifference <= 3600000 && !petOnBoardRequestDenied) {
                    data.petOnBoardRequestAccept = true;
                } else if (!petOnBoardRequestDenied && data.booking_status == "confirmed") {
                    data.petOnBoardRequestAccept = true;
                } else {
                    data.petOnBoardRequest = true;
                }

                // Update data object with pet-related properties
                denied_user_obj[data._id] = denied_userId;
                pet_details_obj[data._id] = pet_ids;
                data.petOnBoardRequestDenied = petOnBoardRequestDenied;
            });

            let guest_details_data = await user_guest_mapping_modal.find({
                _id: {
                    $in: guest_ids
                }
            })
            const valuescc = Object.values(guest_details_obj).flatMap(obj => Object.keys(obj));

            valuescc.forEach((data) => {
                guest_details_data.forEach((obj) => {
                    if (data == obj._id.valueOf()) {
                        guest_details_obj[`${data}`] = obj.guest_name;
                    }
                }
                );

            })

            let pet_data = await user_pet_mapping_modal.find({
                _id: {
                    $in: pet_ids
                }
            }, { pet_name: 1 })

            // Create a mapping of pet IDs to pet names
            let petIdToNameMapping = {};
            pet_data.forEach(pet => {
                petIdToNameMapping[pet._id.toString()] = { pet_name: pet.pet_name, pet_image: pet.pet_image }
            });
            booking.forEach((data) => {
                const guest_name_arr = [];
                for (let i = 1; i <= 8; i++) {
                    const seat_details = data.flight_data.flight_seat[0][`seat${i}_details`];
                    if (guest_details_obj[data._id] && seat_details) {
                        const guest_id = seat_details.guest_id;
                        const guest_name = guest_details_obj[guest_id];
                        if (guest_name) {
                            seat_details.guest_name = guest_name;
                            guest_name_arr.push(guest_name);
                        }
                    }

                    if (seat_details?.pet_id && seat_details.pet_id.length > 0) {
                        seat_details.pet_data = seat_details.pet_id.flatMap(pet_id => petIdToNameMapping[pet_id] || []);
                    }
                }

                data.guest_name = guest_name_arr;

                const pet_ids = pet_details_obj[data._id] || [];
                data.pet_name = [].concat(...pet_ids.map(petId => petIdToNameMapping[petId] || []));
            });
        }
        let show_activate_button = false

        if (membership && membership.snooze_till <= startDate) {
            membership_data = {
                _id: membership._id,
                user_id: membership.user_id,
                membership_id: membership.membership_id,
                name: membership.name,
                price: membership.changed_price || membership.price,
                renewal_date: membership.renewal_date,
                status: membership.status,
                isAutoRenew: membership.isAutoRenew,
                purchase_date: membership.createdAt,
                sequence: 2,
                animationType: "MEMBERSHIP_RENEW"

            };
        }

        if (membership && !membership.is_activate) {
            show_activate_button = true;
        }
        let activeFailedCard = await failedCardModel.findOne({
            userId: req.payload._id,
            status: 'active',
            statusCode: { $in: [51, 215, 54] },
            isActive: true
        });
        let backUpSuccessCard = await failedCardModel.findOne({
            userId: req.payload._id,
            status: 'active',
            statusCode: 200,
            isActive: false
        });
        if (activeFailedCard && backUpSuccessCard) {
            payment_data = {
                animationType: "PAYMENT_DATA",
                sequence: 4,
                activeCard: {
                    cardId: activeFailedCard?.cardId,
                    userId: activeFailedCard?.userId,
                    cardholderName: activeFailedCard?.cardholderName,
                    cardType: activeFailedCard?.cardType,
                    cardNumber: activeFailedCard?.cardNumber,
                    cardIssue: activeFailedCard?.cardIssue,
                    expiry: activeFailedCard?.expiry,
                    statusCode: activeFailedCard?.statusCode
                },
                backUpCard: {
                    cardId: backUpSuccessCard?.cardId,
                    userId: backUpSuccessCard?.userId,
                    cardholderName: backUpSuccessCard?.cardholderName,
                    cardType: backUpSuccessCard?.cardType,
                    cardNumber: backUpSuccessCard?.cardNumber,
                    cardIssue: backUpSuccessCard?.cardIssue,
                    expiry: backUpSuccessCard?.expiry,
                    statusCode: backUpSuccessCard?.statusCode
                }
            };
        };
        let announcement = await announcementsModal.find({
            status: "active",
        }).select({
            admin_id: 1,
            title: 1,
            message: 1,
            image: 1,
            type: 1,
            snooze_till: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
        }).lean();
        let announcement_data = []
        if (announcement && announcement.length > 0) {
            announcement = announcement.map(data => {
                data.sequence = 6;
                data.animationType = "ANNOUNCEMENT"
                if (data.snooze_till < startDate) {
                    announcement_data.push(data)
                }
            });
        }
        let guest_pass_sales = await boutiqueModal.find({
            status: "active",
            flash_sale: true,
            sale_end_date_time: {
                $gte: startDate
            },
            sale_start_date_time: {
                $lte: startDate
            },
            name: { $regex: 'guest', $options: 'i' }
        }).select({
            _id: 1,
            sale_start_date_time: 1,
            sale_end_date_time: 1,
            snooze_till: 1
        }).lean();

        let guest_pass_sale_obj = {};

        let user_boutique = await userBoutiqueModal.find({
            user_id: req.payload._id, status: "active", snooze_till: {
                $gte: startDate
            }
        })
        let user_boutique_obj = {}
        if (user_boutique && user_boutique.length > 0) {
            user_boutique.forEach((data) => {
                user_boutique_obj[`${data.boutique_id}`] = data
            })
        }
        let guest_pass_sale_arr = {}
        // guest_pass_sale = guest_pass_sale.map(sale => {
        //     sale.sequence = 5;
        //     sale.animationType = "GUEST_PASS_SALE"
        //     if (!user_boutique_obj[`${sale._id}`]) {
        //         guest_pass_sale_arr.push(sale)

        //     }
        // });
        guest_pass_sales.forEach(sale => {
            sale.sequence = 5;
            sale.animationType = "GUEST_PASS_SALE";
            if (!user_boutique_obj[`${sale._id}`]) {
                guest_pass_sale_obj[sale._id] = sale;
            }
        });
        let survey_questions = await surveyModal.find({
            user_id: req.payload._id,
            status: "active"

        }).lean()
        let survey_data = []
        if (survey_questions && survey_questions.length > 0) {
            survey_questions.map(data => {
                data.sequence = 7;
                data.animationType = "SURVEY"
                if (data.snooze_till && data.snooze_till < startDate && data.user_answer && data.user_answer.length == 0) {
                    survey_data.push(data)
                }
                if (!data.snooze_till && data.user_answer && data.user_answer.length == 0) {
                    survey_data.push(data)

                }
            });
        }
        if (membership && membership.isAutoRenew) {
            membership_data = {}
        }
        let referSenderData = [];

        // Find the referral document for the user
        const referDocs = await referModal.find({ user_id: req.payload._id, send_by_refer: 'redeem' });
        if (referDocs && referDocs.length > 0) {
            // Add necessary data to referSenderData
            referSenderData = referDocs.map(doc => ({
                ...doc._doc,
                sequence: 8,
                animationType: "SENDREFER"
            }));
        }
        let referReceiverData = [];

        // Find the referral document for the user
        const referDoc = await referModal.find({ send_to: req.payload._id, send_to_refer: 'redeem' });
        if (referDoc && referDoc.length > 0) {
            // Extract user IDs from referDoc
            const userIds = referDoc.map(doc => doc.user_id);

            // Query the userModal to get full names
            const userDetails = await userModal.find({ _id: { $in: userIds } }, 'fullName');

            // Create a map of user IDs to full names for easy lookup
            const userFullNames = userDetails.reduce((acc, user) => {
                acc[user._id] = user.fullName;
                return acc;
            }, {});

            // Add necessary data to referReceiverData and replace the name key
            referReceiverData = referDoc.map(doc => ({
                ...doc._doc,
                name: userFullNames[doc.user_id] || doc.name, // Replace name with full name or keep the original name if not found
                sequence: 9,
                animationType: "RECEIVEREFER"
            }));
        }

        let data = {
            "safety_video": {
                "safety_video_url": process.env.SAFETY_VIDEO_URL,
                "video_watched_status": user.safety_video_seen,
                "thumbnail_image_url": process.env.SAFETY_THUMBNAIL_URL
            },
            "show_profile_card": show_profile_card,
            "show_activate_button": show_activate_button,
            "is_demo_process": checkDemoSettings ? checkDemoSettings.is_demo_process : false,
            "showSafetyVideo": showSafetyVideo,
            "bookings": booking,
            "animation": [
                one_time_initiationFee,//1
                (checkDemoSettings ? {} : membership_data), //2
                (checkDemoSettings ? {} : membership_failedData), //3
                payment_data, //4
                (checkDemoSettings ? {} : guest_pass_sale_arr),//5
                ...announcement_data, //6
                ...survey_data, //7
                ...(referSenderData.length > 0 ? referSenderData : []), // 8
                ...(referReceiverData.length > 0 ? referReceiverData : []) // 8
            ]

        }
        return successResponse(data, 'Data Fetched Successfully!', res)

    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};
exports.updateSafetyVideoWatchStatus = async (req, res) => {
    try {
        const _id = req.payload._id
        //Find user by user's id and update safety video seen status
        let userUpdate = await userModal.findByIdAndUpdate({ _id }, {
            safety_video_seen: req.body.status
        }, { new: true });

        return successResponse(userUpdate, 'Data Updated Successfully!', res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.addPayment = async (req, res) => {
    try {
        let user_id = req.payload._id;
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);

        const findCardType = await paymentGatewayModal.findOne({ status: 'active' });
        if (findCardType) {
            const cardType = req.body.cardType;

            const cardTypeConfig = findCardType.australiaRegion.gatewayPercentages.find(gateway => gateway.paymentType === cardType) ||
                findCardType.nonAustraliaRegion.gatewayPercentages.find(gateway => gateway.paymentType === cardType);
            if (!cardTypeConfig.enabled) {
                return failMessage(`${cardType} Card is not allowed`, res)
            }
        }

        // Check if the card is blacklisted
        const blacklistedCard = await blackListCardModel.findOne({ cardNumber: req.body.cardNumber, status: 'active' });
        if (blacklistedCard) {
            return failMessage('This Card is blacklisted Please Use Another Card', res)
        }
        let user_payments = await paymentModal.find({ userId: user_id, status: "active" });
        let userData = await userModal.findOne({ _id: user_id, status: "active" })

        let is_active = false
        if (user_payments && user_payments.length > 0) {
            let is_duplicate = false;
            for (const data of user_payments) {
                if (data.cardNumber === req.body.cardNumber) {
                    is_duplicate = true;
                    break;
                }
            }

            if (is_duplicate) return failMessage('Card already exists!', res)

        } else {
            is_active = true
        }
        let expiryDate = req.body.expiry || "";
        const [expiryMonth, expiryYear] = expiryDate ? expiryDate.split('/').map(str => parseInt(str.trim(), 10)) : ""
        if (expiryMonth && expiryYear) {
            const expirys = new Date('20' + expiryYear, expiryMonth - 1);
            const currentDate = startDate;
            if (expirys < currentDate) {
                return failMessage('Card expiry date is invalid!', res); // Expiry date is before the current date
            }
        }

        // Fetch payment method details
        const findPayMethod = await paymentMethodModal.findById({ _id: req.body.paymentMethod });
        if (!findPayMethod) {
            return res.status(404).json({ message: 'Payment method not found' });
        }

        // Prepare payment method object
        const payment_method = {
            _id: req.body.paymentMethod,
            name: findPayMethod.name || "",
            type: findPayMethod.type || ""
        };
        let newPayment;
        //If Airwallex Customer Not Exist Then Create Airwallex Customer Id
        if (!userData.airwallexCustomerId) {
            let airCusObj = {
                address: {
                    city: req.body.billingAddress.city,
                    country_code: userData.country_code,
                    postcode: req.body.billingAddress.postCode,
                    state: req.body.billingAddress.state,
                    street: req.body.billingAddress.streetAddress
                },
                email: userData.email,
                first_name: userData.preferredFirstName ? userData.preferredFirstName : userData.fullName,//if user preferred name exist else full name
                last_name: userData.preferredFirstName ? userData.preferredFirstName : userData.fullName,//if user preferred name exist else full name
                merchant_customer_id: uuid(),
                phone_number: userData.phone,
                request_id: uuid(),
            }
            // Handle the payment method through external API
            const airwallexResponse = await saveAirwallexCustomer(user_id, airCusObj);
            if (!airwallexResponse.success) {
                return res.status(500).json({ message: airwallexResponse.message });
            }
        }

        //function for payment constent
        const paymentConsentResponse = await createPaymentConsent(user_id);
        if (!paymentConsentResponse.success) {
            return res.status(500).json({ message: paymentConsentResponse.message });
        }
        //function for verify constent
        const paymentVerifyResponse = await verifyPaymentConsent(user_id, req.body, paymentConsentResponse?.data?.id);
        if (!paymentVerifyResponse.success) {
            return res.status(500).json({ message: paymentVerifyResponse.message });
        }

        // Update Membership Agreement 
        await userModal.findOneAndUpdate({ _id: user_id, status: "active" }, {
            membershipAgreement: req.body.membershipAgreement
        }, { new: true })

        newPayment = new paymentModal({
            userId: user_id,
            paymentMethod: req.body.paymentMethod,
            cardType: req.body.cardType,
            cardholderName: req.body.cardholderName,
            cardNumber: req.body.cardNumber,
            expiry: req.body.expiry,
            airwallexPaySrcId: paymentVerifyResponse?.data?.id,
            billingAddress: req.body.billingAddress,
            isActive: is_active,
            city: req.body.city,
            businessName: req.body.businessName || "",
            abn: req.body.abn || "",
        });

        await newPayment.save(); // 

        //This code for powerboard
        // const apiResponse = await savePowerboardCustomer(user_id, req.body);
        // if (!apiResponse.success) {
        //     return res.status(500).json({ message: apiResponse.message });
        // }

        // // Fetch existing payment sources from the database for the user
        // const existingPaymentSources = await paymentModal.find({ userId: user_id }).select('powerBoardPaySrcId');
        // const existingPaymentSourceIds = existingPaymentSources.map(source => source.powerBoardPaySrcId);

        // // Iterate over payment sources and save each new payment source if not already saved
        // console.log(apiResponse?.data, "apiResponse?.data")
        // const paymentSources = apiResponse?.data?.resource?.data?.payment_sources;

        // for (let i = 0; i < paymentSources.length; i++) {
        //     const paymentSource = paymentSources[i];

        //     // Check if the payment source already exists in the database
        //     if (!existingPaymentSourceIds.includes(paymentSource._id)) {
        //         newPayment = new paymentModal({
        //             userId: user_id,
        //             paymentMethod: req.body.paymentMethod,
        //             cardType: req.body.cardType,
        //             cardholderName: req.body.cardholderName,
        //             cardNumber: req.body.cardNumber,
        //             expiry: req.body.expiry,
        //             powerBoardPaySrcId: paymentSource._id,
        //             billingAddress: req.body.billingAddress,
        //             isActive: is_active,
        //             city: req.body.city,
        //             businessName: req.body.businessName || "",
        //             abn: req.body.abn || "",
        //         });

        //         await newPayment.save(); // Save each new payment source in the db
        //     }
        // }
        let newPayments = {
            _id: newPayment._id,
            userId: user_id,
            paymentMethod: payment_method,
            cardType: newPayment.cardType,
            cardholderName: newPayment.cardholderName,
            cardNumber: newPayment.cardNumber,
            expiry: newPayment.expiry,
            cvv: newPayment.cvv,
            billingAddress: newPayment.billingAddress,
            isActive: is_active,
            city: newPayment.city,
            businessName: newPayment.businessName || "",
            abn: newPayment.abn || "",
            status: newPayment.status
        }
        if (req.body.is_website) {
            await userModal.findByIdAndUpdate({ _id: user_id }, { onboard_status: true, is_member: true, is_membership_payment_page_completed: true }, { new: true });

        }
        return successResponse(newPayments, 'Data Added Successfully!', res)


    } catch (err) {
        console.log(err, "err");
        return internalServerError('Internal Server Error', res);
    }
};
exports.getPaymentMethod = async (req, res) => {
    try {
        //Find payment methods 
        let data = await paymentMethodModal.find({ status: "active" })

        return successResponse(data, 'Data Fetched Successfully!', res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.getUsersPaymentListing = async (req, res) => {
    try {
        const user = req.payload
        //Find payment details by user id
        let payment_data = await paymentModal.aggregate([
            {
                $match: { userId: user._id, status: "active" }
            },
            {
                $lookup: {
                    from: "payment_methods",
                    let: { to_id: "$paymentMethod" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$to_id"] }
                            }
                        }
                    ],
                    as: "paymentMethod"
                }
            },
            {
                $unwind: {
                    path: "$paymentMethod",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);
        if (!payment_data) {
            return emptyResponse(payment_data, res)
        }
        return successResponseWithPagination(payment_data, payment_data.length, 'Data Fetched Successfully!', res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};

exports.get_cities = async (req, res) => {
    try {
        //Getting all the cities from location table
        let cities = await state_modal.find({ status: 'active' }).select('city_name airport_abbreviation image').sort({ order: 1 });
        if (req.query.curr_lat != undefined && req.query.curr_lat != '' && req.query.curr_long != undefined && req.query.curr_long != '') {
            //Getting all the cities from location table basis of lat long
            let lat = req.query.curr_lat;
            let long = req.query.curr_long;
            let arr = [parseFloat(long), parseFloat(lat)]
            cities = await state_modal.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: arr  // Example coordinates
                        },
                        key: "location",
                        distanceField: "distance",
                        query: { status: 'active' }
                    }
                },
                {
                    $project: {
                        city_name: 1,
                        airport_abbreviation: 1,
                        image: 1,
                        distance: 1
                    }
                },
                {
                    $sort: { distance: 1 }  // Sort by distance in ascending order
                }
            ]);
        }

        return successResponse(cities, "Data fetched successfully!", res)

    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};
async function fetch_flight_by_date(first_date, leavingFromObjectId, arrivingAtObjectId, user_id, checkDemoSettings) {
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setHours(startDate.getHours() + 10);
    // startDate.setMinutes(startDate.getMinutes() + 30);
    // const startDate = new Date();
    let booking_data = await booking_modal.aggregate([
        {
            $match: {
                user_id: user_id,
                booking_status: {
                    $ne: "canceled"
                }
            }
        }
    ]
    )
    let bookedFlightIds = []
    if (booking_data.length > 0) {
        booking_data.map((data) => {
            bookedFlightIds.push(data.flight_id.valueOf())
        })
    }
    //Getting all the flights by matching flight_takeoff_date,from,to 
    let route = await routeModal.findOne({ fromCity: leavingFromObjectId, toCity: arrivingAtObjectId, status: 'active' })
    console.log('route===', route)
    let getDay = new Date(first_date).toLocaleDateString('en-US', { weekday: 'long' })
    console.log('getDay====', getDay)
    let first_date_flights = await flightModal.aggregate([
        {
            $match: {
                flight_takeoff_date: new Date(first_date),
                route: route._id,
                day: { $in: [getDay] },
                // is_demo: checkDemoSettings ? true : false,
                $or: [
                    { is_demo: checkDemoSettings ? true : false },
                    { is_demo: { $exists: false } }
                ],
                flight_canceled: false,
                status: 'active'
            }
        },
        {
            $lookup: {
                from: "routes",
                let: { fromCityId: "$route" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$fromCityId"] }
                        }
                    },
                    {
                        $lookup: {
                            from: "locations",
                            let: { fromCityId: "$fromCity" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        city_name: 1,
                                        airport_abbreviation: 1,
                                        image: 1
                                    }
                                }
                            ],
                            as: "from_airport_abb",
                        }
                    },
                    {
                        $lookup: {
                            from: "locations",
                            let: { fromCityId: "$toCity" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        city_name: 1,
                                        airport_abbreviation: 1,
                                        image: 1
                                    }
                                }
                            ],
                            as: "to_airport_abb",
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            to_airport_abb: 1,
                            from_airport_abb: 1
                        }
                    }
                ],
                as: "route",
            }
        },
        {
            $lookup: {
                from: "pilots",
                let: { pilotId: "$pilot" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$pilotId"] }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            first_name: 1,
                            last_name: 1,
                            Photo: 1
                        }
                    }
                ],
                as: "pilot"
            }
        },
        {
            $lookup: {
                from: "pilots",
                let: { pilotId: "$copilot" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$pilotId"] }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            first_name: 1,
                            last_name: 1,
                            Photo: 1
                        }
                    }
                ],
                as: "copilot"
            }
        },
        {
            $project: {
                from: 0,
                to: 0,
            }
        },
    ]);
    let result = []
    console.log('first_date_flights====', first_date_flights)
    if (first_date_flights) {
        let flight_obj = {}
        let flight_ids = []
        await first_date_flights.forEach(async (data) => {
            if (bookedFlightIds.includes(data._id.valueOf())) {
                data.already_booked = true
            } else {
                data.already_booked = false
            }
            data.from_airport_abb = data.route[0]['from_airport_abb']
            data.to_airport_abb = data.route[0]['to_airport_abb']
            delete data.route
            data.pilot_name = data?.pilot?.[0]?.['first_name'] + ' ' + data?.pilot?.[0]?.['last_name']
            data.pilot_image = data?.pilot?.[0]?.['Photo']
            delete data.pilot
            data.copilot_name = data?.copilot?.[0]?.['first_name'] + ' ' + data?.copilot?.[0]?.['last_name']
            data.copilot_image = data?.copilot?.[0]?.['Photo']
            delete data?.copilot
            const flightTakeOffDateRef = data.flight_takeoff_date
            let differences = await commonservices.getTimeDifference(flightTakeOffDateRef, data.takeoff_time, data.landing_time)
            data['durationHours'] = differences.hours
            data['durationMinutes'] = differences.mins
            //Storing all the flight ids in the array "flight_ids"
            flight_ids.push(data._id)
            flight_obj[`${data._id}`] = 0 //Initializing value to 0
        })
        let petOnBoardObj = {}
        //Getting flight's seat data from flight_seat_mapping by flight_id
        let fetch_flight_seats = await flight_seat_mapping.find({ flight_id: { $in: flight_ids } })
        fetch_flight_seats.map((data) => {
            let flightId = `${data.flight_id}`;
            let flight_obj_value = flight_obj[flightId] || 0; // Initializing with current value or 0 if not present
            petOnBoardObj[`${data.flight_id}`] = false
            for (let i = 1; i <= 8; i++) {
                if (data[`seat${i}`] && data[`seat${i}_details`] && data[`seat${i}_details`].booking_id && data[`seat${i}_details`].pet_id) {
                    petOnBoardObj[`${data.flight_id}`] = true
                }
                if (data[`seat${i}`] === 0 || (data[`seat${i}_details`] && !data[`seat${i}_details`].booking_id)) {
                    flight_obj_value++; //Incrementing the value by 1
                }
            }

            flight_obj[flightId] = flight_obj_value;
        })

        first_date_flights.forEach((data) => {
            if (flight_obj[`${data._id}`] || flight_obj[`${data._id}`] == 0) {
                let flightTakeOffDateRef = new Date(data.flight_takeoff_date)
                let [time1Hours, time1Minutes] = data.takeoff_time.split(':').map(Number);
                flightTakeOffDateRef = flightTakeOffDateRef.setHours(time1Hours, time1Minutes)
                let curr_timestamp = startDate.getTime()

                let future_timestamp = curr_timestamp + (90 * 60 * 1000); // Adding 90 minutes in milliseconds
                //Showing those flights having a buffer of 90 minutes before take off time
                if (future_timestamp < flightTakeOffDateRef) {
                    //Adding no_of_seats_left key to the first_date_flights object
                    data.no_of_seats_left = flight_obj[`${data._id}`]
                    if (petOnBoardObj[`${data._id}`] || (petOnBoardObj[`${data._id}`] == false)) data.pet_on_board = petOnBoardObj[`${data._id}`]
                    result.push(data)
                }

            }

        })
    }
    //Returning the flight data
    return result


}
exports.get_flights = async (req, res) => {
    try {
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
        let { first_date, second_date, leaving_from, arriving_at } = req.body
        //Getting user membership
        let user_membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active" })
        // if (user_membership && user_membership.name == "Unlimited Elite" && Number(req.payload.reusable_bookings) <= 0) {
        //     return failMessage('User cannot book a flight as not having enough reusable bookings for Unlimited Elite membership!', res)
        // }
        const leavingFromObjectId = mongoose.Types.ObjectId(leaving_from);//creating a new MongoDB ObjectId instance
        const arrivingAtObjectId = mongoose.Types.ObjectId(arriving_at);//creating a new MongoDB ObjectId instance
        let second_date_flights = []
        let route = await routeModal.findOne({ fromCity: leavingFromObjectId, toCity: arrivingAtObjectId, status: 'active' })
        console.log('routesss===', route)
        if (!route) return failMessage('No data found!', res)

        let getDay = new Date(first_date).toLocaleDateString('en-US', { weekday: 'long' })
        console.log('getDay==', getDay)
        //Fetching flights for first_date
        let get_first_flight_ids = await flightModal.aggregate([{
            $match: {
                flight_takeoff_date: new Date(first_date),
                route: route._id,
                day: { $in: [getDay] },
                is_demo: checkDemoSettings ? true : false
            }
        },
        {
            $project: {
                _id: 1
            }
        }])
        if (get_first_flight_ids.length > 0) {
            get_first_flight_ids.forEach(async (data) => {

                await check_for_lock_time_condition(data._id.valueOf())
            })
        }
        let first_date_flights = await fetch_flight_by_date(first_date, leavingFromObjectId, arrivingAtObjectId, req.payload._id, checkDemoSettings)
        if (second_date) {
            let route = await routeModal.findOne({ fromCity: arrivingAtObjectId, toCity: leavingFromObjectId });

            let getDay = new Date(second_date).toLocaleDateString('en-US', { weekday: 'long' })
            let get_second_flight_ids = await flightModal.aggregate([{
                $match: {
                    flight_takeoff_date: new Date(second_date),
                    route: route._id,
                    day: { $in: [getDay] }
                }
            },
            {
                $project: {
                    _id: 1
                }
            }])
            if (get_second_flight_ids.length > 0) {
                get_second_flight_ids.forEach(async (data) => {
                    await check_for_lock_time_condition(data._id.valueOf())
                })
            }
            //Fetching flights for second_date
            second_date_flights = await fetch_flight_by_date(second_date, arrivingAtObjectId, leavingFromObjectId, req.payload._id, checkDemoSettings)
        }
        return successResponse({ "one_way_flights": first_date_flights, "two_way_flights": second_date_flights }, "Data fetched successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
async function check_for_lock_time_condition(flight_id, user) {
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setHours(startDate.getHours() + 10);
    //startDate.setMinutes(startDate.getMinutes() + 30);
    //Getting flight's seat data by flight_id from flight_seat_mapping
    let seat_of_first_flight = await flight_seat_mapping.find({ flight_id })

    if (seat_of_first_flight?.[0]) {
        let updates = []; // Collect updates to perform in bulk
        for (let i = 1; i <= 8; i++) {
            if (seat_of_first_flight[0][`seat${i}_details`]?.lock_date_time && seat_of_first_flight[0][`seat${i}_details`].lock_date_time != "") {
                let currtime = startDate.getTime()
                //If lock_date_time is >1hour 
                if ((currtime - seat_of_first_flight[0][`seat${i}_details`].lock_date_time) > 3600000) {//1 hr=36,00,000 milliseconds
                    //Collecting the update object for bulk updation
                    updates.push({
                        seatNumber: i,
                        update: {
                            [`seat${i}`]: 0,
                            [`seat${i}_details`]: {}
                        }
                    });
                }
            }
        }
        if (updates.length > 0) {
            let bulkOperations = updates.map(update => ({
                updateOne: {
                    filter: { flight_id },
                    update: update.update
                }
            }));
            //Bulk update the flight_seat_mapping
            await flight_seat_mapping.bulkWrite(bulkOperations);
        }
    }
};
async function fetch_seats_for_various_conditions(flight_id, user) {
    const flightIdObjectId = mongoose.Types.ObjectId(flight_id);//creating a new MongoDB ObjectId instance
    //Getting seats data by matching flight_id
    let seats = await flight_seat_mapping.aggregate([
        {
            $match: {
                flight_id: flightIdObjectId
            }
        },
        {
            $project: {
                _id: 0,
            }
        }

    ])
    let result = []//It will store the final result
    //Prepare an array for seat nos
    let seats_for_first_flight = [seats[0]['seat1'], seats[0]['seat2'], seats[0]['seat3'], seats[0]['seat4'], seats[0]['seat5'], seats[0]['seat6'], seats[0]['seat7'], seats[0]['seat8']]
    //Prepare an array for each seat details
    let seats_details_for_first_flight = [seats[0]['seat1_details'], seats[0]['seat2_details'], seats[0]['seat3_details'], seats[0]['seat4_details'], seats[0]['seat5_details'], seats[0]['seat6_details'], seats[0]['seat7_details'], seats[0]['seat8_details']]
    //result will contain two keys -> seats and seats_details
    result = [{
        seats: seats_for_first_flight,
        seats_details: seats_details_for_first_flight
    }]
    let check_pet_ids = {}, pet_ids = [], empty_seats = {}
    let check_guest_ids = {}, guest_ids = [], other_users_ids = {}
    for (let i = 1; i <= seats_details_for_first_flight.length; i++) {
        if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] == user._id.valueOf() && !seats_details_for_first_flight[i - 1]['booking_id']) {
            //If the seat is previously selected by same user then update the key "is_same_user" to true
            seats_details_for_first_flight[i - 1] = null
            seats_for_first_flight[i - 1] = 0
            empty_seats[`seat${i}`] = 0
            empty_seats[`seat${i}_details`] = null
        }
        if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] == user._id.valueOf() && seats_details_for_first_flight[i - 1]['booking_id'] && (seats_details_for_first_flight[i - 1]['isLocked'] || seats_details_for_first_flight[i - 1]['preserve'])) {
            //If the seat is previously selected by same user then update the key "is_same_user" to true
            seats_details_for_first_flight[i - 1] = null
            seats_for_first_flight[i - 1] = 0
            empty_seats[`seat${i}`] = 0
            empty_seats[`seat${i}_details`] = null
        }
        // if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] && !seats_details_for_first_flight[i - 1]['booking_id']) {
        //     //If the seat is previously selected by same user then update the key "is_same_user" to true
        //     seats_details_for_first_flight[i - 1] = null
        //     seats_for_first_flight[i - 1] = 0
        // }
        // if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] == user._id.valueOf()) {
        //     //If the seat is previously selected by same user then update the key "is_same_user" to true
        //     seats_details_for_first_flight[i - 1]['is_same_user'] = true
        //     seats_details_for_first_flight[i - 1]['user_pic'] = user.profile_pic
        //     seats_details_for_first_flight[i - 1]['user_name'] = user.fullName

        // }
        if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] != user._id.valueOf() && seats_details_for_first_flight[i - 1]['booking_id'] && (seats_details_for_first_flight[i - 1]['isLocked'] || seats_details_for_first_flight[i - 1]['preserve'])) {
            other_users_ids[`${seats_details_for_first_flight[i - 1]['user_id']}`] = i - 1
            seats_details_for_first_flight[i - 1]['is_same_user'] = false
            seats_details_for_first_flight[i - 1]['user_pic'] = ""
            seats_details_for_first_flight[i - 1]['user_name'] = ""

        }
        if (seats_details_for_first_flight[i - 1]?.['pet_id'] && seats_details_for_first_flight[i - 1]['pet_id'].length > 0 && seats_details_for_first_flight[i - 1]['booking_id'] && (!seats_details_for_first_flight[i - 1]['isLocked'] || !seats_details_for_first_flight[i - 1]['preserve'])) {
            //Storing the seat no.
            check_pet_ids[`${i}`] = seats_details_for_first_flight[i - 1]['pet_id']
            //Collecting pet ids
            pet_ids.push(seats_details_for_first_flight[i - 1]['pet_id'])
        }
        if (seats_details_for_first_flight[i - 1]?.['guest_id'] && seats_details_for_first_flight[i - 1]['booking_id'] && (!seats_details_for_first_flight[i - 1]['isLocked'] || !seats_details_for_first_flight[i - 1]['preserve'])) {
            //Storing the seat no.
            check_guest_ids[`${seats_details_for_first_flight[i - 1]['guest_id']}`] = i
            //Collecting guest ids
            guest_ids.push(seats_details_for_first_flight[i - 1]['guest_id'])

        }
        if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] == user._id.valueOf() && seats_details_for_first_flight[i - 1]['booking_id'] && (!seats_details_for_first_flight[i - 1]['isLocked'] && !seats_details_for_first_flight[i - 1]['preserve'])) {
            //If the seat is previously selected by same user then update the key "is_same_user" to true
            seats_details_for_first_flight[i - 1]['is_same_user'] = true
            seats_details_for_first_flight[i - 1]['user_pic'] = user.profile_pic
            seats_details_for_first_flight[i - 1]['user_name'] = user.fullName

        }
        // if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] != user._id.valueOf() && seats_details_for_first_flight[i - 1]['booking_id']) {
        //     other_users_ids[`${seats_details_for_first_flight[i - 1]['user_id']}`] = i - 1
        //     seats_details_for_first_flight[i - 1]['is_same_user'] = false
        //     seats_details_for_first_flight[i - 1]['user_pic'] = ""
        //     seats_details_for_first_flight[i - 1]['user_name'] = ""

        // }
        // if (seats_details_for_first_flight[i - 1]?.['pet_id'] && seats_details_for_first_flight[i - 1]['pet_id'].length > 0 && seats_details_for_first_flight[i - 1]['booking_id']) {
        //     //Storing the seat no.
        //     check_pet_ids[`${i}`] = seats_details_for_first_flight[i - 1]['pet_id']
        //     //Collecting pet ids
        //     pet_ids.push(seats_details_for_first_flight[i - 1]['pet_id'])
        // }
        // if (seats_details_for_first_flight[i - 1]?.['guest_id'] && seats_details_for_first_flight[i - 1]['booking_id']) {
        //     //Storing the seat no.
        //     check_guest_ids[`${seats_details_for_first_flight[i - 1]['guest_id']}`] = i
        //     //Collecting guest ids
        //     guest_ids.push(seats_details_for_first_flight[i - 1]['guest_id'])

        // }
    }
    await flight_seat_mapping.findOneAndUpdate({ flight_id }, empty_seats)
    let other_users_data = await userModal.find({
        _id: {
            $in: Object.keys(other_users_ids)
        }
    })
    other_users_data.forEach((data) => {
        if (data.show_profile) {
            if (other_users_ids[`${data._id.valueOf()}`])
                seats_details_for_first_flight[other_users_ids[`${data._id.valueOf()}`]]['user_pic'] = data.profile_pic
            seats_details_for_first_flight[other_users_ids[`${data._id.valueOf()}`]]['user_name'] = data.fullName

        }
    })
    let mergedArray = [].concat(...pet_ids);
    let new_mergedArray = mergedArray.map((data) => mongoose.Types.ObjectId(`${data}`))

    let pet_details = await user_pet_mapping_modal.aggregate([
        {
            $match: {
                _id: { $in: new_mergedArray }
            }
        },
        {
            $lookup: {
                from: "pets",
                localField: "pet_breed", // Assuming "pet_id" is the field in "pets" mapped from the previous stage
                foreignField: "_id",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            breed_name: 1,
                        }
                    }
                ],
                as: "pet_breed"
            }
        }
    ]);
    if (pet_details) {

        let petDetailsMap = {};

        pet_details.forEach(pet => {
            petDetailsMap[pet._id.toString()] = {
                pet_name: pet.pet_name,
                pet_image: pet.pet_image,
                type_of_pet: pet.type_of_pet,
                pet_breed: pet.pet_breed,
                pet_weight: pet.pet_weight,
                pet_id: pet._id,
                assistance_animal_proof: pet.assistance_animal_proof
            };
        });
        // Update check_pet_ids with pet details
        for (let key in check_pet_ids) {
            let petIds = check_pet_ids[key];
            let petDetails = petIds.map(id => petDetailsMap[id]);
            check_pet_ids[key] = petDetails;
        }
        for (let i = 1; i <= 8; i++) {
            if (check_pet_ids[`${i}`]) {
                seats_details_for_first_flight[i - 1]['pet_data'] = check_pet_ids[`${i}`]
            }

        }
    }
    //Find all the guests from user_guest_mapping_modal by matching id
    let guest_details = await user_guest_mapping_modal.find({
        _id: { $in: guest_ids }
    })

    if (guest_details) {
        guest_details.map((data) => {
            if (check_guest_ids[`${data._id}`]) {
                seats_details_for_first_flight[check_guest_ids[`${data._id}`] - 1]['guest_name'] = data['guest_name'] || '';
                seats_details_for_first_flight[check_guest_ids[`${data._id}`] - 1]['guest_phone'] = data['guest_phone'] || '';
                seats_details_for_first_flight[check_guest_ids[`${data._id}`] - 1]['guest_phone_code'] = data['guest_phone_code'] || '';
            }
        })
    }
    return result
}
// async function fetch_seats_for_various_conditions(flight_id, user) {
//     const flightIdObjectId = mongoose.Types.ObjectId(flight_id);//creating a new MongoDB ObjectId instance
//     //Getting seats data by matching flight_id
//     let seats = await flight_seat_mapping.aggregate([
//         {
//             $match: {
//                 flight_id: flightIdObjectId
//             }
//         },
//         {
//             $project: {
//                 _id: 0,
//             }
//         }

//     ])
//     let result = []//It will store the final result
//     //Prepare an array for seat nos
//     let seats_for_first_flight = [seats[0]['seat1'], seats[0]['seat2'], seats[0]['seat3'], seats[0]['seat4'], seats[0]['seat5'], seats[0]['seat6'], seats[0]['seat7'], seats[0]['seat8']]
//     //Prepare an array for each seat details
//     let seats_details_for_first_flight = [seats[0]['seat1_details'], seats[0]['seat2_details'], seats[0]['seat3_details'], seats[0]['seat4_details'], seats[0]['seat5_details'], seats[0]['seat6_details'], seats[0]['seat7_details'], seats[0]['seat8_details']]
//     //result will contain two keys -> seats and seats_details
//     result = [{
//         seats: seats_for_first_flight,
//         seats_details: seats_details_for_first_flight
//     }]
//     let check_pet_ids = {}, pet_ids = []
//     let check_guest_ids = {}, guest_ids = [], other_users_ids = {}
//     for (let i = 1; i <= seats_details_for_first_flight.length; i++) {
//         // if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] == user._id.valueOf() && !seats_details_for_first_flight[i - 1]['booking_id']) {
//         //     //If the seat is previously selected by same user then update the key "is_same_user" to true
//         //     seats_details_for_first_flight[i - 1] = null
//         //     seats_for_first_flight[i - 1] = 0
//         // }
//         if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] && !seats_details_for_first_flight[i - 1]['booking_id']) {
//             //If the seat is previously selected by same user then update the key "is_same_user" to true
//             seats_details_for_first_flight[i - 1] = null
//             seats_for_first_flight[i - 1] = 0
//         }
//         // if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] == user._id.valueOf()) {
//         //     //If the seat is previously selected by same user then update the key "is_same_user" to true
//         //     seats_details_for_first_flight[i - 1]['is_same_user'] = true
//         //     seats_details_for_first_flight[i - 1]['user_pic'] = user.profile_pic
//         //     seats_details_for_first_flight[i - 1]['user_name'] = user.fullName

//         // }
//         // if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] != user._id.valueOf()) {
//         //     other_users_ids[`${seats_details_for_first_flight[i - 1]['user_id']}`] = i - 1
//         //     seats_details_for_first_flight[i - 1]['is_same_user'] = false
//         //     seats_details_for_first_flight[i - 1]['user_pic'] = ""
//         //     seats_details_for_first_flight[i - 1]['user_name'] = ""

//         // }
//         // if (seats_details_for_first_flight[i - 1]?.['pet_id'] && seats_details_for_first_flight[i - 1]['pet_id'].length > 0) {
//         //     //Storing the seat no.
//         //     check_pet_ids[`${i}`] = seats_details_for_first_flight[i - 1]['pet_id']
//         //     //Collecting pet ids
//         //     pet_ids.push(seats_details_for_first_flight[i - 1]['pet_id'])
//         // }
//         // if (seats_details_for_first_flight[i - 1]?.['guest_id']) {
//         //     //Storing the seat no.
//         //     check_guest_ids[`${seats_details_for_first_flight[i - 1]['guest_id']}`] = i
//         //     //Collecting guest ids
//         //     guest_ids.push(seats_details_for_first_flight[i - 1]['guest_id'])

//         // }
//         if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] == user._id.valueOf() && seats_details_for_first_flight[i - 1]['booking_id']) {
//             //If the seat is previously selected by same user then update the key "is_same_user" to true
//             seats_details_for_first_flight[i - 1]['is_same_user'] = true
//             seats_details_for_first_flight[i - 1]['user_pic'] = user.profile_pic
//             seats_details_for_first_flight[i - 1]['user_name'] = user.fullName

//         }
//         if (seats_details_for_first_flight[i - 1]?.['user_id'] && seats_details_for_first_flight[i - 1]['user_id'] != user._id.valueOf() && seats_details_for_first_flight[i - 1]['booking_id']) {
//             other_users_ids[`${seats_details_for_first_flight[i - 1]['user_id']}`] = i - 1
//             seats_details_for_first_flight[i - 1]['is_same_user'] = false
//             seats_details_for_first_flight[i - 1]['user_pic'] = ""
//             seats_details_for_first_flight[i - 1]['user_name'] = ""

//         }
//         if (seats_details_for_first_flight[i - 1]?.['pet_id'] && seats_details_for_first_flight[i - 1]['pet_id'].length > 0 && seats_details_for_first_flight[i - 1]['booking_id']) {
//             //Storing the seat no.
//             check_pet_ids[`${i}`] = seats_details_for_first_flight[i - 1]['pet_id']
//             //Collecting pet ids
//             pet_ids.push(seats_details_for_first_flight[i - 1]['pet_id'])
//         }
//         if (seats_details_for_first_flight[i - 1]?.['guest_id'] && seats_details_for_first_flight[i - 1]['booking_id']) {
//             //Storing the seat no.
//             check_guest_ids[`${seats_details_for_first_flight[i - 1]['guest_id']}`] = i
//             //Collecting guest ids
//             guest_ids.push(seats_details_for_first_flight[i - 1]['guest_id'])

//         }
//     }
//     let other_users_data = await userModal.find({
//         _id: {
//             $in: Object.keys(other_users_ids)
//         }
//     })
//     other_users_data.forEach((data) => {
//         if (data.show_profile) {
//             if (other_users_ids[`${data._id.valueOf()}`])
//                 seats_details_for_first_flight[other_users_ids[`${data._id.valueOf()}`]]['user_pic'] = data.profile_pic
//             seats_details_for_first_flight[other_users_ids[`${data._id.valueOf()}`]]['user_name'] = data.fullName

//         }
//     })
//     let mergedArray = [].concat(...pet_ids);
//     let new_mergedArray = mergedArray.map((data) => mongoose.Types.ObjectId(`${data}`))

//     let pet_details = await user_pet_mapping_modal.aggregate([
//         {
//             $match: {
//                 _id: { $in: new_mergedArray }
//             }
//         },
//         {
//             $lookup: {
//                 from: "pets",
//                 localField: "pet_breed", // Assuming "pet_id" is the field in "pets" mapped from the previous stage
//                 foreignField: "_id",
//                 pipeline: [
//                     {
//                         $project: {
//                             _id: 1,
//                             breed_name: 1,
//                         }
//                     }
//                 ],
//                 as: "pet_breed"
//             }
//         }
//     ]);
//     if (pet_details) {

//         let petDetailsMap = {};

//         pet_details.forEach(pet => {
//             petDetailsMap[pet._id.toString()] = {
//                 pet_name: pet.pet_name,
//                 pet_image: pet.pet_image,
//                 type_of_pet: pet.type_of_pet,
//                 pet_breed: pet.pet_breed,
//                 pet_weight: pet.pet_weight,
//                 pet_id: pet._id,
//                 assistance_animal_proof: pet.assistance_animal_proof
//             };
//         });
//         // Update check_pet_ids with pet details
//         for (let key in check_pet_ids) {
//             let petIds = check_pet_ids[key];
//             let petDetails = petIds.map(id => petDetailsMap[id]);
//             check_pet_ids[key] = petDetails;
//         }
//         for (let i = 1; i <= 8; i++) {
//             if (check_pet_ids[`${i}`]) {
//                 seats_details_for_first_flight[i - 1]['pet_data'] = check_pet_ids[`${i}`]
//             }

//         }
//     }
//     //Find all the guests from user_guest_mapping_modal by matching id
//     let guest_details = await user_guest_mapping_modal.find({
//         _id: { $in: guest_ids }
//     })

//     if (guest_details) {
//         guest_details.map((data) => {
//             if (check_guest_ids[`${data._id}`]) {
//                 seats_details_for_first_flight[check_guest_ids[`${data._id}`] - 1]['guest_name'] = data['guest_name'] || '';
//                 seats_details_for_first_flight[check_guest_ids[`${data._id}`] - 1]['guest_phone'] = data['guest_phone'] || '';
//                 seats_details_for_first_flight[check_guest_ids[`${data._id}`] - 1]['guest_phone_code'] = data['guest_phone_code'] || '';
//             }
//         })
//     }
//     return result
// }
exports.get_seats_by_flightId = async (req, res) => {
    try {
        let user = req.payload
        let { flight_id, second_flight_id } = req.query
        //Check for the lock time condition whether it is >1 hour or not for flight_id
        await check_for_lock_time_condition(flight_id, user)
        if (second_flight_id) {
            //Check for the lock time condition whether it is >1 hour or not for second_flight_id
            await check_for_lock_time_condition(second_flight_id, user)
        }
        let result = {}
        //Getting seats data for flight_id
        result['first_flight'] = await fetch_seats_for_various_conditions(flight_id, user)

        if (second_flight_id) {
            //Getting seats data for second_flight_id
            result['second_flight'] = await fetch_seats_for_various_conditions(second_flight_id, user)

        }
        result['guest_passes'] = user.guest_passes //Getting guest passes 
        result['pet_passes'] = user.pet_passes //Getting pet passes

        return successResponse(result, "Data fetched successfully!", res)

    } catch (err) {
        console.log("err====", err.message)
        return internalServerError('Internal Server Error', res);
    }
};
// exports.get_seats_by_flightId = async (req, res) => {
//     try {
//         let user = req.payload
//         let { flight_id, second_flight_id } = req.query
//         //Check for the lock time condition whether it is >1 hour or not for flight_id
//         await check_for_lock_time_condition(flight_id, user)
//         if (second_flight_id) {
//             //Check for the lock time condition whether it is >1 hour or not for second_flight_id
//             await check_for_lock_time_condition(second_flight_id, user)
//         }
//         let result = {}
//         //Getting seats data for flight_id
//         result['first_flight'] = await fetch_seats_for_various_conditions(flight_id, user)

//         if (second_flight_id) {
//             //Getting seats data for second_flight_id
//             result['second_flight'] = await fetch_seats_for_various_conditions(second_flight_id, user)

//         }
//         result['guest_passes'] = user.guest_passes //Getting guest passes 
//         result['pet_passes'] = user.pet_passes //Getting pet passes

//         return successResponse(result, "Data fetched successfully!", res)

//     } catch (err) {
//         return internalServerError('Internal Server Error', res);
//     }
// };
exports.add_guest = async (req, res) => {
    try {
        const user = req.payload
        if (user.guest_passes == 0) {//If user has 0 guest passes then send error response
            return failMessage('User has not enough guest passes to add guests!', res)
        }
        let { guest_name, guest_phone_code, guest_phone } = req.body
        let guest_already_exists_data = []
        //Getting guests data by matching user id from user_guest_mapping_modal
        let user_in_mapping = await user_guest_mapping_modal.find({ user_id: user._id.valueOf() })
        if (user_in_mapping.length > 0) {
            let guest_already_exists = 0 //Initialize guest_already_exists flag to 0
            user_in_mapping.map((data) => {
                if (data.guest_phone_code == guest_phone_code && data.guest_phone == guest_phone) {
                    guest_already_exists = 1 //Change the value of guest_already_exists flag to 1 when guest is already exists
                    guest_already_exists_data = data
                }
            })
            if (guest_already_exists == 1) {//Send "Guest already added" response when guest_already_exists flag has value 1
                return successResponse(guest_already_exists_data, "Guest already added!", res)//***We have to add one moire check for flight_id

            }

        }

        //check valid country for twilio
        const twilioCountry = await twilioCountryModel.findOne({ country_code: guest_phone_code });
        if (!twilioCountry) {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${guest_phone_code} country code`, res)
        }
        //red mean we are not support phone code, green,blue and yellow means different sender number 
        if (twilioCountry.colour == 'red') {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${guest_phone_code} country code`, res)
        }

        //Insert the guest record in the db
        let new_guest = new user_guest_mapping_modal({
            user_id: user._id.valueOf(),
            guest_name: guest_name,
            guest_phone_code: guest_phone_code,
            guest_phone: guest_phone,

        })

        //Find the guest in user table by matching guest's phone and guest phone code
        let is_guest_verified = await userModal.findOne({
            "phone_code": new_guest.guest_phone_code,
            "phone": new_guest.guest_phone
        })
        //Check if the guest is verified user then getting the profile pic from user table
        new_guest.guest_profile_pic = is_guest_verified?.passportVerified && is_guest_verified.driverlicenseVerified
            ? is_guest_verified.profile_pic
            : '';
        new_guest.save()//Save the record in the db
        let result = {
            guest_id: new_guest._id,
            guest_name: new_guest.guest_name,
            guest_phone: new_guest.guest_phone,
            guest_phone_code: new_guest.guest_phone_code,
            guest_profile_pic: new_guest.guest_profile_pic,
            guest_passes: user.guest_passes,
            user_id: new_guest.user_id
        }

        if (req.body.booking_id) {
            await userModal.findByIdAndUpdate({ _id: req.payload._id }, {
                guest_passes: req.payload.guest_passes - 1
            })
            await transactionModal.create({
                userId: req.payload._id,
                type: "Seat for Guest",
                booking_id: req.body.booking_id,
                image: process.env.GUESTPASSLOGO,
                name: `Seat for ${new_guest.guest_name}`
            })
        }
        return successResponse(result, "Guest added successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.remove_guest = async (req, res) => {
    try {
        const user = req.payload
        let { guest_id, flight_id, booking_id } = req.body
        await user_guest_mapping_modal.deleteOne({ _id: guest_id })
        let get_flight_seat = await flight_seat_mapping.findOne({
            flight_id: flight_id
        })
        let seat_no = 0
        if (get_flight_seat) {
            for (let i = 1; i <= 8; i++) {
                if (get_flight_seat[`seat${i}_details`] && get_flight_seat[`seat${i}_details`]['user_id'] == user._id.valueOf() && get_flight_seat[`seat${i}_details`]['guest_id'] == guest_id) {
                    seat_no = i
                }
            }
        }
        if (seat_no != 0) {
            await flight_seat_mapping.findOneAndUpdate({
                flight_id: flight_id
            },
                {
                    [`seat${seat_no}`]: 0,
                    [`seat${seat_no}_details`]: {}
                })
        }
        if (booking_id) {


            await userModal.findByIdAndUpdate({ _id: req.payload._id }, {
                guest_passes: req.payload.guest_passes + 1
            })

        }
        return successResponseWithoutData("Guest removed successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.search_pet_breeds = async (req, res) => {
    try {
        const { search, pet_type } = req.query

        //Searching the name of industries using regex
        let regex = new RegExp(search, 'i');
        //Get all the industries which has name contain values coming from "search" parameter
        let result = []
        if (pet_type == 'Cat') {
            result = await petsModal.find({ breed_name: regex, pet_type: 'Cat' })
        }
        if (pet_type == 'Dog') {
            result = await petsModal.find({ breed_name: regex, pet_type: 'Dog' });
        }
        return successResponseWithPagination(result, result.length, 'Data Fetched Successfully!', res)
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.UpdatePetsMaster = async (req, res) => {
    try {
        //Removing the "\r" from all the names of industries in the database
        await petsModal.updateMany({}, [
            {
                $set: {
                    breed_name: { $trim: { input: '$breed_name', chars: '\r' } }
                }
            }
        ])
        return successResponseWithoutData('Data Updated Successfully!', res);

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.add_pet = async (req, res) => {
    try {
        const user = req.payload;
        const _id = user._id;

        const existingPets = await userModal.aggregate([
            {
                $match: { _id: _id }
            },
            {
                $lookup: {
                    from: "user_pet_mappings",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$user_id", "$$userId"] }
                            }
                        }
                    ],
                    as: "pets"
                }
            },
            {
                $project: {
                    _id: 0,
                    pets: 1
                }
            }
        ]);
        let userPetsCount = 0
        if (existingPets[0].pets.length > 0) {
            existingPets[0].pets.map((pet) => {
                if (pet.status == 'active') {
                    userPetsCount++
                }
            })
        }
        // const userPetsCount = existingPets[0].pets.length;

        if (userPetsCount >= 2) {
            return failMessage('User can add only 2 pets!', res);
        }

        let {
            pet_profile_pic = "",
            pet_type = "",
            pet_name = "",
            pet_breed = [],
            pet_weight = "",
            pet_liability_signature = "",
            assistance_animal_proof = "",
            bio = "",
            vets_name = "",
            state,
            vets_license_no = "",
            vets_license_date = "",
            rabbies_vaccine_date = "",
            rabbies_vaccine_valid_to_date = "",
            distemper_vaccine_date = "",
            distemper_vaccine_valid_to_date = "",
            gender = "",
            age = ""
        } = req.body;
        if (pet_weight > 40) {
            return failMessage("Your pet exceeds the combined weight of 40kg for us to safely transport on-board!", res);
        }
        if (pet_liability_signature) {
            let base64signature = pet_liability_signature
            const decodedData = Buffer.from(base64signature, 'base64');
            const writeStream = fs.createWriteStream('pet.pdf');

            // Create a PDF document
            const doc = new PDFDocument();
            // Add pet details to the PDF
            doc.fontSize(12).text('Pet Details:', { underline: true }).moveDown();
            doc.fontSize(10).text(`Pet Name: ${pet_name}`).moveDown();
            doc.fontSize(10).text(`Pet Type: ${pet_type}`).moveDown();
            doc.fontSize(10).text(`Pet Weight: ${pet_weight}`).moveDown();
            doc.fontSize(10).text(`Pet Gender: ${gender}`).moveDown();
            // Add more pet details as needed

            // Add signature to the PDF
            doc.text('Signature:', { underline: true }).moveDown();
            doc.image(decodedData, { fit: [500, 500] });  // Adjust width and height as needed
            doc.pipe(writeStream);

            doc.end();

            // Ensure the write stream is closed after the document is finished writing
            writeStream.on('finish', () => {
            });

            // Handle errors in case of any issues during writing
            writeStream.on('error', (err) => {
                console.error('Error writing PDF:', err);
            });
            const uploadBase64 = require("../../controllers/v1/upload")
            pet_liability_signature = await uploadBase64.uploadBase64FileToS3(base64signature)

            await mail.sendMailPetLiabilitySign({ email: req.payload.email, body: `Your pet liability signature-> ${pet_liability_signature}`, pdf: 'pet.pdf' })

        }
        let newPet = []
        if (state) {//If it is not required then e have to remove it 
            newPet = await user_pet_mapping_modal.create({
                user_id: user._id.valueOf(),
                pet_image: pet_profile_pic,
                type_of_pet: pet_type,
                pet_name,
                pet_breed,
                pet_weight,
                pet_liability_signature,
                assistance_animal_proof,
                Bio: bio,
                vets_name,
                state,
                vets_license_no,
                vets_license_date,
                rabbies_vaccine_date,
                rabbies_vaccine_valid_to_date,
                distemper_vaccine_date,
                distemper_vaccine_valid_to_date,
                gender,
                age
            });
            await transactionModal.create({
                userId: req.payload._id,
                type: "Signed",
                pet_id: newPet._id,
                image: process.env.SIGNEDPETACCEPTANCEOFLIABILITY,
                name: 'Signed Pet Acceptance of Liability'
            })
        } else {
            newPet = await user_pet_mapping_modal.create({
                user_id: user._id.valueOf(),
                pet_image: pet_profile_pic,
                type_of_pet: pet_type,
                pet_name,
                pet_breed,
                pet_weight,
                pet_liability_signature,
                assistance_animal_proof,
                Bio: bio,
                vets_name,
                vets_license_no,
                vets_license_date,
                rabbies_vaccine_date,
                rabbies_vaccine_valid_to_date,
                distemper_vaccine_date,
                distemper_vaccine_valid_to_date,
                gender,
                age
            });
            await transactionModal.create({
                userId: req.payload._id,
                type: "Signed",
                pet_id: newPet._id,
                image: process.env.SIGNEDPETACCEPTANCEOFLIABILITY,
                name: 'Signed Pet Acceptance of Liability'
            })
        }

        const petProfileComplete =
            newPet.pet_image &&
            newPet.type_of_pet &&
            newPet.pet_breed.length > 0 &&
            newPet.pet_weight &&
            newPet.pet_liability_signature &&
            newPet.gender &&
            newPet.age;

        if (petProfileComplete) {
            await user_pet_mapping_modal.findByIdAndUpdate({ _id: newPet._id }, { pet_profile_completed: true });
        }

        return successResponseWithoutData("Pet added successfully!", res);
    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};
exports.get_users_pets = async (req, res) => {
    try {
        const user = req.payload
        let users_pet = await userModal.aggregate([
            {
                $match: {
                    _id: user._id
                }
            },
            {
                $lookup:
                {
                    from: "user_pet_mappings",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$user_id", "$$userId"] },
                                status: "active"
                            }
                        },
                        {
                            $lookup: {
                                from: "pets",
                                localField: "pet_breed", // Assuming "pet_id" is the field in "pets" mapped from the previous stage
                                foreignField: "_id",
                                as: "pet_breed_data"
                            }
                        },
                        {
                            $addFields: {
                                pet_id: "$_id" // Creating aliasField2 for existingField2
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                createdAt: 0,
                                updatedAt: 0,
                                user_id: 0,
                                pet_breed: 0,
                            }
                        },

                    ],
                    as: "pets"
                }
            },
            {
                $addFields: {
                    user_id: "$_id" // Creating aliasField2 for existingField2
                },
            },
            {
                $project: {
                    _id: 0,
                    pet_passes: 1,
                    pets: 1,
                    user_id: 1,

                }
            }
        ]);
        let state_ids = [], state_obj = {}
        users_pet[0]['pets'].map((data) => {
            state_ids.push(data.state)
            state_obj[`${data.state}`] = data.pet_id
        })
        let get_states_data = await state_modal.find({
            _id: {
                $in: state_ids
            }
        })
        if (get_states_data) {
            get_states_data.map((data) => {
                if (state_obj[`${data._id}`]) {
                    state_obj[`${data._id}`] = data.state_name
                }
            })
        }
        users_pet[0]['pets'].forEach((data) => {
            if (state_obj[`${data.state}`]) {
                data.state = {
                    state_id: data.state,
                    state_name: state_obj[`${data.state}`]
                }
            }
        })
        return successResponse(users_pet, "Data fetched successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.edit_pet = async (req, res) => {
    try {
        let users_pet = await user_pet_mapping_modal.findOne({ _id: req.body.pet_id, status: "active" })
        if (!users_pet) {
            return failMessage("No pet found", res)

        }
        let {
            pet_id,
            pet_profile_pic = users_pet.pet_profile_pic,
            pet_type = users_pet.pet_type,
            pet_name = users_pet.pet_name,
            pet_breed = users_pet.pet_breed,
            pet_weight,
            pet_liability_signature = "",
            assistance_animal_proof = users_pet.assistance_animal_proof,
            bio = users_pet.bio,
            vets_name = users_pet.vets_name,
            state = users_pet.state,
            vets_license_no = users_pet.vets_license_no,
            vets_license_date = users_pet.vets_license_date,
            rabbies_vaccine_date = users_pet.rabbies_vaccine_date,
            rabbies_vaccine_valid_to_date = users_pet.rabbies_vaccine_valid_to_date,
            distemper_vaccine_date = users_pet.distemper_vaccine_date,
            distemper_vaccine_valid_to_date = users_pet.distemper_vaccine_valid_to_date,
            gender = users_pet.gender,
            age = users_pet.pet

        } = req.body
        if (pet_liability_signature) {
            let base64signature = pet_liability_signature
            const decodedData = Buffer.from(base64signature, 'base64');
            const writeStream = fs.createWriteStream('pet.pdf');

            // Create a PDF document
            const doc = new PDFDocument();
            doc.rect(0, 0, doc.page.width, doc.page.height).fill('black');
            // Pipe the image buffer to the PDF document
            doc.image(decodedData, { fit: [500, 500] });  // Adjust width and height as needed
            doc.pipe(writeStream);

            doc.end()
            // Ensure the write stream is closed after the document is finished writing
            writeStream.on('finish', () => {
            });

            // Handle errors in case of any issues during writing
            writeStream.on('error', (err) => {
                console.error('Error writing PDF:', err);
            });
            const uploadBase64 = require("../../controllers/v1/upload")
            pet_liability_signature = await uploadBase64.uploadBase64FileToS3(base64signature)

            await mail.sendMailPetLiabilitySign({ email: req.payload.email, body: `Your pet liability signature-> ${pet_liability_signature}`, pdf: 'pet.pdf' })

        } else {
            pet_liability_signature = users_pet.pet_liability_signature
        }
        if (pet_weight) {
            if (pet_weight > 40) {//If pet weight is >40kg 
                return failMessage("Your pet exceeds the combined weight of 40kg for us to safely transport on-board!", res)
            }

        }
        if (!pet_weight) {
            pet_weight = users_pet.pet_weight
        }
        let edit_users_pet = await user_pet_mapping_modal.findByIdAndUpdate({ _id: pet_id, status: "active" }, {
            pet_image: pet_profile_pic,
            type_of_pet: pet_type,
            pet_name: pet_name,
            pet_breed: pet_breed,
            pet_weight: pet_weight,
            pet_liability_signature: pet_liability_signature,
            assistance_animal_proof,
            Bio: bio,
            vets_name,
            state,
            vets_license_no,
            vets_license_date,
            rabbies_vaccine_date,
            rabbies_vaccine_valid_to_date,
            distemper_vaccine_date,
            distemper_vaccine_valid_to_date,
            gender,
            age

        }, {
            new: true
        })

        const petProfileComplete =
            edit_users_pet.pet_image &&
            edit_users_pet.type_of_pet &&
            edit_users_pet.pet_breed.length > 0 &&
            edit_users_pet.pet_weight &&
            edit_users_pet.pet_liability_signature &&
            edit_users_pet.gender &&
            edit_users_pet.age;
        if (petProfileComplete) {
            await user_pet_mapping_modal.findByIdAndUpdate({ _id: pet_id }, {
                pet_profile_completed: true
            })
        }
        return successResponseWithoutData("Pet updated successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
//It is not used in latest code (not in lock_seat) 
exports.lock_seat = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let user = req.payload
        let {
            add_seat_no,
            remove_seat_no,
            flight_id,
            guest_id = "",
            pet_id = [],

        } = req.body

        if (pet_id && pet_id.length > 2) {
            return customResponse('User cannot add more than 2 pets!', res)
        }
        if (remove_seat_no == 0) {
            if (guest_id) {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": startDate.getTime(),
                        "guest_id": guest_id,
                        "pet_request_accepted": 1
                    }
                })
            }
            else if (pet_id.length > 0) {
                let pet_data = await user_pet_mapping_modal.find({
                    _id: {
                        $in: pet_id
                    }
                })
                let addSeatNo = 4;
                if (pet_data.length > 0) {
                    if (pet_data.length <= 1) {
                        pet_data.forEach((data) => {
                            if (Number(data.pet_weight) <= 9) {
                                addSeatNo = 3
                            }
                        })
                    }

                }
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: addSeatNo,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": startDate.getTime(),
                        "pet_id": pet_id,
                        "pet_request_accepted": 1
                    }
                })
            } else {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": startDate.getTime(),
                        "pet_request_accepted": 1
                    }
                })
            }

        } else if (guest_id) {
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                [`seat${add_seat_no}`]: 1,
                [`seat${remove_seat_no}`]: 0,
                [`seat${add_seat_no}_details`]: {
                    "user_id": user._id,
                    "lock_date_time": startDate.getTime(),
                    "guest_id": guest_id,
                    "pet_request_accepted": 1
                },
                [`seat${remove_seat_no}_details`]: null
            })
        } else if (pet_id.length > 0) {
            let pet_data = await user_pet_mapping_modal.find({
                _id: {
                    $in: pet_id
                }
            })
            let addSeatNo = 4;
            if (pet_data.length > 0 && pet_data.length <= 2) {
                if (pet_data.length <= 1) {
                    pet_data.forEach((data) => {
                        if (Number(data.pet_weight) <= 9) {
                            addSeatNo = 3
                        }
                    })
                }
            }
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                [`seat${add_seat_no}`]: addSeatNo,
                [`seat${remove_seat_no}`]: 0,
                [`seat${add_seat_no}_details`]: {
                    "user_id": user._id,
                    "lock_date_time": startDate.getTime(),
                    "pet_id": pet_id,
                    "pet_request_accepted": 1
                },
                [`seat${remove_seat_no}_details`]: null
            })
        } else {
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                [`seat${add_seat_no}`]: 1,
                [`seat${remove_seat_no}`]: 0,
                [`seat${add_seat_no}_details`]: {
                    "user_id": user._id,
                    "lock_date_time": startDate.getTime(),
                    "pet_request_accepted": 1
                },
                [`seat${remove_seat_no}_details`]: null
            })
        }

        // setTimeout(async () => {
        //     try {
        //         let flight = await flight_seat_mapping.findOne({ flight_id, status: "active" });
        //         if (flight) {
        //             if (flight[`seat${add_seat_no}_details`] && !flight[`seat${add_seat_no}_details`].booking_id) {
        //                 await flight_seat_mapping.findOneAndUpdate({ flight_id, status: "active" }, {
        //                     [`seat${add_seat_no}`]: 0,
        //                     [`seat${add_seat_no}_details`]: null
        //                 })
        //             }
        //         }

        //     } catch (err) {
        //         console.error("Error in setTimeout:", err);
        //     }
        // }, 5 * 60 * 1000); // 5 minutes in milliseconds

        return successResponseWithoutData("Seat selection successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.lock_seatv2 = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let user = req.payload
        let {
            add_seat_no,
            remove_seat_no,
            flight_id,
            guest_id = "",
            pet_id = [],

        } = req.body

        if (pet_id && pet_id.length > 2) {
            return customResponse('User cannot add more than 2 pets!', res)
        }
        let checkForOtherUser = await flight_seat_mapping.findOne({ flight_id })
        if (checkForOtherUser && checkForOtherUser[`seat${add_seat_no}`] && checkForOtherUser[`seat${add_seat_no}_details`] && checkForOtherUser[`seat${add_seat_no}_details`].user_id && checkForOtherUser[`seat${add_seat_no}_details`].user_id.valueOf() != req.payload._id) {
            return Forbidden("Oops!  Someone else snagged the seats you wanted just a moment ago.  Could you please select an alternative seating option? We're sorry for the inconvenience!", res)

        }
        function setLongTimeOut(callback, timeout) {
            const maxDelay = 2 ** 31 - 1;
            if (timeout > maxDelay) {
                let expectedTick = Math.ceil(timeout / maxDelay);
                const id = setInterval(() => {
                    if (!--expectedTick) {
                        callback();
                        clearInterval(id);
                    }
                }, timeout / expectedTick);
                return id;
            }
            return setTimeout(callback, timeout);
        }
        const timeoutId = setLongTimeOut(async () => {
            try {
                let flight = await flight_seat_mapping.findOne({ flight_id, status: "active" });
                if (flight) {
                    if (flight[`seat${add_seat_no}_details`] && !flight[`seat${add_seat_no}_details`].booking_id) {
                        await flight_seat_mapping.findOneAndUpdate({ flight_id, status: "active" }, {
                            [`seat${add_seat_no}`]: 0,
                            [`seat${add_seat_no}_details`]: null
                        });
                    }
                }
            } catch (err) {
                console.error("Error in setTimeout:", err);
            }
        }, 3 * 60 * 1000); // 3 minutes in milliseconds
        if (remove_seat_no == 0) {
            if (guest_id) {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": mongoose.Types.ObjectId(user._id),
                        "lock_date_time": startDate.getTime(),
                        "guest_id": guest_id,
                        "pet_request_accepted": 1,

                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId
                })
            }
            else if (pet_id.length > 0) {
                let pet_data = await user_pet_mapping_modal.find({
                    _id: {
                        $in: pet_id
                    }
                })
                let addSeatNo = 4;
                if (pet_data.length > 0) {
                    if (pet_data.length <= 1) {
                        pet_data.forEach((data) => {
                            if (Number(data.pet_weight) <= 9) {
                                addSeatNo = 3
                            }
                        })
                    }

                }
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: addSeatNo,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": mongoose.Types.ObjectId(user._id),
                        "lock_date_time": startDate.getTime(),
                        "pet_id": pet_id,
                        "pet_request_accepted": 1,

                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId

                })
            } else {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": mongoose.Types.ObjectId(user._id),
                        "lock_date_time": startDate.getTime(),
                        "pet_request_accepted": 1,

                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId

                })
            }

        } else if (guest_id) {
            let updatedObj = {
                [`seat${remove_seat_no}_details`]: null,
                [`seat${remove_seat_no}`]: 0,

            }
            if (add_seat_no != 0) {
                updatedObj = {
                    ...updatedObj,
                    [`seat${add_seat_no}`]: 1,
                    // [`seat${remove_seat_no}`]: 0,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": mongoose.Types.ObjectId(user._id),
                        "lock_date_time": startDate.getTime(),
                        "guest_id": guest_id,
                        "pet_request_accepted": 1,


                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId,

                }
            }
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, updatedObj)
        } else if (pet_id.length > 0) {
            let pet_data = await user_pet_mapping_modal.find({
                _id: {
                    $in: pet_id
                }
            })
            let addSeatNo = 4;
            if (pet_data.length > 0 && pet_data.length <= 2) {
                if (pet_data.length <= 1) {
                    pet_data.forEach((data) => {
                        if (Number(data.pet_weight) <= 9) {
                            addSeatNo = 3
                        }
                    })
                }
            }
            let updatedObj = {
                [`seat${remove_seat_no}_details`]: null,
                [`seat${remove_seat_no}`]: 0,

            }
            if (add_seat_no != 0) {
                updatedObj = {
                    ...updatedObj,
                    [`seat${add_seat_no}`]: addSeatNo,
                    // [`seat${remove_seat_no}`]: 0,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": mongoose.Types.ObjectId(user._id),
                        "lock_date_time": startDate.getTime(),
                        "pet_id": pet_id,
                        "pet_request_accepted": 1,


                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId,

                }
            }
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, updatedObj)
        } else {
            let updatedObj = {
                [`seat${remove_seat_no}_details`]: null,
                [`seat${remove_seat_no}`]: 0,

            }
            if (add_seat_no != 0) {
                updatedObj = {
                    ...updatedObj,
                    [`seat${add_seat_no}`]: 1,
                    // [`seat${remove_seat_no}`]: 0,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": mongoose.Types.ObjectId(user._id),
                        "lock_date_time": startDate.getTime(),
                        "pet_request_accepted": 1,


                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId,

                }
            }
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, updatedObj)
        }


        return successResponseWithoutData("Seat selection successfully!", res)

    } catch (err) {
        console.log("err=", err.message)
        return internalServerError('Internal Server Error', res);
    }
};
async function timeoutFunction(flight_id, user, type, booking_id) {
    let flight = await flight_seat_mapping.findOne({ flight_id, status: "active" });
    if (!flight) return failMessage('No flight found!', res)

    let updateSeat = {}, seat_no = [], updateTimeOut = {}
    if (type == 1) {
        for (let i = 1; i <= 8; i++) {
            if (flight[`seat${i}`] && flight[`seat${i}_details`] && flight[`seat${i}_details`].user_id && flight[`seat${i}_details`].user_id.valueOf() == user._id && flight[`seat${i}_timeoutId`] && !flight[`seat${i}_details`].booking_id) {
                updateSeat[`seat${i}`] = 0
                updateSeat[`seat${i}_details`] = null
                seat_no.push(i)
                clearTimeout(flight[`seat${i}_timeoutId`]);

            }
        }
        let timeoutId = setTimeout(async () => {
            try {
                // if (flight) {
                // if (flight[`seat${add_seat_no}_details`] && !flight[`seat${add_seat_no}_details`].booking_id) {
                await flight_seat_mapping.findOneAndUpdate({ flight_id, status: "active" }, updateSeat)
                // }
                // }

            } catch (err) {
                console.error("Error in setTimeout:", err);
            }
        }, 3 * 60 * 1000); // 3 minutes in milliseconds
        for (let i = 0; i < seat_no.length; i++) {
            updateTimeOut[`seat${seat_no[i]}_timeoutId`] = timeoutId
        }
    } else if (type == 2) {
        for (let i = 1; i <= 8; i++) {
            if (flight[`seat${i}`] && flight[`seat${i}_details`] && flight[`seat${i}_details`].user_id && flight[`seat${i}_details`].user_id.valueOf() == user._id && flight[`seat${i}_timeoutId`] && flight[`seat${i}_details`].booking_id && flight[`seat${i}_details`].isLocked) {
                updateSeat[`seat${i}`] = 0
                updateSeat[`seat${i}_details`] = null
                seat_no.push(i)
                clearTimeout(flight[`seat${i}_timeoutId`]);

            }
            if (flight[`seat${i}_details`] && flight[`seat${i}_details`].booking_id && flight[`seat${i}_details`].booking_id == booking_id && flight[`seat${i}_details`].user_id && flight[`seat${i}_details`].user_id.valueOf() == user._id && flight[`seat${i}_timeoutId`]) {
                updateSeat[`seat${i}_details.preserve`] = false
                seat_no.push(i)
                clearTimeout(flight[`seat${i}_timeoutId`]);
            }
        }
        let timeoutId = setTimeout(async () => {
            try {
                await flight_seat_mapping.findOneAndUpdate({ flight_id, status: "active" }, updateSeat)


            } catch (err) {
                console.error("Error in setTimeout:", err);
            }
        }, 3 * 60 * 1000); // 3 minutes in milliseconds
        for (let i = 0; i < seat_no.length; i++) {
            updateTimeOut[`seat${seat_no[i]}_timeoutId`] = timeoutId
        }
    }

    await flight_seat_mapping.findOneAndUpdate({ flight_id, status: "active" }, updateTimeOut)


}
exports.heartBeat = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let user = req.payload
        let flight_id = req.query.flight_id
        let Sflight_id = req.query.Sflight_id
        let booking_id = req.query.booking_id
        let type = req.query.type
        await timeoutFunction(flight_id, user, type, booking_id)
        if (Sflight_id) {
            await timeoutFunction(Sflight_id, user, type, booking_id)

        }


        return successResponseWithoutData("Seat selection successfully!", res)

    } catch (err) {
        console.log("err=", err.message)
        return internalServerError('Internal Server Error', res);
    }
};
exports.get_states = async (req, res) => {
    try {
        let get_state_data = await state_modal.find({})

        return successResponse(get_state_data, "Data fetched successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.get_pet_data = async (req, res) => {
    try {
        let pet_ids = req.body.pet_ids
        let get_pet_data = await user_pet_mapping_modal.find({
            _id: {
                $in: pet_ids
            },
            status: "active"
        })

        return successResponse(get_pet_data, "Data fetched successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.delete_pet = async (req, res) => {
    try {
        let pet_id = req.query.pet_id
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
        let petExists = false
        let usersBooking = await booking_modal.aggregate([
            {
                $match: {
                    user_id: mongoose.Types.ObjectId(req.payload._id),
                    status: "active",
                    booking_status: { $ne: "canceled" },
                    is_demo: checkDemoSettings ? true : false
                }
            },
            {
                $lookup: {
                    from: 'flights',
                    let: { item_id: '$flight_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$item_id"] },
                                status: "active"
                            }
                        },
                        {
                            $lookup: {
                                from: "flight_seats_mappings",
                                let: { fromCityId: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$flight_id", "$$fromCityId"] }
                                        }
                                    }
                                ],
                                as: "flight_seat",
                            }
                        },

                    ],
                    as: 'flight_data'
                }
            },
            {
                $unwind: "$flight_data"
            },
            {
                $addFields: {
                    combined_takeoff_datetime: {
                        $toDate: {
                            $concat: [
                                { $dateToString: { format: "%Y-%m-%d", date: "$flight_data.flight_takeoff_date" } },
                                "T",
                                "$flight_data.takeoff_time"
                            ]
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: ["$combined_takeoff_datetime", startDate] }
                        ]
                    }
                }
            },
            {
                $project: {
                    "flight_data.flight_seat": 1
                }
            }

        ])
        if (usersBooking && usersBooking.length > 0) {
            for (const flight of usersBooking) {
                if (flight.flight_data?.flight_seat) {
                    for (let i = 1; i <= 8; i++) {
                        if (
                            flight.flight_data.flight_seat[0][`seat${i}`] &&
                            flight.flight_data.flight_seat[0][`seat${i}_details`] &&
                            flight.flight_data.flight_seat[0][`seat${i}_details`].booking_id &&
                            flight.flight_data.flight_seat[0][`seat${i}_details`].booking_id.valueOf() == flight._id &&
                            flight.flight_data.flight_seat[0][`seat${i}_details`].pet_id &&
                            flight.flight_data.flight_seat[0][`seat${i}_details`].pet_id.length > 0 &&
                            flight.flight_data.flight_seat[0][`seat${i}_details`].pet_id.includes(pet_id)
                        ) {
                            petExists = true
                            break;
                        }
                    }
                }
            }
        }
        if (petExists) {
            return failMessage('Oops! There is booking for the pet. Please try after your trip!', res)
        }
        let delete_pet = await user_pet_mapping_modal.update({
            _id: pet_id
        }, {
            status: "inactive"
        })

        return successResponse(delete_pet, "Data deleted successfully!", res)

    } catch (err) {
        console.log("err=", err.message)
        return internalServerError('Internal Server Error', res);
    }
};

async function flight_summary_data(flight_id, user, users_petPasses, deduct_pet_passes) {
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setHours(startDate.getHours() + 10);
    // startDate.setMinutes(startDate.getMinutes() + 30);
    let guest_count = 0, pet_count = 0, anyseat_booked = false
    let pet_price_with_gst = ""
    let user_id = user._id
    const FlightObjectId = mongoose.Types.ObjectId(flight_id);
    let guest_ids = [], pet_ids = []
    let guest_seat_obj = {}, pet_seat_obj = {}
    let flight_data = await flightModal.aggregate([
        {
            $match: {
                _id: FlightObjectId,

            }
        },
        {
            $lookup: {
                from: "flight_seats_mappings",
                let: { flightID: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$flight_id", "$$flightID"] }
                        }
                    },

                ],
                as: "flight_seat_data",
            }
        },
        {
            $lookup: {
                from: "routes",
                let: { fromCityId: "$route" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$fromCityId"] }
                        }
                    },
                    {
                        $lookup: {
                            from: "locations",
                            let: { fromCityId: "$fromCity" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        city_name: 1,
                                        airport_abbreviation: 1,
                                        image: 1
                                    }
                                }
                            ],
                            as: "from_airport_abb",
                        }
                    },
                    {
                        $lookup: {
                            from: "locations",
                            let: { fromCityId: "$toCity" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        city_name: 1,
                                        airport_abbreviation: 1,
                                        image: 1
                                    }
                                }
                            ],
                            as: "to_airport_abb",
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            to_airport_abb: 1,
                            from_airport_abb: 1
                        }
                    }
                ],
                as: "route",
            }
        },
        {
            $lookup: {
                from: "pilots",
                let: { pilotId: "$pilot" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$pilotId"] }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            first_name: 1,
                            last_name: 1,
                            Photo: 1
                        }
                    }
                ],
                as: "pilot"
            }
        },
        {
            $lookup: {
                from: "pilots",
                let: { pilotId: "$copilot" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$pilotId"] }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            first_name: 1,
                            last_name: 1,
                            Photo: 1
                        }
                    }
                ],
                as: "copilot"
            }
        },
    ]);
    let user_data = []
    let petDetailsMap = {}, two_pets = false
    if (flight_data[0]['flight_seat_data']) {
        let isPetOnboarded = false
        flight_data[0]['to_airport_abb'] = flight_data[0]['route'][0].to_airport_abb
        flight_data[0]['from_airport_abb'] = flight_data[0]['route'][0].from_airport_abb
        delete flight_data[0]['route']
        for (let i = 1; i <= 8; i++) {
            if (flight_data[0]['flight_seat_data'][0][`seat${i}`] && flight_data[0]['flight_seat_data'][0][`seat${i}_details`] && flight_data[0]['flight_seat_data'][0][`seat${i}_details`].booking_id && flight_data[0]['flight_seat_data'][0][`seat${i}_details`].pet_id) {
                isPetOnboarded = true
            }
            if (flight_data[0]['flight_seat_data'][0][`seat${i}_details`]?.booking_id) {
                anyseat_booked = true
            }


            if (flight_data[0]['flight_seat_data'][0][`seat${i}_details`] && flight_data[0]['flight_seat_data'][0][`seat${i}_details`]['user_id'] == user_id.valueOf() && !flight_data[0]['flight_seat_data'][0][`seat${i}_details`].booking_id) {

                flight_data[0]['flight_seat_data'][0][`seat${i}_details`].user_name = user.fullName
                if (flight_data[0]['flight_seat_data'][0][`seat${i}_details`].guest_id) {
                    guest_ids.push(flight_data[0]['flight_seat_data'][0][`seat${i}_details`].guest_id)
                    guest_seat_obj[`${flight_data[0]['flight_seat_data'][0][`seat${i}_details`].guest_id}`] = i
                    guest_count++
                }
                if (flight_data[0]['flight_seat_data'][0][`seat${i}_details`].pet_id && flight_data[0]['flight_seat_data'][0][`seat${i}_details`].pet_id.length > 0) {
                    pet_ids.push(flight_data[0]['flight_seat_data'][0][`seat${i}_details`].pet_id)
                    pet_seat_obj[`${i}`] = flight_data[0]['flight_seat_data'][0][`seat${i}_details`].pet_id
                    if (flight_data[0]['flight_seat_data'][0][`seat${i}_details`].pet_id.length > 1) two_pets = true
                    pet_count++
                }
            }
        }
        flight_data[0]['pet_on_board'] = isPetOnboarded

        let guest_data = await user_guest_mapping_modal.find({
            _id: {
                $in: guest_ids
            }
        })
        let mergedArray = [].concat(...pet_ids);

        let pet_data = await user_pet_mapping_modal.find({
            _id: {
                $in: mergedArray
            }
        })
        if (pet_data) {

            pet_data.forEach(pet => {
                petDetailsMap[pet._id.toString()] = {
                    pet_name: pet.pet_name,
                    pet_image: pet.pet_image,
                    type_of_pet: pet.type_of_pet,
                    pet_breed: pet.pet_breed,
                    pet_weight: pet.pet_weight,
                    pet_id: pet._id,
                    assistance_animal_proof: pet.assistance_animal_proof

                };
            });

            // Update check_pet_ids with pet details
            for (let key in pet_seat_obj) {
                let petIds = pet_seat_obj[key];
                let petDetails = petIds.map(id => petDetailsMap[id]);
                pet_seat_obj[key] = petDetails;
            }

        }
        if (guest_data) {
            guest_data.map((data) => {
                if (guest_seat_obj[`${data._id.valueOf()}`]) {
                    guest_seat_obj[`${data._id.valueOf()}`] = {
                        guest_profile_pic: data.guest_profile_pic,
                        guest_name: data.guest_name,
                        guest_phone_code: data.guest_phone_code,
                        guest_phone: data.guest_phone
                    }
                }
            })
        }
        for (let i = 1; i <= 8; i++) {
            if (flight_data[0]['flight_seat_data'][0][`seat${i}_details`] && flight_data[0]['flight_seat_data'][0][`seat${i}_details`]['user_id'] == user._id.valueOf() && !flight_data[0]['flight_seat_data'][0][`seat${i}_details`].booking_id) {
                flight_data[0]['flight_seat_data'][0][`seat${i}_details`]['seat_no'] = i
                if (guest_seat_obj[`${flight_data[0]['flight_seat_data'][0][`seat${i}_details`].guest_id}`]) {
                    flight_data[0]['flight_seat_data'][0][`seat${i}_details`]['guest_data'] = guest_seat_obj[`${flight_data[0]['flight_seat_data'][0][`seat${i}_details`].guest_id}`]

                }
                if (pet_seat_obj[`${i}`]) {
                    flight_data[0]['flight_seat_data'][0][`seat${i}_details`]['pet_data'] = pet_seat_obj[`${i}`]

                }
                user_data.push(flight_data[0]['flight_seat_data'][0][`seat${i}_details`])

            }
        }
    }

    flight_data[0]['pilot'][0]['full_name'] = flight_data?.[0]?.['pilot']?.[0]?.['first_name'] + ' ' + flight_data?.[0]?.['pilot']?.[0]?.['last_name'],
        flight_data[0]['copilot'][0]['full_name'] = flight_data?.[0]?.['copilot']?.[0]?.['first_name'] + ' ' + flight_data?.[0]?.['copilot']?.[0]?.['last_name'],

        flight_data[0]['flight_seat_data'] = user_data
    flight_data[0]['pet_passes'] = user.pet_passes
    flight_data[0]['guest_passes'] = user.guest_passes
    flight_data[0]['is_booking_confirmed'] = false
    flight_data[0]['booking_request_submitted'] = false
    flight_data[0]['upgrade_membership_pop_up'] = false
    flight_data[0]['is_member_seat'] = false
    flight_data[0]['is_only_guest_seat'] = false
    flight_data[0]['is_only_pet_seat'] = false
    flight_data[0]['is_guest_and_pet_seat'] = false
    flight_data[0]['is_pet_on_lap'] = false
    flight_data[0]['anyseat_booked'] = anyseat_booked

    let user_membership = await userMembershipModal.findOne({ user_id: user._id, status: "active" })
    if (guest_count == 0) {//For member seat only
        if (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0) {
            flight_data[0]['is_booking_confirmed'] = true
        } else if (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) <= 0) {
            flight_data[0]['is_booking_confirmed'] = false
        } else if (user_membership && user_membership.type && user_membership.type == 2) {
            flight_data[0]['is_booking_confirmed'] = true
        }
        let pet_on_lap;
        if (!two_pets && pet_count) {//check for pet weight is smaller than 9 kg
            Object.values(petDetailsMap).forEach((data) => {
                if (Number(data.pet_weight) <= 9)//pet weight <9
                {
                    pet_on_lap = data
                    pet_count--
                }
            })
            if (pet_on_lap) {

                flight_data[0]['is_pet_on_lap'] = true

            } else {
                flight_data[0]['is_member_seat'] = true
            }
        } else {
            flight_data[0]['is_member_seat'] = true
        }



    }
    if (guest_count && pet_count == 0) {//For only guest seat
        if (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0) {
            flight_data[0]['is_booking_confirmed'] = true

        } else if (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) <= 0) {
            flight_data[0]['is_booking_confirmed'] = false
        }
        else if (user_membership && user_membership.type && user_membership.type == 2) {
            flight_data[0]['is_booking_confirmed'] = true
        }
        flight_data[0]['is_only_guest_seat'] = true

    }
    if (guest_count == 0 && pet_count) {//FOR PET SEAT ONLY
        if (users_petPasses == 0 || (users_petPasses == 1 && pet_count == 2)) {
            let pet_price = await items_modal.aggregate([
                {
                    $match: {
                        name: "Pet pass",
                    }
                },
                {
                    $lookup: {
                        from: "prices",
                        let: { priceID: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$items", "$$priceID"] },
                                    effectiveDate: {
                                        $lte: startDate
                                    },
                                    status: "active",
                                    $or: [
                                        { effectiveEndDate: null },
                                        { effectiveEndDate: { $gt: currentDate } }
                                    ]
                                }
                            },
                            {
                                $sort: {
                                    effectiveDate: -1
                                }
                            },
                            { $limit: 1 }
                        ],
                        as: "prices",
                    }
                }
            ]);
            if (pet_price[0]?.['prices']) {
                let gst = pet_price[0].gst
                if (pet_price[0]['prices'][0]) {
                    pet_price_with_gst = Number(pet_price[0]['prices'][0].price) + (Number(pet_price[0]['prices'][0].price) * Number(gst) / 100)

                }
            }
            //if admin enable the flash sale then apply the discounted price
            if (pet_price) {
                if (pet_price[0].flash_sale && pet_price[0].sale_start_date_time && pet_price[0].sale_start_date_time <= new Date() && pet_price[0].sale_end_date_time && pet_price[0].sale_end_date_time >= new Date()) {
                    let gst = pet_price[0].gst

                    pet_price_with_gst = Number(pet_price[0].discount_price) + (Number(pet_price[0].discount_price) * Number(gst) / 100)


                }
            }

            flight_data[0]['pet_price_with_gst'] = pet_price_with_gst
            if (users_petPasses == 1 && pet_count == 2) flight_data[0]['Total_pet_price_with_gst'] = pet_price_with_gst
            else flight_data[0]['Total_pet_price_with_gst'] = pet_price_with_gst * pet_count
        }
        if (users_petPasses == 1 && pet_count == 2) {
            users_petPasses--
            deduct_pet_passes++
        }
        else if (users_petPasses >= 1) {
            users_petPasses = users_petPasses - pet_count
            deduct_pet_passes += pet_count
        }

        if (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0) {
            flight_data[0]['booking_request_submitted'] = true

        }
        flight_data[0]['is_booking_confirmed'] = false
        flight_data[0]['is_only_pet_seat'] = true

    }
    if (guest_count && pet_count) {//FOR PET AND GUEST SEAT BOTH
        flight_data[0]['is_guest_and_pet_seat'] = true
        if ((users_petPasses == 0 || (users_petPasses == 1 && pet_count == 2))) {
            let pet_price = await items_modal.aggregate([
                {
                    $match: {
                        name: "Pet pass",
                    }
                },
                {
                    $lookup: {
                        from: "prices",
                        let: { priceID: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$items", "$$priceID"] },
                                    effectiveDate: {
                                        $lte: startDate
                                    },
                                    status: "active",
                                    $or: [
                                        { effectiveEndDate: null },
                                        { effectiveEndDate: { $gt: currentDate } }
                                    ]
                                }
                            },
                            {
                                $sort: {
                                    effectiveDate: -1
                                }
                            },
                            { $limit: 1 }
                        ],
                        as: "prices",
                    }
                }
            ]);
            if (pet_price[0]?.['prices']) {
                let gst = pet_price[0].gst
                if (pet_price[0]['prices'][0]) {
                    pet_price_with_gst = Number(pet_price[0]['prices'][0].price) + (Number(pet_price[0]['prices'][0].price) * Number(gst) / 100)

                }
            }
            //if admin enable the flash sale then apply the discounted price
            if (pet_price) {
                if (pet_price[0].flash_sale && pet_price[0].sale_start_date_time && pet_price[0].sale_start_date_time <= startDate && pet_price[0].sale_end_date_time && pet_price[0].sale_end_date_time >= startDate) {
                    let gst = pet_price[0].gst
                    pet_price_with_gst = Number(pet_price[0].discount_price) + (Number(pet_price[0].discount_price) * Number(gst) / 100)
                }
            }

            flight_data[0]['pet_price_with_gst'] = pet_price_with_gst
            if (users_petPasses == 1 && pet_count == 2) flight_data[0]['Total_pet_price_with_gst'] = pet_price_with_gst
            else flight_data[0]['Total_pet_price_with_gst'] = pet_price_with_gst * pet_count

        }
        if (users_petPasses == 1 && pet_count == 2) {
            users_petPasses--
            deduct_pet_passes++
        }
        else if (users_petPasses >= 1) {
            users_petPasses = users_petPasses - pet_count
            deduct_pet_passes += pet_count
        }

        if (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0) {
            flight_data[0]['booking_request_submitted'] = true

        }
        flight_data[0]['is_booking_confirmed'] = false
    }

    return { flight_data, users_petPasses, deduct_pet_passes, pet_price_with_gst, anyseat_booked, pet_count }
}
exports.booking_summary = async (req, res) => {
    try {
        let user = req.payload
        let flight_id = req.query.flight_id
        let flight_exists = await flightModal.findOne({ _id: flight_id, status: "active" })
        if (!flight_exists) return failMessage('Invalid flight!', res)
        let total_pet_price = 0
        let second_flight_id = req.query.second_flight_id ? req.query.second_flight_id : ""
        if (second_flight_id) {
            flight_exists = await flightModal.findOne({ _id: second_flight_id, status: "active" })
            if (!flight_exists) return failMessage('Invalid flight!', res)
        }

        let users_petPasses = req.payload.pet_passes, deduct_pet_passes = 0
        let first_flight_data = await flight_summary_data(flight_id, user, users_petPasses, deduct_pet_passes)
        let second_flight_data = []
        deduct_pet_passes = first_flight_data.pet_count
        total_pet_price = first_flight_data.pet_price_with_gst ? Number(first_flight_data.pet_price_with_gst) : 0
        let is_user_membership = true, upgrade_membership_pop_up = false

        let user_membership = await userMembershipModal.findOne({ user_id: user._id, status: "active" })
        if (!user_membership) is_user_membership = false
        if (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) <= 0) {
            upgrade_membership_pop_up = true
        }
        if (second_flight_id) {
            second_flight_data = await flight_summary_data(second_flight_id, user, first_flight_data.users_petPasses, first_flight_data.deduct_pet_passes)
            deduct_pet_passes = second_flight_data.pet_count
            total_pet_price += second_flight_data.pet_price_with_gst ? Number(second_flight_data.pet_price_with_gst) : 0
            //if user has only 1 reusable booking and wanted to book 2 flights then upgrade membership pop up should show
            if (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) == 1) {
                upgrade_membership_pop_up = true
            }
        }

        let membership_id, name, price

        let upgrade_membership_id = await userMembershipModal
            .find({ user_id: req.payload._id.valueOf(), status: "active" },
                { _id: 0 }
            )
            .sort({ createdAt: -1 })
            .limit(1);

        // let upgrade_membership_id=await membershipModal.findOne({name:"Unlimited Elite",status:"active"})
        if (upgrade_membership_id && upgrade_membership_id.length > 0) {
            membership_id = upgrade_membership_id?.[0]?.membership_id,
                name = upgrade_membership_id?.[0]?.name,
                price = upgrade_membership_id[0].changed_price ? upgrade_membership_id[0].changed_price : upgrade_membership_id[0].price
        }

        if (first_flight_data.flight_data[0].flight_seat_data.length == 0 || (second_flight_id && second_flight_data.flight_data[0].flight_seat_data.length == 0)) {
            return Forbidden("Oops!  Someone else snagged the seats you wanted just a moment ago.  Could you please select an alternative seating option? We're sorry for the inconvenience!", res)
        }
        let membership_settings_model = await membership_settings.findOne({ status: "active" })
        let show_activate_membership_button = false
        if (membership_settings_model?.activate_membership_button) {
            show_activate_membership_button = true
        }
        //Create an Object to handle the response
        const result = {
            first_flight_data: first_flight_data.flight_data.map(flight => ({
                _id: flight._id,
                flight_name: flight.flight_name,
                day: flight.day,
                isRecurr: flight.isRecurr,
                recurrLastDate: flight.recurrLastDate,
                flight_takeoff_date: flight.flight_takeoff_date,
                takeoff_time: flight.takeoff_time,
                landing_time: flight.landing_time,
                actual_takeoff_time: flight.actual_takeoff_time || '',
                actual_landing_time: flight.actual_landing_time || '',
                pilot: flight.pilot,
                copilot: flight.copilot,
                aircraftAssignment: flight.aircraftAssignment,
                lastMaintenanceDate: flight.lastMaintenanceDate,
                NextMaintenanceIn: flight.NextMaintenanceIn,
                flight_delayed: flight.flight_delayed,
                flight_delayed_time: flight.flight_delayed_time,
                flight_delayed_reason: flight.flight_delayed_reason || '',
                flight_canceled: flight.flight_canceled,
                flight_canceled_time: flight.flight_canceled_time,
                flight_canceled_reason: flight.flight_canceled_reason || '',
                boarding: flight.boarding,
                boarding_time: flight.boarding_time,
                checkedIn: flight.checkedIn,
                checkedIn_time: flight.checkedIn_time,
                departure: flight.departure,
                departure_time: flight.departure_time,
                status: flight.status,
                pet_on_board: flight.pet_on_board,
                is_demo: flight.is_demo,
                createdAt: flight.createdAt,
                updatedAt: flight.updatedAt,
                flight_seat_data: flight.flight_seat_data,
                to_airport_abb: flight.to_airport_abb,
                from_airport_abb: flight.from_airport_abb,
                pet_passes: flight.pet_passes,
                guest_passes: flight.guest_passes,
                is_booking_confirmed: flight.is_booking_confirmed,
                booking_request_submitted: flight.booking_request_submitted,
                upgrade_membership_pop_up: flight.upgrade_membership_pop_up,
                is_member_seat: flight.is_member_seat,
                is_only_guest_seat: flight.is_only_guest_seat,
                is_only_pet_seat: flight.is_only_pet_seat,
                is_guest_and_pet_seat: flight.is_guest_and_pet_seat,
                is_pet_on_lap: flight.is_pet_on_lap,
                anyseat_booked: flight.anyseat_booked,
                pet_price_with_gst: membership_settings_model.preOrder ? 0 : flight.pet_price_with_gst,
                Total_pet_price_with_gst: membership_settings_model.preOrder ? 0 : flight.Total_pet_price_with_gst,
            })),
            second_flight_data: second_flight_data ? second_flight_data.flight_data : undefined,
            pet_pass_used: first_flight_data.pet_count,
            Spet_pass_used: deduct_pet_passes - first_flight_data.pet_count,
            Total_pet_price_with_gst: membership_settings_model.preOrder ? 0 : total_pet_price,
            is_user_membership: is_user_membership,
            upgrade_membership_pop_up: upgrade_membership_pop_up,
            membership_id: membership_id || "",
            name: name || "",
            price: membership_settings_model.preOrder ? 0 : price,
            show_activate_membership_button: show_activate_membership_button,
            cancellationHTML: `<!DOCTYPE html>
                      <html>
                      <head>
                      <title>Flight Booking Cancellation/Change Policy</title>
                      </head>
                      <body>
                        <h1>Flight Booking Cancellation/Change Policy
                        </h1>
                        <p>When cancelling a booking within 24 hours of departure, the associated items used to make the booking will be held in penalty.  
                        Reset Vouchers recover items under penalties.  Canceling 24-12 hours before departure requires 1 Reset Voucher per item, while canceling within 12 hours necessitates 2 per item.
                        Applicable Items:
                        Reusable Booking(s)
                        Pet Pass(es)
                        Guess Pass(es)
                        Understanding that plans may change at the last minute, we issue a complimentary pair of Reset Vouchers to you every three months.   Should you require more, they are available for purchase at 125 dollars each..</p>
                      </body>
                      </html>`
        };
        return successResponse(result, "Data fetched successfully!", res)

    } catch (err) {
        console.log("err=", err.message)
        return internalServerError('Internal Server Error', res);
    }
};

exports.guest_confirms_booking = async (req, res) => {
    try {//To confirm with frontend side that api is using or not
        let user_id = req.query.user_id
        let guest_id = req.query.guest_id
        let confirm = req.query.confirm
        let flight_id = req.query.flight_id
        let booking_id = req.query.booking_id
        let user_data = await userModal.findOne({ _id: user_id })
        if (user_data) {
            if (confirm == 1) {//when guest accepts the booking confirmation
                let flight_seat_update = await flight_seat_mapping.find({ flight_id })
                if (flight_seat_update) {
                    let deduct = 0, seat_no = 0
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_update[0][`seat${i}_details`]?.guest_id && flight_seat_update[0][`seat${i}_details`].guest_id == guest_id && flight_seat_update[0][`seat${i}_details`].booking_id == booking_id) {
                            if (!flight_seat_update[0][`seat${i}_details`].guest_booking_decision_taken) {
                                deduct = 1
                                seat_no = i
                            }
                        }
                    }
                    if (deduct) {
                        await flight_seat_mapping.findOneAndUpdate({ flight_id },
                            {
                                [`seat${seat_no}_details.lock_date_time`]: "",
                                [`seat${seat_no}_details.guest_booking_decision_taken`]: 1,
                                [`seat${seat_no}_details.pet_request_accepted`]: 1
                            },
                            { new: true })
                        if (user_data.guest_passes > 0) {
                            await userModal.findByIdAndUpdate({ _id: user_id }, {
                                guest_passes: user_data.guest_passes - 1
                            })
                            let user_booking = await booking_modal.findOne({ _id: booking_id, status: "active" })
                            if (user_booking) await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                                guest_pass_used: user_booking.guest_pass_used + 1
                            })

                        } else {
                            return failMessage('User doesnot have enough guest pass!', res)
                        }

                    }
                }
                return successResponseWithoutData('Booking confirmed by guest!', res)

            } else {//when guest rejects
                let flight_seat_update = await flight_seat_mapping.find({ flight_id })
                if (flight_seat_update) {
                    let deduct = 0, seat_no = 0
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_update[0][`seat${i}_details`]?.guest_id && flight_seat_update[0][`seat${i}_details`].guest_id == guest_id && flight_seat_update[0][`seat${i}_details`].booking_id == booking_id) {
                            if (!flight_seat_update[0][`seat${i}_details`].guest_booking_decision_taken) {
                                deduct = 1
                                seat_no = i
                            }
                        }
                    }
                    if (deduct) {
                        await flight_seat_mapping.findOneAndUpdate({ flight_id },
                            {
                                [`seat${seat_no}_details.lock_date_time`]: "",
                                [`seat${seat_no}_details.guest_id`]: "",
                                [`seat${seat_no}_details.guest_booking_decision_taken`]: 1,
                                [`seat${seat_no}_details.user_id`]: "",
                                [`seat${seat_no}_details.pet_request_accepted`]: 1,
                                [`seat${seat_no}_details.booking_id`]: ""
                            },
                            { new: true })
                    }
                }
                return successResponseWithoutData('Booking rejected by guest!', res)

            }
        } else {
            return failMessage('Invalid user!', res)

        }


    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};

exports.check_users_booking = async (req, res) => {
    try {
        const currentDate = new Date();
        let startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let user_penalty_exists = false;
        let user_id = req.payload._id
        let curr_date = new Date(dayjs().format('YYYY-MM-DD'))
        let booking_data = await booking_modal.aggregate([
            {
                $match: {
                    user_id: user_id
                }
            },
            {
                $lookup: {
                    from: "flights",
                    let: { flightID: "$flight_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$flightID"] },
                                flight_takeoff_date: {
                                    $gte: curr_date
                                },
                            }
                        },

                    ],
                    as: "flights",
                }
            },
        ]
        )
        let membership_settings_model = await membership_settings.findOne({ status: "active" })
        let show_activate_membership_button = false
        let is_demo_process = false
        let user_verified = false;
        if (membership_settings_model?.activate_membership_button) {
            show_activate_membership_button = true
        }
        if (membership_settings_model?.is_demo_process) {
            is_demo_process = true
            user_verified = true
        }
        let membership_activated = false
        let total_reusable = 0, is_membership_purchased = false

        let user_membership = await userMembershipModal.findOne({ user_id, status: "active" })
        if (user_membership) {
            is_membership_purchased = true
            if (user_membership.is_activate) membership_activated = true

            if (user_membership.type && user_membership.type == 1) total_reusable = 2
            if (user_membership.type && user_membership.type == 2) total_reusable = 4

            let journey_completed = await booking_modal.aggregate([
                {
                    $match: {
                        user_id: user_id,
                        is_journey_completed: false,
                        status: "active",
                        booking_status: "confirmed"
                    }
                },
                {
                    $lookup: {
                        from: "flights",
                        let: { flightID: "$flight_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$flightID"] },
                                    flight_takeoff_date: {
                                        $lte: curr_date
                                    },
                                }
                            },

                        ],
                        as: "flights",
                    }
                },
            ]
            )
            if (journey_completed && journey_completed.length > 0) {
                let updated_booking_ids = []
                journey_completed.forEach((data) => {
                    if (data.flights && data.flights.length > 0) {
                        let landing_time = ""
                        if (data.flights[0].actual_landing_time) {
                            landing_time = data.flights[0].actual_landing_time
                        } else {
                            landing_time = data.flights[0].landing_time

                        }
                        let landingHours = parseInt(landing_time.split(":")[0]);
                        let landingMinutes = parseInt(landing_time.split(":")[1]);


                        let flightTakeOffDateRef = new Date(data.flights[0].flight_takeoff_date)
                        // Check if landing time is greater than or equal to "00:00"
                        if (landingHours == 0 && landingMinutes >= 0) {
                            // Add 1 day to flightTakeOffDateRef
                            flightTakeOffDateRef.setDate(flightTakeOffDateRef.getDate() + 1);
                        }
                        let [time1Hours, time1Minutes] = landing_time.split(':').map(Number);
                        flightTakeOffDateRef = flightTakeOffDateRef.setHours(time1Hours, time1Minutes)

                        let curr_time = startDate.getTime()
                        if (curr_time >= flightTakeOffDateRef) {
                            updated_booking_ids.push(data._id)
                        }
                    }
                })
                let return_reusable = updated_booking_ids.length

                if ((total_reusable == 2 && req.payload.reusable_bookings + Number(return_reusable) <= 2) || (total_reusable == 4 && req.payload.reusable_bookings + Number(return_reusable) <= 4)) {
                    const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });

                    await userModal.findByIdAndUpdate({ _id: user_id }, {
                        reusable_bookings: checkDemoSettings ? req.payload.reusable_bookings : req.payload.reusable_bookings + Number(return_reusable)
                    })
                    await booking_modal.updateMany({
                        _id: {
                            $in: updated_booking_ids
                        }
                    }, {
                        is_journey_completed: true
                    })
                }
            }
        }
        //if (req.payload.passportVerified && req.payload.driverlicenseVerified) user_verified = true
        console.log('userVerifyStatus==', req.payload.userVerifyStatus)
        if (req.payload.userVerifyStatus == 'verified') {
            user_verified = true
        }

        if (booking_data && booking_data.length > 0) {
            let count = 0, confirm_booking = 0

            booking_data.forEach((data) => {
                if (data.isPenalty == 1) {
                    user_penalty_exists = true
                }
                if (data.booking_status == "confirmed" && data.flights.length > 0) {
                    count++
                }
                if (data.booking_status == "confirmed") confirm_booking++
            })
            let result = {
                "booking_count": booking_data.length,
                "confirm_booking": confirm_booking,
                "user_verified": user_verified,
                "is_membership_activated": membership_activated,
                "total_reusable": total_reusable,
                "reusable_bookings": req.payload.reusable_bookings,
                "is_membership_purchased": is_membership_purchased,
                "reset_vouchers": req.payload.reset_vouchers,
                "guest_pass": req.payload.guest_passes,
                "user_penalty_exists": user_penalty_exists,
                show_activate_membership_button,
                is_demo_process,
                launch_season: membership_settings_model.launch_season
            }
            if (count == 2) {
                return successResponse(result, 'User can only book maximum of 2 flights at a time!', res)

            } else {
                return successResponse(result, 'User can book a flight!', res)
            }

        } else {
            let result = {
                "booking_count": 0,
                "confirm_booking": 0,
                "user_verified": user_verified,
                "is_membership_activated": membership_activated,
                "total_reusable": total_reusable,
                "reusable_bookings": req.payload.reusable_bookings,
                "is_membership_purchased": is_membership_purchased,
                "reset_vouchers": req.payload.reset_vouchers,
                "guest_pass": req.payload.guest_passes,
                show_activate_membership_button,
                is_demo_process,
                launch_season: membership_settings_model.launch_season

            }
            return successResponse(result, 'Data fetched successfully!', res)
        }
    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};
async function bookingFunction(user, flight_id, is_booking_confirmed, is_member_seat, is_only_guest_seat, is_only_pet_seat, is_guest_and_pet_seat, Total_pet_price_with_gst, is_pet_on_lap, pet_pass_used, guest_pass_to_pet_pass, checkDemoSettings) {
    let requestDatass = { flight_id, is_booking_confirmed, is_member_seat, is_only_guest_seat, is_only_pet_seat, is_guest_and_pet_seat, Total_pet_price_with_gst, is_pet_on_lap, pet_pass_used, guest_pass_to_pet_pass, checkDemoSettings }
    console.log('bookingFunction==', requestDatass)
    let booking_id = "";
    let arr = [];
    let arr1 = [];
    let pet_ids;
    let user_membership = await userMembershipModal.findOne({ user_id: user._id.valueOf(), status: "active" })
    let flight_seat_data = await flight_seat_mapping.findOne({ flight_id })
    let guest_seat_obj = {}
    let guestCount = 0;
    let guest_names = []

    let guest_data = await user_guest_mapping_modal.find({ user_id: user._id.valueOf() })
    let isUserSeatExists = false
    for (let i = 1; i <= 8; i++) {
        if (flight_seat_data[`seat${i}_details`] && flight_seat_data[`seat${i}_details`]['user_id'] == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
            if (flight_seat_data[`seat${i}_details`].guest_id) {
                guest_seat_obj[`${flight_seat_data[`seat${i}_details`].guest_id}`] = i
                guestCount++;
            }
            isUserSeatExists = true
        }
    }

    if (isUserSeatExists) {
        if (guest_data.length > 0) {
            guest_data.map((data) => {
                if (guest_seat_obj[`${data._id.valueOf()}`]) {
                    guest_seat_obj[`${data._id.valueOf()}`] = data
                }
            })
        }

        if (is_member_seat && !is_only_guest_seat && !is_only_pet_seat && !is_guest_and_pet_seat && !is_pet_on_lap) {
            if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 2) {
                //if user membership is unlimited and has reusable bookings then booking is confirmed
                await userModal.findByIdAndUpdate({ _id: user._id.valueOf() }, {
                    reusable_bookings: user.reusable_bookings - 1
                }, { new: true })
                is_booking_confirmed = true
            } else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            } else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 2 && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 4) {
                await userModal.findByIdAndUpdate({ _id: user._id.valueOf() }, {
                    reusable_bookings: user.reusable_bookings - 1
                }, { new: true })
                is_booking_confirmed = true
            }
            else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 2 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings) {
                return 'User not having enough reusable bookings!'

            }

            if (is_booking_confirmed) {//booking confirmed
                let update_seat_obj = {}
                //create booking
                let new_booking = await booking_modal.create({
                    flight_id,
                    user_id: user._id.valueOf(),
                    booking_status: "confirmed",
                    reusable_booking_used: checkDemoSettings ? 0 : 1,
                    is_demo: checkDemoSettings ? true : false
                })
                booking_id = new_booking._id
                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                            update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                            update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                            update_seat_obj[`seat${i}_timeoutId`] = 0
                            update_seat_obj[`seat${i}`] = 1
                        }
                    }
                    await flight_seat_mapping.findOneAndUpdate({ flight_id }, update_seat_obj)
                }
            } else {//booking is pending
                //create booking
                let new_booking = await booking_modal.create({
                    flight_id,
                    user_id: user._id.valueOf(),
                    booking_status: "pending",
                    reusable_booking_used: checkDemoSettings ? 0 : 1,
                    is_demo: checkDemoSettings ? true : false

                })
                booking_id = new_booking._id
                let update_seat_obj = {}

                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                            update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                            update_seat_obj[`seat${i}_timeoutId`] = 0
                            update_seat_obj[`seat${i}`] = 1
                        }
                    }
                    await flight_seat_mapping.findOneAndUpdate({ flight_id }, update_seat_obj)
                }
            }
        } else if (is_pet_on_lap) {
            //for pet add time for pet user
            let newCurrentDate = new Date()
            newCurrentDate.setHours(newCurrentDate.getHours() + 10);
            let petOnBoardRequestStarts = new Date(newCurrentDate)
            const currenthour = newCurrentDate.getHours()
            if (currenthour >= 22) {
                let add_10_hours = newCurrentDate.setHours(newCurrentDate.getHours() + 10)
                petOnBoardRequestStarts = new Date(add_10_hours);
            }

            let user_membership = await userMembershipModal.findOne({ user_id: user._id, status: "active" })

            if (!checkDemoSettings && (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 2) || (user_membership && user_membership.name == 'Unlimited Elite' && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 4)) {
                await userModal.findByIdAndUpdate({ _id: user._id.valueOf() }, {
                    reusable_bookings: user.reusable_bookings - 1
                }, { new: true })
                is_booking_confirmed = true
            }
            else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 2 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings) {
                return 'User not having enough reusable bookings!'
            }
            let isNotify = false, pet_ids = [], index = 0
            let update_seat_obj = {}
            console.log('is_pet_on_lappetOnBoardRequestStarts==', petOnBoardRequestStarts)

            let new_booking = await booking_modal.create({
                flight_id,
                user_id: user._id.valueOf(),
                booking_status: "pending",
                reusable_booking_used: checkDemoSettings ? 0 : 1,
                is_demo: checkDemoSettings ? true : false,
                petOnBoardRequestStarts: petOnBoardRequestStarts

            })
            booking_id = new_booking._id
            if (is_booking_confirmed) {//booking confirmed

                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        // pet_ids = flight_seat_data[`seat${i}_details`].pet_id;
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            if (flight_seat_data[`seat${i}_details`].pet_id && flight_seat_data[`seat${i}_details`].pet_id.length == 1) {
                                pet_ids.push(flight_seat_data[`seat${i}_details`].pet_id[0])
                                index = i
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 3
                            } else {
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 1
                            }
                        }
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
                            isNotify = true
                        }
                        arr.push(pet_ids);
                    }
                }
            } else if (flight_seat_data) {//booking is pending
                for (let i = 1; i <= 8; i++) {
                    if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                        if (flight_seat_data[`seat${i}_details`].pet_id && flight_seat_data[`seat${i}_details`].pet_id.length == 1) {
                            pet_ids.push(flight_seat_data[`seat${i}_details`].pet_id[0])
                            index = i
                            update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                            update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                            update_seat_obj[`seat${i}_timeoutId`] = 0
                            update_seat_obj[`seat${i}`] = 3

                        } else {
                            update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                            update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                            update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                            update_seat_obj[`seat${i}_timeoutId`] = 0
                            update_seat_obj[`seat${i}`] = 1
                        }
                    }
                    if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
                        isNotify = true
                    }
                }
            }
            let pet_data = await user_pet_mapping_modal.findOne({ _id: pet_ids[0], status: "active" })
            if (is_booking_confirmed) {
                if (!isNotify || (isNotify && pet_data?.assistance_animal_proof)) {
                    update_seat_obj[`seat${index}_details.lock_date_time`] = ""
                    update_seat_obj[`seat${index}_details.pet_request_accepted`] = 1
                    update_seat_obj[`seat${index}_details.booking_id`] = booking_id
                    update_seat_obj[`seat${index}_timeoutId`] = 0
                    update_seat_obj[`seat${index}`] = 3
                    await flightModal.findByIdAndUpdate({ _id: flight_id }, { pet_on_board: true }, { new: true })
                    await booking_modal.findByIdAndUpdate({ _id: booking_id }, { booking_status: "confirmed" })
                }
            }

            if (isNotify) send_notification.sendNotification(flight_id, user, booking_id)
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, update_seat_obj, { new: true })

        }
        else if (is_only_guest_seat) {
            let user_membership = await userMembershipModal.findOne({ user_id: user._id, status: "active" })
            if (!checkDemoSettings && (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 2) || (user_membership && user_membership.name == 'Unlimited Elite' && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 4)) {
                await userModal.findByIdAndUpdate({ _id: user._id }, {
                    reusable_bookings: user.reusable_bookings - 1,
                    guest_passes: user.guest_passes - guestCount
                }, { new: true })
            } else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 2 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings) {
                return 'User not having enough reusable bookings!'

            }
            if (guest_seat_obj) {
                Object.values(guest_seat_obj).forEach(async (data) => {
                    guest_names.push(data.guest_name)
                    // let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
                    // //check valid country for twilio
                    // const twilioCountry = await twilioCountryModel.findOne({ country_code: data['guest_phone_code'] });
                    // // if (!twilioCountry) {
                    // //     return NotAcceptable(`Unfortunately, we do not support phone numbers with ${data['guest_phone_code']} country code`, {})
                    // // }
                    // if (twilioCountry) {
                    //     //red mean we are not support phone code, green,blue and yellow means different sender number 
                    //     // if (twilioCountry.colour == 'red') {
                    //     //     return NotAcceptable(`Unfortunately, we do not support phone numbers with ${data['guest_phone_code']} country code`, {})
                    //     // } else 
                    //     if (twilioCountry.colour == 'green') {
                    //         fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                    //     } else if (twilioCountry.colour == 'blue') {
                    //         fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                    //     } else if (twilioCountry.colour == 'yellow') {
                    //         fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                    //     }
                    // }
                    // let toPhoneNumber = data['guest_phone_code'] + data.guest_phone; // The recipient's phone number
                    // //sending sms
                    // //if (process.env.NODE_ENV == 'production') {
                    // //`Hi, confirm your booking by clicking this ${process.env.SERVER_URL}/v1/user/guest_confirms_booking?user_id=${user._id}&guest_id=${data._id}&flight_id=${flight_id}&confirm=1 
                    //                 //If you don't want to confirm this booking then you can cancel it by clicking this url ${process.env.SERVER_URL}/v1/user/guest_confirms_booking?user_id=${user._id}&guest_id=${data._id}&flight_id=${flight_id}&confirm=0`
                    //     client.messages
                    //         .create({
                    //             body: `Hi, confirm your booking by clicking this ${process.env.SERVER_URL}/v1/user/guest_confirms_booking?user_id=${user._id}&guest_id=${data._id}&flight_id=${flight_id}&confirm=1 
                    //                 If you don't want to confirm this booking then you can cancel it by clicking this url ${process.env.SERVER_URL}/v1/user/guest_confirms_booking?user_id=${user._id}&guest_id=${data._id}&flight_id=${flight_id}&confirm=0`,
                    //             from: fromPhoneNumber,
                    //             to: toPhoneNumber,
                    //         })
                    //         .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    //         .catch(error => console.error(`Error sending OTP: ${error.message}`));
                    // //}

                })
            }

            if (is_booking_confirmed) {
                //create booking
                let new_booking = await booking_modal.create({
                    flight_id,
                    user_id: user._id.valueOf(),
                    booking_status: "confirmed",
                    Total_pet_price_with_gst: checkDemoSettings ? 0 : Total_pet_price_with_gst,
                    reusable_booking_used: checkDemoSettings ? 0 : 1,
                    guest_pass_used: checkDemoSettings ? 0 : guestCount,
                    // guest_penalty: checkDemoSettings ? 0 : 1,
                    is_demo: checkDemoSettings ? true : false

                })
                booking_id = new_booking._id

                let update_seat_obj = {}
                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                            update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                            update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                            update_seat_obj[`seat${i}_timeoutId`] = 0
                            update_seat_obj[`seat${i}`] = 1
                        }
                    }
                    await flight_seat_mapping.findOneAndUpdate({ flight_id }, update_seat_obj)
                }
            } else {
                //create booking
                let new_booking = await booking_modal.create({
                    flight_id,
                    user_id: user._id.valueOf(),
                    booking_status: "pending",
                    Total_pet_price_with_gst: checkDemoSettings ? 0 : Total_pet_price_with_gst,
                    reusable_booking_used: checkDemoSettings ? 0 : 1,
                    guest_pass_used: checkDemoSettings ? 0 : guestCount,
                    // guest_penalty: checkDemoSettings ? 0 : 1,
                    is_demo: checkDemoSettings ? true : false

                })
                booking_id = new_booking._id
                let update_seat_obj = {}

                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            if (flight_seat_data[`seat${i}_details`].guest_id && !flight_seat_data[`seat${i}_details`].pet_id) {//only update member seats
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 1

                            } else {
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 1
                            }
                        }
                    }
                    await flight_seat_mapping.findOneAndUpdate({ flight_id }, update_seat_obj)
                }
            }
        } else if (is_only_pet_seat) {
            //for pet add time for pet user
            let newCurrentDate = new Date()
            newCurrentDate.setHours(newCurrentDate.getHours() + 10);
            let petOnBoardRequestStarts = new Date(newCurrentDate)
            const currenthour = newCurrentDate.getHours()
            if (currenthour >= 22) {
                let add_10_hours = newCurrentDate.setHours(newCurrentDate.getHours() + 10)
                petOnBoardRequestStarts = new Date(add_10_hours);
            }
            let isNotify = false, index = 0
            let update_seat_obj = {}, pet_ids = {}, pet_count = 0
            if (!checkDemoSettings && (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 2) || (user_membership && user_membership.name == 'Unlimited Elite' && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 4)) {
                await userModal.findByIdAndUpdate({ _id: user._id }, {
                    reusable_bookings: user.reusable_bookings - 1,
                }, { new: true })
            } else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 2 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings) {
                return 'User not having enough reusable bookings!'

            }

            // if (!(Number(Total_pet_price_with_gst) > 0)) {
            //     await userModal.findOneAndUpdate({ _id: user._id, status: "active" }, {
            //         pet_passes: checkDemoSettings ? user.pet_passes : user.pet_passes - pet_pass_used
            //         // reusable_bookings: checkDemoSettings ? user.reusable_bookings : user.reusable_bookings - 1
            //     }, { new: true });
            // }
            //If pet_pass_used then subtract user pet pass
            if (pet_pass_used) {
                if (user.pet_passes > 0) {
                    await userModal.findOneAndUpdate({ _id: user._id, status: "active" }, {
                        pet_passes: checkDemoSettings ? user.pet_passes : user.pet_passes - pet_pass_used
                        // reusable_bookings: checkDemoSettings ? user.reusable_bookings : user.reusable_bookings - 1
                    }, { new: true });
                }
            }
            if (is_booking_confirmed) {//booking confirmed
                console.log('is_only_pet_seatpetOnBoardRequestStartsC==', petOnBoardRequestStarts)
                //create booking
                let new_booking = await booking_modal.create({
                    flight_id,
                    user_id: user._id.valueOf(),
                    booking_status: "confirmed",
                    Total_pet_price_with_gst: checkDemoSettings ? 0 : Total_pet_price_with_gst,
                    is_demo: checkDemoSettings ? true : false,
                    reusable_booking_used: checkDemoSettings ? 0 : 1,
                    petOnBoardRequestStarts: petOnBoardRequestStarts,
                    guest_pass_to_pet_pass: guest_pass_to_pet_pass

                })
                booking_id = new_booking._id

                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        // pet_ids = flight_seat_data[`seat${i}_details`].pet_id;
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            if (flight_seat_data[`seat${i}_details`].pet_id && flight_seat_data[`seat${i}_details`].pet_id.length > 0 && !flight_seat_data[`seat${i}_details`].guest_id) {//only update member seats
                                index = i
                                pet_ids[`${i}`] = flight_seat_data[`seat${i}_details`].pet_id
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 4
                                pet_count++

                                arr.push(pet_ids);
                                arr1.push(flight_seat_data[`seat${i}_details`].pet_id);
                            } else {
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 1
                            }
                        }
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
                            isNotify = true
                        }

                    }
                }


            } else {//booking is pending
                console.log('is_only_pet_seatpetOnBoardRequestStarts==', petOnBoardRequestStarts)
                //create booking
                let new_booking = await booking_modal.create({
                    flight_id,
                    user_id: user._id.valueOf(),
                    booking_status: "pending",
                    Total_pet_price_with_gst: checkDemoSettings ? 0 : Total_pet_price_with_gst,
                    is_demo: checkDemoSettings ? true : false,
                    reusable_booking_used: checkDemoSettings ? 0 : 1,
                    petOnBoardRequestStarts: petOnBoardRequestStarts,
                    guest_pass_to_pet_pass: guest_pass_to_pet_pass

                })
                booking_id = new_booking._id
                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            if (flight_seat_data[`seat${i}_details`].pet_id && flight_seat_data[`seat${i}_details`].pet_id.length > 0 && !flight_seat_data[`seat${i}_details`].guest_id) {//only update member seats
                                pet_ids[`${i}`] = flight_seat_data[`seat${i}_details`].pet_id
                                index = i
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 4
                                pet_count++
                                arr.push(pet_ids);
                                arr1.push(flight_seat_data[`seat${i}_details`].pet_id);
                            } else {
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 1 //for member pet


                            }
                        }
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
                            isNotify = true
                        }


                    }
                }
            }
            let pet_ids_obj = {}
            let pet_ids_arr = [].concat(...Object.values(pet_ids)).map((data) => {
                pet_ids_obj[data] = data
            })
            let pet_data = await user_pet_mapping_modal.find({
                _id: {
                    $in: pet_ids_arr
                }
            }, { assistance_animal_proof: 1 })
            pet_data.forEach((data) => {
                if (pet_ids_obj[`${data._id}`] && data.assistance_animal_proof) isNotify = false
            })

            if (is_booking_confirmed) {
                if (!isNotify || (isNotify && pet_data?.assistance_animal_proof)) {
                    update_seat_obj[`seat${index}_details.lock_date_time`] = ""
                    update_seat_obj[`seat${index}_details.pet_request_accepted`] = 1
                    update_seat_obj[`seat${index}_details.booking_id`] = booking_id
                    update_seat_obj[`seat${index}_timeoutId`] = 0
                    update_seat_obj[`seat${index}`] = 4 //for member pet


                    await flightModal.findByIdAndUpdate({ _id: flight_id }, { pet_on_board: true }, { new: true });
                    await booking_modal.findByIdAndUpdate({ _id: booking_id }, { booking_status: "confirmed" });

                    if (guest_pass_to_pet_pass > 0) {
                        let guestPetPassName = `${guest_pass_to_pet_pass} Pet Pass`;
                        if (guest_pass_to_pet_pass > 1) {
                            guestPetPassName = `${guest_pass_to_pet_pass} Pet Passes`;
                        }
                        //transaction record
                        let petDocuments = {
                            userId: user._id,
                            type: "Guest to Pet Pass",
                            image: process.env.PETPASSLOGO,
                            name: guestPetPassName,
                            count: guest_pass_to_pet_pass
                        };
                        const newTrans = new transactionModal(petDocuments);
                        await newTrans.save();

                        //updating guest_pass_to_pet_pass in user model
                        await userModal.findByIdAndUpdate({ _id: user._id.valueOf() }, { guest_pass_to_pet_pass: Number(user.guest_pass_to_pet_pass - guest_pass_to_pet_pass) })
                    }

                    if (arr1.length > 0 && Number(pet_pass_used) > 0) {
                        let petNameArr = [];
                        let petName = '';
                        for (let ji = 0; ji < arr1[0].length; ji++) {
                            let petIdNo = mongoose.Types.ObjectId(arr1[0][ji]);
                            let getPetName = await user_pet_mapping_modal.findOne({ _id: petIdNo }, { pet_name: 1, type_of_pet: 1, _id: 0 })
                            if (getPetName) {
                                petNameArr.push(getPetName.pet_name);
                            }
                        }
                        if (petNameArr.length > 0) {
                            petName = petNameArr.join(' & ')
                        }

                        let petDocuments = {
                            userId: user._id,
                            type: "Seat for Pet",
                            booking_id,
                            image: process.env.DOGLOGO,
                            name: `Seat for ${petName}`
                        };
                        const newTrans = new transactionModal(petDocuments);
                        await newTrans.save();
                    }
                } else {
                    await booking_modal.findByIdAndUpdate({ _id: booking_id }, { booking_status: "pending" })

                }
            }
            //SEND NOTIFICATION TO ALL OTHER FLIGHT MEMBERS FOR PET ON BOARD
            if (isNotify && !checkDemoSettings) send_notification.sendNotification(flight_id, user, booking_id)
            else if (!(Number(Total_pet_price_with_gst)) > 0 && !isNotify) {
                if (user.pet_passes > 0) {
                    await userModal.findOneAndUpdate({ _id: user._id, status: "active" }, {
                        pet_passes: checkDemoSettings ? user.pet_passes : user.pet_passes - pet_pass_used
                        // reusable_bookings: checkDemoSettings ? user.reusable_bookings : user.reusable_bookings - 1

                    }, { new: true })
                }
            }
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, update_seat_obj, { new: true })

        } else if (is_guest_and_pet_seat) {
            //for pet add time for pet user
            let newCurrentDate = new Date()
            newCurrentDate.setHours(newCurrentDate.getHours() + 10);
            let petOnBoardRequestStarts = new Date(newCurrentDate)
            const currenthour = newCurrentDate.getHours()
            if (currenthour >= 22) {
                let add_10_hours = newCurrentDate.setHours(newCurrentDate.getHours() + 10)
                petOnBoardRequestStarts = new Date(add_10_hours);
            }
            let isNotify = false, pet_ids = {}
            if (!checkDemoSettings && (user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 2) || (user_membership && user_membership.name == 'Unlimited Elite' && Number(user.reusable_bookings) > 0 && Number(user.reusable_bookings) <= 4)) {
                await userModal.findByIdAndUpdate({ _id: user._id }, {
                    reusable_bookings: user.reusable_bookings - 1,
                    guest_passes: user.guest_passes - guestCount
                }, { new: true })
            } else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 1 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings && user_membership && user_membership.type && user_membership.type == 2 && Number(user.reusable_bookings) <= 0) {
                return 'User not having enough reusable bookings!'
            }
            else if (!checkDemoSettings) {
                return 'User not having enough reusable bookings!'

            }
            if (guest_seat_obj) {
                Object.values(guest_seat_obj).forEach(async (data) => {
                    // let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
                    // //check valid country for twilio
                    // const twilioCountry = await twilioCountryModel.findOne({ country_code: data['guest_phone_code'] });
                    // // if (!twilioCountry) {
                    // //     return NotAcceptable(`Unfortunately, we do not support phone numbers with ${data['guest_phone_code']} country code`, {})
                    // // }
                    // if (twilioCountry) {
                    //     //red mean we are not support phone code, green,blue and yellow means different sender number 
                    //     // if (twilioCountry.colour == 'red') {
                    //     //     return NotAcceptable(`Unfortunately, we do not support phone numbers with ${data['guest_phone_code']} country code`, {})
                    //     // } else 
                    //     if (twilioCountry.colour == 'green') {
                    //         fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                    //     } else if (twilioCountry.colour == 'blue') {
                    //         fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                    //     } else if (twilioCountry.colour == 'yellow') {
                    //         fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                    //     }
                    // }
                    // let toPhoneNumber = data['guest_phone_code'] + data.guest_phone; // The recipient's phone number
                    // //if (process.env.NODE_ENV == 'production') {
                    //     client.messages
                    //         .create({
                    //             body: `Hi, confirm your booking by clicking this ${process.env.SERVER_URL}/v1/user/guest_confirms_booking?user_id=${user._id}&guest_id=${data._id}&flight_id=${flight_id}&confirm=1 
                    //     If you don't want to confirm this booking then you can cancel it by clicking this url ${process.env.SERVER_URL}/v1/user/guest_confirms_booking?user_id=${user._id}&guest_id=${data._id}&flight_id=${flight_id}&confirm=0`,
                    //             from: fromPhoneNumber,
                    //             to: toPhoneNumber,
                    //         })
                    //         .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    //         .catch(error => console.error(`Error sending OTP: ${error.message}`));

                    // //}
                })
            }
            if (is_booking_confirmed) {//booking confirmed
                console.log('is_guest_and_pet_seatpetOnBoardRequestStartsC==', petOnBoardRequestStarts)

                //create booking
                let new_booking = await booking_modal.create({
                    flight_id,
                    user_id: user._id.valueOf(),
                    booking_status: "confirmed",
                    Total_pet_price_with_gst: checkDemoSettings ? 0 : Total_pet_price_with_gst,
                    is_demo: checkDemoSettings ? true : false,
                    reusable_booking_used: checkDemoSettings ? 0 : 1,
                    guest_pass_used: checkDemoSettings ? 0 : guestCount,
                    petOnBoardRequestStarts: petOnBoardRequestStarts,
                    guest_pass_to_pet_pass: guest_pass_to_pet_pass
                    // guest_penalty: checkDemoSettings ? 0 : 1,

                })
                booking_id = new_booking._id
                await flightModal.findByIdAndUpdate({ _id: flight_id }, { pet_on_board: true }, { new: true });

                let update_seat_obj = {}
                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        // pet_ids = flight_seat_data[`seat${i}_details`].pet_id;
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            if (flight_seat_data[`seat${i}_details`].pet_id && flight_seat_data[`seat${i}_details`].pet_id.length > 0 && !flight_seat_data[`seat${i}_details`].guest_id) {//only update member seats
                                pet_ids[`${i}`] = flight_seat_data[`seat${i}_details`].pet_id
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 4

                                arr.push(pet_ids);
                                arr1.push(flight_seat_data[`seat${i}_details`].pet_id);
                            }
                            if (!flight_seat_data[`seat${i}_details`].pet_id) {//only update member seats
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 1 //for member pet


                            }

                            // if (!flight_seat_data[`seat${i}_details`].pet_id && flight_seat_data[`seat${i}_details`].guest_id) {//only update member seats
                            //     update_seat_obj = {
                            //         [`seat${i}_details.pet_request_accepted`]: 1,
                            //         [`seat${i}_details.booking_id`]: booking_id,
                            //         [`seat${i}_timeoutId`]: 0
                            //     }


                            // }
                        }
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
                            isNotify = true
                        }

                    }
                    await flight_seat_mapping.findOneAndUpdate({ flight_id }, update_seat_obj)
                }

                if (guest_pass_to_pet_pass > 0) {
                    let guestPetPassName = `${guest_pass_to_pet_pass} Pet Pass`;
                    if (guest_pass_to_pet_pass > 1) {
                        guestPetPassName = `${guest_pass_to_pet_pass} Pet Passes`;
                    }
                    //transaction record
                    let petDocuments = {
                        userId: user._id,
                        type: "Guest to Pet Pass",
                        image: process.env.PETPASSLOGO,
                        name: guestPetPassName,
                        count: guest_pass_to_pet_pass
                    };
                    const newTrans = new transactionModal(petDocuments);
                    await newTrans.save();

                    //updating guest_pass_to_pet_pass in user model
                    await userModal.findByIdAndUpdate({ _id: user._id.valueOf() }, { guest_pass_to_pet_pass: Number(user.guest_pass_to_pet_pass - guest_pass_to_pet_pass) })
                }

                if (arr1.length > 0 && Number(pet_pass_used) > 0) {
                    let petNameArr = [];
                    let petName = '';
                    for (let ji = 0; ji < arr1[0].length; ji++) {
                        let petIdNo = mongoose.Types.ObjectId(arr1[0][ji]);
                        let getPetName = await user_pet_mapping_modal.findOne({ _id: petIdNo }, { pet_name: 1, type_of_pet: 1, _id: 0 })
                        if (getPetName) {
                            petNameArr.push(getPetName.pet_name);
                        }
                    }
                    if (petNameArr.length > 0) {
                        petName = petNameArr.join(' & ')
                    }

                    let petDocuments = {
                        userId: user._id,
                        type: "Seat for Pet",
                        booking_id,
                        image: process.env.DOGLOGO,
                        name: `Seat for ${petName}`
                    };
                    const newTrans = new transactionModal(petDocuments);
                    await newTrans.save();
                }

            } else {//booking is pending
                //create booking
                console.log('is_guest_and_pet_seatpetOnBoardRequestStarts==', petOnBoardRequestStarts)
                let new_booking = await booking_modal.create({
                    flight_id,
                    user_id: user._id.valueOf(),
                    booking_status: "pending",
                    Total_pet_price_with_gst: checkDemoSettings ? 0 : Total_pet_price_with_gst,
                    is_demo: checkDemoSettings ? true : false,
                    reusable_booking_used: checkDemoSettings ? 0 : 1,
                    guest_pass_used: checkDemoSettings ? 0 : guestCount,
                    petOnBoardRequestStarts: petOnBoardRequestStarts,
                    guest_pass_to_pet_pass: guest_pass_to_pet_pass
                    // guest_penalty: checkDemoSettings ? 0 : 1,

                })
                booking_id = new_booking._id
                let update_seat_obj = {}
                if (flight_seat_data) {
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id == user._id.valueOf() && !flight_seat_data[`seat${i}_details`].booking_id) {
                            if (flight_seat_data[`seat${i}_details`].pet_id && flight_seat_data[`seat${i}_details`].pet_id.length > 0 && !flight_seat_data[`seat${i}_details`].guest_id) {//only update member seats
                                pet_ids[`${i}`] = flight_seat_data[`seat${i}_details`].pet_id
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 4

                                arr.push(pet_ids);
                                arr1.push(flight_seat_data[`seat${i}_details`].pet_id);
                            }
                            if (!flight_seat_data[`seat${i}_details`].pet_id) {//only update member seats
                                update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                                update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                                update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                                update_seat_obj[`seat${i}_timeoutId`] = 0
                                update_seat_obj[`seat${i}`] = 1 //for member pet


                            }

                            // else {
                            //     update_seat_obj[`seat${i}_details.lock_date_time`] = ""
                            //     update_seat_obj[`seat${i}_details.pet_request_accepted`] = 1
                            //     update_seat_obj[`seat${i}_details.booking_id`] = booking_id
                            //     update_seat_obj[`seat${i}_timeoutId`] = 0
                            //     update_seat_obj[`seat${i}`] = 1 //for member pet


                            // }
                            // if (!flight_seat_data[`seat${i}_details`].pet_id && flight_seat_data[`seat${i}_details`].guest_id) {//only update member seats
                            //     update_seat_obj = {
                            //         [`seat${i}_details.pet_request_accepted`]: 1,
                            //         [`seat${i}_details.booking_id`]: booking_id,
                            //         [`seat${i}_timeoutId`]: 0

                            //     }

                            // }
                        }
                        if (flight_seat_data[`seat${i}_details`]?.user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
                            isNotify = true
                        }

                    }
                    await flight_seat_mapping.findOneAndUpdate({ flight_id }, update_seat_obj)
                }
            }
            let pet_ids_obj = {}
            let pet_ids_arr = [].concat(...Object.values(pet_ids)).map((data) => {
                pet_ids_obj[data] = data
            })
            let pet_data = await user_pet_mapping_modal.find({
                _id: {
                    $in: pet_ids_arr
                }
            }, { assistance_animal_proof: 1 })
            pet_data.forEach((data) => {
                if (pet_ids_obj[`${data._id}`] && data.assistance_animal_proof) isNotify = false
            })
            //SEND NOTIFICATION TO ALL OTHER FLIGHT MEMBERS FOR PET ON BOARD
            if (isNotify) send_notification.sendNotification(flight_id, user, booking_id)
            // if (!(Number(Total_pet_price_with_gst) > 0) && !isNotify) {

            //     await userModal.findOneAndUpdate({ _id: user._id, status: "active" }, {
            //         pet_passes: checkDemoSettings ? user.pet_passes : user.pet_passes - pet_pass_used,
            //         // reusable_bookings: checkDemoSettings ? user.reusable_bookings : user.reusable_bookings - 1

            //     }, { new: true })
            // }
            //If pet_pass_used then subtract user pet pass
            if (pet_pass_used) {
                if (user.pet_passes > 0) {
                    await userModal.findOneAndUpdate({ _id: user._id, status: "active" }, {
                        pet_passes: checkDemoSettings ? user.pet_passes : user.pet_passes - pet_pass_used
                        // reusable_bookings: checkDemoSettings ? user.reusable_bookings : user.reusable_bookings - 1
                    }, { new: true });
                }
            }

        }
        let users_booking = await booking_modal.findOne({ _id: booking_id, status: "active" })
        await booking_modal.findOneAndUpdate({ _id: booking_id, status: "active" }, {
            pet_pass_used: checkDemoSettings ? 0 : Number(users_booking.pet_pass_used) + pet_pass_used
        })
        if (guest_names.length > 0) {
            const guestDocuments = guest_names.map(guest_name => ({
                userId: user._id,
                type: "Seat for Guest",
                booking_id,
                image: process.env.GUESTPASSLOGO,
                name: `Seat for ${guest_name}`
            }));
            await transactionModal.insertMany(guestDocuments);
        }
        console.log('arr==', arr)
        console.log('arr==', arr1)
        if (Number(Total_pet_price_with_gst) > 0) {
            let name = `1 Pet Pass`;
            if (arr1[0].length > 1) {
                name = `${arr1[0].length} Pet Passes`;
            }
            // Create payment using the createPayment function
            const result = await createPayment({
                userId: user._id,
                name: name,
                price: Total_pet_price_with_gst,
                normalPrice: '',
                normalInitiationFees: '',
                initiationFees: '',
                pet_id: arr,
                currency: "AUD",
                type: "Pet Passes" // Static type for API calls
            });

            // Handle payment failure
            if (!result.success) {
                return failMessage(result.message, res);
            }
        }

        return booking_id
    } else {
        return "NA"
    }

}
exports.booking = async (req, res) => {

    try {
        let user = req.payload
        let flight_id = req.body.flight_id//mandatory
        let is_booking_confirmed = req.body.is_booking_confirmed//mandatory
        let is_member_seat = req.body.is_member_seat//optional
        let is_only_guest_seat = req.body.is_only_guest_seat//optional
        let is_only_pet_seat = req.body.is_only_pet_seat//optional
        let is_guest_and_pet_seat = req.body.is_guest_and_pet_seat//optional
        let is_pet_on_lap = req.body.is_pet_on_lap//optional

        let Sflight_id = req.body.Sflight_id//optional
        let Sis_booking_confirmed = req.body.Sis_booking_confirmed//optional
        let Sis_member_seat = req.body.Sis_member_seat//optional
        let Sis_only_guest_seat = req.body.Sis_only_guest_seat//optional
        let Sis_only_pet_seat = req.body.Sis_only_pet_seat//optional
        let Sis_guest_and_pet_seat = req.body.Sis_guest_and_pet_seat//optional
        let Sis_pet_on_lap = req.body.Sis_pet_on_lap//optional
        let result = {}
        let Total_pet_price_with_gst = req.body.Total_pet_price_with_gst ? req.body.Total_pet_price_with_gst : ""//optional
        let STotal_pet_price_with_gst = req.body.STotal_pet_price_with_gst ? req.body.STotal_pet_price_with_gst : ""//optional
        let pet_pass_used = req.body.pet_pass_used ? req.body.pet_pass_used : 0
        let Spet_pass_used = req.body.Spet_pass_used ? req.body.Spet_pass_used : 0

        let guest_pass_to_pet_pass = req.body.guest_pass_to_pet_pass ? req.body.guest_pass_to_pet_pass : 0
        let Sguest_pass_to_pet_pass = req.body.Sguest_pass_to_pet_pass ? req.body.Sguest_pass_to_pet_pass : 0
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });

        result.booking_id = await bookingFunction(user, flight_id, is_booking_confirmed, is_member_seat, is_only_guest_seat, is_only_pet_seat, is_guest_and_pet_seat, Total_pet_price_with_gst, is_pet_on_lap, pet_pass_used, guest_pass_to_pet_pass, checkDemoSettings)
        result.secondBooking_id = ""
        if (Sflight_id) {
            let updated_user = await userModal.findOne({ _id: user._id })
            result.secondBooking_id = await bookingFunction(updated_user, Sflight_id, Sis_booking_confirmed, Sis_member_seat, Sis_only_guest_seat, Sis_only_pet_seat, Sis_guest_and_pet_seat, STotal_pet_price_with_gst, Sis_pet_on_lap, Spet_pass_used, Sguest_pass_to_pet_pass, checkDemoSettings)

        }
        if (result.booking_id == "Demo Booking" || result.secondBooking_id == "Demo Booking") {
            result.booking_id = ""
            result.secondBooking_id = ""

            return successResponse(result, "Demo Flight Booked Successfully!", res)
        }
        if (result.booking_id == 'User not having enough reusable bookings!' || result.secondBooking_id == 'User not having enough reusable bookings!') {
            return failMessage('User not having enough reusable bookings!', res)
        }
        if (result.booking_id == "NA" || result.secondBooking_id == "NA") {
            return failMessage('Please book again!', res)
        }

        if (result.secondBooking_id) {
            await booking_modal.findByIdAndUpdate({ _id: result.secondBooking_id }, {
                round_trip_id: result.booking_id
            }, { new: true })
        }
        if (result.booking_id && result.secondBooking_id) {
            await booking_modal.findByIdAndUpdate({ _id: result.booking_id }, {
                isRoundTrip: true
            }, { new: true })
        }


        // //send sms to guest user
        if (result.booking_id && result.secondBooking_id) {
            let firstbookingObjectId = mongoose.Types.ObjectId(result.booking_id);
            let secondbookingObjectId = mongoose.Types.ObjectId(result.secondBooking_id);
            console.log('single flight 123')
            let firstGuests = [];
            let secondGuests = [];
            let firstformattedDate = '';
            let secondformattedDate = '';
            let firstFlightData;
            let secondFlightData;
            //fetch booking first flight details
            let getFirstBooking = await booking_modal.findOne({ _id: result.booking_id, booking_status: 'confirmed' });
            if (getFirstBooking) {
                //getting booked flight data
                firstFlightData = await flightModal.findById({ _id: getFirstBooking.flight_id })
                    .populate({
                        path: 'route',
                        populate: [
                            { path: 'toCity', model: 'location' },
                            { path: 'fromCity', model: 'location' }
                        ]
                    })
                    .exec();
                if (firstFlightData) {
                    console.log('single flight 1231')
                    //date format
                    firstformattedDate = moment(firstFlightData.flight_takeoff_date).format('Do MMMM');
                    //time format
                    const [hours, minutes] = firstFlightData.takeoff_time.split(':');
                    const formattedHours = parseInt(hours, 10) % 12 || 12;  // Convert to 12-hour format
                    const period = parseInt(hours, 10) < 12 ? 'AM' : 'PM';  // Determine AM/PM
                    firstFlightData.takeoff_time = `${formattedHours}:${minutes} ${period}`;


                    let seat_details = await flight_seat_mapping.findOne({ flight_id: getFirstBooking.flight_id })
                    for (let j = 1; j <= 8; j++) {
                        if (seat_details?.[`seat${j}_details`]?.user_id != undefined && seat_details?.[`seat${j}_details`]?.booking_id != undefined) {
                            if (seat_details?.[`seat${j}_details`]?.user_id.equals(user._id) && seat_details?.[`seat${j}_details`]?.booking_id.equals(firstbookingObjectId)) {
                                console.log('single flight 1232')
                                if (seat_details[`seat${j}_details`]['guest_id'] != undefined) {
                                    let getGuestDetails = await user_guest_mapping_modal.findOne({ _id: seat_details[`seat${j}_details`]['guest_id'] })
                                    if (getGuestDetails) {
                                        firstGuests.push({ guest_id: getGuestDetails._id, guest_name: getGuestDetails.guest_name, guest_phone_code: getGuestDetails.guest_phone_code, guest_phone: getGuestDetails.guest_phone })
                                    }
                                }
                            }
                        }
                    }
                }
            }

            //fetch booking second flight details
            let getSecondBooking = await booking_modal.findOne({ _id: result.secondBooking_id, booking_status: 'confirmed' });
            if (getSecondBooking) {
                //getting second booked flight data
                secondFlightData = await flightModal.findById({ _id: getSecondBooking.flight_id })
                    .populate({
                        path: 'route',
                        populate: [
                            { path: 'toCity', model: 'location' },
                            { path: 'fromCity', model: 'location' }
                        ]
                    })
                    .exec();
                if (secondFlightData) {
                    console.log('single flight 1233')
                    //date format
                    secondformattedDate = moment(secondFlightData.flight_takeoff_date).format('Do MMMM');
                    //time format
                    const [hours, minutes] = secondFlightData.takeoff_time.split(':');
                    const formattedHours = parseInt(hours, 10) % 12 || 12;  // Convert to 12-hour format
                    const period = parseInt(hours, 10) < 12 ? 'AM' : 'PM';  // Determine AM/PM
                    secondFlightData.takeoff_time = `${formattedHours}:${minutes} ${period}`;

                    let seat_details = await flight_seat_mapping.findOne({ flight_id: getSecondBooking.flight_id })
                    for (let j = 1; j <= 8; j++) {
                        if (seat_details?.[`seat${j}_details`]?.user_id != undefined && seat_details?.[`seat${j}_details`]?.booking_id != undefined) {
                            if (seat_details?.[`seat${j}_details`]?.user_id.equals(user._id) && seat_details?.[`seat${j}_details`]?.booking_id.equals(secondbookingObjectId)) {
                                console.log('single flight 1234')
                                if (seat_details[`seat${j}_details`]['guest_id'] != undefined) {
                                    let getGuestDetails = await user_guest_mapping_modal.findOne({ _id: seat_details[`seat${j}_details`]['guest_id'] })
                                    if (getGuestDetails) {
                                        console.log('single flight 1235')
                                        secondGuests.push({ guest_id: getGuestDetails._id, guest_name: getGuestDetails.guest_name, guest_phone_code: getGuestDetails.guest_phone_code, guest_phone: getGuestDetails.guest_phone })
                                    }
                                }
                            }
                        }
                    }
                }
            }
            let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
            console.log('firstGuests===', firstGuests)
            console.log('secondGuests===', secondGuests)
            if (firstGuests.length > 0 && secondGuests.length > 0) {
                console.log('single flight 1235')
                //filter common object
                let commonObjects = firstGuests.filter(obj1 =>
                    secondGuests.some(obj2 => obj2.guest_phone === obj1.guest_phone)
                );

                // Convert firstGuests to a Set of guest_ids for fast lookup
                let set1 = new Set(firstGuests.map(obj => obj.guest_phone));
                // Convert secondGuests to a Set of guest_ids for fast lookup
                let set2 = new Set(secondGuests.map(obj => obj.guest_phone));

                // Filter objects in firstGuests that are not in secondGuests and mark them with source array
                let remainingInArray3 = firstGuests.filter(obj => {
                    obj.sourceArray = 'firstGuests';
                    return !set2.has(obj.guest_phone);
                });

                // Filter objects in secondGuests that are not in firstGuests and mark them with source array
                let remainingInArray4 = secondGuests.filter(obj => {
                    obj.sourceArray = 'secondGuests';
                    return !set1.has(obj.guest_phone);
                });

                // Combine remaining objects from both arrays
                let remainingObjects = remainingInArray3.concat(remainingInArray4);
                //check common guest data
                console.log('commonObjects===', commonObjects)
                if (commonObjects.length > 0) {
                    console.log('commonObjects===here')
                    for (let fi = 0; fi < commonObjects.length; fi++) {
                        //check valid country for twilio
                        const twilioCountry = await twilioCountryModel.findOne({ country_code: commonObjects[fi].guest_phone_code });
                        if (twilioCountry) {
                            if (twilioCountry.colour == 'green') {
                                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                            } else if (twilioCountry.colour == 'blue') {
                                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                            } else if (twilioCountry.colour == 'yellow') {
                                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                            }
                        }
                        let toPhoneNumber = commonObjects[fi].guest_phone_code + commonObjects[fi].guest_phone; // The recipient's phone number
                        //if (process.env.NODE_ENV == 'production') {
                        client.messages
                            .create({
                                body: `Hey ${commonObjects[fi].guest_name},  You're invited on ${user.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}.  ${secondFlightData.route.fromCity.city_name} - ${secondFlightData.route.toCity.city_name} ${secondformattedDate} ${secondFlightData.takeoff_time}.  Confirm by registering with this mobile phone number on the BLACK JET APP: https://blackjet.au/getapp`,
                                from: fromPhoneNumber,
                                to: toPhoneNumber,
                            })
                            .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                            .catch(error => console.error(`Error sending OTP: ${error.message}`));

                        //}


                    }
                }
                //checking different guest data
                console.log('remainingObjects==', remainingObjects)
                if (remainingObjects.length > 0) {
                    console.log('remainingObjects==here')
                    for (let si = 0; si < remainingObjects.length; si++) {
                        //check valid country for twilio
                        const twilioCountry = await twilioCountryModel.findOne({ country_code: remainingObjects[si].guest_phone_code });
                        if (twilioCountry) {
                            if (twilioCountry.colour == 'green') {
                                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                            } else if (twilioCountry.colour == 'blue') {
                                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                            } else if (twilioCountry.colour == 'yellow') {
                                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                            }
                        }
                        let toPhoneNumber = remainingObjects[si].guest_phone_code + remainingObjects[si].guest_phone; // The recipient's phone number
                        if (remainingObjects[si].sourceArray == 'firstGuests') {
                            //if (process.env.NODE_ENV == 'production') {
                            client.messages
                                .create({
                                    body: `Hey ${remainingObjects[si].guest_name},  You're invited on ${user.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}.  Confirm by registering with this mobile phone number on the BLACK JET APP: https://blackjet.au/getapp`,
                                    from: fromPhoneNumber,
                                    to: toPhoneNumber,
                                })
                                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                                .catch(error => console.error(`Error sending OTP: ${error.message}`));

                            //}
                        } else if (remainingObjects[si].sourceArray == 'secondGuests') {
                            //if (process.env.NODE_ENV == 'production') {
                            client.messages
                                .create({
                                    body: `Hey ${remainingObjects[si].guest_name},  You're invited on ${user.fullName}'s BLACK JET.  ${secondFlightData.route.fromCity.city_name} - ${secondFlightData.route.toCity.city_name} ${secondformattedDate} ${secondFlightData.takeoff_time}.  Confirm by registering with this mobile phone number on the BLACK JET APP: https://blackjet.au/getapp`,
                                    from: fromPhoneNumber,
                                    to: toPhoneNumber,
                                })
                                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                                .catch(error => console.error(`Error sending OTP: ${error.message}`));

                            //}
                        }
                    }
                }

            } else if (firstGuests.length > 0) {
                console.log('hereeee==')
                for (let si = 0; si < firstGuests.length; si++) {
                    //check valid country for twilio
                    const twilioCountry = await twilioCountryModel.findOne({ country_code: firstGuests[si].guest_phone_code });
                    if (twilioCountry) {
                        if (twilioCountry.colour == 'green') {
                            fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                        } else if (twilioCountry.colour == 'blue') {
                            fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                        } else if (twilioCountry.colour == 'yellow') {
                            fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                        }
                    }
                    let toPhoneNumber = firstGuests[si].guest_phone_code + firstGuests[si].guest_phone; // The recipient's phone number
                    //if (process.env.NODE_ENV == 'production') {
                    client.messages
                        .create({
                            body: `Hey ${firstGuests[si].guest_name},  You're invited on ${user.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}.  Confirm by registering with this mobile phone number on the BLACK JET APP: https://blackjet.au/getapp`,
                            from: fromPhoneNumber,
                            to: toPhoneNumber,
                        })
                        .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                        .catch(error => console.error(`Error sending OTP: ${error.message}`));

                    //}
                }
            } else if (secondGuests.length > 0) {
                console.log('hereeee121==')
                for (let si = 0; si < secondGuests.length; si++) {
                    //check valid country for twilio
                    const twilioCountry = await twilioCountryModel.findOne({ country_code: secondGuests[si].guest_phone_code });
                    if (twilioCountry) {
                        if (twilioCountry.colour == 'green') {
                            fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                        } else if (twilioCountry.colour == 'blue') {
                            fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                        } else if (twilioCountry.colour == 'yellow') {
                            fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                        }
                    }
                    let toPhoneNumber = secondGuests[si].guest_phone_code + secondGuests[si].guest_phone; // The recipient's phone number
                    //if (process.env.NODE_ENV == 'production') {
                    client.messages
                        .create({
                            body: `Hey ${secondGuests[si].guest_name},  You're invited on ${user.fullName}'s BLACK JET.  ${secondFlightData.route.fromCity.city_name} - ${secondFlightData.route.toCity.city_name} ${secondformattedDate} ${secondFlightData.takeoff_time}.  Confirm by registering with this mobile phone number on the BLACK JET APP: https://blackjet.au/getapp`,
                            from: fromPhoneNumber,
                            to: toPhoneNumber,
                        })
                        .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                        .catch(error => console.error(`Error sending OTP: ${error.message}`));

                    //}
                }
            }
        }
        else if (result.secondBooking_id) {
            console.log('ffffe==')
            let secondbookingObjectId = mongoose.Types.ObjectId(result.secondBooking_id);
            let secondGuests = [];
            //fetch booking second flight details
            let getSecondBooking = await booking_modal.findOne({ _id: result.secondBooking_id, booking_status: 'confirmed' });
            if (getSecondBooking) {
                //getting second booked flight data
                let secondFlightData = await flightModal.findById({ _id: getSecondBooking.flight_id })
                    .populate({
                        path: 'route',
                        populate: [
                            { path: 'toCity', model: 'location' },
                            { path: 'fromCity', model: 'location' }
                        ]
                    })
                    .exec();
                if (secondFlightData) {
                    //date format
                    let secondformattedDate = moment(secondFlightData.flight_takeoff_date).format('Do MMMM');

                    //time format
                    const [hours, minutes] = secondFlightData.takeoff_time.split(':');
                    const formattedHours = parseInt(hours, 10) % 12 || 12;  // Convert to 12-hour format
                    const period = parseInt(hours, 10) < 12 ? 'AM' : 'PM';  // Determine AM/PM
                    secondFlightData.takeoff_time = `${formattedHours}:${minutes} ${period}`;

                    let seat_details = await flight_seat_mapping.findOne({ flight_id: getSecondBooking.flight_id })
                    for (let j = 1; j <= 8; j++) {
                        if (seat_details?.[`seat${j}_details`]?.user_id != undefined && seat_details?.[`seat${j}_details`]?.booking_id != undefined) {
                            if (seat_details?.[`seat${j}_details`]?.user_id.equals(user._id) && seat_details?.[`seat${j}_details`]?.booking_id.equals(secondbookingObjectId)) {
                                if (seat_details[`seat${j}_details`]['guest_id'] != undefined) {
                                    let getGuestDetails = await user_guest_mapping_modal.findOne({ _id: seat_details[`seat${j}_details`]['guest_id'] })
                                    if (getGuestDetails) {
                                        secondGuests.push({ guest_id: getGuestDetails._id, guest_name: getGuestDetails.guest_name, guest_phone_code: getGuestDetails.guest_phone_code, guest_phone: getGuestDetails.guest_phone })
                                    }
                                }
                            }
                        }
                    }
                    let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
                    for (let si = 0; si < secondGuests.length; si++) {
                        //check valid country for twilio
                        const twilioCountry = await twilioCountryModel.findOne({ country_code: secondGuests[si].guest_phone_code });
                        if (twilioCountry) {
                            if (twilioCountry.colour == 'green') {
                                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                            } else if (twilioCountry.colour == 'blue') {
                                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                            } else if (twilioCountry.colour == 'yellow') {
                                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                            }
                        }
                        let toPhoneNumber = secondGuests[si].guest_phone_code + secondGuests[si].guest_phone; // The recipient's phone number
                        //if (process.env.NODE_ENV == 'production') {
                        client.messages
                            .create({
                                body: `Hey ${secondGuests[si].guest_name},  You're invited on ${user.fullName}'s BLACK JET.  ${secondFlightData.route.fromCity.city_name} - ${secondFlightData.route.toCity.city_name} ${secondformattedDate} ${secondFlightData.takeoff_time}.  Confirm by registering with this mobile phone number on the BLACK JET APP: https://blackjet.au/getapp`,
                                from: fromPhoneNumber,
                                to: toPhoneNumber,
                            })
                            .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                            .catch(error => console.error(`Error sending OTP: ${error.message}`));

                        //}
                    }
                }

            }

        } else {
            let firstbookingObjectId = mongoose.Types.ObjectId(result.booking_id);
            console.log('single flight==', firstbookingObjectId)
            let firstGuests = [];
            //fetch booking first flight details
            let getFirstBooking = await booking_modal.findOne({ _id: result.booking_id, booking_status: 'confirmed' });
            if (getFirstBooking) {
                console.log('single flight 1')
                //getting booked flight data
                let firstFlightData = await flightModal.findById({ _id: getFirstBooking.flight_id })
                    .populate({
                        path: 'route',
                        populate: [
                            { path: 'toCity', model: 'location' },
                            { path: 'fromCity', model: 'location' }
                        ]
                    })
                    .exec();
                if (firstFlightData) {
                    //date format
                    let firstformattedDate = moment(firstFlightData.flight_takeoff_date).format('Do MMMM');

                    //time format
                    const [hours, minutes] = firstFlightData.takeoff_time.split(':');
                    const formattedHours = parseInt(hours, 10) % 12 || 12;  // Convert to 12-hour format
                    const period = parseInt(hours, 10) < 12 ? 'AM' : 'PM';  // Determine AM/PM
                    firstFlightData.takeoff_time = `${formattedHours}:${minutes} ${period}`;


                    let seat_details = await flight_seat_mapping.findOne({ flight_id: getFirstBooking.flight_id })
                    for (let j = 1; j <= 8; j++) {
                        if (seat_details?.[`seat${j}_details`]?.user_id != undefined && seat_details?.[`seat${j}_details`]?.booking_id != undefined) {
                            if (seat_details?.[`seat${j}_details`]?.user_id.equals(user._id) && seat_details?.[`seat${j}_details`]?.booking_id.equals(firstbookingObjectId)) {
                                console.log('enter hogaya', firstbookingObjectId, user._id)
                                if (seat_details[`seat${j}_details`]['guest_id'] != undefined) {
                                    let getGuestDetails = await user_guest_mapping_modal.findOne({ _id: seat_details[`seat${j}_details`]['guest_id'] })
                                    if (getGuestDetails) {
                                        console.log('single flight 2')
                                        firstGuests.push({ guest_id: getGuestDetails._id, guest_name: getGuestDetails.guest_name, guest_phone_code: getGuestDetails.guest_phone_code, guest_phone: getGuestDetails.guest_phone })
                                    }
                                }
                            }
                        }
                    }

                    let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
                    for (let si = 0; si < firstGuests.length; si++) {
                        console.log('single flight 3')
                        //check valid country for twilio
                        const twilioCountry = await twilioCountryModel.findOne({ country_code: firstGuests[si].guest_phone_code });
                        if (twilioCountry) {
                            if (twilioCountry.colour == 'green') {
                                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                            } else if (twilioCountry.colour == 'blue') {
                                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                            } else if (twilioCountry.colour == 'yellow') {
                                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                            }
                        }
                        let toPhoneNumber = firstGuests[si].guest_phone_code + firstGuests[si].guest_phone; // The recipient's phone number
                        //if (process.env.NODE_ENV == 'production') {
                        client.messages
                            .create({
                                body: `Hey ${firstGuests[si].guest_name},  You're invited on ${user.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}.  Confirm by registering with this mobile phone number on the BLACK JET APP: https://blackjet.au/getapp`,
                                from: fromPhoneNumber,
                                to: toPhoneNumber,
                            })
                            .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                            .catch(error => console.error(`Error sending OTP: ${error.message}`));

                        //}
                    }
                }

            }

        }
        return successResponse(result, "Flight Booked Successfully!", res)

    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};

exports.pet_on_board_member_decision = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let booking_id = req.body.booking_id
        let user = req.payload
        let member_response = req.body.member_response//mandatory-->0,1
        let flight_id = req.body.flight_id//mandatory
        let requested_id = req.body.requested_id//mandatory
        const FlightObjectId = mongoose.Types.ObjectId(flight_id);
        let flight_seat_data = await flight_seat_mapping.aggregate([{
            $match: {
                flight_id: FlightObjectId

            }
        },
        {
            $lookup: {
                from: "flights",
                let: { flightID: "$flight_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$flightID"] },
                        }
                    },

                ],
                as: "flights",
            }
        }
        ])
        if (flight_seat_data[0]) {

            if (flight_seat_data[0].flights[0]) {
                let response_flag = 0
                let curr_date = dayjs().format("YYYY-MM-DD")
                let flight_takeoff_date = dayjs(flight_seat_data[0].flights[0].flight_takeoff_date).format("YYYY-MM-DD")
                if (flight_takeoff_date < curr_date) {
                    return failMessage("Flight is already taken off!", res)
                }
                if (flight_takeoff_date == curr_date) {
                    let takeoff_time = flight_seat_data[0].flights[0].takeoff_time

                    const currentDate = startDate;

                    // Get hours and minutes from the current date
                    const hours = String(currentDate.getHours()).padStart(2, '0');
                    const minutes = String(currentDate.getMinutes()).padStart(2, '0');

                    let takeoff_hours = takeoff_time.split(":")[0]
                    if (Number(takeoff_hours) <= Number(hours)) {
                        return failMessage("Flight is already taken off today!", res)

                    } else {
                        response_flag = 1
                    }
                }
                if (flight_takeoff_date > curr_date) {
                    response_flag = 1
                }
                if (response_flag == 1) {
                    let update_obj = {}, requested_bookingId
                    for (let i = 1; i <= 8; i++) {
                        if (flight_seat_data[0][`seat${i}_details`] && flight_seat_data[0][`seat${i}_details`].user_id && flight_seat_data[0][`seat${i}_details`].user_id == user._id.valueOf() && flight_seat_data[0][`seat${i}_details`].booking_id == booking_id) {
                            update_obj[`seat${i}_details.pet_request_accepted`] = member_response

                        }
                        if (flight_seat_data[0][`seat${i}_details`] && flight_seat_data[0][`seat${i}_details`].user_id && flight_seat_data[0][`seat${i}_details`].user_id == requested_id && flight_seat_data[0][`seat${i}_details`].booking_id) {
                            requested_bookingId = flight_seat_data[0][`seat${i}_details`].booking_id
                        }
                    }
                    await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                        $set: update_obj
                    }, { upsert: true, new: true })
                    await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                        decision_taken: true
                    }, { new: true })
                    //check whether all flight members have accepted the pet on board request or not
                    if (member_response == 0) {
                        await booking_modal.findByIdAndUpdate({ _id: requested_bookingId }, {
                            booking_status: "canceled"
                        }, { new: true })
                        //send notification to the requester that his pet on board request has been declined
                        send_notification.sendNotificationToRequester(requested_id, "reject", requested_bookingId)
                        //Empty the seat for cancelled booking
                        let update_reject = []
                        for (let i = 1; i <= 8; i++) {
                            if (flight_seat_data[0][`seat${i}_details`] && flight_seat_data[0][`seat${i}_details`].user_id == requested_id && flight_seat_data[0][`seat${i}_details`].booking_id == booking_id) {
                                update_reject.push({
                                    [`seat${i}`]: 0,
                                    [`seat${i}_details`]: {}
                                })
                            }
                        }
                        let booking_data = await booking_modal.findOne({ _id: requested_bookingId });
                        if (booking_data) {
                            if (booking_data.guest_pass_to_pet_pass > 0) {
                                let getUserDetails = await userModal.findOne({ _id: booking_data.user_id })
                                await userModal.findOneAndUpdate({ _id: booking_data.user_id, status: "active" }, {
                                    guest_passes: getUserDetails.guest_passes + Number(booking_data.guest_pass_to_pet_pass)
                                })
                            }
                        }

                    }
                    return successResponseWithoutData("Successfully fetch the Pet On Board response!", res)

                }
            } else {
                return emptyResponse(flight_seat_data[0].flights[0], res)

            }
        } else {
            return emptyResponse(flight_seat_data[0], res)

        }
    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.check_booking_status = async (req, res) => {
    try {
        let membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active" }, { updatedAt: 0, change_date: 0 })
        let membership_activated = false
        if (membership && membership.is_activate) membership_activated = true

        let booking_id = req.query.booking_id//required
        let booking_data = await booking_modal.findOne({ _id: booking_id })
        for (let seatDetail of booking_data.canceled_seat_details) {
            if (seatDetail.seat_details.guest_id) {
                seatDetail.seat_details.guest_id = await user_guest_mapping_modal.findById(seatDetail.seat_details.guest_id).select('-updatedAt -createdAt -__v');
            }
        }
        let membership_settings_model = await membership_settings.findOne({ "status": "active" })
        let show_activate_membership_button = false
        if (membership_settings_model?.activate_membership_button) {
            show_activate_membership_button = true
        }
        booking_data = { ...booking_data._doc, membership_activated, show_activate_membership_button }

        return successResponse(booking_data, "Data fetched successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.convert_guest_pass = async (req, res) => {
    try {
        let user = req.payload
        //minus 1 from guest pass and add 1 to pet pass
        let user_update = await userModal.findByIdAndUpdate({ _id: user._id }, {
            pet_passes: user.guest_pass_to_pet_pass + 1,
            guest_passes: user.guest_passes - 1
        }, { new: true })


        return successResponse(user_update, "Data fetched successfully!", res)


    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.makePaymentActive = async (req, res) => {
    try {
        let { id } = req.query

        //update all other users payment isActive to false
        await paymentModal.updateMany({ user_id: req.payload._id, status: "active" }, {
            isActive: false
        }, { new: true })

        //Update payment active status true for this id
        await paymentModal.findByIdAndUpdate({ _id: id }, {
            isActive: true
        }, { new: true })
        return successResponseWithoutData("Payment status activated successfully!", res)


    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.changePreference = async (req, res) => {
    try {
        let data;
        //Find the user preference data from preference table
        let userPreference = await prefernceModal.findOne({ user_id: req.payload._id })

        //If user preference is not present then create a new preference
        if (!userPreference) {
            //Adding user id for insertion in preference table
            req.body.user_id = req.payload._id
            //Add the whole request body in preference table
            data = await prefernceModal.create(req.body)
        }

        //Storing all the fields to an array
        const fieldsToUpdate = ['pushNotifications', 'locationFeature', 'SyncFlightWithCalendar', 'displayPreferences', 'automaticInvoiceToMail'];
        let updatedFields = {}
        fieldsToUpdate.forEach(field => {
            if (req.body[field] || req.body[field] == false) {
                updatedFields[field] = req.body[field];
            }
        });
        //Update the preference on the basis of user id and active status
        data = await prefernceModal.findOneAndUpdate({ user_id: req.payload._id, status: "active" }, updatedFields, { new: true })
        return successResponse(data, "Preferences added successfully!", res)


    } catch (err) {
        console.log("err-", err)
        return internalServerError('Internal Server Error', res);
    }
};
exports.getPreference = async (req, res) => {
    try {
        //Find the user preference data from preference table
        let data = await prefernceModal.findOne({ user_id: req.payload._id, status: "active" })

        // Check if data was found; if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        // Return a success response with the user preference details
        return successResponse(data, 'Data Fetched Successfully.', res);

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.viewAllLegal = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1; // Updated to 0-based index
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Create an aggregation pipeline to sort, skip, limit, and filter records
        const pipeline = [
            { $sort: { order: 1 } }, // Sort by 'order' in ascending order
            { $skip: offset }, // Skip records based on pagination
            { $limit: parsedLimit }, // Limit the number of records per page
            {
                $project: {
                    _id: 1,
                    legalTitle: '$legalTitle',
                    subTitle: 1
                },
            },
        ];

        // Execute the aggregation pipeline
        const legals = await legalModal.aggregate(pipeline);

        return successResponseWithPagination(legals, legals.length, 'Data Fetched Successfully.', res);
    } catch (error) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.viewAllFAQcategory = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Set default values for skip, limit, and sort
        const parsedSkip = skip ? parseInt(skip) : 1; // Default to the first page
        const parsedLimit = limit ? parseInt(limit) : 10; // Default page size to 10 categories

        // Calculate the number of records to skip
        const offset = (parsedSkip - 1) * parsedLimit;

        // Perform an aggregation query to retrieve category
        const data = await newCategoryModal.aggregate([
            {
                $project: {
                    name: 1,
                    image: 1,
                    _id: 1,
                    order: 1
                }
            },
            {
                $sort: { order: 1 } // Sort by 'order' in ascending order (latest first)
            },
            {
                $skip: offset
            },
            {
                $limit: parsedLimit
            }
        ]);

        //Getting by default "Popular Questions" category faq
        const popularQuestionFAQ = await newCategoryModal.aggregate([{
            $match: {
                name: "Popular Questions", status: "active"
            }
        },
        {
            $lookup: {
                from: "faqs", // Update to the correct collection name
                localField: "_id",
                foreignField: "category",
                as: "Popular_question_faq"
            }
        },
        {
            $unwind: "$Popular_question_faq" // Unwind the array to sort its elements
        },
        {
            $sort: {
                "Popular_question_faq.order": 1 // Sort by the 'order' field in ascending order
            }
        },
        {
            $group: {
                _id: "$_id", // Group by the _id of newCategoryModal documents
                name: { $first: "$name" }, // Preserve other fields from newCategoryModal
                status: { $first: "$status" },
                Popular_question_faq: { $push: "$Popular_question_faq" } // Push back sorted faqs
            }
        }

        ])
        //getting membership category faq
        const membershipQuestionFAQ = await newCategoryModal.aggregate([{
            $match: {
                name: "Membership", status: "active"
            }
        },
        {
            $lookup: {
                from: "faqs", // Update to the correct collection name
                localField: "_id",
                foreignField: "category",
                as: "Membership_question_faq"
            }
        },
        {
            $unwind: "$Membership_question_faq" // Unwind the array to sort its elements
        },
        {
            $sort: {
                "Membership_question_faq.order": 1 // Sort by the 'order' field in ascending order
            }
        },
        {
            $group: {
                _id: "$_id", // Group by the _id of newCategoryModal documents
                name: { $first: "$name" }, // Preserve other fields from newCategoryModal
                status: { $first: "$status" },
                Membership_question_faq: { $push: "$Membership_question_faq" } // Push back sorted faqs
            }
        }
        ])

        //getting Airport category faq
        const AirportQuestionFAQ = await newCategoryModal.aggregate([{
            $match: {
                name: "Airport", status: "active"
            }
        },
        {
            $lookup: {
                from: "faqs", // Update to the correct collection name
                localField: "_id",
                foreignField: "category",
                as: "Airport_question_faq"
            }
        },
        {
            $unwind: "$Airport_question_faq" // Unwind the array to sort its elements
        },
        {
            $sort: {
                "Airport_question_faq.order": 1 // Sort by the 'order' field in ascending order
            }
        },
        {
            $group: {
                _id: "$_id", // Group by the _id of newCategoryModal documents
                name: { $first: "$name" }, // Preserve other fields from newCategoryModal
                status: { $first: "$status" },
                Airport_question_faq: { $push: "$Airport_question_faq" } // Push back sorted faqs
            }
        }
        ])

        //getting Safety & Security category faq
        const SafetySecurityQuestionFAQ = await newCategoryModal.aggregate([{
            $match: {
                name: "Safety & Security", status: "active"
            }
        },
        {
            $lookup: {
                from: "faqs", // Update to the correct collection name
                localField: "_id",
                foreignField: "category",
                as: "Safety_Security_question_faq"
            }
        },
        {
            $unwind: "$Safety_Security_question_faq" // Unwind the array to sort its elements
        },
        {
            $sort: {
                "Safety_Security_question_faq.order": 1 // Sort by the 'order' field in ascending order
            }
        },
        {
            $group: {
                _id: "$_id", // Group by the _id of newCategoryModal documents
                name: { $first: "$name" }, // Preserve other fields from newCategoryModal
                status: { $first: "$status" },
                Safety_Security_question_faq: { $push: "$Safety_Security_question_faq" } // Push back sorted faqs
            }
        }
        ])

        //getting Booking Flights category faq
        const BookingFlightsQuestionFAQ = await newCategoryModal.aggregate([{
            $match: {
                name: "Booking Flights", status: "active"
            }
        },
        {
            $lookup: {
                from: "faqs", // Update to the correct collection name
                localField: "_id",
                foreignField: "category",
                as: "Booking_Flights_question_faq"
            }
        },
        {
            $unwind: "$Booking_Flights_question_faq" // Unwind the array to sort its elements
        },
        {
            $sort: {
                "Booking_Flights_question_faq.order": 1 // Sort by the 'order' field in ascending order
            }
        },
        {
            $group: {
                _id: "$_id", // Group by the _id of newCategoryModal documents
                name: { $first: "$name" }, // Preserve other fields from newCategoryModal
                status: { $first: "$status" },
                Booking_Flights_question_faq: { $push: "$Booking_Flights_question_faq" } // Push back sorted faqs
            }
        }
        ])

        //getting In-flight Experience category faq
        const InflightExperienceQuestionFAQ = await newCategoryModal.aggregate([{
            $match: {
                name: "In-flight Experience", status: "active"
            }
        },
        {
            $lookup: {
                from: "faqs", // Update to the correct collection name
                localField: "_id",
                foreignField: "category",
                as: "Inflight_Experience_question_faq"
            }
        },
        {
            $unwind: "$Inflight_Experience_question_faq" // Unwind the array to sort its elements
        },
        {
            $sort: {
                "Inflight_Experience_question_faq.order": 1 // Sort by the 'order' field in ascending order
            }
        },
        {
            $group: {
                _id: "$_id", // Group by the _id of newCategoryModal documents
                name: { $first: "$name" }, // Preserve other fields from newCategoryModal
                status: { $first: "$status" },
                Inflight_Experience_question_faq: { $push: "$Inflight_Experience_question_faq" } // Push back sorted faqs
            }
        }
        ])

        //getting What Lies Ahead category faq
        const WhatLiesAheadQuestionFAQ = await newCategoryModal.aggregate([{
            $match: {
                name: "What Lies Ahead", status: "active"
            }
        },
        {
            $lookup: {
                from: "faqs", // Update to the correct collection name
                localField: "_id",
                foreignField: "category",
                as: "What_Lies_Ahead_question_faq"
            }
        },
        {
            $unwind: "$What_Lies_Ahead_question_faq" // Unwind the array to sort its elements
        },
        {
            $sort: {
                "What_Lies_Ahead_question_faq.order": 1 // Sort by the 'order' field in ascending order
            }
        },
        {
            $group: {
                _id: "$_id", // Group by the _id of newCategoryModal documents
                name: { $first: "$name" }, // Preserve other fields from newCategoryModal
                status: { $first: "$status" },
                What_Lies_Ahead_question_faq: { $push: "$What_Lies_Ahead_question_faq" } // Push back sorted faqs
            }
        }
        ])

        if (data.length > 0) {
            data.forEach((data) => {
                //append popular Question FAQ
                if (popularQuestionFAQ[0]['_id'] == data._id.valueOf()) {
                    data.faq = popularQuestionFAQ[0]['Popular_question_faq']
                }
                //append membership Question FAQ
                if (membershipQuestionFAQ[0]['_id'] == data._id.valueOf()) {
                    data.faq = membershipQuestionFAQ[0]['Membership_question_faq']
                }
                //append Airport Question FAQ
                if (AirportQuestionFAQ[0]['_id'] == data._id.valueOf()) {
                    data.faq = AirportQuestionFAQ[0]['Airport_question_faq']
                }

                //append Safety & Security Question FAQ
                if (SafetySecurityQuestionFAQ[0]['_id'] == data._id.valueOf()) {
                    data.faq = SafetySecurityQuestionFAQ[0]['Safety_Security_question_faq']
                }

                //append Booking Flights Question FAQ
                if (BookingFlightsQuestionFAQ[0]['_id'] == data._id.valueOf()) {
                    data.faq = BookingFlightsQuestionFAQ[0]['Booking_Flights_question_faq']
                }

                //append In-flight_Experience Question FAQ
                if (InflightExperienceQuestionFAQ[0]['_id'] == data._id.valueOf()) {
                    data.faq = InflightExperienceQuestionFAQ[0]['Inflight_Experience_question_faq']
                }

                //append What Lies Ahead Question FAQ
                if (WhatLiesAheadQuestionFAQ[0]['_id'] == data._id.valueOf()) {
                    data.faq = WhatLiesAheadQuestionFAQ[0]['What_Lies_Ahead_question_faq']
                }
            })
        }
        // Send the FAQ data as a JSON response
        return successResponseWithPagination(data, data.length, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.viewFAQbasedOnCategory = async (req, res) => {
    try {
        // Perform an aggregation query to retrieve category
        const data = await faqModal.aggregate([
            {
                $match: {
                    category: mongoose.Types.ObjectId(req.query.id)
                }
            },
            {
                $project: {
                    question: 1,
                    answer: 1,
                    _id: 1
                }
            },
            {
                $sort: { _id: -1 } // Sort by '_id' in descending order (latest first)
            }
        ]);

        // Send the FAQ data as a JSON response
        return successResponseWithPagination(data, data.length, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.AddContactUs = async (req, res) => {
    try {
        const { FullName, email, phone, enquiry, subject, enquiryDetails } = req.body
        //getting first middel last name from fullName
        const attrs = human.parseName(FullName);
        let middle_name = attrs.middleName ? ' ' + attrs.middleName : ''; //middel name
        let firstName = `${attrs.firstName}${middle_name}`; // first and middel name if exist
        let lastName = attrs.lastName ? attrs.lastName : ''; //last name

        // Perform an aggregation query to retrieve category
        // const data = await usercontactModal.create({
        //     FullName, email, phone, enquiry, subject, enquiryDetails, user_id: req.payload?._id
        // });

        // const getAdminMail = await contactModal.findOne()
        // if (getAdminMail && getAdminMail.email) {
        //     await mail.sendMail({ email: getAdminMail.email, body: `User data-> ${data}` })

        // }
        let acctType = req.body.acctType;
        if (acctType == '' || acctType == undefined) {
            acctType = 'public_user';
        }
        // Fetch the type from the enquiryList table based on the relatedEnquiry ID
        const relatedEnquiryInfo = await enquiryListModal.findOne({ name: enquiry });

        if (!relatedEnquiryInfo) {
            // Handle the case where the relatedEnquiry ID is not found
            return notFoundResponse('Related Enquiry not found', res);
        }
        // Create a new ENQUIRY document
        const newEnquiry = new enquiryModal({
            firstName,
            lastName,
            email,
            phone,
            subject,
            acctType, //account type full_member or public_user
            relatedEnquiry: relatedEnquiryInfo._id,
            type: relatedEnquiryInfo.type,
            enQuiry: enquiryDetails
        });

        // Save the new Enquiry to the database
        await newEnquiry.save();

        //mail content 
        let mailData = {
            firstName,//enquiry sender first name
            lastName,//enquiry sender last name
            email,//enquiry sender email ID
            phone,//enquiry sender phone
            subject,// enquiry for
            acctType,//account type full_member or public_user
            enQuiry: enquiryDetails, //enquiry message
            category: enquiry,//enquiry type
            termlink: process.env.TERMOFUSELINK,
            privacylink: process.env.PRIVACYLINK
        }
        //Send acknowledgement mail to user 
        await mail.sendMailEnquiry(mailData)

        // Send the FAQ data as a JSON response
        return successResponse(newEnquiry, 'Data Added Successfully.', res);
    } catch (error) {
        console.log(error)
        // Handle errors and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.getUserTransaction = async (req, res) => {
    try {
        let data = await transactionModal.find({ userId: req.payload._id.valueOf(), status: "active" }).sort({ createdAt: -1 });

        return successResponse(data, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.AddMembership = async (req, res) => {
    try {
        // Get the current date and adjust timezone
        const current_Date = new Date();
        const startDate = new Date(current_Date);
        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        const { name, price, membership_id } = req.body;
        let currentDate = startDate;
        let priceValue;
        let initiationFee;
        await userMembershipModal.updateMany({ payIntId: '' })
        // Find user's active card
        let userCard = await paymentModal.find({ userId: req.payload._id, status: "active" });

        // Return error if user doesn't have an active card
        if (!userCard || userCard.length === 0) {
            return failMessage('Please activate or add your card details!', res);
        }

        // Find user's active membership
        let userMembership = await userMembershipModal.find({ user_id: req.payload._id, status: "active" });

        // Return error if user already has an active membership
        if (userMembership.length > 0) {
            return failMessage('User has already an active membership!', res);
        }

        // Find membership details
        let membershipData = await membershipModal.findOne({ _id: membership_id, status: "active" });

        // Return error if no membership found
        if (!membershipData) return failMessage('No membership found!', res);

        // Check if it's the first time initiation
        // let firstTimeInitiation = await transactionModal.findOne({
        //     user_id: req.payload._id,
        //     type: "Initiation and Verification Fee",
        //     status: "inactive"
        // });
        let membershipSettings = {};
        membershipSettings = await membership_settings.findOne({ status: 'active' })

        // Determine membership type or set default
        let membershipType = membershipData.type || 1; // by default we are using 1

        // Initialize variables for initiation fees and latest price
        let initiationFees = price, latest_Price;

        // Find the prices with effective dates after the current UTC date and time
        const prices = await priceModal.find({
            status: "active",
            membership: membership_id,
            effectiveDate: { $lte: currentDate }, // Only select prices with effective dates less than or equal to the current UTC time
            $or: [
                { effectiveEndDate: null }, // Select prices with no effective end date
                { effectiveEndDate: { $gt: currentDate } } // Select prices with effective end dates greater than the current UTC time
            ]
        }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date

        // Return error if no prices found
        if (!prices || prices.length === 0) {
            return notFoundResponse('Price not found', res);
        }

        // Get the latest price based on descending order of effective date
        const currentPrice = prices[0];

        // Extract the price value and initiation fees from the current price
        priceValue = currentPrice.price;
        initiationFee = currentPrice.initiationFees;

        // Find active discounts for the membership
        const activeDiscounts = await discountModal.find({
            membership_id,
            status: 'active',
            $or: [
                {
                    start_date: { $lte: currentDate },
                    end_date: { $gte: currentDate }
                },
                {
                    start_date: { $lte: currentDate },
                    end_date: null
                }
            ]
        }).sort({ start_date: -1 });

        // Find and update the smallest discount
        const smallestDiscount = await commonservices.findSmallestDiscount(activeDiscounts);

        // Apply smallest discount if available
        if (smallestDiscount?.smallestDiscount?.discount_price) {
            initiationFees = smallestDiscount.initiation_fees ? smallestDiscount.initiation_fees : initiationFee;
            latest_Price = parseFloat(smallestDiscount.smallestDiscount.discount_price);
            // Update used seats in the discount tier
            await discountModal.updateOne(
                { _id: smallestDiscount.discountId, 'tier._id': smallestDiscount.smallestTierId },
                { $inc: { 'tier.$.used_seats': -1 } },
                { new: true }
            );
        } else {
            latest_Price = priceValue;
            initiationFees = smallestDiscount.initiation_fees ? smallestDiscount.initiation_fees : initiationFee;
        }

        // Add 1 month to the renewal date
        let renewal_date = currentDate.setMonth(currentDate.getMonth() + 1);
        console.log(initiationFee, 'initiationFee');
        console.log(initiationFees, 'initiationFees');

        // Calculate price with initiation fees
        const priceNumber = Number(initiationFees);
        const firstInitiationFees = membershipSettings.preOrder == false ? Number(priceNumber) : 0;
        const priceWithInitiation = Number(latest_Price) + firstInitiationFees;

        // Create payment using the createPayment function
        const result = await createPayment({
            userId: req.payload._id,
            name,
            priceWithInitiation,
            price: latest_Price,
            normalPrice: priceValue,
            normalInitiationFees: initiationFee,
            initiationFees: initiationFees,
            id: membership_id,
            currency: "AUD",
            type: "Membership" // Static type for API calls
        });
        // Handle payment failure
        if (!result.success) {
            return failMessage(result.message, res);
        }
        // Record initiation fee transaction
        let transationId = await transactionModal.create({
            userId: req.payload._id,
            type: "Initiation and Verification Fee",
            purchaseTransactionId: membership_id,
            image: process.env.MEMBERSHIPLOGO,
            name: "Initiation and Verification Fee",
            normalPrice: priceValue,
            normalInitiationFees: initiationFee,
            initiationFees: initiationFees,
            price: membershipSettings.preOrder == false ? initiationFees : '0'
        });

        const data = await userMembershipModal.create(
            {
                user_id: req.payload._id,
                name,
                price: latest_Price,
                normalPrice: priceValue,
                renewal_date: new Date(renewal_date),
                membership_id,
                isAutoRenew: true,
                is_activate: membershipSettings.preOrder == false ? true : false,
                type: membershipType,
                payIntId: result?.data?.transactionId
            }
        );
        if (!membershipSettings.preOrder) {
            // Find the referral document for the user
            const referDoc = await referModal.findOne({
                $or: [
                    { user_id: req.payload._id },
                    { send_to: req.payload._id }
                ]
            });


            let sendTo = {};
            const sendBy = await userModal.findOne({ _id: referDoc?.user_id, status: "active" });

            if (referDoc?.send_to) {
                // Find the user being referred to (sendTo)
                sendTo = await userModal.findOne({ _id: referDoc?.send_to, status: "active" });
            }


            // Check if sendTo has an active membership
            const sendByMembership = await userMembershipModal.findOne({ user_id: sendBy?._id, status: "active" });
            const sendToMembership = sendTo?._id ? await userMembershipModal.findOne({ user_id: sendTo?._id, status: "active" }) : null;

            if (sendByMembership && sendByMembership.is_activate && sendToMembership && sendToMembership.is_activate) {
                // Update referral status to 'redeem'
                await referModal.findByIdAndUpdate(
                    referDoc?._id,
                    {
                        refer_status: 'redeem',
                        send_to_refer: 'redeem',
                        send_by_refer: 'redeem'
                    },
                    { new: true }
                );
            }
        }
        // Initialize perks and transactions arrays based on membership type
        let perks = {};
        let transactions = [];
        //condition for memmbership type
        if (membershipType == 1) {
            // Set perks and transactions for membership type 1
            perks = { reusable_bookings: 2 };
            transactions.push({
                user_id: req.payload._id,
                type: "Membership Perk",
                membership_id,
                image: process.env.GUESTPASSLOGO,
                name: "+1 Guest Pass"
            });
        } else if (membershipType == 2) {
            // Set perks and transactions for membership type 2
            perks = { reusable_bookings: 4 };
            transactions.push(
                {
                    user_id: req.payload._id,
                    type: "Membership Perk",
                    membership_id,
                    image: process.env.GUESTPASSLOGO,
                    name: "+2 Guest Passes"
                },
                {
                    user_id: req.payload._id,
                    type: "Membership Perk",
                    membership_id,
                    image: process.env.RESETVOUCHERLOGO,
                    name: "+4 Reset Vouchers"
                }
            );
        }
        // if (updatedUser) {
        //     // Update the reset vouchers transaction with the correct count
        //     transactions.forEach(transaction => {
        //         if (transaction.name.includes("Reset Vouchers")) {
        //             transaction.reset_voucher = updatedUser.reset_vouchers;
        //         }
        //     });

        //     await transactionModal.insertMany(transactions);
        // }

        // Update user perks based on membership type
        const updatedUser = await userModal.findOneAndUpdate(
            { _id: req.payload._id, status: "active" },
            perks,
            { new: true }
        );

        let businessName;
        let abn;

        // Find user's active card
        let userCardInfo = await cardModal.findOne({ _id: transationId.cardId });
        if (userCardInfo) {
            businessName = userCardInfo.businessName;
            abn = userCardInfo.abn;
        }
        // current date
        const date = new Date();
        // Extract the year, month, and day
        const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month and pad with leading zero if necessary
        const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary

        //Concatenate the parts
        const formattedDate = year[0] + month[0] + day[0] + year[1] + month[1] + day[1];
        //invoice number 
        let invoiceNo = formattedDate + '-' + randomize('0', 3);
        //reverse gst calculation
        let reverseGST = parseFloat(latest_Price) * 100 / (100 + 10);
        let gst = parseFloat(latest_Price) - parseFloat(reverseGST);
        gst = gst.toFixed(2);
        //current date
        let nowDate = new Date();
        let currdate = nowDate.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
        //renewal date
        let renewData = new Date(renewal_date);
        let renewalDateInfo = renewData.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
        //discount price
        let discountPriceVal = parseFloat(priceValue) - parseFloat(latest_Price);
        //invoice dta
        let invoiceData = {
            discountPriceVal: latest_Price,//discount amount
            latest_Price: priceWithInitiation,//with discount price
            priceValue,// without discount price
            initiationFee,//without discount
            initiationFees,//with discount
            renewalDateInfo,//renewal date
            currdate,//current date
            gst,//reverse gst
            name,//membership name
            invoiceNo, //invoice number,
            businessName: businessName || '',//customer business name
            abn: abn || '',//customer abn
        }
        //generating invoice pdf 
        let generatedFileName = await genratePdf.generateMembershipInvoicePdf(invoiceData, req.payload);
        //adding invoice info with 
        await transactionModal.findByIdAndUpdate({ _id: transationId?._id }, {
            invoiceNumber: invoiceNo,
            invoiceUrl: generatedFileName
        }, { new: true })

        if (result?.data?._id) {
            //adding invoice info with 
            await transactionModal.findByIdAndUpdate({ _id: result?.data?._id }, {
                invoiceNumber: invoiceNo,
                invoiceUrl: generatedFileName
            }, { new: true })
        }
        // Send invoice email if user preference is enabled
        let preference = await prefernceModal.findOne({ user_id: req.payload._id, status: "active" });
        if (preference?.automaticInvoiceToMail) {
            //const generatedFileName = await generateInvoice(result, req.payload);

            await mail.sendMailMembershipInvoice({
                email: req.payload.email,
                file: generatedFileName
            });

        }
        let responseData = await membershipModal.findOneAndUpdate({ _id: membership_id, status: "active" }, {
            noOfSeats: membershipData.noOfSeats + 1
        });
        return successResponse(data, 'Payment added', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.getUserMembership = async (req, res) => {
    try {
        let data = await userMembershipModal
            .find({ user_id: req.payload._id.valueOf(), status: "active" },
                { _id: 0 }
            )
            .sort({ createdAt: -1 })
            .limit(1);

        if (data.length === 0) {
            // Handle the case when no data is found
            return emptyResponse(data, res);
        }
        let result;
        const membershipData = data[0];
        if (membershipData.type === 1) {
            result = {
                isUpgraded: true,
                data: {
                    membership_id: membershipData.membership_id,
                    name: membershipData.name,
                    price: membershipData.changed_price ? membershipData.changed_price : membershipData.price,
                    normalPrice: membershipData.normalPrice || "",
                    renewal_date: membershipData.renewal_date,
                    isAutoRenew: membershipData.isAutoRenew,
                    purchase_date: (membershipData.createdAt ? membershipData.createdAt : ""),
                    isDowngradeRequested: (membershipData.isDowngradeRequested ? membershipData.isDowngradeRequested : false)

                }
            };
        } else {
            result = {
                isUpgraded: false,
                data: {
                    membership_id: membershipData.membership_id,
                    name: membershipData.name,
                    price: membershipData.changed_price ? membershipData.changed_price : membershipData.price,
                    normalPrice: membershipData.normalPrice || "",
                    renewal_date: membershipData.renewal_date,
                    isAutoRenew: membershipData.isAutoRenew,
                    purchase_date: (membershipData.createdAt ? membershipData.createdAt : false),
                    isDowngradeRequested: (membershipData.isDowngradeRequested ? membershipData.isDowngradeRequested : false)


                }
            };
        }

        return successResponse(result, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.getBoutique = async (req, res) => {
    try {
        const currentDate = new Date(); // Get the current date and time

        // Fetch all active boutiques
        const boutiques = await boutiqueModal.find({ status: 'active' });

        // Get details of prices for the active boutiques
        const boutiqueIds = boutiques.map(boutique => boutique._id);
        const boutiqueDetails = await priceModal.find({
            boutique: { $in: boutiqueIds },
            status: 'active'
        }, 'boutique effectiveEndDate effectiveDate initiationFees price').lean();

        // Process the item details to get the desired response
        const processedBoutiques = boutiques.map(boutique => {
            const validDetails = boutiqueDetails.filter(detail =>
                detail.boutique.equals(boutique._id) &&
                detail.effectiveDate <= currentDate &&
                detail.effectiveEndDate >= currentDate
            );

            if (validDetails.length > 0) {
                const currentDetails = validDetails.sort((a, b) => b.effectiveDate - a.effectiveDate)[0];
                const currentPrice = currentDetails.price;
                const initiationFees = currentDetails.initiationFees;
                const effectiveDate = currentDetails.effectiveDate;
                const effectiveEndDate = currentDetails.effectiveEndDate;

                return {
                    _id: boutique._id,
                    name: boutique.name,
                    card_title: boutique.card_title,
                    card_content: boutique.card_content,
                    product_set: boutique.product_set,
                    flash_sale: boutique.flash_sale,
                    sale_start_date_time: boutique.sale_start_date_time,
                    sale_end_date_time: boutique.sale_end_date_time,
                    no_of_month: boutique.no_of_month,
                    status: boutique.status,
                    membership: boutique.membership,
                    initiationFees: initiationFees,
                    latestPrice: currentPrice,
                    effectiveDate: effectiveDate,
                    effectiveEndDate: effectiveEndDate
                };
            }
        }).filter(Boolean);

        // Adjust price if there's a flash sale
        processedBoutiques.forEach(data => {
            if (data.flash_sale && data.sale_start_date_time <= currentDate && data.sale_end_date_time >= currentDate) {
                data.latestPrice = data.discount_price || data.latestPrice;
            }
        });

        if (processedBoutiques.length <= 0) return notFoundResponse('Boutique item not found', res);

        return successResponse(processedBoutiques, 'Boutique Item fetched successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.getHTMLContent = async (req, res) => {
    try {

        const data = await app_static_contentModal.findOne({ type: req.query.type })
        if (!data) return emptyResponse(data, res);

        // Return a success response with data
        return successResponse(data, 'Data fetched successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
function convertTo24HourFormat(time12h) {
    const regex = /(\d{1,2}):(\d{2})([ap]m)/i;
    const match = time12h.match(regex);
    if (!match) return null; // Invalid time format

    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const modifier = match[3].toLowerCase();

    if (modifier === 'pm' && hour !== 12) {
        hour += 12;
    }
    if (modifier === 'am' && hour === 12) {
        hour = 0;
    }

    return hour.toString().padStart(2, '0') + ':' + minute;
}

exports.purchaseGiftCard = async (req, res) => {

    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let { giftcardName, giftCard_id, recipient_name, recipient_number, recipient_phone_code = "", recipient_country_code = "", recipient_message, delivery_date, delivery_time, price } = req.body
        let code = commonservices.generateUniqueNumber()

        //check valid country for twilio
        const twilioCountry = await twilioCountryModel.findOne({ country_code: recipient_phone_code });
        if (!twilioCountry) {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${recipient_phone_code} country code`, res)
        }
        let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
        //red mean we are not support phone code, green,blue and yellow means different sender number 
        if (twilioCountry.colour == 'red') {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${recipient_phone_code} country code`, res)
        } else if (twilioCountry.colour == 'green') {
            fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
        } else if (twilioCountry.colour == 'blue') {
            fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
        } else if (twilioCountry.colour == 'yellow') {
            fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
        }
        // Find the prices with effective dates after the current UTC date and time
        const prices = await priceModal.find({
            status: "active",
            boutique: giftCard_id,
            effectiveDate: { $lte: startDate }, // Only select prices with effective dates less than or equal to the current UTC time
            $or: [
                { effectiveEndDate: null }, // Select prices with no effective end date
                { effectiveEndDate: { $gt: startDate } } // Select prices with effective end dates greater than the current UTC time
            ]
        }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date

        if (!prices || prices.length === 0) {
            // If no prices are found, send a response indicating that no price is available
            return notFoundResponse('Price not found', res);
        }

        // Get the latest price based on descending order of effective date
        const currentPrice = prices[0];

        // Extract the price value and initiation fees from the current price
        let priceValue = currentPrice.price;
        let initiationFees = currentPrice.initiationFees;
        //Add transaction
        const transaction = await createPayment({
            userId: req.payload._id,
            type: "Gift Card",
            name: giftcardName,
            purchaseTransactionId: giftCard_id,
            boutiqueId: giftCard_id,
            price: priceValue,
            image: process.env.BOUTIQUELOGO,
            details: {
                recipient_name,
                recipient_number,
                recipient_phone_code,
                recipient_country_code,
                recipient_message,
                delivery_date,
                delivery_time,
                code
            },
            currency: "AUD",
        });

        // Handle payment failure
        if (!transaction.success) {
            return failMessage(transaction.message, res);
        };

        //Getting user prefernces
        let preference = await prefernceModal.findOne({ user_id: req.payload._id, status: "active" })
        if (preference && preference.automaticInvoiceToMail) {
            //send Invoice to email
            const generatedFileName = await generateInvoice(transaction, req.payload);

            // After PDF generation completes, send the email
            await mail.sendMailInvoice({
                email: req.payload.email,
                file: generatedFileName
            });

        }
        let newUserGiftCard = await userGiftCard.create({
            giftedBy: req.payload._id,
            boutiqueId: giftCard_id,
            recipient_name,
            recipient_number,
            recipient_phone_code,
            recipient_country_code,
            recipient_message,
            delivery_date,
            delivery_time,
            price: priceValue,
            code,
            transactionId: transaction?.data?._id
        })

        if (delivery_date && delivery_time) {

            const deliveryDateTime = new Date(`${delivery_date}T${convertTo24HourFormat(delivery_time)}`);
            const currentDateTime = startDate;
            const timeDifference = deliveryDateTime.getTime() - currentDateTime.getTime();
            //set timeout function
            function setLongTimeOut(callback, timeout) {
                const maxDelay = 2 ** 31 - 1
                if (timeout > maxDelay) {
                    let expectedTick = Math.ceil(timeout / maxDelay)
                    const id = setInterval(() => {
                        if (!--expectedTick) {
                            callback()
                            clearInterval(id)
                        }
                    }, timeout / expectedTick)
                    return id
                }
                return setTimeout(callback, timeout)
            }
            const TimeOutId = setLongTimeOut(async () => {
                //sending sms
                //if (process.env.NODE_ENV == 'production') {
                client.messages
                    .create({
                        body: `Hey ${recipient_name}, ${req.payload.fullName} gifted you a Black Jet Membership!  Redeem your gift at gift.blackjet.au/${newUserGiftCard._id}`,
                        from: fromPhoneNumber,
                        to: recipient_phone_code + recipient_number,
                    })
                    .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    .catch(error => console.error(`Error sending OTP: ${error.message}`));
                //}
            }, timeDifference);

            await transactionModal.findByIdAndUpdate({ _id: transaction?.data?._id }, {
                timeOutId: TimeOutId
            }, { new: true })
        } else {
            //sending sms
            //if (process.env.NODE_ENV == 'production') {
            client.messages
                .create({
                    body: `Hey ${recipient_name}, ${req.payload.fullName} gifted you a Black Jet Membership!  Redeem your gift at gift.blackjet.au/${newUserGiftCard._id}`,
                    from: fromPhoneNumber,
                    to: recipient_phone_code + recipient_number,
                })
                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                .catch(error => console.error(`Error sending OTP: ${error.message}`));
            //}

        }


        // Return a success response with data
        return successResponse(transaction, 'Gift Card Purchase successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.resendGiftCard = async (req, res) => {

    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let transaction_id = req.query.id
        // let code = commonservices.generateUniqueNumber()
        let transaction_details = await transactionModal.findOne({ _id: transaction_id, status: "active" })
        if (!transaction_details) return failMessage('No transaction found!', res)
        let newUserGiftCard = await userGiftCard.findOne({
            giftedBy: req.payload._id,
            boutiqueId: transaction_details.boutique_id,
            transactionId: transaction_details._id
        })
        if (!newUserGiftCard) return failMessage('No Gift Card found!', res)
        //Getting user prefernces
        let preference = await prefernceModal.findOne({ user_id: req.payload._id, status: "active" })
        if (preference && preference.automaticInvoiceToMail) {
            //send Invoice to email
            const generatedFileName = await generateInvoice(transaction, req.payload);

            // After PDF generation completes, send the email
            await mail.sendMailInvoice({
                email: req.payload.email,
                file: generatedFileName
            });

        }
        //check valid country for twilio
        const twilioCountry = await twilioCountryModel.findOne({ country_code: transaction_details.details.recipient_phone_code });
        if (!twilioCountry) {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${transaction_details.details.recipient_phone_code} country code`, res)
        }
        let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
        //red mean we are not support phone code, green,blue and yellow means different sender number 
        if (twilioCountry.colour == 'red') {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${transaction_details.details.recipient_phone_code} country code`, res)
        } else if (twilioCountry.colour == 'green') {
            fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
        } else if (twilioCountry.colour == 'blue') {
            fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
        } else if (twilioCountry.colour == 'yellow') {
            fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
        }
        if (transaction_details.details.delivery_date && transaction_details.details.delivery_time) {
            const deliveryDateTime = new Date(`${transaction_details.details.delivery_date}T${transaction_details.details.delivery_time}`);
            const currentDateTime = startDate;
            const timeDifference = deliveryDateTime.getTime() - currentDateTime.getTime();
            function setLongTimeOut(callback, timeout) {
                const maxDelay = 2 ** 31 - 1
                if (timeout > maxDelay) {
                    let expectedTick = Math.ceil(timeout / maxDelay)
                    const id = setInterval(() => {
                        if (!--expectedTick) {
                            callback()
                            clearInterval(id)
                        }
                    }, timeout / expectedTick)
                    return id
                }
                return setTimeout(callback, timeout)
            }
            const TimeOutId = setLongTimeOut(async () => {
                //sending sms
                //if (process.env.NODE_ENV == 'production') {
                client.messages
                    .create({
                        body: `Hey ${transaction_details.details.recipient_name}, ${req.payload.fullName} gifted you a Black Jet Membership!  Redeem your gift at gift.blackjet.au/${newUserGiftCard._id}`,
                        from: fromPhoneNumber,
                        to: transaction_details.details.recipient_phone_code + transaction_details.details.recipient_number,
                    })
                    .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    .catch(error => console.error(`Error sending OTP: ${error.message}`));
                //}
            }, timeDifference);

            await transactionModal.findByIdAndUpdate({ _id: transaction_details._id }, {
                timeOutId: TimeOutId
            }, { new: true })
        } else {
            //sending sms
            //if (process.env.NODE_ENV == 'production') {
            client.messages
                .create({
                    body: `Hey ${transaction_details.details.recipient_name}, ${req.payload.fullName} gifted you a Black Jet Membership!  Redeem your gift at gift.blackjet.au/${newUserGiftCard._id}`,
                    from: fromPhoneNumber,
                    to: transaction_details.details.recipient_phone_code + transaction_details.details.recipient_number,
                })
                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                .catch(error => console.error(`Error sending OTP: ${error.message}`));
            //}

        }


        // Return a success response with data
        return successResponse(transaction_details, 'Gift Card Resend successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.editGiftCard = async (req, res) => {

    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let { transaction_id, recipient_name, recipient_number, recipient_phone_code, recipient_country_code, recipient_message, delivery_date, delivery_time } = req.body
        //Get transaction
        let transaction = await transactionModal.findOne({ _id: transaction_id, status: "active" });
        let userGiftCards = await userGiftCard.findOne({
            transactionId: transaction_id, status: "active"
        })
        if (!transaction || !userGiftCards) {
            return failMessage('Invalid Gift Card!', res)
        }

        let updatedObj = { details: transaction.details }
        let userGiftCardObj = {}

        if (recipient_name) {
            userGiftCardObj.recipient_name = recipient_name
            updatedObj.details.recipient_name = recipient_name

        }
        if (recipient_number && recipient_phone_code && recipient_country_code) {
            userGiftCardObj.recipient_number = recipient_number
            userGiftCardObj.recipient_phone_code = recipient_phone_code
            userGiftCardObj.recipient_country_code = recipient_country_code
            updatedObj.details.recipient_number = recipient_number
            updatedObj.details.recipient_phone_code = recipient_phone_code
            updatedObj.details.recipient_country_code = recipient_country_code
        }
        if (recipient_message) {
            userGiftCardObj.recipient_message = recipient_message
            updatedObj.details.recipient_message = recipient_message

        }
        if (delivery_date && delivery_time) {
            updatedObj.details.delivery_date = delivery_date
            updatedObj.details.delivery_time = delivery_time
            userGiftCardObj.delivery_date = delivery_date
            userGiftCardObj.delivery_time = delivery_time
            const deliveryDateTime = new Date(`${delivery_date}T${convertTo24HourFormat(delivery_time)}`);
            const currentDateTime = startDate;
            const timeDifference = deliveryDateTime.getTime() - currentDateTime.getTime();
            //check valid country for twilio
            const twilioCountry = await twilioCountryModel.findOne({ country_code: recipient_phone_code });
            if (!twilioCountry) {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${recipient_phone_code} country code`, res)
            }
            let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
            //red mean we are not support phone code, green,blue and yellow means different sender number 
            if (twilioCountry.colour == 'red') {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${recipient_phone_code} country code`, res)
            } else if (twilioCountry.colour == 'green') {
                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
            } else if (twilioCountry.colour == 'blue') {
                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
            } else if (twilioCountry.colour == 'yellow') {
                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
            }
            function setLongTimeOut(callback, timeout) {
                const maxDelay = 2 ** 31 - 1
                if (timeout > maxDelay) {
                    let expectedTick = Math.ceil(timeout / maxDelay)
                    const id = setInterval(() => {
                        if (!--expectedTick) {
                            callback()
                            clearInterval(id)
                        }
                    }, timeout / expectedTick)
                    return id
                }
                return setTimeout(callback, timeout)
            }
            const TimeOutId = setLongTimeOut(async () => {
                //sending sms
                //if (process.env.NODE_ENV == 'production') {
                client.messages
                    .create({
                        body: `Hey ${recipient_name || transaction.recipient_name}, ${req.payload.fullName} gifted you a Black Jet Membership!  Redeem your gift at gift.blackjet.au/${userGiftCards._id}`,
                        from: fromPhoneNumber,
                        to: (recipient_phone_code || transaction.recipient_phone_code) + (recipient_number || transaction.recipient_number),
                    })
                    .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                    .catch(error => console.error(`Error sending OTP: ${error.message}`));
                //}
            }, timeDifference);

            await transactionModal.findByIdAndUpdate({ _id: transaction?._id }, {
                timeOutId: TimeOutId
            }, { new: true })
        }
        await transactionModal.findOneAndUpdate({ _id: transaction?._id }, updatedObj)
        await userGiftCard.findOneAndUpdate({ _id: userGiftCards._id }, userGiftCardObj)

        // Return a success response
        return successResponseWithoutData('Gift Card updated successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.rescheduleDeliveryTime = async (req, res) => {

    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let { transaction_id,
            delivery_date,
            delivery_time } = req.body

        let transaction = await transactionModal.findOne({ _id: transaction_id })
        if (!transaction) {
            return emptyResponse(transaction, res);
        }

        clearTimeout(transaction.timeOutId)
        const deliveryDateTime = new Date(`${delivery_date}T${convertTo24HourFormat(delivery_time)}`);
        const currentDateTime = startDate;
        const timeDifference = deliveryDateTime.getTime() - currentDateTime.getTime();
        //check valid country for twilio
        const twilioCountry = await twilioCountryModel.findOne({ country_code: transaction.details.recipient_phone_code });
        if (!twilioCountry) {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${transaction.details.recipient_phone_code} country code`, res)
        }
        let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
        //red mean we are not support phone code, green,blue and yellow means different sender number 
        if (twilioCountry.colour == 'red') {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${transaction.details.recipient_phone_code} country code`, res)
        } else if (twilioCountry.colour == 'green') {
            fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
        } else if (twilioCountry.colour == 'blue') {
            fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
        } else if (twilioCountry.colour == 'yellow') {
            fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
        }
        function setLongTimeOut(callback, timeout) {
            const maxDelay = 2 ** 31 - 1
            if (timeout > maxDelay) {
                let expectedTick = Math.ceil(timeout / maxDelay)
                const id = setInterval(() => {
                    if (!--expectedTick) {
                        callback()
                        clearInterval(id)
                    }
                }, timeout / expectedTick)
                return id
            }
            return setTimeout(callback, timeout)
        }
        const TimeOutId = setLongTimeOut(async () => {
            //send sms
            //if (process.env.NODE_ENV == 'production') {
            client.messages
                .create({
                    body: `Hey ${transaction.details.recipient_name}, ${req.payload.fullName} gifted you a Black Jet Membership!  Redeem your gift at gift.blackjet.au/2dbw2d9gw`,
                    from: fromPhoneNumber,
                    to: transaction.details.recipient_phone_code + transaction.details.recipient_number,
                })
                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                .catch(error => console.error(`Error sending OTP: ${error.message}`));
            //}
        }, timeDifference);

        let addTimeOutId = await transactionModal.findByIdAndUpdate({ _id: transaction_id }, {
            timeOutId: TimeOutId, 'details.delivery_date': delivery_date, 'details.delivery_time': delivery_time
        }, { new: true })

        await userGiftCards.findOneAndUpdate({ transactionId: transaction_id }, {
            delivery_date, delivery_time
        })
        // Return a success response with data
        return successResponse(addTimeOutId, 'Reschedule successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
async function generateInvoice(transaction, user) {
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setHours(startDate.getHours() + 10);
    //startDate.setMinutes(startDate.getMinutes() + 30);
    const pdfPromise = new Promise(async (resolve, reject) => {
        try {
            // Create a new PDF document
            const doc = new PDFDocument();

            // Pipe the PDF content to a buffer
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // PDF content generation
            doc.fontSize(18).text('Invoice', { align: 'center' }).moveDown(0.5);
            const invoice = {
                id: 'INV-001',
                date: startDate.toLocaleDateString(),
                customer: {
                    name: user.fullName,
                    address: '',
                    email: user.email,
                },
                items: [
                    { description: transaction.name, price: transaction.price },
                ],
            };
            doc.fontSize(12).text(`Invoice ID: ${invoice.id}`);
            doc.fontSize(12).text(`Invoice Date: ${invoice.date}`);
            doc.moveDown();
            // Customer information
            doc.fontSize(14).text('Customer Information:');
            doc.fontSize(12).text(`Name: ${invoice.customer.name}`);
            doc.fontSize(12).text(`Email: ${invoice.customer.email}`);
            doc.moveDown();
            doc.fontSize(14).text('Invoice Items:');
            doc.moveDown(0.5);
            const tableHeaders = ['Description', 'Price'];
            const tableRows = [[transaction.name, `$${transaction.price}`]];
            // Calculate table column widths
            const columnWidths = [250, 100]; // Adjust the widths as needed

            // Define starting position for the table
            const startY = 250; // Adjust the starting Y position as needed
            let currentY = startY;
            tableHeaders.forEach((header, i) => {
                doc.text(header, columnWidths[i], currentY, { width: columnWidths[i], align: 'left' });
            });
            currentY += 20; // Move down after headers
            // Draw table rows
            tableRows.forEach(row => {
                row.forEach((cell, i) => {
                    doc.text(cell, columnWidths[i], currentY, { width: columnWidths[i], align: 'left' });
                });
                currentY += 20; // Move down after each row
            });

            // End the document
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
    return pdfPromise
}
exports.emailInvoice = async (req, res) => {
    try {
        let { id, type, email } = req.query;
        let user = req.payload

        let transaction = await transactionModal.findOne({
            _id: id,
            status: "active",
            $or: [
                { type: "Membership" },
                { type: "Initiation and Verification Fee" },
                { type: "Refund" }
            ]
        });
        if (!transaction) {
            return emptyResponse(transaction, res);
        }

        //const generatedFileName = await generateInvoice(transaction, user);

        let recipientEmail;
        if (type === 'false') {
            recipientEmail = user.email;
        } else if (type === 'true' && email) {
            recipientEmail = email;
        } else if (type === 'true' && (!email || email === '')) {
            recipientEmail = user.email;
        } else {
            // Fallback to user's email if no conditions match
            recipientEmail = user.email;
        }
        // After PDF generation completes, send the email
        // await mail.sendMailInvoice({
        //     email: recipientEmail,
        //     file: generatedFileName
        // });

        if (transaction.invoiceUrl) {
            //send invoice mail
            await mail.sendMailMembershipInvoice({
                email: recipientEmail,
                file: transaction.invoiceUrl
            });

            // Return a success response with data
            return successResponseWithoutData('Invoice sent to your mail!', res);
        }

        // current date
        const date = new Date(transaction.createdAt);
        let priceValue = transaction.normalPrice;
        let latest_Price = priceValue;
        let initiationFees = transaction.initiationFees;
        let initiationFee = transaction.normalInitiationFees;
        let membershipName = await planAndpricingModal.findOne({ _id: transaction.purchaseTransactionId });
        let name = membershipName.name ? membershipName.name : transaction.name;
        // Find active discounts for the membership
        const activeDiscounts = await discountModal.find({
            membership_id: transaction.purchaseTransactionId,
            status: 'active',
            $or: [
                {
                    start_date: { $lte: date },
                    end_date: { $gte: date }
                },
                {
                    start_date: { $lte: date },
                    end_date: null
                }
            ]
        }).sort({ start_date: -1 });

        // Find and update the smallest discount
        const smallestDiscount = await commonservices.findSmallestDiscount(activeDiscounts);

        // Apply smallest discount if available
        if (smallestDiscount?.smallestDiscount?.discount_price) {
            initiationFees = smallestDiscount.initiation_fees;
            latest_Price = parseFloat(smallestDiscount.smallestDiscount.discount_price);
            // Update used seats in the discount tier
            // await discountModal.updateOne(
            //     { _id: smallestDiscount.discountId, 'tier._id': smallestDiscount.smallestTierId },
            //     { $inc: { 'tier.$.used_seats': -1 } },
            //     { new: true }
            // );
        } else {
            latest_Price = priceValue;
            initiationFees = smallestDiscount.initiation_fees ? smallestDiscount.initiation_fees : initiationFee;
        }

        let businessName;
        let abn;
        if (transaction.cardId) {
            // Find user's active card
            let userCardInfo = await cardModal.findOne({ _id: transaction.cardId });
            if (userCardInfo) {
                businessName = userCardInfo.businessName;
                abn = userCardInfo.abn;
            }
        }

        // Extract the year, month, and day
        const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month and pad with leading zero if necessary

        const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary

        //Concatenate the parts
        const formattedDate = year[0] + month[0] + day[0] + year[1] + month[1] + day[1];
        //invoice number 
        let invoiceNo = formattedDate + '-' + randomize('0', 3);

        //reverse gst calculation
        let reverseGST = parseFloat(latest_Price) * 100 / (100 + 10);
        let gst = parseFloat(latest_Price) - parseFloat(reverseGST);
        gst = gst.toFixed(2);
        //current date
        let nowDate = new Date(transaction.createdAt);
        let currdate = nowDate.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
        // Add 1 month to the renewal date
        let renewal_date = date.setMonth(date.getMonth() + 1);
        //renewal date
        let renewData = new Date(renewal_date);
        let renewalDateInfo = renewData.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
        //discount price
        let discountPriceVal = parseFloat(priceValue) - parseFloat(latest_Price);
        //invoice dta
        let invoiceData = {
            discountPriceVal,//discount amount
            latest_Price,//with discount price
            priceValue,// without discount price
            initiationFee,//without discount
            initiationFees,//with discount
            renewalDateInfo,//renewal date
            currdate,//current date
            gst,//reverse gst
            name,//membership name
            invoiceNo, //invoice number,
            businessName: businessName || '',//customer business name
            abn: abn || '',//customer abn
        }

        //generating invoice pdf 
        let generatedFileName = await genratePdf.generateMembershipInvoicePdf(invoiceData, req.payload);
        //add invoice url in payment collection
        await transactionModal.findByIdAndUpdate({ _id: id }, {
            invoiceUrl: generatedFileName,
            invoiceNumber: invoiceNo
        }, { new: true })

        //send invoice mail
        await mail.sendMailMembershipInvoice({
            email: recipientEmail,
            file: generatedFileName
        });
        // Return a success response with data
        return successResponseWithoutData('Invoice sent to your mail!', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.upgradeMembership = async (req, res) => {
    try {
        const current_Date = new Date();
        let data1 = {};
        let data2 = {};
        const startDate = new Date(current_Date);
        const type = req.query.type === 'true';
        const type1 = req.query.type1 === 'true';

        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        let data = await userMembershipModal.findOne({ user_id: req.payload._id.valueOf(), status: "active" }, { name: 1, price: 1, normalPrice: 1, renewal_date: 1, membership_id: 1, _id: 0, type: 1 }).sort({ createdAt: -1 }).limit(1);
        let membership, initiationFee, initiationFees, latest_Price, priceValue;
        if (type) {
            //Find the id of Unlimited elite membership
            membership = await membershipModal.findOne({ type: 2, status: "active" })
            if (!membership) {
                return failMessage('No membership is available for upgradation!', res)
            }
        } else {
            //Find the id of Unlimited elite membership
            membership = await membershipModal.findOne({ type: 1, status: "active" })
            if (!membership) {
                return failMessage('No membership is available for upgradation!', res)
            }
            data1 = await userMembershipModal.findOne({ user_id: req.payload._id.valueOf(), type: 1 }, { name: 1, price: 1, normalPrice: 1, renewal_date: 1, _id: 0, type: 1 }).sort({ createdAt: -1 }).limit(1);
        };
        data2 = await userMembershipModal.findOne({ user_id: req.payload._id.valueOf(), type: 1 }, { name: 1, price: 1, normalPrice: 1, renewal_date: 1, _id: 0, type: 1 }).sort({ createdAt: -1 }).limit(1);
        const curr_year = startDate.getFullYear();
        const curr_month = startDate.getMonth() + 1; // Months are zero-based, so January is 0, February is 1, etc.
        let currRenewal = new Date(data.renewal_date);
        const renewal_year = currRenewal.getFullYear();

        let renewal_month = currRenewal.getMonth()
        const renewal_total_days = new Date(renewal_year, renewal_month, 0).getDate();
        // Calculate the number of days in the current month
        const totalDaysInMonth = new Date(curr_year, curr_month, 0).getDate();

        let current_mem_price = data.changed_price ? data.changed_price : data.price;
        let per_day_curr_price = current_mem_price / renewal_total_days

        // Subtract one month from the current renewal date
        currRenewal.setMonth(currRenewal.getMonth() - 1);
        let differenceInMs = startDate.getTime() - currRenewal.getTime();

        // Convert milliseconds to days
        let differenceInDays = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));
        let used_price = Number((differenceInDays * per_day_curr_price).toFixed(2))
        used_price = current_mem_price - used_price;

        // Query the price modal to get the latest price for the given membership
        const currentDate = startDate; // Get the current date and time
        const prices = await priceModal.find({
            status: "active",
            membership: membership._id,
            effectiveDate: { $lte: currentDate }, // Only select prices with effective dates less than or equal to the current UTC time
            $or: [
                { effectiveEndDate: null }, // Select prices with no effective end date
                { effectiveEndDate: { $gt: currentDate } } // Select prices with effective end dates greater than the current UTC time
            ]
        }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date

        const currentPrice = prices[0];

        // Extract the price value and initiation fees from the current price
        priceValue = currentPrice.price;
        initiationFee = currentPrice.initiationFees;
        // Query the discount modal to get the active discount for the given membership
        const activeDiscounts = await discountModal.find({
            membership_id: data.membership_id,
            status: 'active',
            $or: [
                {
                    start_date: { $lte: currentDate },
                    end_date: { $gte: currentDate }
                },
                {
                    start_date: { $lte: currentDate },
                    end_date: null
                }
            ]
        }).sort({ start_date: -1 });
        // Find and update the smallest discount
        let smallestDiscount = await commonservices.findSmallestDiscount(activeDiscounts);

        if (smallestDiscount?.smallestDiscount?.discount_price) {
            initiationFees = smallestDiscount.initiation_fees;
            latest_Price = parseFloat(smallestDiscount.smallestDiscount.discount_price);
            await discountModal.updateOne(
                { _id: smallestDiscount.discountId, 'tier._id': smallestDiscount.smallestTierId },
                { $inc: { 'tier.$.used_seats': -1 } },
                { new: true }
            );
        }
        // Create a response object
        // const responseObj = {
        //     ...membership.toObject(),
        //     initiationFees: initiationFee?.toString() || "",
        //     latestPrice: type ? ((Number(data.normalPrice)) + (Number(priceValue))).toString() || "" : Number(data1.normalPrice),
        //     discountInitiationFees: initiationFees || "",
        //     discountPrice: type ?
        //         (data.price ? (Number(data.price) + Number(priceValue)).toString() : '') :
        //         (data.price ? Number(data1.price).toString() : '')
        //     ,
        // };
        initiationFees = smallestDiscount.initiation_fees ? smallestDiscount.initiation_fees : initiationFee;


        const responseObj = {
            ...membership.toObject(),
            initiationFees: initiationFee?.toString() || "",
            latestPrice: type ?
                (type1 ? (Number(data2.normalPrice) + Number(priceValue)).toString() : (Number(data.normalPrice) + Number(priceValue)).toString()) :
                (data.price ? Number(data1.normalPrice).toString() : ''),
            discountInitiationFees: initiationFees || "",
            discountPrice: type ?
                (type1 ? (Number(data2.price) + Number(priceValue)).toString() : (Number(data.price) + Number(priceValue)).toString()) :
                (data.price ? Number(data1.price).toString() : '')
        };

        let elite_price = smallestDiscount?.smallestDiscount?.discount_price ? responseObj.discountPrice : responseObj.latestPrice;
        let per_day_elite_price = elite_price / totalDaysInMonth;

        let days_left = totalDaysInMonth - differenceInDays;
        let elite_price_latest = (per_day_elite_price * days_left) - used_price;

        responseObj.prorata_diff = Math.abs(Number(elite_price_latest.toFixed(2)));
        // Send the response object as a JSON response
        return successResponse(responseObj, 'Data Fetched Successfully.', res);

    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.confirmUpgradeAndPurchase = async (req, res) => {
    try {
        let { price, prarataDiff, membership_id } = req.body
        const current_Date = new Date();
        const startDate = new Date(current_Date);
        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        let data = await userMembershipModal.findOne({ user_id: req.payload._id.valueOf(), status: "active" }, { name: 1, price: 1, normalPrice: 1, renewal_date: 1, _id: 1, is_activate: 1, type: 1, isDowngraded: 1, isDowngradeRequested: 1 }).sort({ createdAt: -1 }).limit(1);
        let initiationFee, priceValue;
        let initiationFees = price, latest_Price;

        if (data['type'] == 1) {
            let is_activate = false
            if (data.is_activate) is_activate = true
            //Find the id of Unlimited elite membership
            let membership = await membershipModal.findOne({ _id: membership_id, status: "active" })
            if (!membership) {
                return failMessage('No membership is available for upgradation!', res)
            }
            if (membership.type == 2) {
                let prices = await priceModal.find({
                    status: "active",
                    membership: membership_id,
                    effectiveDate: { $lte: startDate }, // Only select prices with effective dates less than or equal to the current UTC time
                    $or: [
                        { effectiveEndDate: null }, // Select prices with no effective end date
                        { effectiveEndDate: { $gt: startDate } } // Select prices with effective end dates greater than the current UTC time
                    ]
                }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date

                const currentPrice = prices[0];

                // Extract the price value and initiation fees from the current price
                priceValue = currentPrice.price;
                initiationFee = currentPrice.initiationFees;
                // Query the discount modal to get the active discount for the given membership
                const activeDiscounts = await discountModal.find({
                    membership_id,
                    status: 'active',
                    $or: [
                        {
                            start_date: { $lte: startDate },
                            end_date: { $gte: startDate }
                        },
                        {
                            start_date: { $lte: startDate },
                            end_date: null
                        }
                    ]
                }).sort({ start_date: -1 });
                // Find and update the smallest discount
                let smallestDiscount = await commonservices.findSmallestDiscount(activeDiscounts);

                // Apply smallest discount if available
                if (smallestDiscount?.smallestDiscount?.discount_price) {
                    initiationFees = smallestDiscount.initiation_fees;
                    latest_Price = parseFloat(smallestDiscount.smallestDiscount.discount_price);
                } else {
                    latest_Price = priceValue;
                    initiationFees = smallestDiscount.initiation_fees ? smallestDiscount.initiation_fees : initiationFee;
                }
                //Add transaction for upgraded membership
                const result = await createPayment({
                    userId: req.payload._id,
                    purchaseTransactionId: membership_id,
                    type: "Membership",
                    name: "Upgrade",
                    price: prarataDiff,
                    normalPrice: priceValue,
                    normalInitiationFees: initiationFee,
                    initiationFees: initiationFees || "",
                    renewal_date: data.renewal_date,
                    image: process.env.MEMBERSHIPLOGO,
                    currency: "AUD",
                });

                // Handle payment failure
                if (!result.success) {
                    return failMessage(result.message, res);
                };
                //soft delete user's active membership
                await userMembershipModal.findByIdAndUpdate({ _id: data._id }, {
                    status: "inactive"
                })
                await userMembershipModal.create({
                    user_id: req.payload._id,
                    membership_id,
                    name: membership.name,
                    price: data.price ? ((Number(data.price)) + (Number(latest_Price))).toString() || "" : '',
                    normalPrice: data.normalPrice ? ((Number(data.normalPrice)) + (Number(priceValue))).toString() || "" : '',
                    renewal_date: data.renewal_date,
                    is_activate,
                    type: membership.type,
                    payIntId: result?.data?.transactionId
                });

                let upgraded_reusable = 4
                let user_booking_count = 0
                let booking_data = await booking_modal.find({ user_id: req.payload._id, status: "active" })
                if (booking_data && booking_data.length > 0) {
                    booking_data.forEach((booking) => {
                        if (booking.booking_status == "confirmed" && !booking.is_journey_completed) {
                            user_booking_count++
                        }
                        if (booking.booking_status == "canceled" && booking.isPenalty == 1) {
                            user_booking_count++
                        }
                    })
                }
                if (Number(req.payload.reusable_bookings) >= 0 && Number(req.payload.reusable_bookings) < 2) {
                    upgraded_reusable = 4 - Number(req.payload.reusable_bookings)
                }
                if (user_booking_count) {
                    if (user_booking_count >= 4) {
                        upgraded_reusable = 0
                    } else if (user_booking_count >= 0 && user_booking_count < 4) {
                        upgraded_reusable = 4 - user_booking_count

                    }
                }
                //Add 4 reusable bookings, 2 guest passes in every 3 months, 4 reset vouchers in every 3 months.
                await userModal.findByIdAndUpdate({ _id: req.payload._id }, {
                    // guest_passes: req.payload.guest_passes + 2,
                    reusable_bookings: upgraded_reusable,
                    // reset_vouchers: req.payload.reset_vouchers + 4
                }, { new: true })
                return successResponseWithoutData('Membership upgraded Successfully.', res);

            } else {
                return failMessage('Invalid membership!', res)
            }

        } else {
            if (data.isDowngraded && data.isDowngradeRequested) {
                await userMembershipModal.findOneAndUpdate({ _id: data._id }, {
                    isDowngraded: false,
                    isDowngradeRequested: false
                })
                return successResponseWithoutData('Your membership is revoked!', res)

            }

            return failMessage('Already upgraded!', res)
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.downgradeMembership = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        let { price, membership_id } = req.body
        let data = await userMembershipModal.findOne({ user_id: req.payload._id.valueOf(), status: "active" }, { name: 1, price: 1, normalPrice: 1, renewal_date: 1, _id: 1, is_activate: 1, isDowngraded: 1, type: 1 }).sort({ createdAt: -1 }).limit(1);
        let data1 = await userMembershipModal.findOne({ user_id: req.payload._id.valueOf(), type: 1 }, { name: 1, price: 1, normalPrice: 1, renewal_date: 1, _id: 1, is_activate: 1, isDowngraded: 1, type: 1 }).sort({ createdAt: -1 }).limit(1);
        if (!data || data['type'] == 1) {
            return failMessage('No need for downgrade!', res)
        } else {
            if (data.isDowngraded) {
                return successResponseWithoutData('Membership already downgraded.', res);
            }

            const deliveryDateTime = new Date(`${data.renewal_date}`);

            const currentDateTime = startDate;

            const timeDifference = deliveryDateTime.getTime() - currentDateTime.getTime();
            let membership = await membershipModal.findOne({ _id: membership_id, status: "active" });

            if (!membership) {
                return failMessage('No membership is available for downgradation!', res);
            }
            function setLongTimeOut(callback, timeout) {
                const maxDelay = 2 ** 31 - 1
                if (timeout > maxDelay) {
                    let expectedTick = Math.ceil(timeout / maxDelay);

                    const id = setInterval(() => {
                        if (!--expectedTick) {
                            callback()
                            clearInterval(id)
                        }
                    }, timeout / expectedTick)
                    return id
                }
                return setTimeout(callback, timeout)
            }
            const TimeOutId = setLongTimeOut(async () => {
                const nextRenewalDate = startDate;
                nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);

                let latestUserMembership = await userMembershipModal.findOne({
                    _id: data._id, status: "active"
                })
                if (latestUserMembership && latestUserMembership.isDowngraded && latestUserMembership.isDowngradeRequested) {
                    await userMembershipModal.findByIdAndUpdate(
                        { _id: data._id },
                        { status: "inactive" }
                    );
                    let is_activate = false
                    if (data.is_activate) is_activate = true
                    await userMembershipModal.create({
                        user_id: req.payload._id,
                        membership_id,
                        name: membership.name,
                        price,
                        normalPrice: data1.normalPrice,
                        renewal_date: nextRenewalDate,
                        is_activate,
                        isDowngradeRequested: false,
                        type: membership.type
                    });
                    if (membership.type == 1) {
                        await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                            reusable_bookings: 2, guest_passes: 1
                        }, { new: true })
                    }
                    if (membership.type == 2) {
                        await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                            reusable_bookings: 4, guest_passes: 2, reset_vouchers: 4
                        }, { new: true })
                    }
                }


            }, timeDifference);

            await userMembershipModal.findByIdAndUpdate({ _id: data._id }, {
                isDowngraded: true, isDowngradeRequested: true
            })
            return successResponseWithoutData('Membership downgraded Successfully.', res);

        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.cancelMembership = async (req, res) => {
    try {
        const { membership_id, status } = req.body;

        const updatedData = await userMembershipModal.findOneAndUpdate(
            { membership_id: membership_id, user_id: req.payload._id.valueOf(), status: 'active' },
            { $set: { status: status } },
            { new: true }
        );

        if (!updatedData) {
            return emptyResponse(updatedData, res);
        }

        return successResponseWithoutData('Status updated successfully.', res);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getBookingList = async (req, res) => {
    try {
        let user_penalty_exists = false
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        const userId = req.payload._id;
        const bookingStatus = req.query.booking_status || '';
        let reset_vouchers = []
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
        let data = await booking_modal.aggregate([
            {
                $match: {
                    user_id: mongoose.Types.ObjectId(userId),
                    status: "active",
                    is_demo: checkDemoSettings ? true : false
                }
            },
            {
                $lookup: {
                    from: 'flights',
                    let: { item_id: '$flight_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$item_id"] }
                            }
                        },
                        {
                            $lookup: {
                                from: "routes",
                                let: { fromCityId: "$route" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$fromCityId"] }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "locations",
                                            let: { fromCityId: "$fromCity" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        _id: 1,
                                                        city_name: 1,
                                                        airport_abbreviation: 1,
                                                        image: 1,
                                                        lat: 1,
                                                        long: 1,
                                                        airport_name: { $ifNull: ["$airport_name", "Airport 1"] }
                                                    }
                                                }
                                            ],
                                            as: "from_airport_abb",
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "locations",
                                            let: { fromCityId: "$toCity" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        _id: 1,
                                                        city_name: 1,
                                                        airport_abbreviation: 1,
                                                        image: 1,
                                                        lat: 1,
                                                        long: 1,
                                                        airport_name: { $ifNull: ["$airport_name", "Airport 1"] }
                                                    }
                                                }
                                            ],
                                            as: "to_airport_abb",
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            to_airport_abb: 1,
                                            from_airport_abb: 1
                                        }
                                    }
                                ],
                                as: "route",
                            }
                        },
                        {
                            $lookup: {
                                from: "pilots",  // Target collection name (pilots)
                                let: { pilotId: "$pilot" },  // Local field to match
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$pilotId"] }  // Matching condition
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            first_name: 1,
                                            last_name: 1,
                                            Photo: 1
                                        }
                                    }
                                ],
                                as: "pilot"  // Output field containing the joined data
                            }
                        },
                        {
                            $lookup: {
                                from: "pilots",  // Target collection name (pilots)
                                let: { pilotId: "$copilot" },  // Local field to match
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$pilotId"] }  // Matching condition
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            first_name: 1,
                                            last_name: 1,
                                            Photo: 1
                                        }
                                    }
                                ],
                                as: "copilot"  // Output field containing the joined data
                            }
                        },
                        {
                            $lookup: {
                                from: "flight_seats_mappings",
                                let: { fromCityId: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$flight_id", "$$fromCityId"] }
                                        }
                                    }
                                ],
                                as: "flight_seat",
                            }
                        },
                        {

                            $addFields: {
                                actual_takeoff_time: { $ifNull: ["$actual_takeoff_time", "09:00"] },
                                actual_landing_time: { $ifNull: ["$actual_landing_time", "10:00"] }
                            }

                        }

                    ],
                    as: 'flight_data'
                }
            },
            {
                $lookup: {
                    from: 'bookings',
                    let: { item_id: '$round_trip_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$item_id"] }
                            }
                        },
                        {
                            $lookup: {
                                from: 'flights',
                                let: { item_id: '$flight_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$item_id"] }
                                        }
                                    }



                                ],
                                as: 'round_flight_data'
                            }
                        },

                    ],
                    as: 'round_trip_data'
                }
            },
            {
                $project: {
                    flight_id: 0,
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }

        ]);

        let total_reusable = 0
        let user_membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active" })
        if (user_membership) {
            if (user_membership.type == 1) total_reusable = 2
            if (user_membership.type == 2) total_reusable = 4
        }
        if (!data || data.length === 0) {
            let responseData = { reset_vouchers: [], bookings: [], user_name: req.payload.fullName, users_reset_voucher: req.payload.reset_vouchers, users_reusable_bookings: req.payload.reusable_bookings, total_reusable }
            return successResponse(responseData, 'No Data found!', res);
        }

        for (let jk = 0; jk < data.length; jk++) {
            data[jk].flight_data[0].pilot[0].full_name = data[jk].flight_data[0].pilot[0].first_name + ' ' + data[jk].flight_data[0].pilot[0].last_name;
            data[jk].flight_data[0].copilot[0].full_name = data[jk].flight_data[0].copilot[0].first_name + ' ' + data[jk].flight_data[0].copilot[0].last_name

        }
        let filteredData = [];
        let result = {}
        if (bookingStatus && bookingStatus === 'pending') {
            // Filter pending flights
            filteredData = data.filter((flight) => {
                const flightTakeOffDateRef = new Date(flight.flight_data[0].flight_takeoff_date);
                const [time1Hours, time1Minutes] = flight.flight_data[0].takeoff_time.split(':').map(Number);
                flightTakeOffDateRef.setHours(time1Hours, time1Minutes);
                const currTimestamp = startDate.getTime();
                return flightTakeOffDateRef >= currTimestamp && flight.booking_status !== "canceled";
            });

        }
        else if (bookingStatus && bookingStatus === 'canceled') {
            let arr = []
            for (let i = 0; i < data.length; i++) {
                if (data[i].booking_status == 'canceled' || data[i].otherSeatBooking_status == "canceled") {
                    for (let seatDetail of data[i].canceled_seat_details) {
                        if (seatDetail.seat_details.guest_id) {
                            seatDetail.seat_details.guest_id = await user_guest_mapping_modal.findById(seatDetail.seat_details.guest_id).select('-updatedAt -createdAt -__v');
                        }

                        // if(seatDetail.seat_details.pet_id[0] != undefined){
                        //     seatDetail.seat_details.guest_id = await user_pet_mapping_modal.findById(seatDetail.seat_details.pet_id[0]).select('-updatedAt -createdAt -__v');
                        // }
                    }

                    if (data[i].otherSeatBooking_status == "canceled" && data[i].booking_status == 'confirmed') {
                        console.log('hereeeee==', data[i]._id)
                        if (data[i].guest_pass_used) {
                            let custom_obj = JSON.parse(JSON.stringify(data[i]));
                            custom_obj.reset_pet_pass = false
                            custom_obj.reset_reusable_booking = false
                            custom_obj.pet_pass_used = 0
                            custom_obj.reusable_booking_used = 0
                            custom_obj.total_reset_passes_left = data[i].guest_pass_used
                            custom_obj.guest_cancel_count = data[i].canceled_seat_details.length
                            custom_obj.block_reusable_reset = false
                            if (data[i].reset_guest_pass) {
                                custom_obj.isPenalty = 1
                                user_penalty_exists = true

                            } else {
                                custom_obj.isPenalty = 0

                            }
                            if (!data[i].reset_guest_pass && data[i].guest_pass_used) {
                                custom_obj.isPenalty = 2

                            }
                            if (!data[i].between12to24hr && !data[i].within12hr) {
                                custom_obj.isPenalty = 0
                            }
                            arr.push(custom_obj);
                        }

                        if (data[i].pet_pass_used) {
                            let custom_obj = JSON.parse(JSON.stringify(data[i]));
                            custom_obj.reset_guest_pass = false
                            custom_obj.reset_reusable_booking = false
                            custom_obj.guest_pass_used = 0
                            custom_obj.reusable_booking_used = 0
                            if (data[i].reset_pet_pass) {
                                custom_obj.isPenalty = 1
                                user_penalty_exists = true

                            } else {
                                custom_obj.isPenalty = 0

                            }
                            if (!data[i].reset_pet_pass && data[i].pet_pass_used) {
                                custom_obj.isPenalty = 2

                            }
                            if (!data[i].between12to24hr && !data[i].within12hr) {
                                custom_obj.isPenalty = 0
                            }
                            custom_obj.block_reusable_reset = false

                            arr.push(custom_obj)
                        }
                    } else {
                        console.log('thereeeee==', data[i]._id)
                        if (data[i].pet_pass_used) {
                            console.log('hdhdhdh')
                            let custom_obj = JSON.parse(JSON.stringify(data[i]));
                            custom_obj.reset_guest_pass = false
                            custom_obj.reset_reusable_booking = false
                            custom_obj.guest_pass_used = 0
                            custom_obj.reusable_booking_used = 0
                            if (data[i].reset_pet_pass) {
                                custom_obj.isPenalty = 1
                                user_penalty_exists = true

                            } else {
                                custom_obj.isPenalty = 0

                            }
                            if (!data[i].reset_pet_pass && data[i].pet_pass_used) {
                                custom_obj.isPenalty = 2

                            }
                            if (!data[i].between12to24hr && !data[i].within12hr) {
                                custom_obj.isPenalty = 0
                            }
                            custom_obj.block_reusable_reset = false

                            arr.push(custom_obj)
                        }
                        //condition to check guest pass used
                        if (data[i].guest_pass_used) {
                            let custom_obj = JSON.parse(JSON.stringify(data[i]));
                            custom_obj.reset_pet_pass = false
                            custom_obj.reset_reusable_booking = false
                            custom_obj.pet_pass_used = 0
                            custom_obj.reusable_booking_used = 0
                            custom_obj.block_reusable_reset = false
                            if (data[i].reset_guest_pass) {
                                custom_obj.isPenalty = 1
                                user_penalty_exists = true

                            } else {
                                custom_obj.isPenalty = 0

                            }
                            if (!data[i].reset_guest_pass && data[i].guest_pass_used) {
                                custom_obj.isPenalty = 2

                            }
                            if (!data[i].between12to24hr && !data[i].within12hr) {
                                custom_obj.isPenalty = 0
                            }
                            arr.push(custom_obj)


                        }
                        if (data[i].reusable_booking_used) {
                            console.log('hereee')

                            let custom_obj = JSON.parse(JSON.stringify(data[i]));
                            custom_obj.reset_pet_pass = false
                            custom_obj.reset_guest_pass = false
                            custom_obj.pet_pass_used = 0
                            custom_obj.guest_pass_used = 0
                            if (data[i].reset_reusable_booking) {
                                custom_obj.isPenalty = 1
                                user_penalty_exists = true


                            } else {
                                custom_obj.isPenalty = 0

                            }
                            if (!data[i].reset_reusable_booking && data[i].reusable_booking_used) {
                                custom_obj.isPenalty = 2

                            }
                            if (data[i].reset_guest_pass || data[i].reset_pet_pass) {
                                custom_obj.block_reusable_reset = true

                            } else {
                                custom_obj.block_reusable_reset = false

                            }
                            if (!data[i].between12to24hr && !data[i].within12hr) {
                                custom_obj.isPenalty = 0
                            }
                            arr.push(custom_obj)
                        }
                    }
                }
            }

            filteredData = arr

        }
        else if (bookingStatus && bookingStatus === 'previous') {
            // Filter previous flights
            filteredData = data.filter((flight) => {
                flight.round_trip_days_spent = ''
                const flightTakeOffDateRef = new Date(flight.flight_data[0].flight_takeoff_date);
                const [time1Hours, time1Minutes] = flight.flight_data[0].takeoff_time.split(':').map(Number);
                flightTakeOffDateRef.setHours(time1Hours, time1Minutes);
                const currTimestamp = startDate.getTime();
                if (flight.round_trip_id && flight.round_trip_data && flight.round_trip_data.length > 0 && flight.round_trip_data[0].round_flight_data && flight.round_trip_data[0].round_flight_data.length > 0) {
                    const takeoffTimeRoundTrip = flight.round_trip_data[0].round_flight_data[0].landing_time;
                    const firstFlightTimeRoundTrip = flight.flight_data[0].takeoff_time;
                    // Parse the flight takeoff dates into Date objects
                    const roundTripDate = new Date(flight.round_trip_data[0].round_flight_data[0].flight_takeoff_date);
                    const firstFlightDate = new Date(flight.flight_data[0].flight_takeoff_date);

                    // Create new Date objects by combining date and time
                    const roundTripDateTimeString = roundTripDate.toISOString().slice(0, 10) + ' ' + takeoffTimeRoundTrip;
                    const firstFlightDateTimeString = firstFlightDate.toISOString().slice(0, 10) + ' ' + firstFlightTimeRoundTrip;

                    // Create Date objects
                    const roundTripDateTime = new Date(roundTripDateTimeString);
                    const firstFlightDateTime = new Date(firstFlightDateTimeString);
                    // Calculate the difference in milliseconds
                    const timeDifference = Math.abs(roundTripDateTime.getTime() - firstFlightDateTime.getTime());

                    // Convert milliseconds to days (1 day = 24 * 60 * 60 * 1000 milliseconds)
                    let daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

                    daysDifference = daysDifference - 1
                    let text = ""
                    if (daysDifference == 1) {
                        text = "Night"
                    } else {
                        text = "Nights"
                    }
                    flight.round_trip_days_spent = (daysDifference) + ` ${text} in ${flight.flight_data[0].route[0].from_airport_abb[0].city_name}`

                }
                return flightTakeOffDateRef < currTimestamp && flight.booking_status !== "canceled";
            });
        }
        else {
            filteredData = data; // If no status provided, use the original data
        };
        let totalPaginatedRecords = filteredData.length

        let denied_user_obj = {}, pet_details_obj = {}, summedUpPet = [], guest_details_obj = {}, guest_ids = []
        for (const data of filteredData) {
            if (data.isPenalty == 1) {
                if (data.between12to24hr) {
                    data.total_guest_reset = Number((data.guest_pass_used))
                    data.total_pet_reset = Number((data.pet_pass_used))
                    data.total_reusable_reset = Number((data.reusable_booking_used))

                }
                else if (data.within12hr) {
                    data.total_guest_reset = Number((data.guest_pass_used * 2))
                    data.total_pet_reset = Number((data.pet_pass_used * 2))
                    data.total_reusable_reset = Number((data.reusable_booking_used * 2))

                } else {
                    data.total_guest_reset = 0
                    data.total_pet_reset = 0
                    data.total_reusable_reset = 0
                }
            } else {
                data.total_guest_reset = 0
                data.total_pet_reset = 0
                data.total_reusable_reset = 0

            }

            let differences = await commonservices.getTimeDifference(data.flight_data[0]['flight_takeoff_date'], data.flight_data[0]['takeoff_time'], data.flight_data[0]['landing_time'])
            data.flight_data[0]['durationHours'] = differences.hours
            data.flight_data[0]['durationMinutes'] = differences.mins
            let actual_differences = await commonservices.getTimeDifference(data.flight_data[0]['flight_takeoff_date'], data.flight_data[0]['actual_takeoff_time'], data.flight_data[0]['actual_landing_time'])
            data.flight_data[0]['actual_durationHours'] = actual_differences.hours
            data.flight_data[0]['actual_durationMinutes'] = actual_differences.mins
            const flight_takeoff = new Date(data.flight_data[0]['flight_takeoff_date'])
            const [time1Hours, time1Minutes] = data.flight_data[0]['takeoff_time'].split(':').map(Number);
            flight_takeoff.setHours(time1Hours, time1Minutes);
            const currentTime = startDate;

            if (flight_takeoff.getTime() >= currentTime.getTime()) {
                // Calculate the time difference
                const timeDifference = flight_takeoff.getTime() - currentTime.getTime();

                // Convert milliseconds to minutes (or any other unit you prefer)
                const minutesDifference = timeDifference / (1000 * 60);
                if (data.flight_data[0].flight_delayed && !data.flight_data[0].flight_canceled) {
                    data.flight_data[0].departure = false
                    data.flight_data[0].departs_in = 0
                    data.flight_data[0].checked_in = 0
                    data.flight_data[0].checkedIn = false
                    data.flight_data[0].checkedIn_time_left = 0

                } else {
                    if (minutesDifference >= 0 && minutesDifference <= 90 && !data.flight_data[0].flight_canceled) {//departure time left
                        data.flight_data[0].departure = true
                        data.flight_data[0].departs_in = Number(minutesDifference.toFixed(2))
                        let time_left_for_checkin = minutesDifference - 30; //deepak
                        data.flight_data[0].checkedIn_time_left = Number(time_left_for_checkin.toFixed(2))

                    } else {
                        data.flight_data[0].departure = false
                        data.flight_data[0].departs_in = 0
                        data.flight_data[0].checkedIn_time_left = 0

                    }
                    //deepak
                    if (minutesDifference >= 0 && minutesDifference <= 30 && !data.flight_data[0].flight_canceled) {//chcek in time left

                        data.flight_data[0].checked_in = Number(minutesDifference.toFixed(2))
                        data.flight_data[0].checkedIn = true
                        data.flight_data[0].departure = false
                        data.flight_data[0].departs_in = 0
                        data.flight_data[0].checkedIn_time_left = 0

                    } else {
                        data.flight_data[0].checked_in = 0
                        data.flight_data[0].checkedIn = false

                    }
                }

            } else {
                data.flight_data[0].departure = false
                data.flight_data[0].departs_in = 0
                data.flight_data[0].checked_in = 0
                data.flight_data[0].checkedIn = false
                data.flight_data[0].checkedIn_time_left = 0


            }

            let currtime = startDate.getTime()
            let petOnBoardRequestDenied = false, petOnBoardRequestAccept = false, petOnBoardRequest = false, denied_userId = [], pet_ids = []
            for (let i = 1; i <= 8; i++) {
                if (data.flight_data && data.flight_data.length > 0 && data.flight_data[0].flight_seat && data.flight_data[0].flight_seat.length > 0 && data.flight_data[0].flight_seat[0][`seat${i}_details`] && data.flight_data[0].flight_seat[0][`seat${i}_details`].user_id && data.flight_data[0].flight_seat[0][`seat${i}_details`].user_id != req.payload._id.valueOf()) {
                    if (!data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_request_accepted) {
                        console.log('hereeee')
                        petOnBoardRequestDenied = true, denied_userId.push(data.flight_data[0].flight_seat[0][`seat${i}_details`].user_id)
                    }

                    if (data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id != undefined && data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id.length > 0) {
                        petOnBoardRequest = true
                    }

                }

                if (data.flight_data && data.flight_data.length > 0 && data.flight_data[0].flight_seat && data.flight_data[0].flight_seat.length > 0 && data.flight_data[0].flight_seat[0][`seat${i}_details`] && data.flight_data[0].flight_seat[0][`seat${i}_details`].user_id && data.flight_data[0].flight_seat[0][`seat${i}_details`].user_id == req.payload._id.valueOf()) {

                    if (data.flight_data[0].flight_seat[0][`seat${i}_details`].guest_id && data.flight_data[0].flight_seat[0][`seat${i}_details`].booking_id && data.flight_data[0].flight_seat[0][`seat${i}_details`].booking_id.valueOf() == data._id) {
                        if (!guest_details_obj[data._id]) {
                            guest_details_obj[data._id] = {};
                        }
                        guest_ids.push(data.flight_data[0].flight_seat[0][`seat${i}_details`].guest_id)
                        guest_details_obj[`${data._id}`][`${data.flight_data[0].flight_seat[0][`seat${i}_details`].guest_id}`] = { seat_no: i }
                    }
                    data.flight_data[0].flight_seat[0][`seat${i}_details`].is_same_user = true

                    if (data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id && data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id.length > 0 && data.flight_data[0].flight_seat[0][`seat${i}_details`].booking_id && data.flight_data[0].flight_seat[0][`seat${i}_details`].booking_id.valueOf() == data._id) {
                        //get pet details
                        summedUpPet = summedUpPet.concat(...data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id)
                        pet_ids = pet_ids.concat(...data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id)
                    }
                }
                if (data.flight_data && data.flight_data.length > 0 && data.flight_data[0].flight_seat && data.flight_data[0].flight_seat.length > 0 && data.flight_data[0].flight_seat[0][`seat${i}_details`] && data.flight_data[0].flight_seat[0][`seat${i}_details`].user_id && data.flight_data[0].flight_seat[0][`seat${i}_details`].user_id != req.payload._id.valueOf()) {
                    data.flight_data[0].flight_seat[0][`seat${i}_details`].is_same_user = false

                }
                if (data.flight_data && data.flight_data.length > 0 && data.flight_data[0].flight_seat && data.flight_data[0].flight_seat.length > 0 && data.flight_data[0].flight_seat[0][`seat${i}_details`]) {
                    data.flight_data[0].flight_seat[0][`seat${i}_details`].seat_no = i
                }
            }
            if (flight_takeoff >= currtime && ((flight_takeoff - currtime) <= 3600000)) {//1 hr=36,00,000 milliseconds
                console.log('thereeee', petOnBoardRequestDenied)
                if (!petOnBoardRequestDenied) petOnBoardRequestAccept = true

            } else {
                console.log('whereeee', petOnBoardRequestDenied, data.booking_status)
                if (!petOnBoardRequestDenied && data.booking_status == "confirmed") {
                    petOnBoardRequestAccept = true
                }
                //else { petOnBoardRequest = true }
            }
            denied_user_obj[`${data._id}`] = denied_userId
            pet_details_obj[`${data._id}`] = pet_ids
            if (petOnBoardRequestDenied) petOnBoardRequestDenied = true
            data.petOnBoardRequestDenied = petOnBoardRequestDenied
            data.petOnBoardRequest = petOnBoardRequest
            data.petOnBoardRequestAccept = petOnBoardRequestAccept

        }

        let guest_details_data = await user_guest_mapping_modal.find({
            _id: {
                $in: guest_ids
            }
        })
        const valuescc = Object.values(guest_details_obj).flatMap(obj => Object.keys(obj));
        valuescc.forEach((data) => {
            guest_details_data.forEach((obj) => {
                if (data == obj._id.valueOf()) {
                    guest_details_obj[`${data}`] = obj.guest_name;

                }
            }
            );

        })
        let pet_data = await user_pet_mapping_modal.find({
            _id: {
                $in: summedUpPet
            }
        }, { pet_name: 1, pet_image: 1 })

        // Create a mapping of pet IDs to pet names
        let petIdToNameMapping = {};
        pet_data.forEach(pet => {
            petIdToNameMapping[pet._id.toString()] = { pet_name: pet.pet_name, pet_image: pet.pet_image };

        });

        // Iterate through filteredData and update pet_name property
        filteredData.forEach((data) => {
            let guest_name_arr = []
            for (let i = 1; i <= 8; i++) {
                if (guest_details_obj[`${data._id}`]) {
                    if (data.flight_data[0].flight_seat[0][`seat${i}_details`] && guest_details_obj[`${data._id}`][`${data.flight_data[0].flight_seat[0][`seat${i}_details`].guest_id}`]) {
                        data.flight_data[0].flight_seat[0][`seat${i}_details`].guest_name = guest_details_obj[`${data.flight_data[0].flight_seat[0][`seat${i}_details`].guest_id}`]
                        guest_name_arr.push(guest_details_obj[`${data.flight_data[0].flight_seat[0][`seat${i}_details`].guest_id}`])
                    }
                }
                if (data.flight_data[0].flight_seat[0][`seat${i}_details`] && data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id && data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id.length > 0) {
                    if (petIdToNameMapping[`${data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id[0]}`]) {
                        if (!data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_data) data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_data = []
                        data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_data.push(petIdToNameMapping[`${data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id[0]}`])
                    }
                    if (petIdToNameMapping[`${data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id[1]}`]) {
                        if (!data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_data) data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_data = []
                        data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_data.push(petIdToNameMapping[`${data.flight_data[0].flight_seat[0][`seat${i}_details`].pet_id[0]}`])
                    }
                }
            }
            data.guest_name = guest_name_arr
            if (!data.requested_id) data.requested_id = ""
            let pet_ids = pet_details_obj[`${data._id}`] || [];
            data.pet_name = [].concat(...pet_ids.map(petId => petIdToNameMapping[petId] || []));

        });
        if (bookingStatus && bookingStatus === 'canceled') {
            let countUserPenalty = 0
            filteredData.forEach((checkPenaltyCount) => {
                if (checkPenaltyCount.isPenalty == 1) {
                    countUserPenalty += checkPenaltyCount.total_guest_reset + checkPenaltyCount.total_pet_reset + checkPenaltyCount.total_reusable_reset
                }
            })
            if (req.payload.reset_vouchers < countUserPenalty) {
                reset_vouchers = await itemModal.aggregate([
                    {
                        $match: {
                            name: "Reset Voucher",
                            count: "1"
                        }
                    },
                    {
                        $lookup: {
                            from: 'prices',
                            let: { itemId: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$items', '$$itemId'] },
                                        status: 'active', // Add this to filter for active prices
                                        effectiveDate: { $lte: currentDate },

                                    }
                                },

                                {
                                    $sort: { effectiveDate: -1 } // Sort prices by effective date in descending order
                                },
                                {
                                    $limit: 1 // Limit to the top 2 prices
                                },
                                {
                                    $project: {
                                        price: 1
                                    }
                                }
                            ],
                            as: 'prices'
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            status: 1,
                            flash_sale: 1,
                            discount_price: 1,
                            sale_end_date_time: 1,
                            sale_start_date_time: 1,
                            currentPrice: {
                                $cond: {
                                    if: { $eq: [{ $size: '$prices' }, 0] },
                                    then: '', // Set to empty string when there's no data
                                    else: { $arrayElemAt: ['$prices.price', 0] } // Retrieve the value if data exists
                                }
                            },
                            nextCurrentPrice: {
                                $cond: {
                                    if: { $eq: [{ $size: '$prices' }, 1] },
                                    then: '', // Set to empty string when there's no data
                                    else: { $arrayElemAt: ['$prices.price', 1] } // Retrieve the value if data exists
                                }
                            },
                            count: 1
                        }
                    },
                    {
                        $sort: {
                            'currentPrice.price.effectiveDate': 1 // Sort by effective date in descending order
                        }
                    },
                    {
                        $limit: 1
                    }

                ]);
                //if reset vouchers not empty
                if (reset_vouchers.length > 0) {
                    reset_vouchers.forEach((data) => {
                        if (data.flash_sale && data.sale_start_date_time && data.sale_start_date_time <= startDate && data.sale_end_date_time && data.sale_end_date_time >= startDate) {
                            data.currentPrice = data.discount_price

                        }
                        delete data.sale_start_date_time
                        delete data.sale_end_date_time
                        delete data.discount_price
                        delete data.flash_sale
                    })
                    if (countUserPenalty == 2 || countUserPenalty >= 2) {
                        reset_vouchers.push({
                            "_id": reset_vouchers[0]['_id'],
                            "name": "Reset Voucher",
                            "status": "active",
                            "count": "2",
                            "currentPrice": `${reset_vouchers[0]['currentPrice'] * 2}`,
                            "nextCurrentPrice": reset_vouchers[0]['nextCurrentPrice'] ? `${reset_vouchers[0]['nextCurrentPrice']}` * 2 : ''
                        })
                    }
                    if (countUserPenalty == 3 || countUserPenalty >= 3) {
                        reset_vouchers.push({
                            "_id": reset_vouchers[0]['_id'],
                            "name": "Reset Voucher",
                            "status": "active",
                            "count": "3",
                            "currentPrice": `${reset_vouchers[0]['currentPrice'] * 3}`,
                            "nextCurrentPrice": reset_vouchers[0]['nextCurrentPrice'] ? `${reset_vouchers[0]['nextCurrentPrice']}` * 3 : ''
                        })
                    }

                    if (countUserPenalty > 3) {
                        reset_vouchers.push({
                            "_id": reset_vouchers[0]['_id'],
                            "name": "Reset Voucher",
                            "status": "active",
                            "count": `${countUserPenalty}`,
                            "currentPrice": `${reset_vouchers[0]['currentPrice'] * countUserPenalty}`,
                            "nextCurrentPrice": reset_vouchers[0]['nextCurrentPrice'] ? `${reset_vouchers[0]['nextCurrentPrice']}` * countUserPenalty : ''
                        })
                    }

                    reset_vouchers.reverse();
                }

                result.reset_vouchers = reset_vouchers

            }
        }

        // Applying pagination
        if (req.query.skip && req.query.limit) {
            const skip = parseInt(req.query.skip)
            const limit = parseInt(req.query.limit)
            const startIndex = (skip - 1);
            const endIndex = startIndex + limit;

            filteredData = filteredData.slice(startIndex, endIndex);
        }

        result.reset_vouchers = reset_vouchers
        result.bookings = filteredData
        result.user_name = req.payload.fullName
        result.users_reset_voucher = req.payload.reset_vouchers
        result.users_reusable_bookings = req.payload.reusable_bookings
        result.total_reusable = total_reusable
        result.user_penalty_exists = user_penalty_exists

        successResponseWithPagination(result, totalPaginatedRecords, 'Data Fetched Successfully.', res);

    } catch (error) {
        console.error('Error in getBookingList:', error);
        return errorResponse('Internal Server Error', res);
    }
};
exports.automaticMailInvoice = async (req, res) => {
    try {
        let { email } = req.body
        await prefernceModal.findOneAndUpdate({ user_id: req.payload._id.valueOf(), status: "active" }, {
            automaticInvoiceToMail: true,
            automaticMail: email
        }, { new: true });
        return successResponseWithoutData(`Automatic email invoice sets to ${email}.`, res);

    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.downloadInvoice = async (req, res) => {
    try {
        let { id } = req.query;
        let user = req.payload

        let transaction = await transactionModal.findOne({
            _id: id,
            status: "active",
            $or: [
                { type: "Membership" },
                { type: "Initiation and Verification Fee" },
                { type: "Refund" }
            ]
        });

        if (!transaction) {
            return emptyResponse(transaction, res);
        }

        if (transaction.invoiceUrl) {
            let result = { "invoiceUrl": transaction.invoiceUrl }
            return successResponse(result, 'Invoice downloaded successfully.', res);
        }

        // current date
        const date = new Date(transaction.createdAt);
        let priceValue = transaction.normalPrice;
        let latest_Price = priceValue;
        let initiationFees = transaction.initiationFees;
        let initiationFee = transaction.normalInitiationFees;
        let membershipName = await planAndpricingModal.findOne({ _id: transaction.purchaseTransactionId });
        let name = membershipName.name ? membershipName.name : transaction.name;
        // Find active discounts for the membership
        const activeDiscounts = await discountModal.find({
            membership_id: transaction.purchaseTransactionId,
            status: 'active',
            $or: [
                {
                    start_date: { $lte: date },
                    end_date: { $gte: date }
                },
                {
                    start_date: { $lte: date },
                    end_date: null
                }
            ]
        }).sort({ start_date: -1 });

        // Find and update the smallest discount
        const smallestDiscount = await commonservices.findSmallestDiscount(activeDiscounts);

        // Apply smallest discount if available
        if (smallestDiscount?.smallestDiscount?.discount_price) {
            initiationFees = smallestDiscount.initiation_fees;
            latest_Price = parseFloat(smallestDiscount.smallestDiscount.discount_price);
            // Update used seats in the discount tier
            // await discountModal.updateOne(
            //     { _id: smallestDiscount.discountId, 'tier._id': smallestDiscount.smallestTierId },
            //     { $inc: { 'tier.$.used_seats': -1 } },
            //     { new: true }
            // );
        } else {
            latest_Price = priceValue;
            initiationFees = smallestDiscount.initiation_fees ? smallestDiscount.initiation_fees : initiationFee;
        }

        let businessName;
        let abn;
        if (transaction.cardId) {
            // Find user's active card
            let userCardInfo = await cardModal.findOne({ _id: transaction.cardId });
            if (userCardInfo) {
                businessName = userCardInfo.businessName;
                abn = userCardInfo.abn;
            }
        }

        // Extract the year, month, and day
        const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month and pad with leading zero if necessary

        const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary

        //Concatenate the parts
        const formattedDate = year[0] + month[0] + day[0] + year[1] + month[1] + day[1];
        //invoice number 
        let invoiceNo = formattedDate + '-' + randomize('0', 3);

        //reverse gst calculation
        let reverseGST = parseFloat(latest_Price) * 100 / (100 + 10);
        let gst = parseFloat(latest_Price) - parseFloat(reverseGST);
        gst = gst.toFixed(2);
        //current date
        let nowDate = new Date(transaction.createdAt);
        let currdate = nowDate.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
        // Add 1 month to the renewal date
        let renewal_date = date.setMonth(date.getMonth() + 1);
        //renewal date
        let renewData = new Date(renewal_date);
        let renewalDateInfo = renewData.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
        //discount price
        let discountPriceVal = parseFloat(priceValue) - parseFloat(latest_Price);
        //invoice dta
        let invoiceData = {
            discountPriceVal,//discount amount
            latest_Price,//with discount price
            priceValue,// without discount price
            initiationFee,//without discount
            initiationFees,//with discount
            renewalDateInfo,//renewal date
            currdate,//current date
            gst,//reverse gst
            name,//membership name
            invoiceNo, //invoice number,
            businessName: businessName || '',//customer business name
            abn: abn || '',//customer abn
        }

        //generating invoice pdf 
        let generatedFileName = await genratePdf.generateMembershipInvoicePdf(invoiceData, req.payload);
        //add invoice url in payment collection
        await transactionModal.findByIdAndUpdate({ _id: id }, {
            invoiceUrl: generatedFileName,
            invoiceNumber: invoiceNo
        }, { new: true })

        let result = { "invoiceUrl": generatedFileName }
        return successResponse(result, 'Invoice downloaded successfully.', res);
        // const generatedFileName = await generateInvoice(transaction, user);
        // res.setHeader('Content-disposition', 'inline; filename="invoice.pdf"');
        // res.setHeader('Content-type', 'application/pdf');
        // res.send(generatedFileName)
        // return res

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.buyGuestPasses = async (req, res) => {
    try {
        // Get the current date and time in UTC
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        let { boutique_id, price } = req.body
        let userMembership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active" })
        if (!userMembership) {
            return failMessage('User does not have any membership!', res)
        }
        let boutique = await boutiqueModal.findOne({ _id: boutique_id })
        if (!boutique) {
            return emptyResponse(boutique, res)
        }

        // Find the prices with effective dates after the current UTC date and time
        const prices = await priceModal.find({
            status: "active",
            boutique: boutique_id,
            effectiveDate: { $lte: startDate }, // Only select prices with effective dates less than or equal to the current UTC time
            $or: [
                { effectiveEndDate: null }, // Select prices with no effective end date
                { effectiveEndDate: { $gt: startDate } } // Select prices with effective end dates greater than the current UTC time
            ]
        }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date

        if (!prices || prices.length === 0) {
            // If no prices are found, send a response indicating that no price is available
            return notFoundResponse('Price not found', res);
        }

        // Get the latest price based on descending order of effective date
        const currentPrice = prices[0];

        // Extract the price value and initiation fees from the current price
        let priceValue = currentPrice.price;
        let initiationFees = currentPrice.initiationFees;
        //Add transaction
        const transaction = await createPayment({
            userId: req.payload._id,
            type: "Guest Passes",
            name: boutique.name,
            purchaseTransactionId: boutique_id,
            price: priceValue,
            image: process.env.BOUTIQUELOGO,
            currency: "AUD",
        });


        // Handle payment failure
        if (!transaction.success) {
            return failMessage(transaction.message, res);
        }
        //Add guest passes to users
        await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
            guest_passes: req.payload.guest_passes + Number(boutique.product_set)
        }, { new: true })
        //Getting user prefernces
        let preference = await prefernceModal.findOne({ user_id: req.payload._id, status: "active" })
        if (preference && preference.automaticInvoiceToMail) {
            //send Invoice to email
            const generatedFileName = await generateInvoice(transaction, req.payload);
            let pdfSentToMail = ""
            if (preference.automaticMail) {
                pdfSentToMail = preference.automaticMail
            } else {
                pdfSentToMail = req.payload.email
            }
            // After PDF generation completes, send the email
            await mail.sendMailInvoice({
                email: pdfSentToMail,
                file: generatedFileName
            });

        }

        // Return a success response with data
        return successResponse(transaction, 'Passes purchased successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.redeemGiftCard = async (req, res) => {
    try {

        let code = req.body.code
        let userGiftCardData = await userGiftCard.findOne({
            code,
            recipient_number: req.payload.phone,
            recipient_phone_code: req.payload.phone_code,
            recipient_country_code: req.payload.country_code,
            isRedeem: false
        })
        if (!userGiftCardData) return failMessage("Invalid Gift Card!", res)

        let deliveryTime = convertTo24HourFormat(userGiftCardData.delivery_time)
        let deliveryDateTime = new Date(userGiftCardData.delivery_date + " " + deliveryTime);
        const correctDeliveryDateTime = new Date(deliveryDateTime);
        correctDeliveryDateTime.setHours(correctDeliveryDateTime.getHours() + 5);
        correctDeliveryDateTime.setMinutes(correctDeliveryDateTime.getMinutes() + 30);
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        if (startDate.getTime() < correctDeliveryDateTime.getTime()) return failMessage('Invalid Gift Card!', res)
        let userMembership = await userMembershipModal.findOne({
            user_id: req.payload._id, status: "active"
        })
        let boutique = await boutiqueModal.findOne({
            _id: userGiftCardData.boutiqueId,
            status: "active"
        })
        if (!boutique) return failMessage('Invalid Gift Card!', res)
        let membershipData = await membershipModal.findOne({ _id: boutique.membership_id, status: "active" })
        if (!membershipData) return failMessage('Invalid Gift Card!', res)
        //If month then multiply the month with 30 otherwise multiply with 7 for weeks for getting total no of days
        let noOfDays = (boutique.is_month) ? Number(boutique.no_of_month * 30) : Number(boutique.no_of_month * 7)
        if (!userMembership || (userMembership && new Date(userMembership.renewal_date).getTime() < startDate.getTime())) {
            if (userMembership) await userMembershipModal.findOneAndUpdate({ _id: userMembership._id }, { status: "inactive" })
            let nextRenewalDate = new Date(startDate.setDate(startDate.getDate() + noOfDays))

            await userMembershipModal.create(
                {
                    user_id: req.payload._id,
                    name: membershipData.name,
                    price: userGiftCardData.price,
                    renewal_date: nextRenewalDate,
                    membership_id: membershipData._id,
                    isAutoRenew: false,
                    type: membershipData.type
                }
            );
            if (membershipData.type == 1) {
                await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                    reusable_bookings: 2, guest_passes: 1
                }, { new: true })
                // await transactionModal.create({
                //     user_id: req.payload._id,
                //     type: "Membership Perk",
                //     membership_id,
                //     image: process.env.GUESTPASSLOGO,
                //     name: "+1 Guest Pass"
                // })
            }
            if (membershipData.type == 2) {
                await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                    reusable_bookings: 4, guest_passes: 2, reset_vouchers: 4
                }, { new: true })
                // await transactionModal.create({
                //     user_id: req.payload._id,
                //     type: "Membership Perk",
                //     membership_id,
                //     image: process.env.GUESTPASSLOGO,
                //     name: "+2 Guest Passes"
                // })
                // await transactionModal.create({
                //     user_id: req.payload._id,
                //     type: "Membership Perk",
                //     membership_id,
                //     image: process.env.RESETVOUCHERLOGO,
                //     name: "+4 Reset Vouchers",
                //     reset_voucher: updatedUser.reset_vouchers
                // })
            }
            await userGiftCard.findOneAndUpdate({ _id: userGiftCardData._id }, { isRedeem: true })
        }
        else {
            let timeDifference = new Date(userMembership.renewal_date).getTime() - startDate.getTime()
            function setLongTimeOut(callback, timeout) {
                const maxDelay = 2 ** 31 - 1
                if (timeout > maxDelay) {
                    let expectedTick = Math.ceil(timeout / maxDelay)
                    const id = setInterval(() => {
                        if (!--expectedTick) {
                            callback()
                            clearInterval(id)
                        }
                    }, timeout / expectedTick)
                    return id
                }
                return setTimeout(callback, timeout)
            }
            const TimeOutId = setLongTimeOut(async () => {
                let userData = await userModal.findOne({ _id: req.payload._id, status: "active" })
                if (userData) {
                    let currUserMembership = await userMembershipModal.findOne({
                        user_id: userData._id,
                        status: "active"
                    })
                    const currentDate = new Date();
                    const startDate = new Date(currentDate);
                    startDate.setHours(startDate.getHours() + 10);
                    //startDate.setMinutes(startDate.getMinutes() + 30);
                    if (currUserMembership && new Date(currUserMembership.renewal_date).getTime() < startDate.getTime()) {
                        await userMembershipModal.findOneAndUpdate({
                            _id: currUserMembership._id
                        }, {
                            status: "inactive"
                        })
                        let nextRenewalDate = new Date(startDate.setDate(startDate.getDate() + noOfDays))

                        if (currUserMembership.type == 1 && membershipData.type == 2) {
                            await userMembershipModal.create({
                                userId: userData._id,
                                purchaseTransactionId: membershipData._id,
                                name: membershipData.name,
                                price: boutique.price,
                                renewal_date: nextRenewalDate,
                                is_activate: currUserMembership.is_activate,
                                type: membershipData.type
                            })

                            //Add transaction for upgraded membership
                            // await transactionModal.create({
                            //     user_id: req.payload._id,
                            //     membership_id,
                            //     type: "Membership",
                            //     name: "Upgrade",
                            //     price: prarataDiff, initiationFees,
                            //     renewal_date: data.renewal_date,
                            //     image: process.env.MEMBERSHIPLOGO
                            // })
                            let upgraded_reusable = 4
                            let user_booking_count = 0
                            let booking_data = await booking_modal.find({ user_id: userData._id, status: "active" })
                            if (booking_data && booking_data.length > 0) {
                                booking_data.forEach((booking) => {
                                    if (booking.booking_status == "confirmed" && !booking.is_journey_completed) {
                                        user_booking_count++
                                    }
                                    if (booking.booking_status == "canceled" && booking.isPenalty == 1) {
                                        user_booking_count++
                                    }
                                })
                            }
                            if (Number(userData.reusable_bookings) >= 0 && Number(userData.reusable_bookings) < 2) {
                                upgraded_reusable = 4 - Number(userData.reusable_bookings)
                            }
                            if (user_booking_count) {
                                if (user_booking_count >= 4) {
                                    upgraded_reusable = 0
                                } else if (user_booking_count >= 0 && user_booking_count < 4) {
                                    upgraded_reusable = 4 - user_booking_count

                                }
                            }
                            //Add 4 reusable bookings, 2 guest passes in every 3 months, 4 reset vouchers in every 3 months.
                            await userModal.findByIdAndUpdate({ _id: userData._id }, {
                                guest_passes: userData.guest_passes + 2,
                                reusable_bookings: upgraded_reusable,
                                reset_vouchers: userData.reset_vouchers + 4
                            }, { new: true })

                        }
                        else if (currUserMembership.type == 2 && membershipData.type == 1) {
                            await userMembershipModal.create({
                                userId: userData._id,
                                purchaseTransactionId: membershipData._id,
                                name: membershipData.name,
                                price: boutique.price,
                                renewal_date: nextRenewalDate,
                                is_activate: currUserMembership.is_activate,
                                type: membershipData.type
                            })

                            //Add transaction for upgraded membership
                            // await transactionModal.create({
                            //     user_id: req.payload._id,
                            //     membership_id,
                            //     type: "Membership",
                            //     name: "Upgrade",
                            //     price: prarataDiff, initiationFees,
                            //     renewal_date: data.renewal_date,
                            //     image: process.env.MEMBERSHIPLOGO
                            // })

                            //Add 4 reusable bookings, 2 guest passes in every 3 months, 4 reset vouchers in every 3 months.
                            await userModal.findByIdAndUpdate({ _id: userData._id }, {
                                guest_passes: 1,
                                reusable_bookings: 2,
                                reset_vouchers: 2
                            }, { new: true })

                        } else {
                            await userMembershipModal.findOneAndUpdate({
                                _id: currUserMembership._id
                            },

                                {

                                    renewal_date: nextRenewalDate,
                                    status: "active"
                                })
                        }
                        await userGiftCard.findOneAndUpdate({ _id: userGiftCardData._id }, { isRedeem: true })

                    }
                }


            }, timeDifference);
        }

        // Return a success response with data
        return successResponseWithoutData('Gift Card redeemed successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.changeRenewalDay = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let { membership_id, day } = req.body
        if (!Number(day)) {
            return failMessage('Day must be a number.', res)
        }
        // let curr_date = startDate.getDate()
        // if (Number(day) < curr_date) return failMessage('Day must be greater than today.', res)

        //Getting user membership data
        let user_membership = await userMembershipModal.findOne({
            user_id: req.payload._id,
            membership_id, status: "active"
        })
        if (!user_membership) {
            return failMessage('No active membership found.', res)
        }
        const curr_renewal = new Date(user_membership.renewal_date)
        const dayNumber = curr_renewal.getDate();
        const renewalDate = new Date(user_membership.renewal_date)
        let renewal_month = renewalDate.getMonth() + 1
        renewalDate.setDate(Number(day))
        if (dayNumber > day) {
            renewalDate.setMonth(renewal_month)
        }

        let diff2 = (renewalDate.getTime() - curr_renewal.getTime()) / (1000 * 60 * 60 * 24)
        let diff = Math.abs((renewalDate.getTime() - curr_renewal.getTime()) / (1000 * 60 * 60 * 24));
        let year = curr_renewal.getFullYear();
        let totalDays = new Date(year, renewal_month, 0).getDate();
        let charges = diff * (Number(user_membership.changed_price ? user_membership.changed_price : user_membership.price) / Number(totalDays));

        // let card_details = await paymentModal.aggregate([
        //     {
        //         $match: {
        //             userId: mongoose.Types.ObjectId(req.payload._id),
        //             isActive: true,
        //             status: "active"
        //         }
        //     },
        //     {
        //         $lookup: {
        //             from: "payment_methods", // Specify the collection to join
        //             localField: "paymentMethod", // Field from the current collection
        //             foreignField: "_id", // Field from the other collection
        //             as: "payment_method_data" // Alias for the joined data
        //         }
        //     }
        // ]);
        //Find payment details by user id
        let card_details = await paymentModal.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(req.payload._id),
                    isActive: true,
                    status: "active"
                }
            },
            {
                $lookup: {
                    from: "payment_methods",
                    let: { to_id: "$paymentMethod" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$to_id"] }
                            }
                        }
                    ],
                    as: "paymentMethod"
                }
            },
            {
                $unwind: {
                    path: "$paymentMethod",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        let result = {
            "_id": user_membership._id,
            "user_id": user_membership.user_id,
            "membership_id": user_membership.membership_id,
            "name": user_membership.name,
            "price": user_membership.price,
            "changed_price": user_membership.changed_price,
            "change_date": user_membership.change_date,
            "updated_purchase_date": user_membership.updated_purchase_date,//Unknown during KT by rahul roy
            "renewal_date": renewalDate,
            "isAutoRenew": user_membership.isAutoRenew,
            "snooze_till": user_membership.snooze_till,
            "is_activate": user_membership.is_activate,
            "status": user_membership.status,
            "createdAt": user_membership.createdAt,
            "updatedAt": user_membership.updatedAt
        }
        // Return a success response with data
        return successResponse({ membership: result, additional_charges: Number(charges.toFixed(2)), card_details }, 'Renewal day changes successfully!', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.changeRenewalDayConfirmPay = async (req, res) => {
    try {
        let { membership_id, additional_charges, new_renewable_date } = req.body
        // if (!Number(additional_charges)) {
        //     return failMessage('Additional charges must be a number.', res)
        // }
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        //Getting user membership data
        let user_membership = await userMembershipModal.findOne({
            user_id: req.payload._id,
            membership_id, status: "active"
        })
        if (!user_membership) {
            return failMessage('No active membership found.', res)
        }

        await userMembershipModal.findByIdAndUpdate({ _id: user_membership._id }, {
            renewal_date: new_renewable_date
        }, { new: true })

        await priceModal.findOne({
            membership: membership_id,
            effectiveDate: { $lte: startDate },
        })
            .sort({ effectiveDate: -1 })
            .limit(1);
        // Query the discount modal to get the active discount for the given membership
        const activeDiscounts = await discountModal.find({
            membership_id,
            status: 'active',
            $or: [
                {
                    start_date: { $lte: currentDate },
                    end_date: { $gte: currentDate }
                },
                {
                    start_date: { $lte: currentDate },
                    end_date: null
                }
            ]
        }).sort({ start_date: -1 });
        // Find and update the smallest discount
        let smallestDiscount = await commonservices.findSmallestDiscount(activeDiscounts);

        //Add user transaction data
        let user_transaction = await createPayment({
            userId: req.payload._id,
            purchaseTransactionId: membership_id,
            type: "Membership",
            name: "Change Renewal Day",
            price: Number(additional_charges),
            initiationFees: smallestDiscount?.initiation_fees || "",
            renewal_date: new_renewable_date,
            image: process.env.MEMBERSHIPLOGO
        });

        // Handle payment failure
        if (!user_transaction.success) {
            return failMessage(user_transaction.message, res);
        }


        // Return a success response with data
        return successResponse(user_transaction, 'Additional charges paid successfully!', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.terminateMembership = async (req, res) => {
    try {
        const { membership_id } = req.body;
        const userId = req.payload._id;

        // Retrieve active membership settings
        const membershipSettings = await membership_settings.findOne({ status: 'active' });
        const userData = req.payload;
        // Get user membership data
        const userMembership = await userMembershipModal.findOne({ user_id: userId, membership_id, status: "active" });

        if (!userMembership) {
            return failMessage('No membership found.', res);
        }

        // Check if the membership type is 2 and handle accordingly
        let userNormalMembership;
        if (userMembership.type == 2) {
            userNormalMembership = await userMembershipModal.findOne({
                user_id: userId,
                type: 1
            }).sort({ _id: -1 }).exec();
        }

        // Check if the membership was purchased today
        const purchaseDate = new Date(userMembership.createdAt);
        const currentDate = new Date();

        if (purchaseDate.toDateString() === currentDate.toDateString()) {
            // Refund the payment(s) and handle the results
            const result = await processRefund(userId, membership_id, purchaseDate, userMembership.renewal_date, userMembership.payIntId, membershipSettings, userData, userMembership.type === 2 ? "Unlimited Elite" : "Unlimited");

            if (!result.success) {
                return failMessage(result.message, res);
            }

            if (userMembership.type == 2 && userNormalMembership) {
                const secondResult = await processRefund(userId, userNormalMembership._id, purchaseDate, userNormalMembership.renewal_date, userNormalMembership.payIntId, membershipSettings, userData, "Unlimited");

                if (!secondResult.success) {
                    return failMessage(secondResult.message, res);
                }
            }
        }

        // Update the guest passes, pet passes, reusable bookings, and reset vouchers
        await userModal.findByIdAndUpdate(userId, {
            guest_passes: 0,
            pet_passes: 0,
            reusable_bookings: 0,
            reset_vouchers: 0
        }, { new: true });

        // Inactivate the current membership
        await userMembershipModal.findByIdAndUpdate(userMembership._id, {
            status: "inactive"
        }, { new: true });

        if (!userMembership.is_activate) {
            // Handle referral updates
            await handleReferralUpdates(req.payload._id);
        }

        return successResponseWithoutData('Membership terminated successfully!', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

const processRefund = async (userId, membership_id, purchaseDate, renewal_date, payIntId, membershipSettings, userData, membershipName) => {
    const result = await refundPayment(payIntId);

    if (!result.success) {
        return result;
    }

    // Format the current and renewal dates
    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-au', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatPurchaseDate = formatDate(purchaseDate);
    const formatRenewalDate = formatDate(renewal_date);

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const formattedDate = year[0] + month[0] + day[0] + year[1] + month[1] + day[1];
    const invoiceNo = formattedDate + '-' + randomize('0', 3);
    const reverseGST = parseFloat(result?.data?.[0]?.amount) * 100 / (100 + 10);
    const gst = (parseFloat(result?.data?.[0]?.amount) - parseFloat(reverseGST)).toFixed(2);
    const currdate = new Date().toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });

    const transaction = await transactionModal.create({
        userId,
        type: "Refund",
        purchaseTransactionId: membership_id,
        image: process.env.MEMBERSHIPLOGO,
        name: `Refund: ${membershipName}`,
        normalPrice: result?.data?.[0]?.amount,
        normalInitiationFees: '',
        initiationFees: '',
        price: result?.data?.[0]?.amount
    });

    let businessName;
    let abn;

    // Find user's active card
    let userCardInfo = await cardModal.findOne({ _id: transaction.cardId });
    if (userCardInfo) {
        businessName = userCardInfo.businessName;
        abn = userCardInfo.abn;
    }

    const invoiceData = {
        purchaseDate: formatPurchaseDate,
        renewal_date: formatRenewalDate,
        amount: result?.data?.[0]?.amount,
        currdate,
        gst,
        name: membershipName,
        invoiceNo,
        businessName: businessName || '',
        abn: abn || ''
    };

    const generatedFileName = await refundPdf.generateRefundMembershipInvoicePdf(invoiceData, userData);

    await transactionModal.findByIdAndUpdate(transaction._id, {
        invoiceNumber: invoiceNo,
        invoiceUrl: generatedFileName
    }, { new: true });

    if (result?.data?._id) {
        await transactionModal.findByIdAndUpdate(result?.data?._id, {
            invoiceNumber: invoiceNo,
            invoiceUrl: generatedFileName
        }, { new: true });
    }

    await saveAirwallexLog(userId, result);

    await mail.sendMailRefundInvoice({
        email: userData.email,
        file: generatedFileName
    });

    return result;
};

const saveAirwallexLog = async (userId, result) => {
    const airwallexLog = new airwallexLogModal({
        cardId: '',
        userId,
        price: result?.data?.[0]?.amount,
        transactionId: result?.data[0].payment_intent_id,
        paymentStatus: result?.data[0].status,
        airwallexData: JSON.stringify(result),
        paymentType: 'Airwallex'
    });
    await airwallexLog.save();
};

const handleReferralUpdates = async (userId) => {
    const referDoc = await referModal.findOne({
        $or: [
            { user_id: userId },
            { send_to: userId }
        ]
    });

    if (referDoc) {
        await userModal.updateOne(
            { _id: referDoc?.user_id, underway: { $gt: 0 } },
            { $inc: { underway: -1 } },
            { new: true }
        );

        await userModal.updateOne(
            { _id: referDoc?.send_to, underway: { $gt: 0 } },
            { $inc: { underway: -1 } },
            { new: true }
        );

        await referModal.findByIdAndUpdate(
            referDoc?._id,
            {
                refer_status: 'canceled',
                send_by_refer: 'canceled',
                send_to_refer: 'canceled'
            },
            { new: true }
        );
    }
};

// exports.terminateMembership = async (req, res) => {
//     try {
//         let { membership_id } = req.body;
//         let membershipSettings = {};
//         membershipSettings = await membership_settings.findOne({ status: 'active' });

//         // Getting user membership data
//         let user_membership = await userMembershipModal.findOne({
//             user_id: req.payload._id,
//             membership_id, status: "active"
//         });

//         if (!user_membership) {
//             return failMessage('No membership found.', res);
//         }

//         // Check if the membership type is 2 and handle accordingly
//         let userNormalMembership;
//         if (user_membership.type == 2) {
//             userNormalMembership = await userMembershipModal.findOne({
//                 user_id: req.payload._id,
//                 type: 1
//             }).sort({ _id: -1 }).exec();
//         }
//         // Check if the membership was purchased today
//         let purchaseDate = new Date(user_membership.createdAt);
//         let currentDate = new Date();
//         // Compare the dates (only the date parts)
//         if (purchaseDate.toDateString() === currentDate.toDateString()) {
//             // Create payment using the createPayment function
//             let result = await refundPayment(user_membership.payIntId);

//             if (user_membership.type == 2 && userNormalMembership) {
//                 // Refund the second payment
//                 let secondResult = await refundPayment(userNormalMembership.payIntId);

//                 // Handle payment failure for the second refund
//                 if (!secondResult.success) {
//                     return failMessage(secondResult.message, res);
//                 }
//                 console.log(secondResult, 'secondResult');
//                 let transationId = await transactionModal.create({
//                     userId: req.payload._id,
//                     type: "Refund",
//                     purchaseTransactionId: membership_id,
//                     image: process.env.MEMBERSHIPLOGO,
//                     name: "Unlimited Elite",
//                     normalPrice: priceValue,
//                     normalInitiationFees: initiationFee,
//                     initiationFees: initiationFees,
//                     price: membershipSettings.preOrder == false ? initiationFees : '0'
//                 });
//                 // Save Airwallex payment log for the second refund
//                 const secondAirwallexLog = new airwallexLogModal({
//                     cardId: '',
//                     userId: req.payload._id,
//                     price: secondResult?.data?.amount,
//                     transactionId: secondResult?.data[0].payment_intent_id,
//                     paymentStatus: secondResult?.data[0].status, // Received For Refund
//                     airwallexData: JSON.stringify(secondResult),
//                     paymentType: 'Airwallex' // You need to define the type
//                 });
//                 await secondAirwallexLog.save();
//                 // current date
//                 const date = new Date();
//                 // Extract the year, month, and day
//                 const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
//                 const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month and pad with leading zero if necessary
//                 const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary

//                 //Concatenate the parts
//                 const formattedDate = year[0] + month[0] + day[0] + year[1] + month[1] + day[1];
//                 //invoice number 
//                 let invoiceNo = formattedDate + '-' + randomize('0', 3);
//                 //reverse gst calculation
//                 let reverseGST = parseFloat(latest_Price) * 100 / (100 + 10);
//                 let gst = parseFloat(latest_Price) - parseFloat(reverseGST);
//                 gst = gst.toFixed(2);
//                 //current date
//                 let nowDate = new Date();
//                 let currdate = nowDate.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
//                 //renewal date
//                 let renewData = new Date(renewal_date);
//                 let renewalDateInfo = renewData.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
//                 //invoice dta
//                 let invoiceData = {
//                     renewalDateInfo,//renewal date
//                     amount: secondResult?.data?.amount,
//                     currdate,//current date
//                     gst,//reverse gst
//                     name,//membership name
//                     invoiceNo, //invoice number,
//                     businessName: businessName || '',//customer business name
//                     abn: abn || '',//customer abn
//                 }
//                 //generating invoice pdf 
//                 let generatedFileName = await refundPdf.generateRefundMembershipInvoicePdf(invoiceData, req.payload);
//                 //adding invoice info with 
//                 await transactionModal.findByIdAndUpdate({ _id: transationId?._id }, {
//                     invoiceNumber: invoiceNo,
//                     invoiceUrl: generatedFileName
//                 }, { new: true })

//                 if (result?.data?._id) {
//                     //adding invoice info with 
//                     await transactionModal.findByIdAndUpdate({ _id: result?.data?._id }, {
//                         invoiceNumber: invoiceNo,
//                         invoiceUrl: generatedFileName
//                     }, { new: true })
//                 }
//                 // Send invoice email if user preference is enabled
//                 let preference = await prefernceModal.findOne({ user_id: req.payload._id, status: "active" });
//                 if (preference?.automaticInvoiceToMail) {
//                     //const generatedFileName = await generateInvoice(result, req.payload);

//                     await mail.sendMailMembershipInvoice({
//                         email: req.payload.email,
//                         file: generatedFileName
//                     });
//                 }
//             }

//             // Handle payment failure for the first refund
//             if (!result.success) {
//                 return failMessage(result.message, res);
//             }
//             let transationId = await transactionModal.create({
//                 userId: req.payload._id,
//                 type: "Refund",
//                 purchaseTransactionId: membership_id,
//                 image: process.env.MEMBERSHIPLOGO,
//                 name: "Unlimited",
//                 normalPrice: priceValue,
//                 normalInitiationFees: initiationFee,
//                 initiationFees: initiationFees,
//                 price: membershipSettings.preOrder == false ? initiationFees : '0'
//             });
//             // current date
//             const date = new Date();
//             // Extract the year, month, and day
//             const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
//             const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month and pad with leading zero if necessary
//             const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary

//             //Concatenate the parts
//             const formattedDate = year[0] + month[0] + day[0] + year[1] + month[1] + day[1];
//             //invoice number 
//             let invoiceNo = formattedDate + '-' + randomize('0', 3);
//             //reverse gst calculation
//             let reverseGST = parseFloat(latest_Price) * 100 / (100 + 10);
//             let gst = parseFloat(latest_Price) - parseFloat(reverseGST);
//             gst = gst.toFixed(2);
//             //current date
//             let nowDate = new Date();
//             let currdate = nowDate.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
//             //renewal date
//             let renewData = new Date(renewal_date);
//             let renewalDateInfo = renewData.toLocaleString('en-au', { month: 'short', year: 'numeric', day: 'numeric' });
//             //invoice dta
//             let invoiceData = {
//                 renewalDateInfo,//renewal date
//                 amount: result?.data?.amount,
//                 currdate,//current date
//                 gst,//reverse gst
//                 name,//membership name
//                 invoiceNo, //invoice number,
//                 businessName: businessName || '',//customer business name
//                 abn: abn || '',//customer abn
//             }
//             //generating invoice pdf 
//             let generatedFileName = await refundPdf.generateRefundMembershipInvoicePdf(invoiceData, req.payload);
//             //adding invoice info with 
//             await transactionModal.findByIdAndUpdate({ _id: transationId?._id }, {
//                 invoiceNumber: invoiceNo,
//                 invoiceUrl: generatedFileName
//             }, { new: true })

//             if (result?.data?._id) {
//                 //adding invoice info with 
//                 await transactionModal.findByIdAndUpdate({ _id: result?.data?._id }, {
//                     invoiceNumber: invoiceNo,
//                     invoiceUrl: generatedFileName
//                 }, { new: true })
//             }
//             // Send invoice email if user preference is enabled
//             let preference = await prefernceModal.findOne({ user_id: req.payload._id, status: "active" });
//             if (preference?.automaticInvoiceToMail) {
//                 //const generatedFileName = await generateInvoice(result, req.payload);

//                 await mail.sendMailMembershipInvoice({
//                     email: req.payload.email,
//                     file: generatedFileName
//                 });
//             }

//             // Save Airwallex payment log for the first refund
//             const airwallexLog = new airwallexLogModal({
//                 cardId: '',
//                 userId: req.payload._id,
//                 price: result?.data?.amount,
//                 transactionId: secondResult?.data[0].payment_intent_id,
//                 paymentStatus: secondResult?.data[0].status, // Received For Refund
//                 airwallexData: JSON.stringify(result),
//                 paymentType: 'Airwallex' // You need to define the type
//             });
//             await airwallexLog.save();
//         }

//         // Update the guest passes, pet passes, reusable bookings and reset vouchers
//         let update_user = await userModal.findByIdAndUpdate({ _id: req.payload._id }, {
//             guest_passes: 0,
//             pet_passes: 0,
//             reusable_bookings: 0,
//             reset_vouchers: 0
//         }, { new: true });

//         // Inactive the current membership
//         let membership = await userMembershipModal.findByIdAndUpdate({ _id: user_membership._id }, {
//             status: "inactive"
//         }, { new: true });

//         if (!user_membership.is_activate) {
//             // Find the referral document for the user
//             const referDoc = await referModal.findOne({
//                 $or: [
//                     { user_id: req.payload._id },
//                     { send_to: req.payload._id }
//                 ]
//             });

//             // Update guest passes and underway for both sender and receiver
//             if (referDoc) {
//                 await userModal.updateOne(
//                     { _id: referDoc?.user_id },
//                     { $inc: { underway: -1 } },
//                     { new: true }
//                 );

//                 await userModal.updateOne(
//                     { _id: referDoc?.send_to },
//                     { $inc: { underway: -1 } },
//                     { new: true }
//                 );

//                 // Update referral status to 'canceled'
//                 await referModal.findByIdAndUpdate(
//                     referDoc?._id,
//                     { refer_status: 'canceled' },
//                     { send_by_refer: 'canceled' },
//                     { send_to_refer: 'canceled' },
//                     { new: true }
//                 );
//             }
//         }

//         // Return a success response
//         return successResponseWithoutData('Membership terminated successfully!', res);

//     } catch (error) {
//         console.error(error);
//         // Handle and respond with an internal server error message
//         return internalServerError('Internal Server Error', res);
//     }
// };

exports.cancelBooking = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let { id } = req.query

        //reset_guest_pass

        //Getting user booking data
        let booking_data = await booking_modal.findOne({
            _id: id, user_id: req.payload._id
        })
        if (!booking_data) {
            return failMessage('No booking found.', res)
        }
        let change = true
        if (booking_data.booking_status != 'confirmed') {
            change = false
        }
        //empty the seats
        let flight_seat = await flight_seat_mapping.findOne({ flight_id: booking_data.flight_id })
        let flightdata = await flightModal.findOne({ _id: booking_data.flight_id })

        if (!flight_seat || !flightdata) {
            return failMessage('Invalid flight!', res)
        }
        await flightModal.findByIdAndUpdate({ _id: booking_data.flight_id }, { pet_on_board: false }, { new: true });

        //get flight departure date time
        let curr_date = startDate
        let hours = flightdata.takeoff_time.split(":")[0]
        let minutes = flightdata.takeoff_time.split(":")[1]

        let takeoffDateTime = new Date(`${flightdata.flight_takeoff_date}`)
        let [time1Hours, time1Minutes] = flightdata.takeoff_time.split(':').map(Number);
        takeoffDateTime = takeoffDateTime.setHours(time1Hours, time1Minutes)
        if (takeoffDateTime < curr_date) {
            return failMessage('Invalid flight!', res)
        }

        let update_booking;
        let diff = (takeoffDateTime - curr_date) / (1000 * 60 * 60);
        if (diff > 24)//when greater than 24 hours then no penalty
        {
            //update booking changed to canceled
            update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                booking_status: "canceled",
                canceled_datetime: startDate,
                isPenalty: 0

            }, { new: true })
        } else if (diff <= 24 && diff > 12) {
            //greter than 12 hours and less than 24 hours

            if (!change) {

                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    booking_status: "canceled",
                    canceled_datetime: startDate,
                    isPenalty: 0


                }, { new: true })
                let reset_guest_pass = false, reset_pet_pass = false
                if (update_booking.pet_penalty == 1 && update_booking.pet_pass_used) reset_pet_pass = true
                if (update_booking.guest_penalty == 1 && update_booking.guest_pass_used) reset_guest_pass = true
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    reset_pet_pass, reset_guest_pass

                }, { new: true })
            } else {

                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    booking_status: "canceled",
                    canceled_datetime: startDate,
                    isPenalty: 1,
                    between12to24hr: true,
                    reset_reusable_booking: true,
                    reusable_penalty: 1


                }, { new: true })
                let reset_guest_pass = false, reset_pet_pass = false, pet_penalty = 0, guest_penalty = 0
                //update_booking.pet_penalty == 0 && 
                if (update_booking.pet_pass_used) {
                    reset_pet_pass = true
                    pet_penalty = 1
                }
                if (update_booking.pet_pass_used == 1 && update_booking.pet_penalty == 2) {
                    reset_pet_pass = false
                    pet_penalty = 1
                }
                //update_booking.guest_penalty == 0 && 
                if (update_booking.guest_pass_used) {
                    reset_guest_pass = true
                    guest_penalty = 1
                }
                if (update_booking.guest_pass_used == 1 && update_booking.guest_penalty == 2) {
                    reset_guest_pass = false
                    guest_penalty = 1
                }
                let petPassUsed = 0;
                if (reset_pet_pass == true) {
                    petPassUsed = parseInt(update_booking.pet_pass_used);
                }
                let guestPassUsed = 0;
                if (reset_guest_pass == true) {
                    guestPassUsed = parseInt(update_booking.guest_pass_used);
                }

                let totResetPassLeft = Number(1 + (petPassUsed) + (guestPassUsed));
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    reset_pet_pass, reset_guest_pass, total_reset_passes_left: totResetPassLeft,
                    pet_penalty, guest_penalty

                }, { new: true })
                await transactionModal.create({
                    userId: req.payload._id,
                    type: "Penalty Applied",
                    booking_id: update_booking._id,
                    image: process.env.PENALTYAPPLIEDFORREUSABLE,
                    name: "Penalty applied to Reusable Booking"
                })
                if (reset_pet_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORPETPASS,
                        name: "Penalty applied to Pet Pass"
                    })
                }
                if (reset_guest_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORGUESTPASS,
                        name: "Penalty applied to Guest Pass"
                    })
                }
            }

        }
        else if (diff <= 12) {
            //less than 12 hours 

            if (!change) {
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    booking_status: "canceled",
                    canceled_datetime: startDate,
                    isPenalty: 0

                }, { new: true })
                let reset_guest_pass = false, reset_pet_pass = false, pet_penalty = 0, guest_penalty = 0
                if (update_booking.pet_penalty == 1 && update_booking.pet_pass_used) {
                    reset_pet_pass = true
                    pet_penalty = 1
                }
                if (update_booking.guest_penalty == 1 && update_booking.guest_pass_used) {
                    reset_guest_pass = true
                    guest_penalty = 1
                }
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    reset_pet_pass, reset_guest_pass, pet_penalty, guest_penalty

                }, { new: true })
            } else {
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    booking_status: "canceled",
                    canceled_datetime: startDate,
                    isPenalty: 1,
                    within12hr: true,
                    reset_reusable_booking: true,
                    reusable_penalty: 1

                }, { new: true })

                let reset_guest_pass = false, reset_pet_pass = false, pet_penalty = 0, guest_penalty = 0
                //update_booking.pet_penalty == 0 && 
                if (update_booking.pet_pass_used) {
                    reset_pet_pass = true
                    pet_penalty = 1
                }
                if (update_booking.pet_pass_used == 1 && update_booking.pet_penalty == 2) {
                    reset_pet_pass = false
                    pet_penalty = 1
                }
                //update_booking.guest_penalty == 0 &&
                if (update_booking.guest_pass_used) {
                    reset_guest_pass = true
                    guest_penalty = 1
                }
                if (update_booking.guest_pass_used == 1 && update_booking.guest_penalty == 2) {
                    reset_guest_pass = false
                    guest_penalty = 1
                }
                let petPassUsed = 0;
                if (reset_pet_pass == true) {
                    petPassUsed = parseInt(update_booking.pet_pass_used) * 2;
                }
                let guestPassUsed = 0;
                if (reset_guest_pass == true) {
                    guestPassUsed = parseInt(update_booking.guest_pass_used) * 2;
                }

                let totResetPassLeft = Number(2 + (petPassUsed) + (guestPassUsed));
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    reset_pet_pass, reset_guest_pass, total_reset_passes_left: totResetPassLeft,
                    pet_penalty, guest_penalty
                }, { new: true })

                await transactionModal.create({
                    userId: req.payload._id,
                    type: "Penalty Applied",
                    booking_id: update_booking._id,
                    image: process.env.PENALTYAPPLIEDFORREUSABLE,
                    name: "Penalty applied to Reusable Booking"
                })
                if (reset_pet_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORPETPASS,
                        name: "Penalty applied to Pet Pass"
                    })
                }
                if (reset_guest_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORGUESTPASS,
                        name: "Penalty applied to Guest Pass"
                    })
                }
            }

        }
        let updatedObj = {}
        let canceled_seat_details = []
        for (let i = 1; i <= 8; i++) {
            if (flight_seat[`seat${i}_details`] && flight_seat[`seat${i}_details`].user_id && flight_seat[`seat${i}_details`].user_id.valueOf() == req.payload._id && flight_seat[`seat${i}_details`].booking_id) {
                if (flight_seat[`seat${i}_details`].booking_id.valueOf() == id) {
                    updatedObj[`seat${i}`] = 0
                    updatedObj[`seat${i}_details`] = null
                    canceled_seat_details.push({ seat_no: i, seat_details: flight_seat[`seat${i}_details`] })
                }
            }
        }
        update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, { canceled_seat_details }, { new: true })
        //above 24 hours
        if (diff > 24)//when greater than 24 hours then no penalty
        {
            let pet_passes = 0, guest_passes = 0
            if (change) {
                pet_passes = update_booking.pet_penalty == 1 ? 0 : update_booking.pet_pass_used
                guest_passes = update_booking.guest_penalty == 1 ? 0 : update_booking.guest_pass_used
                let guestDetail = 0;
                let petDetail = 0;
                if (update_booking.isPenalty == 0) {
                    for (let seatDetailV2 of update_booking.canceled_seat_details) {
                        //checking guest
                        if (seatDetailV2.seat_details.guest_id != undefined && seatDetailV2.seat_details.user_id.equals(req.payload._id)) {
                            guestDetail++;
                        }
                        //checking pet
                        if (seatDetailV2.seat_details.pet_id != undefined && seatDetailV2.seat_details.user_id.equals(req.payload._id)) {
                            petDetail++;
                        }
                    }
                }
                let guest_passes_data = req.payload.guest_passes;
                let pet_passes_data = req.payload.pet_passes;
                //if guest detail exist then add pass guest 
                if (guestDetail > 0) {
                    guest_passes_data = parseInt(req.payload.guest_passes) + parseInt(guest_passes);
                }

                //if pet detail exist then add pass pet 
                if (petDetail > 0) {
                    pet_passes_data = parseInt(req.payload.pet_passes) + parseInt(pet_passes);
                }

                await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                    reusable_bookings: req.payload.reusable_bookings + Number(update_booking.reusable_booking_used),
                    guest_passes: guest_passes_data,
                    pet_passes: pet_passes_data,
                })
            } else {
                await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                    reusable_bookings: req.payload.reusable_bookings + Number(update_booking.reusable_booking_used)
                })

                if (booking_data.booking_status == 'pending' && booking_data.guest_pass_to_pet_pass > 0) {
                    await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                        guest_passes: req.payload.guest_passes + Number(booking_data.guest_pass_to_pet_pass)
                    })
                }
            }

        }
        let update_flight_seat = await flight_seat_mapping.findOneAndUpdate({ flight_id: booking_data.flight_id }, updatedObj, {
            new: true
        })
        // Return a success response 
        return successResponse(update_booking, 'Booking canceled successfully!', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.cancelBookingv2 = async (req, res) => {
    try {
        let { id, cancel_all, canceled_seat_nos } = req.body
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        //Getting user booking data
        let booking_data = await booking_modal.findOne({
            _id: id, user_id: req.payload._id
        })
        if (!booking_data) {
            return failMessage('No booking found.', res)
        }

        //empty the seats
        let flight_seat = await flight_seat_mapping.findOne({ flight_id: booking_data.flight_id })
        let flightdata = await flightModal.findOne({ _id: booking_data.flight_id })

        if (!flight_seat || !flightdata) {
            return failMessage('Invalid flight!', res)
        }
        if (cancel_all == 'yes' && booking_data.canceled_seat_details && booking_data.canceled_seat_details.length > 0) {
            return failMessage('Something went wrong!', res)
        }
        //get flight departure date time
        let curr_date = startDate
        let hours = flightdata.takeoff_time.split(":")[0]
        let minutes = flightdata.takeoff_time.split(":")[1]

        let takeoffDateTime = new Date(`${flightdata.flight_takeoff_date}`)
        let [time1Hours, time1Minutes] = flightdata.takeoff_time.split(':').map(Number);
        takeoffDateTime = takeoffDateTime.setHours(time1Hours, time1Minutes)
        if (takeoffDateTime < curr_date) {
            return failMessage('Invalid flight!', res)
        }

        if (cancel_all == 'yes') {
            let update_booking = await booking_modal.findOne({ _id: id });
            let reset_reusable = update_booking.reusable_penalty

            let diff = (takeoffDateTime - curr_date) / (1000 * 60 * 60)
            if (diff > 24)//when greater than 24 hours then no penalty
            {
                let change = true
                if (booking_data.booking_status != 'confirmed') {
                    change = false
                }
                //update booking changed to canceled
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    booking_status: "canceled",
                    isPenalty: 0

                }, { new: true })
                let pet_passes = 0, guest_passes = 0

                if (change) {

                    pet_passes = update_booking.pet_penalty == 1 ? update_booking.pet_pass_used : 0
                    guest_passes = update_booking.guest_penalty == 1 ? update_booking.guest_pass_used : 0
                    await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                        guest_passes: req.payload.guest_passes + guest_passes,
                        pet_passes: req.payload.pet_passes + pet_passes,
                        reusable_bookings: req.payload.reusable_bookings + Number(update_booking.reusable_penalty == 1 ? update_booking.reusable_booking_used : 0)
                    })
                } else {
                    await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                        reusable_bookings: req.payload.reusable_bookings + Number(update_booking.reusable_penalty == 1 ? update_booking.reusable_booking_used : 0)
                    })
                }


            } else if (diff <= 24 && diff > 12) {
                //greter than 12 hours and less than 24 hours
                let change = true
                if (booking_data.booking_status != 'confirmed') {
                    change = false
                }

                if (!change) {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        booking_status: "canceled",
                        isPenalty: 0


                    }, { new: true })
                    let reset_guest_pass = false, reset_pet_pass = false
                    if (update_booking.pet_penalty == 1 && update_booking.pet_pass_used) reset_pet_pass = true
                    if (update_booking.guest_penalty == 1 && update_booking.guest_pass_used) reset_guest_pass = true
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        reset_pet_pass, reset_guest_pass

                    }, { new: true })
                } else {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        booking_status: "canceled",
                        isPenalty: 1,
                        between12to24hr: true,
                        reset_reusable_booking: reset_reusable == 1 ? true : false


                    }, { new: true })
                }

            }
            else if (diff <= 12) {
                //less than 12 hours 
                let change = true
                if (booking_data.booking_status != 'confirmed') {
                    change = false
                }
                if (!change) {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        booking_status: "canceled",
                        isPenalty: 0

                    }, { new: true })
                    let reset_guest_pass = false, reset_pet_pass = false
                    if (update_booking.pet_penalty == 1 && update_booking.pet_pass_used) reset_pet_pass = true
                    if (update_booking.guest_penalty == 1 && update_booking.guest_pass_used) reset_guest_pass = true
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        reset_pet_pass, reset_guest_pass

                    }, { new: true })
                } else {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        booking_status: "canceled",
                        isPenalty: 1,
                        within12hr: true,
                        reset_reusable_booking: reset_reusable == 1 ? true : false

                    }, { new: true })
                }

            }
            let updatedObj = {}
            for (let i = 1; i <= 8; i++) {
                if (flight_seat[`seat${i}_details`]?.user_id && flight_seat[`seat${i}_details`].user_id.valueOf() == req.payload._id && flight_seat[`seat${i}_details`].booking_id) {
                    if (flight_seat[`seat${i}_details`].booking_id.valueOf() == id) {
                        updatedObj[`seat${i}`] = 0
                        updatedObj[`seat${i}_details`] = null
                    }
                }
            }
            await flight_seat_mapping.findOneAndUpdate({ flight_id: booking_data.flight_id }, updatedObj, {
                new: true
            })
            if (booking_data.round_trip_id) {
                await booking_modal.findByIdAndUpdate({ _id: booking_data.round_trip_id }, {
                    isRoundTrip: false
                }, { new: true })

            }
            // Return a success response 
            return successResponse(update_booking, 'Booking canceled successfully!', res);

        } else {//cancel particular seats

            if (!canceled_seat_nos || canceled_seat_nos.length == 0) {
                return failMessage('Please select seat for cancellation!', res)
            }
            let canceled_seat_obj = {}, count_pet = 0, count_guest = 0, isMember = false
            canceled_seat_nos.forEach((data) => {
                canceled_seat_obj[`${data}`] = data
            })
            let update_booking;
            let diff = (takeoffDateTime - curr_date) / (1000 * 60 * 60)
            let change = true
            if (booking_data.booking_status != 'confirmed') {
                change = false
            }
            if (diff > 24)//when greater than 24 hours then no penalty
            {
                //update booking changed to canceled
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    isPenalty: 0,
                    otherSeatBooking_status: "canceled",
                    canceled_datetime: startDate

                }, { new: true })
                await userModal.findByIdAndUpdate({ _id: req.payload._id }, {
                    guest_passes: req.payload.guest_passes + 1
                })

            } else if (diff <= 24 && diff > 12) {
                //greter than 12 hours and less than 24 hours
                //update booking changed to canceled
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    isPenalty: 1,
                    between12to24hr: true,
                    otherSeatBooking_status: "canceled",
                    canceled_datetime: startDate


                }, { new: true })
                let reset_guest_pass = false, reset_pet_pass = false, pet_penalty = 0, guest_penalty = 0
                if (update_booking.pet_pass_used) {
                    reset_pet_pass = true
                    pet_penalty = 1
                }
                if (update_booking.guest_pass_used) {
                    reset_guest_pass = true
                    guest_penalty = 1
                }
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    reset_pet_pass, reset_guest_pass, total_reset_passes_left: Number(1 + update_booking.pet_pass_used + update_booking.guest_pass_used),
                    pet_penalty, guest_penalty

                }, { new: true })
                if (reset_pet_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORPETPASS,
                        name: "Penalty applied to Pet Pass"
                    })
                }
                if (reset_guest_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORGUESTPASS,
                        name: "Penalty applied to Guest Pass"
                    })
                }

            } else if (diff <= 12) {
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    canceled_datetime: startDate,
                    isPenalty: 1,
                    within12hr: true,
                    otherSeatBooking_status: "canceled"

                }, { new: true })
                let reset_guest_pass = false, reset_pet_pass = false, pet_penalty = 0, guest_penalty = 0
                if (update_booking.pet_pass_used) {
                    reset_pet_pass = true
                    pet_penalty = 1
                }
                if (update_booking.guest_pass_used) {
                    reset_guest_pass = true
                    guest_penalty = 1
                }
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    reset_pet_pass, reset_guest_pass, total_reset_passes_left: Number(2 + (update_booking.pet_pass_used * 2) + (update_booking.guest_pass_used * 2)),
                    pet_penalty, guest_penalty
                }, { new: true })

                if (reset_pet_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORPETPASS,
                        name: "Penalty applied to Pet Pass"
                    })
                }
                if (reset_guest_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORGUESTPASS,
                        name: "Penalty applied to Guest Pass"
                    })
                }

            }



            let pet_passes = 0, guest_passes = 0, reusable_bookings = 0
            let updatedObj = {}
            let canceled_seat_details = []

            for (let i = 1; i <= 8; i++) {
                if (flight_seat[`seat${i}_details`]?.user_id && flight_seat[`seat${i}_details`].user_id.valueOf() == req.payload._id && flight_seat[`seat${i}_details`].booking_id) {
                    if (flight_seat[`seat${i}_details`].booking_id.valueOf() == id) {
                        if (canceled_seat_obj[`${i}`]) {
                            if (flight_seat[`seat${i}_details`].pet_id && flight_seat[`seat${i}_details`].pet_id.length > 0) count_pet++
                            if (flight_seat[`seat${i}_details`].guest_id) count_guest++
                            if (!flight_seat[`seat${i}_details`].guest_id && !flight_seat[`seat${i}_details`].pet_id) isMember = true
                            updatedObj[`seat${i}`] = 0
                            updatedObj[`seat${i}_details`] = null
                            canceled_seat_details.push({ seat_no: i, seat_details: flight_seat[`seat${i}_details`] })

                        }

                    }
                }
            }
            let booking_cancel = await booking_modal.findOne({ _id: id })
            let cancel_book_seat = booking_cancel.canceled_seat_details
            let mergedArray = canceled_seat_details.concat(cancel_book_seat);
            update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, { canceled_seat_details: mergedArray }, { new: true })

            await flight_seat_mapping.findOneAndUpdate({ flight_id: booking_data.flight_id }, updatedObj, {
                new: true
            })
            pet_passes = Number(count_pet) ? (Number(update_booking.pet_pass_used) > Number(count_pet) ? Number(update_booking.pet_pass_used) - Number(count_pet) : Number(update_booking.pet_pass_used)) : 0
            guest_passes = Number(count_guest) ? (Number(update_booking.guest_pass_used) > Number(count_guest) ? Number(update_booking.guest_pass_used) - Number(count_guest) : Number(update_booking.guest_pass_used)) : 0
            reusable_bookings = isMember ? 1 : 0
            if (reusable_bookings) {
                update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                    booking_status: "canceled"

                }, { new: true })
                if (update_booking.round_trip_id) {
                    await booking_modal.findByIdAndUpdate({ _id: update_booking.round_trip_id }, {
                        isRoundTrip: false
                    }, { new: true })

                }
            }
            if (diff > 24) {
                if (change) {
                    await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                        guest_passes: req.payload.guest_passes + guest_passes,
                        pet_passes: req.payload.pet_passes + pet_passes,
                        reusable_bookings
                    })
                }

            }


            if (Number(pet_passes) > 0 && diff <= 24) {
                if (change) {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        reset_pet_pass: true

                    }, { new: true })
                }

            }
            if (reusable_bookings && diff <= 24) {
                if (change) {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        reset_reusable_booking: true

                    }, { new: true })
                }

            }
            if (Number(guest_passes) > 0 && diff <= 24) {
                if (change) {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: id }, {
                        reset_guest_pass: true

                    }, { new: true })
                }

            }
            return successResponse(update_booking, 'Booking canceled successfully!', res);

        }

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.contactUsAutoFields = async (req, res) => {
    try {
        let enquiryList = await enquiryListModal.find({ status: "active" }, { name: 1 })

        if (enquiryList.length === 0) {
            return customResponse('No active enquiries found', res); // Respond with a not found message
        }

        // Return a success response 
        return successResponse(enquiryList, 'Data fetched successfully!', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.autoRenew = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        const user = req.payload;
        const membership = await userMembershipModal.findOne({ status: "active", user_id: user._id });

        if (!membership) {
            return failMessage('No membership found!', res);
        }
        let auto_renew = await userMembershipModal.findByIdAndUpdate({ _id: membership._id }, {
            isAutoRenew: true
        }, { new: true })
        function setLongTimeOut(callback, timeout) {
            const maxDelay = 2 ** 31 - 1
            if (timeout > maxDelay) {
                let expectedTick = Math.ceil(timeout / maxDelay)
                const id = setInterval(() => {
                    if (!--expectedTick) {
                        callback()
                        clearInterval(id)
                    }
                }, timeout / expectedTick)
                return id
            }
            return setTimeout(callback, timeout)
        }
        async function renewMembership(membership) {
            await transactionModal.create({
                userId: req.payload._id,
                type: "Auto Renew Membership",
                name: "Membership",
                purchaseTransactionId: membership._id,
                price: membership.changed_price ? membership.changed_price : membership.price,
                renewal_date: membership.renewal_date,
                image: process.env.MEMBERSHIPLOGO,
            });

            const nextRenewalDate = new Date(membership.renewal_date);
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);

            let nextMembership = await userMembershipModal.findOneAndUpdate(
                { _id: membership._id, status: "active" },
                { renewal_date: nextRenewalDate },
                { new: true }
            );
            if (nextMembership?.isAutoRenew) {
                const newRenewalTime = new Date(nextRenewalDate);
                const newTimeDifference = newRenewalTime.getTime() - Date.now();
                const nextTimeOutId = setLongTimeOut(() => renewMembership(nextMembership), newTimeDifference);
                clearTimeout(nextMembership.timeOutId);
                return nextTimeOutId;
            } else {
                clearTimeout(nextMembership.timeOutId);
            }


        };

        const deliveryDateTime = new Date(membership.renewal_date);
        const timeDifference = deliveryDateTime.getTime() - Date.now();

        const TimeOutId = setLongTimeOut(async () => {
            const refreshedMembership = await userMembershipModal.findOneAndUpdate({ status: "active", user_id: user._id }, { timeOutId: TimeOutId }, { new: true });

            if (refreshedMembership?.isAutoRenew) {
                const nextRenewalDate = new Date(refreshedMembership.renewal_date);
                nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
                const newTimeDifference = new Date(nextRenewalDate).getTime() - Date.now();
                const nextTimeOutId = setLongTimeOut(() => renewMembership(refreshedMembership), newTimeDifference);
                clearTimeout(TimeOutId);
            } else {
                clearTimeout(TimeOutId);
            }
        }, timeDifference);

        return successResponseWithoutData('Auto renew sets successfully!', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.edit_seat = async (req, res) => {
    try {
        let user = req.payload
        let {
            add_seat_no,
            remove_seat_no,
            flight_id,
            guest_id = "",
            pet_id = [],
            booking_id

        } = req.body

        if (pet_id && pet_id.length > 2) {
            return customResponse('User cannot add more than 2 pets!', res)
        }
        if (remove_seat_no == 0) {
            if (guest_id) {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "guest_id": guest_id,
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id)
                    }
                })
            }
            else if (pet_id.length > 0) {
                let pet_data = await user_pet_mapping_modal.find({
                    _id: {
                        $in: pet_id
                    }
                })
                let addSeatNo = 4;
                if (pet_data.length > 0) {
                    if (pet_data.length <= 1) {
                        pet_data.forEach((data) => {
                            if (Number(data.pet_weight) <= 9) {
                                addSeatNo = 3
                            }
                        })
                    }

                }
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: addSeatNo,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "pet_id": pet_id,
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id)
                    }
                })
            } else {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id)

                    }
                })
            }

        } else {
            if (guest_id) {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${remove_seat_no}`]: 0,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "guest_id": guest_id,
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id)

                    },
                    [`seat${remove_seat_no}_details`]: null
                })
            } else if (pet_id.length > 0) {
                let pet_data = await user_pet_mapping_modal.find({
                    _id: {
                        $in: pet_id
                    }
                })
                let addSeatNo = 4;
                if (pet_data.length > 0 && pet_data.length <= 2) {
                    if (pet_data.length <= 1) {
                        pet_data.forEach((data) => {
                            if (Number(data.pet_weight) <= 9) {
                                addSeatNo = 3
                            }
                        })
                    }
                }
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: addSeatNo,
                    [`seat${remove_seat_no}`]: 0,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "pet_id": pet_id,
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id)

                    },
                    [`seat${remove_seat_no}_details`]: null
                })
            } else {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${remove_seat_no}`]: 0,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id)

                    },
                    [`seat${remove_seat_no}_details`]: null
                })
            }

        }

        return successResponseWithoutData("Seat updation successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.edit_seatv2 = async (req, res) => {
    try {
        let user = req.payload
        let {
            add_seat_no,
            remove_seat_no,
            flight_id,
            guest_id = "",
            pet_id = [],
            booking_id

        } = req.body

        if (pet_id && pet_id.length > 2) {
            return customResponse('User cannot add more than 2 pets!', res)
        }
        let checkForOtherUser = await flight_seat_mapping.findOne({ flight_id })
        if (checkForOtherUser && checkForOtherUser[`seat${add_seat_no}`] && checkForOtherUser[`seat${add_seat_no}_details`] && checkForOtherUser[`seat${add_seat_no}_details`].user_id && checkForOtherUser[`seat${add_seat_no}_details`].user_id.valueOf() != req.payload._id && checkForOtherUser[`seat${add_seat_no}_details`].booking_id) {
            return Forbidden("Oops!  Someone else snagged the seats you wanted just a moment ago.  Could you please select an alternative seating option? We're sorry for the inconvenience!", res)

        }
        let timeoutId = setTimeout(async () => {
            try {
                let flight = await flight_seat_mapping.findOne({ flight_id, status: "active" });
                if (flight) {
                    if (flight[`seat${add_seat_no}_details`] && flight[`seat${add_seat_no}_details`].booking_id && flight[`seat${add_seat_no}_details`].isLocked) {
                        await flight_seat_mapping.findOneAndUpdate({ flight_id, status: "active" }, {
                            [`seat${add_seat_no}`]: 0,
                            [`seat${add_seat_no}_details`]: null
                        })
                    }
                    if (flight[`seat${add_seat_no}_details`] && flight[`seat${add_seat_no}_details`].booking_id && flight[`seat${add_seat_no}_details`].booking_id == booking_id) {
                        await flight_seat_mapping.findOneAndUpdate({ flight_id, status: "active" }, {
                            // [`seat${add_seat_no}`]: 0,
                            // [`seat${add_seat_no}_details`]: null
                            $set: {
                                [`seat${add_seat_no}_details.preserve`]: false
                            }
                        })
                    }
                }

            } catch (err) {
                console.error("Error in setTimeout:", err);
            }
        }, 3 * 60 * 1000); // 3 minutes in milliseconds
        if (remove_seat_no == 0) {
            if (guest_id) {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "guest_id": guest_id,
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id),
                        "isLocked": true,

                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId
                })
            }
            else if (pet_id.length > 0) {
                let pet_data = await user_pet_mapping_modal.find({
                    _id: {
                        $in: pet_id
                    }
                })
                let addSeatNo = 4;
                if (pet_data.length > 0) {
                    if (pet_data.length <= 1) {
                        pet_data.forEach((data) => {
                            if (Number(data.pet_weight) <= 9) {
                                addSeatNo = 3
                            }
                        })
                    }

                }
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: addSeatNo,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "pet_id": pet_id,
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id),
                        "isLocked": true,

                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId

                })
            } else {
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, {
                    [`seat${add_seat_no}`]: 1,
                    [`seat${add_seat_no}_details`]: {
                        "user_id": user._id,
                        "lock_date_time": "",
                        "pet_request_accepted": 1,
                        "booking_id": mongoose.Types.ObjectId(booking_id),
                        "isLocked": true,

                    },
                    [`seat${add_seat_no}_timeoutId`]: timeoutId

                })
            }

        } else {
            if (guest_id) {
                let updatedObj = {
                    [`seat${remove_seat_no}_timeoutId`]: timeoutId,
                    [`seat${remove_seat_no}_details.preserve`]: true,

                }
                if (add_seat_no != 0) {
                    updatedObj = {
                        ...updatedObj,
                        [`seat${add_seat_no}`]: 1,
                        // [`seat${remove_seat_no}`]: 0,
                        [`seat${add_seat_no}_details`]: {
                            "user_id": user._id,
                            "lock_date_time": "",
                            "guest_id": guest_id,
                            "pet_request_accepted": 1,
                            "booking_id": mongoose.Types.ObjectId(booking_id),
                            "isLocked": true,


                        },
                        [`seat${add_seat_no}_timeoutId`]: timeoutId,

                    }
                }
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, updatedObj)
            } else if (pet_id.length > 0) {
                let pet_data = await user_pet_mapping_modal.find({
                    _id: {
                        $in: pet_id
                    }
                })
                let addSeatNo = 4;
                if (pet_data.length > 0 && pet_data.length <= 2) {
                    if (pet_data.length <= 1) {
                        pet_data.forEach((data) => {
                            if (Number(data.pet_weight) <= 9) {
                                addSeatNo = 3
                            }
                        })
                    }
                }
                let updatedObj = {
                    [`seat${remove_seat_no}_timeoutId`]: timeoutId,
                    [`seat${remove_seat_no}_details.preserve`]: true,

                }
                if (add_seat_no != 0) {
                    updatedObj = {
                        ...updatedObj,
                        [`seat${add_seat_no}`]: addSeatNo,
                        // [`seat${remove_seat_no}`]: 0,
                        [`seat${add_seat_no}_details`]: {
                            "user_id": user._id,
                            "lock_date_time": "",
                            "pet_id": pet_id,
                            "pet_request_accepted": 1,
                            "booking_id": mongoose.Types.ObjectId(booking_id),
                            "isLocked": true,


                        },
                        [`seat${add_seat_no}_timeoutId`]: timeoutId,

                    }
                }
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, updatedObj)
            } else {
                let updatedObj = {
                    [`seat${remove_seat_no}_timeoutId`]: timeoutId,
                    [`seat${remove_seat_no}_details.preserve`]: true,

                }
                if (add_seat_no != 0) {
                    updatedObj = {
                        ...updatedObj,
                        [`seat${add_seat_no}`]: 1,
                        [`seat${add_seat_no}_details`]: {
                            "user_id": user._id,
                            "lock_date_time": "",
                            "pet_request_accepted": 1,
                            "booking_id": mongoose.Types.ObjectId(booking_id),
                            "isLocked": true,



                        },
                        // [`seat${remove_seat_no}_details`]: null
                        [`seat${add_seat_no}_timeoutId`]: timeoutId,

                    }
                }
                await flight_seat_mapping.findOneAndUpdate({ flight_id }, updatedObj)
            }

        }

        return successResponseWithoutData("Seat updation successfully!", res)

    } catch (err) {
        console.log("err=", err.message)
        return internalServerError('Internal Server Error', res);
    }
};
exports.confirmEditSeat = async (req, res) => {
    try {
        let { add_seat_no, remove_seat_no, pet_id = [], flight_id, canceled_seat_nos = [], booking_id } = req.body
        if (pet_id && pet_id.length > 2) {
            return customResponse('User cannot add more than 2 pets!', res)
        }
        if (canceled_seat_nos.length > 0) {//cancel particular seats
            const currentDate = new Date();
            const startDate = new Date(currentDate);
            startDate.setHours(startDate.getHours() + 10);
            //startDate.setMinutes(startDate.getMinutes() + 30);
            let curr_date = startDate
            let booking_data = await booking_modal.findOne({
                _id: booking_id, user_id: req.payload._id
            })
            if (!booking_data) {
                return failMessage('No booking found.', res)
            }
            //empty the seats
            let flight_seat = await flight_seat_mapping.findOne({ flight_id })
            let flightdata = await flightModal.findOne({ _id: flight_id })

            let takeoffDateTime = new Date(`${flightdata.flight_takeoff_date}`)
            let [time1Hours, time1Minutes] = flightdata.takeoff_time.split(':').map(Number);
            takeoffDateTime = takeoffDateTime.setHours(time1Hours, time1Minutes)
            if (takeoffDateTime < curr_date) {
                return failMessage('Invalid flight!', res)
            }


            let canceled_seat_obj = {}, count_pet = 0, count_guest = 0, isMember = false
            canceled_seat_nos.forEach((data) => {
                canceled_seat_obj[`${data}`] = data
            })
            let update_booking;
            let diff = (takeoffDateTime - curr_date) / (1000 * 60 * 60)
            let change = true
            if (booking_data.booking_status != 'confirmed') {
                change = false
            }
            if (diff > 24)//when greater than 24 hours then no penalty
            {
                //update booking changed to canceled
                update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                    isPenalty: 0,
                    otherSeatBooking_status: "canceled",
                    canceled_datetime: startDate

                }, { new: true })
                //adding guest pass when removing guest from booking
                await userModal.findByIdAndUpdate({ _id: req.payload._id },
                    { $inc: { guest_passes: 1 } }, // increment guest_passes by 1
                    { new: true })
                //removing guest pass -1 from booking
                // await booking_modal.findOneAndUpdate(
                //     { _id: booking_id },
                //     { $inc: { guest_pass_used: -1 } }, 
                //     { new: true } 
                // );

            } else if (diff <= 24 && diff > 12) {
                //greter than 12 hours and less than 24 hours
                //update booking changed to canceled
                update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                    isPenalty: 1,
                    between12to24hr: true,
                    otherSeatBooking_status: "canceled",
                    canceled_datetime: startDate


                }, { new: true })
                let reset_guest_pass = false, reset_pet_pass = false, pet_penalty = 0, guest_penalty = 0
                if (update_booking.pet_pass_used) {
                    reset_pet_pass = true
                    pet_penalty = 1
                }
                if (update_booking.guest_pass_used) {
                    reset_guest_pass = true
                    guest_penalty = 1
                }
                update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                    reset_pet_pass, reset_guest_pass, total_reset_passes_left: Number(1 + update_booking.pet_pass_used + update_booking.guest_pass_used),
                    pet_penalty, guest_penalty

                }, { new: true })
                if (reset_pet_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORPETPASS,
                        name: "Penalty applied to Pet Pass"
                    })
                }
                if (reset_guest_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORGUESTPASS,
                        name: "Penalty applied to Guest Pass"
                    })
                }

            } else if (diff <= 12) {
                update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                    canceled_datetime: startDate,
                    isPenalty: 1,
                    within12hr: true,
                    otherSeatBooking_status: "canceled"

                }, { new: true })
                let reset_guest_pass = false, reset_pet_pass = false, pet_penalty = 0, guest_penalty = 0
                if (update_booking.pet_pass_used) {
                    reset_pet_pass = true
                    pet_penalty = 1
                }
                if (update_booking.guest_pass_used) {
                    reset_guest_pass = true
                    guest_penalty = 1
                }
                update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                    reset_pet_pass, reset_guest_pass, total_reset_passes_left: Number(2 + (update_booking.pet_pass_used * 2) + (update_booking.guest_pass_used * 2)),
                    pet_penalty, guest_penalty
                }, { new: true })

                if (reset_pet_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORPETPASS,
                        name: "Penalty applied to Pet Pass"
                    })
                }
                if (reset_guest_pass) {
                    await transactionModal.create({
                        userId: req.payload._id,
                        type: "Penalty Applied",
                        booking_id: update_booking._id,
                        image: process.env.PENALTYAPPLIEDFORGUESTPASS,
                        name: "Penalty applied to Guest Pass"
                    })
                }

            }



            let pet_passes = 0, guest_passes = 0, reusable_bookings = 0
            let updatedObj = {}
            let canceled_seat_details = []

            for (let i = 1; i <= 8; i++) {
                if (flight_seat[`seat${i}_details`]?.user_id && flight_seat[`seat${i}_details`].user_id.valueOf() == req.payload._id && flight_seat[`seat${i}_details`].booking_id) {
                    if (flight_seat[`seat${i}_details`].booking_id.valueOf() == booking_id) {
                        if (canceled_seat_obj[`${i}`]) {
                            if (flight_seat[`seat${i}_details`].pet_id && flight_seat[`seat${i}_details`].pet_id.length > 0) count_pet++
                            if (flight_seat[`seat${i}_details`].guest_id) count_guest++
                            if (!flight_seat[`seat${i}_details`].guest_id && !flight_seat[`seat${i}_details`].pet_id) isMember = true
                            updatedObj[`seat${i}`] = 0
                            updatedObj[`seat${i}_details`] = null
                            canceled_seat_details.push({ seat_no: i, seat_details: flight_seat[`seat${i}_details`] })

                        }

                    }
                }
            }

            let booking_cancel = await booking_modal.findOne({ _id: booking_id })
            let cancel_book_seat = booking_cancel.canceled_seat_details
            let mergedArray = canceled_seat_details.concat(cancel_book_seat);
            update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, { canceled_seat_details: mergedArray }, { new: true })

            await flight_seat_mapping.findOneAndUpdate({ flight_id: booking_data.flight_id }, updatedObj, {
                new: true
            })
            pet_passes = Number(count_pet) ? (Number(update_booking.pet_pass_used) > Number(count_pet) ? Number(update_booking.pet_pass_used) - Number(count_pet) : Number(update_booking.pet_pass_used)) : 0
            guest_passes = Number(count_guest) ? (Number(update_booking.guest_pass_used) > Number(count_guest) ? Number(update_booking.guest_pass_used) - Number(count_guest) : Number(update_booking.guest_pass_used)) : 0
            // reusable_bookings = isMember ? 1 : req.payload.reusable_bookings
            // if (reusable_bookings) update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
            //     booking_status: "canceled"

            // }, { new: true })
            if (diff > 24) {
                if (change) {
                    await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                        guest_passes: req.payload.guest_passes + guest_passes,
                        pet_passes: req.payload.pet_passes + pet_passes,

                    })
                }

            }


            if (Number(pet_passes) > 0 && diff <= 24) {
                if (change) {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                        reset_pet_pass: true

                    }, { new: true })
                }

            }
            if (reusable_bookings && diff <= 24) {
                if (change) {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                        reset_reusable_booking: true

                    }, { new: true })
                }

            }
            if (Number(guest_passes) > 0 && diff <= 24) {
                if (change) {
                    update_booking = await booking_modal.findByIdAndUpdate({ _id: booking_id }, {
                        reset_guest_pass: true

                    }, { new: true })
                }

            }

        }
        if ((add_seat_no && add_seat_no.length > 0) && (remove_seat_no && remove_seat_no.length > 0)) {
            let seat_details = await flight_seat_mapping.findOne({ flight_id })
            const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
            let reduceGuestPasses = 0, reducePetPasses = 0
            let addSeatsObject = {}
            let userBooking = await booking_modal.findOne({ _id: booking_id })
            for (let i = 0; i < add_seat_no.length; i++) {
                if (!add_seat_no[i].seat_no) return failMessage('No seat no. passed!', res)
                if (!booking_id) return failMessage('No booking id passed!', res)
                if (!add_seat_no[i].user_id) return failMessage('No user id passed!', res)
                if (add_seat_no[i].guest_id) {
                    // let addGuestPasses = true
                    // for (let j = 1; j <= 8; j++) {
                    //     if (seat_details && seat_details[`seat${j}`] && seat_details[`seat${j}_details`] && seat_details[`seat${j}_details`]['guest_id'] && seat_details[`seat${j}_details`]['guest_id'] == add_seat_no[i].guest_id && seat_details[`seat${j}_details`]['booking_id'] && seat_details[`seat${j}_details`]['booking_id'] == booking_id) {
                    //         addGuestPasses = false
                    //         console.log('hereeeeeeeee==')
                    //     }
                    // }
                    // console.log('addGuestPasses========',addGuestPasses)
                    // if (addGuestPasses) 
                    reduceGuestPasses++

                    addSeatsObject[`seat${add_seat_no[i].seat_no}`] = 1
                    addSeatsObject[`seat${add_seat_no[i].seat_no}_details`] = {
                        "lock_date_time": "",
                        "pet_request_accepted": 1,
                        "user_id": mongoose.Types.ObjectId(add_seat_no[i].user_id),
                        "booking_id": mongoose.Types.ObjectId(booking_id),
                        "isLocked": false,
                        "guest_id": add_seat_no[i].guest_id,
                    }
                    addSeatsObject[`seat${add_seat_no[i].seat_no}_timeoutId`] = 0
                }
                if (add_seat_no[i].pet_id && add_seat_no[i].petOnLap) {
                    addSeatsObject[`seat${add_seat_no[i].seat_no}`] = 3
                    addSeatsObject[`seat${add_seat_no[i].seat_no}_details`] = {
                        "lock_date_time": "",
                        "pet_request_accepted": 1,
                        "user_id": mongoose.Types.ObjectId(add_seat_no[i].user_id),
                        "booking_id": mongoose.Types.ObjectId(booking_id),
                        "isLocked": false,
                        "pet_id": add_seat_no[i].pet_id,

                    }
                    addSeatsObject[`seat${add_seat_no[i].seat_no}_timeoutId`] = 0


                }
                if (add_seat_no[i].pet_id && !add_seat_no[i].petOnLap) {
                    reducePetPasses++
                    addSeatsObject[`seat${add_seat_no[i].seat_no}`] = 4
                    addSeatsObject[`seat${add_seat_no[i].seat_no}_details`] = {
                        "lock_date_time": "",
                        "pet_request_accepted": 1,
                        "user_id": mongoose.Types.ObjectId(add_seat_no[i].user_id),
                        "booking_id": mongoose.Types.ObjectId(booking_id),
                        "isLocked": false,
                        "pet_id": add_seat_no[i].pet_id,

                    }
                    addSeatsObject[`seat${add_seat_no[i].seat_no}_timeoutId`] = 0


                }
                if (!add_seat_no[i].guest_id && (!add_seat_no[i].pet_id || (add_seat_no[i].pet_id && add_seat_no[i].pet_id.length == 0))) {
                    addSeatsObject[`seat${add_seat_no[i].seat_no}`] = 1
                    addSeatsObject[`seat${add_seat_no[i].seat_no}_details`] = {
                        "lock_date_time": "",
                        "pet_request_accepted": 1,
                        "user_id": mongoose.Types.ObjectId(add_seat_no[i].user_id),
                        "booking_id": mongoose.Types.ObjectId(booking_id),
                        "isLocked": false,
                    }
                    addSeatsObject[`seat${add_seat_no[i].seat_no}_timeoutId`] = 0
                }

                // else {
                //     if (data.pet_id && data.petOnLap) {
                //         addSeatsObject[`seat${data.seat_no}`] = 3
                //         addSeatsObject[`seat${data.seat_no}_details`] = {
                //             "lock_date_time": "",
                //             "pet_request_accepted": 1,
                //             "user_id": data.user_id,
                //             "booking_id": mongoose.Types.ObjectId(booking_id),
                //             "isLocked": false,
                //             "pet_id": data.pet_id,

                //         }
                //         addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0


                //     }
                //     if (data.pet_id && !data.petOnLap) {
                //         addSeatsObject[`seat${data.seat_no}`] = 4
                //         addSeatsObject[`seat${data.seat_no}_details`] = {
                //             "lock_date_time": "",
                //             "pet_request_accepted": 1,
                //             "user_id": data.user_id,
                //             "booking_id": mongoose.Types.ObjectId(booking_id),
                //             "isLocked": false,
                //             "pet_id": data.pet_id,

                //         }
                //         addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0


                //     }
                //     if (!data.pet_id) {
                //         addSeatsObject[`seat${data.seat_no}`] = 1
                //         addSeatsObject[`seat${data.seat_no}_details`] = {
                //             "lock_date_time": "",
                //             "pet_request_accepted": 1,
                //             "user_id": data.user_id,
                //             "booking_id": mongoose.Types.ObjectId(booking_id),
                //             "isLocked": false,

                //         }
                //         addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0

                //     }

                //     // if (data.pet_id) addSeatsObject[`seat${data.seat_no}_details`]['pet_id'] = data.pet_id
                //     if (data.guest_id) addSeatsObject[`seat${data.seat_no}_details`]['guest_id'] = data.guest_id
                // }
            }
            // add_seat_no.forEach(async (data) => {
            //     if (!data.seat_no) return failMessage('No seat no. passed!', res)
            //     if (!booking_id) return failMessage('No booking id passed!', res)
            //     if (!data.user_id) return failMessage('No user id passed!', res)
            //     let userBooking = await booking_modal.findOne({_id:booking_id})
            //         if (data.guest_id) {
            //             reduceGuestPasses++
            //             addSeatsObject[`seat${data.seat_no}`] = 1
            //             addSeatsObject[`seat${data.seat_no}_details`] = {
            //                 "lock_date_time": "",
            //                 "pet_request_accepted": 1,
            //                 "user_id": data.user_id,
            //                 "booking_id": mongoose.Types.ObjectId(booking_id),
            //                 "isLocked": false,
            //                 "guest_id": data.guest_id,
            //             }
            //             addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0
            //         }
            //         if (data.pet_id && data.petOnLap) {
            //             addSeatsObject[`seat${data.seat_no}`] = 3
            //             addSeatsObject[`seat${data.seat_no}_details`] = {
            //                 "lock_date_time": "",
            //                 "pet_request_accepted": 1,
            //                 "user_id": data.user_id,
            //                 "booking_id": mongoose.Types.ObjectId(booking_id),
            //                 "isLocked": false,
            //                 "pet_id": data.pet_id,

            //             }
            //             addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0


            //         }
            //         if (data.pet_id && !data.petOnLap) {
            //             reducePetPasses++
            //             addSeatsObject[`seat${data.seat_no}`] = 4
            //             addSeatsObject[`seat${data.seat_no}_details`] = {
            //                 "lock_date_time": "",
            //                 "pet_request_accepted": 1,
            //                 "user_id": data.user_id,
            //                 "booking_id": mongoose.Types.ObjectId(booking_id),
            //                 "isLocked": false,
            //                 "pet_id": data.pet_id,

            //             }
            //             addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0


            //         }
            //         if (!data.guest_id && (!data.pet_id || (data.pet_id && data.pet_id.length==0))) {
            //             addSeatsObject[`seat${data.seat_no}`] = 1
            //             addSeatsObject[`seat${data.seat_no}_details`] = {
            //                 "lock_date_time": "",
            //                 "pet_request_accepted": 1,
            //                 "user_id": data.user_id,
            //                 "booking_id": mongoose.Types.ObjectId(booking_id),
            //                 "isLocked": false,
            //             }
            //             addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0
            //         }

            // else {
            //     if (data.pet_id && data.petOnLap) {
            //         addSeatsObject[`seat${data.seat_no}`] = 3
            //         addSeatsObject[`seat${data.seat_no}_details`] = {
            //             "lock_date_time": "",
            //             "pet_request_accepted": 1,
            //             "user_id": data.user_id,
            //             "booking_id": mongoose.Types.ObjectId(booking_id),
            //             "isLocked": false,
            //             "pet_id": data.pet_id,

            //         }
            //         addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0


            //     }
            //     if (data.pet_id && !data.petOnLap) {
            //         addSeatsObject[`seat${data.seat_no}`] = 4
            //         addSeatsObject[`seat${data.seat_no}_details`] = {
            //             "lock_date_time": "",
            //             "pet_request_accepted": 1,
            //             "user_id": data.user_id,
            //             "booking_id": mongoose.Types.ObjectId(booking_id),
            //             "isLocked": false,
            //             "pet_id": data.pet_id,

            //         }
            //         addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0


            //     }
            //     if (!data.pet_id) {
            //         addSeatsObject[`seat${data.seat_no}`] = 1
            //         addSeatsObject[`seat${data.seat_no}_details`] = {
            //             "lock_date_time": "",
            //             "pet_request_accepted": 1,
            //             "user_id": data.user_id,
            //             "booking_id": mongoose.Types.ObjectId(booking_id),
            //             "isLocked": false,

            //         }
            //         addSeatsObject[`seat${data.seat_no}_timeoutId`] = 0

            //     }

            //     // if (data.pet_id) addSeatsObject[`seat${data.seat_no}_details`]['pet_id'] = data.pet_id
            //     if (data.guest_id) addSeatsObject[`seat${data.seat_no}_details`]['guest_id'] = data.guest_id
            // }
            //     await booking_modal.findOneAndUpdate({_id:booking_id},{guest_pass_used:userBooking.guest_pass_used+reduceGuestPasses,pet_pass_used:userBooking.pet_pass_used+reducePetPasses})
            //     console.log("addSeatsObject========<<<<<<<<<<<<<<<<",addSeatsObject)
            // })
            remove_seat_no.forEach((data) => {
                addSeatsObject[`seat${data}`] = 0
                addSeatsObject[`seat${data}_details`] = null

            })
            if (reduceGuestPasses || reducePetPasses) {
                console.log('reduceGuestPasses==', reduceGuestPasses)
                console.log('reducePetPasses==', reducePetPasses)
                //subtract guestpass from guest pass used
                reduceGuestPasses = reduceGuestPasses - userBooking.guest_pass_used;
                console.log('user_id==', req.payload._id)
                let user = await userModal.findOne({ _id: req.payload._id })
                console.log('user.guest_passes==', user.guest_passes)
                console.log('user.pet_passes==', user.pet_passes)
                // if ((user.guest_passes < reduceGuestPasses && user.guest_passes != reduceGuestPasses) || (user.pet_passes < reducePetPasses && user.pet_passes != reducePetPasses)) {
                //     return failMessage('Insufficient pet passes or guest passes!', res)
                // }
                if (userBooking) {
                    //updating guest pass and pet pass used in bookings
                    await booking_modal.findOneAndUpdate({ _id: booking_id }, { guest_pass_used: userBooking.guest_pass_used + reduceGuestPasses, pet_pass_used: userBooking.pet_pass_used + reducePetPasses })
                }

                //update user guest pass and pet pass
                // await userModal.findByIdAndUpdate({ _id: user._id }, {
                //     guest_passes: user.guest_passes - reduceGuestPasses,
                //     pet_passes: user.pet_passes - reducePetPasses
                // })
            }
            await flight_seat_mapping.findOneAndUpdate({ flight_id }, addSeatsObject) //Adding seats and removing previous seats


        } else {
            return failMessage('No seat updated!', res)
        }
        return successResponseWithoutData("Seat updation successfully!", res)

    } catch (err) {
        console.log("error=", err.message)
        return internalServerError('Internal Server Error', res);
    }
};
exports.purchaseResetVoucher = async (req, res) => {
    try {
        const current_Date = new Date();
        const startDate = new Date(current_Date);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let user_membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active" })
        if (!user_membership) return failMessage("User must have an active membership!", res)
        let { id, count } = req.body

        let item = await items_modal.findOne({ _id: id })
        if (!item) return failMessage("No item found!", res)
        const currentDate = startDate; // Get the current date and time

        const latestPrice = await priceModal.find({
            status: "active",
            items: item._id,
            effectiveDate: { $lte: currentDate }, // Only select prices with effective dates less than or equal to the current UTC time
            $or: [
                { effectiveEndDate: null }, // Select prices with no effective end date
                { effectiveEndDate: { $gt: currentDate } } // Select prices with effective end dates greater than the current UTC time
            ]
        }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date

        // Get the latest price based on descending order of effective date
        const currentPrice = latestPrice[0];

        // Extract the price value and initiation fees from the current price
        let priceValue = currentPrice.price;
        let initiationFees = currentPrice.initiationFees;
        const result = await createPayment({
            userId: req.payload._id,
            purchaseTransactionId: id,
            type: item.name || "",
            name: item.name || "",
            price: priceValue ? (priceValue ? priceValue : initiationFees) * count : "",
            normalPrice: priceValue || "",
            normalInitiationFees: priceValue || "",
            initiationFees: priceValue || "",
            image: process.env.RESET_VOUCHER,
            reset_voucher: count,
            currency: "AUD",
            // type: "Membership" // Static type for API calls
        });
        let userResetVoucher = await userModal.findByIdAndUpdate({ _id: req.payload._id, status: "active" }, {
            reset_vouchers: req.payload.reset_vouchers + Number(count)
        }, { new: true })

        return successResponse({ count: userResetVoucher.reset_vouchers }, "Reset vouchers purchased successfully!", res)

    } catch (err) {
        console.log(err, "err");
        return internalServerError('Internal Server Error', res);
    }
};
exports.reset_passes = async (req, res) => {
    try {
        let user_membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active" })
        if (!user_membership) return failMessage("User must have an active membership!", res)
        let {
            id,//booking id
            reset_pet_pass = 0,
            reset_guest_pass = 0,
            reset_reusable_booking = 0,
            total_reset_voucher = 0,
            all_reset
        } = req.body

        console.log('reset_passes_requert==', req.body)
        let booking = await booking_modal.findOne({ _id: id, status: "active" })
        if (!booking) {
            return failMessage('No booking found!', res)
        }
        if ((total_reset_voucher) > req.payload.reset_vouchers) {
            return failMessage('Not enough reset vouchers, please purchase!', res)
        }

        let guest_penalty = booking.guest_penalty, pet_penalty = booking.pet_penalty, reusable_penalty = booking.reusable_penalty;

        if (booking.guest_penalty == 1 && booking.guest_pass_used && reset_guest_pass) {
            guest_penalty = 2;
        }
        if (booking.pet_penalty == 1 && booking.pet_pass_used && reset_pet_pass) {
            pet_penalty = 2;
        }
        if (booking.reusable_penalty == 1 && booking.reusable_booking_used && reset_reusable_booking && !booking.reset_guest_pass && !booking.reset_pet_pass) {
            reusable_penalty = 2;
        }
        // if (all_reset) {
        //     reusable_penalty = 2;
        //     if (booking.guest_pass_used) guest_penalty = 2;
        //     if (booking.pet_pass_used) pet_penalty = 2;

        // }

        if (booking && !booking.reset_reusable_booking && !booking.reset_guest_pass && !booking.reset_pet_pass) {
            await booking_modal.findByIdAndUpdate({ _id: id }, { isPenalty: 2, guest_penalty, pet_penalty, reusable_penalty }, { new: true })
            return failMessage("Already Reset!", res)

        }
        let updated_obj = {}

        if (reset_pet_pass) {
            updated_obj['reset_pet_pass'] = false
        }
        if (reset_guest_pass) {
            updated_obj['reset_guest_pass'] = false
        }
        if (reset_reusable_booking) {
            if (!booking.reset_guest_pass && !booking.reset_pet_pass) {
                updated_obj['reset_reusable_booking'] = false
            }

        }
        if (updated_obj) {
            let reset_booking = await booking_modal.findByIdAndUpdate({ _id: id }, updated_obj, { new: true })
            if (reset_booking && !reset_booking.reset_reusable_booking && !reset_booking.reset_guest_pass && !reset_booking.reset_pet_pass) {
                await booking_modal.findByIdAndUpdate({ _id: id }, { isPenalty: 2, guest_penalty, pet_penalty, reusable_penalty }, { new: true })

            }
        }

        if (!all_reset) {
            await booking_modal.findByIdAndUpdate({ _id: id }, { guest_penalty, pet_penalty, reusable_penalty }, { new: true })

            if (Number(reset_reusable_booking)) {
                if (!booking.reset_guest_pass && !booking.reset_pet_pass) {
                    reset_reusable_booking = 1
                } else {
                    if (reset_reusable_booking && !reset_pet_pass && !reset_guest_pass && (booking.reset_guest_pass || booking.reset_pet_pass)) {
                        total_reset_voucher = 0
                        return failMessage("Please reset other items first!", res)

                    }
                    reset_reusable_booking = 0
                }
            }
            await userModal.findByIdAndUpdate({ _id: req.payload._id, status: "active" }, {
                pet_passes: req.payload.pet_passes + Number(reset_pet_pass),
                guest_passes: req.payload.guest_passes + Number(reset_guest_pass),
                reusable_bookings: req.payload.reusable_bookings + Number(reset_reusable_booking),
                reset_vouchers: req.payload.reset_vouchers - (total_reset_voucher)
            }, { new: true })
            if (reset_pet_pass) {
                await transactionModal.create({
                    userId: req.payload._id,
                    type: "Penalty Removed",
                    booking_id: booking._id,
                    image: process.env.PENALTYREMOVEDFORREUSABLE,
                    //image: process.env.PENALTYREMOVEDFORPETPASS,
                    name: "Penalty removed from  Pet Pass",
                    reset_voucher: total_reset_voucher
                    //reset_voucher: reset_pet_pass
                })
            }
            if (reset_guest_pass) {
                await transactionModal.create({
                    userId: req.payload._id,
                    type: "Penalty Removed",
                    booking_id: booking._id,
                    image: process.env.PENALTYREMOVEDFORREUSABLE,
                    //image: process.env.PENALTYREMOVEDFORGUESTPASS,
                    name: "Penalty removed from  Guest Pass",
                    reset_voucher: total_reset_voucher
                    //reset_voucher: reset_guest_pass
                })
            }
            if (reset_reusable_booking) {
                await transactionModal.create({
                    userId: req.payload._id,
                    type: "Penalty Removed",
                    booking_id: booking._id,
                    image: process.env.PENALTYREMOVEDFORREUSABLE,
                    name: "Penalty removed from  Reusable Booking",
                    reset_voucher: total_reset_voucher
                    //reset_voucher: reset_reusable_booking
                })
            }
        } else {
            await booking_modal.findByIdAndUpdate({ _id: id }, { isPenalty: 2, reset_pet_pass: false, reset_guest_pass: false, reset_reusable_booking: false, guest_penalty, pet_penalty, reusable_penalty }, { new: true })
            let guestPassUsedCount = req.payload.guest_passes;
            let petPassUsedCount = req.payload.pet_passes;
            if (reset_pet_pass) {
                petPassUsedCount = req.payload.pet_passes + Number(booking.pet_penalty == 1 ? booking.pet_pass_used : 0);
            }
            if (reset_guest_pass) {
                guestPassUsedCount = req.payload.guest_passes + Number(booking.guest_penalty == 1 ? booking.guest_pass_used : 0)
            }
            await userModal.findByIdAndUpdate({ _id: req.payload._id, status: "active" }, {
                pet_passes: petPassUsedCount,
                guest_passes: guestPassUsedCount,
                reusable_bookings: req.payload.reusable_bookings + Number(booking.reusable_penalty == 1 ? 1 : 0),
                reset_vouchers: req.payload.reset_vouchers - (total_reset_voucher)
            }, { new: true })
            let petReset = 0;
            let guestReset = 0;
            if (reset_pet_pass) {
                reset_pet_pass = parseInt(reset_pet_pass) * 2;
                petReset = reset_pet_pass;
                await transactionModal.create({
                    userId: req.payload._id,
                    type: "Penalty Removed",
                    booking_id: booking._id,
                    image: process.env.PENALTYREMOVEDFORREUSABLE,
                    //image: process.env.PENALTYREMOVEDFORPETPASS,
                    name: "Penalty removed from  Pet Pass",
                    reset_voucher: reset_pet_pass
                })
            }
            if (reset_guest_pass) {
                reset_guest_pass = parseInt(reset_guest_pass) * 2;
                guestReset = reset_guest_pass;
                await transactionModal.create({
                    userId: req.payload._id,
                    type: "Penalty Removed",
                    booking_id: booking._id,
                    image: process.env.PENALTYREMOVEDFORREUSABLE,
                    //image: process.env.PENALTYREMOVEDFORGUESTPASS,
                    name: "Penalty removed from  Guest Pass",
                    reset_voucher: reset_guest_pass
                })
            }
            let reusableReset = parseInt(total_reset_voucher) - parseInt(guestReset) - parseInt(petReset);
            await transactionModal.create({
                userId: req.payload._id,
                type: "Penalty Removed",
                booking_id: booking._id,
                image: process.env.PENALTYREMOVEDFORREUSABLE,
                name: "Penalty removed from  Reusable Booking",
                reset_voucher: reusableReset
                //reset_voucher: reset_reusable_booking
            })
        }



        await booking_modal.findByIdAndUpdate({ _id: booking._id }, {
            total_reset_passes_left: booking.total_reset_passes_left - (reset_pet_pass + reset_guest_pass + reset_reusable_booking),
        })
        let user_id = req.payload._id
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);

        let booking_data = await booking_modal.aggregate([
            {
                $match: {
                    user_id: user_id
                }
            },
            {
                $lookup: {
                    from: "flights",
                    let: { flightID: "$flight_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$flightID"] },
                                flight_takeoff_date: {
                                    $gte: startDate
                                },
                            }
                        },

                    ],
                    as: "flights",
                }
            },
        ]
        )
        let user_penalty_exists = false
        if (booking_data && booking_data.length > 0) {

            booking_data.forEach((data) => {
                if (data.isPenalty == 1) {
                    user_penalty_exists = true
                }
            })

        }
        let updated_user = await userModal.findOne({
            _id: req.payload._id, status: "active"
        })
        let result = {
            "reusable_bookings": updated_user ? updated_user.reusable_bookings : 0,
            "reset_vouchers": updated_user ? updated_user.reset_vouchers : 0,
            user_penalty_exists
        }
        return successResponse(result, "Reset successfully!", res)

    } catch (err) {
        console.log("err==", err)
        return internalServerError('Internal Server Error', res);
    }
};
exports.renewMembership = async (req, res) => {
    try {
        const user = req.payload;
        const membership = await userMembershipModal.findOne({ status: "active", user_id: user._id });

        if (!membership) {
            return failMessage('No membership found!', res);
        }
        let renewal_date = new Date(new Date(membership.renewal_date).setMonth(new Date(membership.renewal_date).getMonth() + 1));

        let renew = await userMembershipModal.findByIdAndUpdate({ _id: membership._id }, {
            renewal_date
        }, { new: true })
        return successResponseWithoutData('Renew membership successfully!', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.show_profile = async (req, res) => {
    try {
        const user = req.payload;
        const { is_show } = req.query
        if (is_show == 'yes') {
            await userModal.findOneAndUpdate({ _id: user._id, status: "active" }, {
                show_profile: true
            }, { new: true })
        } else if (is_show == 'no') {
            await userModal.findOneAndUpdate({ _id: user._id, status: "active" }, {
                show_profile: false
            }, { new: true })
        }
        return successResponseWithoutData('Data updated successfully!', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.snooze = async (req, res) => {
    try {
        const current_Date = new Date();
        const startDate = new Date(current_Date);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        const user = req.payload;
        const { announcement_id, survey_id, boutique_id, payment_id, membership_id, delete_forever, snooze_for_24hr, snooze_for_1hr, show_profile_card } = req.query
        let currentDate = startDate; let new_date;
        if (announcement_id) {
            let announcement = await announcementModal.findOne({
                announcement_id: announcement_id,
                user_ids: req.payload._id,
                status: "active"
            })
            if (!announcement) return failMessage("No announcement found!", res)
            if (snooze_for_24hr == 'yes') {

                // Add 1 hour to the current date
                new_date = currentDate.setHours(currentDate.getHours() + 24);
                await announcementModal.findOneAndUpdate({
                    announcement_id: announcement_id,
                    user_ids: req.payload._id, status: "active"
                }, {
                    snooze_till: new_date
                }, {
                    new: true
                })

            } else if (snooze_for_1hr == 'yes') {
                new_date = currentDate.setHours(currentDate.getHours() + 1);
                await announcementModal.findOneAndUpdate({
                    announcement_id: announcement_id,
                    user_ids: req.payload._id, status: "active"
                }, {
                    snooze_till: new_date
                }, {
                    new: true
                })
            } else if (delete_forever == 'yes') {
                await announcementModal.findOneAndUpdate({
                    announcement_id: announcement_id,
                    user_ids: req.payload._id, status: "active"
                }, {
                    status: "inactive"
                }, {
                    new: true
                })
            }

        } else if (boutique_id) {

            let boutique = await boutiqueModal.findOne({ _id: boutique_id, status: "active" })
            if (!boutique) return failMessage('No boutique found!', res)

            if (snooze_for_24hr == 'yes') {

                // Add 1 hour to the current date
                new_date = currentDate.setHours(currentDate.getHours() + 24);

            } else if (snooze_for_1hr == 'yes') {
                new_date = currentDate.setHours(currentDate.getHours() + 1);

            } else if (delete_forever == 'yes') {
                let lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

                new_date = lastDayOfMonth.setHours(lastDayOfMonth.getHours() + 24);

            }
            let user_boutique = await userBoutiqueModal.findOneAndUpdate({
                boutique_id: boutique._id,
                user_id: req.payload._id,
                status: "active"
            }, {
                snooze_till: new_date
            }, {
                new: true
            })
            if (!user_boutique) await userBoutiqueModal.create({
                boutique_id: boutique._id,
                user_id: req.payload._id,
                snooze_till: new_date
            })

        } else if (payment_id) {

            let payment = await paymentModal.findOne({ _id: payment_id, status: "active" })
            if (!payment) return failMessage('No payment found!', res)

            if (snooze_for_24hr == 'yes') {

                // Add 1 hour to the current date
                new_date = currentDate.setHours(currentDate.getHours() + 24);

            } else if (snooze_for_1hr == 'yes') {
                new_date = currentDate.setHours(currentDate.getHours() + 1);

            } else if (delete_forever == 'yes') {
                let lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

                new_date = lastDayOfMonth.setHours(lastDayOfMonth.getHours() + 24);

            }
            await paymentModal.findByIdAndUpdate({ _id: payment._id }, {
                snooze_till: new_date
            }, {
                new: true
            })

        } else if (membership_id) {
            let membership = await userMembershipModal.findOne({ _id: membership_id, status: "active" })
            if (!membership) return failMessage('No membership found!', res)

            if (snooze_for_24hr == 'yes') {

                // Add 1 hour to the current date
                new_date = currentDate.setHours(currentDate.getHours() + 24);

            } else if (snooze_for_1hr == 'yes') {
                new_date = currentDate.setHours(currentDate.getHours() + 1);

            } else if (delete_forever == 'yes') {
                let lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

                new_date = lastDayOfMonth.setHours(lastDayOfMonth.getHours() + 24);

            }
            await userMembershipModal.findByIdAndUpdate({ _id: membership._id }, {
                snooze_till: new_date
            }, {
                new: true
            })
        } else if (show_profile_card == "yes") {
            if (snooze_for_24hr == 'yes') {

                // Add 1 hour to the current date
                new_date = currentDate.setHours(currentDate.getHours() + 24);


            } else if (snooze_for_1hr == 'yes') {
                new_date = currentDate.setHours(currentDate.getHours() + 1);

            } else if (delete_forever == 'yes') {
                let lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

                new_date = lastDayOfMonth.setHours(lastDayOfMonth.getHours() + 24);

            }
            await userModal.findByIdAndUpdate({ _id: user._id }, {
                show_profile_snooze_till: new_date
            }, {
                new: true
            })
        } else if (survey_id) {

            let survey = await surveyModal.findOne({ _id: survey_id, status: "active" })
            if (!survey) return failMessage('No survey found!', res)

            if (snooze_for_24hr == 'yes') {

                // Add 1 hour to the current date
                new_date = currentDate.setHours(currentDate.getHours() + 24);

            } else if (snooze_for_1hr == 'yes') {
                new_date = currentDate.setHours(currentDate.getHours() + 1);

            } else if (delete_forever == 'yes') {
                let lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

                new_date = lastDayOfMonth.setHours(lastDayOfMonth.getHours() + 24);

            }
            await surveyModal.findByIdAndUpdate({ _id: survey._id }, {
                snooze_till: new_date
            }, {
                new: true
            })

        }
        return successResponseWithoutData('Snoozed successfully!', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.updateDeviceTokenold = async (req, res) => {
    try {
        let { device_token, device_type, type } = req.body;
        let resp;

        let device = await deviceTokenModal.findOne({ device_token, device_type });

        if (device && type == 'logout') {
            resp = await deviceTokenModal.deleteOne({
                device_token,
                device_type,
            });
        } else {
            let payload = {
                device_token,
                device_type,
                user_id: req.payload.id
            };

            if (device) {
                await deviceTokenModal.updateOne(
                    { device_token, device_type },
                    { $set: payload }
                );
            }

            if (!device) {
                await deviceTokenModal.create(payload);
            }
        }

        return successResponseWithoutData('Success', res);

    } catch (error) {
        console.error(`${error}`);
        return errorResponse(error, res);
    }
};
exports.getBook_another_flights = async (req, res) => {
    try {
        let { canceled_flight_id, total_seats_wanted, with_pet } = req.body
        //Getting user membership
        let user_membership = await userMembershipModal.findOne({ user_id: req.payload._id, status: "active" })
        if (user_membership && user_membership.name == "Unlimited Elite" && Number(req.payload.reusable_bookings) <= 0) {
            return failMessage('User cannot book a flight as not having enough reusable bookings for Unlimited Elite membership!', res)
        }
        let flight = await flightModal.findOne({ _id: canceled_flight_id })
        if (!flight) return failMessage('No data found!', res)
        let route = await routeModal.findOne({ _id: flight.route })
        if (!route) return failMessage('No data found!', res)

        //Fetching flights for first_date
        let get_first_flight_ids = await flightModal.aggregate([{
            $match: {
                route: mongoose.Types.ObjectId(route._id),
                flight_takeoff_date: {
                    $gte: flight.flight_takeoff_date
                },
                _id: {
                    $ne: mongoose.Types.ObjectId(flight._id)
                }
            }
        },
        {
            $lookup: {
                from: "flight_seats_mappings",
                let: { fromCityId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$flight_id", "$$fromCityId"] }
                        }
                    }
                ],
                as: "flight_seat",
            }
        },
        {
            $lookup: {
                from: "routes",
                let: { fromCityId: "$route" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$fromCityId"] }
                        }
                    },
                    {
                        $lookup: {
                            from: "locations",
                            let: { fromCityId: "$fromCity" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        city_name: 1,
                                        airport_abbreviation: 1,
                                        image: 1
                                    }
                                }
                            ],
                            as: "from_airport_abb",
                        }
                    },
                    {
                        $lookup: {
                            from: "locations",
                            let: { fromCityId: "$toCity" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        city_name: 1,
                                        airport_abbreviation: 1,
                                        image: 1
                                    }
                                }
                            ],
                            as: "to_airport_abb",
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            to_airport_abb: 1,
                            from_airport_abb: 1
                        }
                    }
                ],
                as: "route",
            }
        },
        {
            $lookup: {
                from: "pilots",  // Target collection name (pilots)
                let: { pilotId: "$pilot" },  // Local field to match
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$pilotId"] }  // Matching condition
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            full_name: 1,
                            Photo: 1
                        }
                    }
                ],
                as: "pilot"  // Output field containing the joined data
            }
        },
        {
            $lookup: {
                from: "pilots",  // Target collection name (pilots)
                let: { pilotId: "$copilot" },  // Local field to match
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$pilotId"] }  // Matching condition
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            full_name: 1,
                            Photo: 1
                        }
                    }
                ],
                as: "copilot"  // Output field containing the joined data
            }
        },
        {
            $project: {
                from: 0,
                to: 0
            }
        }
        ])
        let result_flights = []
        let takeoff_date = flight.flight_takeoff_date
        let booking_data = await booking_modal.aggregate([
            {
                $match: {
                    user_id: mongoose.Types.ObjectId(req.payload._id),
                    booking_status: {
                        $ne: "canceled"
                    }
                }
            }
        ]
        )
        let bookedFlightIds = []
        if (booking_data.length > 0) {
            booking_data.map((data) => {
                bookedFlightIds.push(data.flight_id.valueOf())
            })
        }
        if (get_first_flight_ids.length > 0) {
            await get_first_flight_ids.forEach(async (data) => {
                let seats = 0
                for (let i = 1; i <= 8; i++) {
                    if (data.flight_seat && data.flight_seat[0] && data.flight_seat[0][`seat${i}`] == 0) {
                        seats++
                    }
                }
                if (Number(total_seats_wanted) <= seats) {
                    if (with_pet) {
                        let currentDate = new Date(takeoff_date);
                        currentDate.setHours(currentDate.getHours() + 48); // Add 48 hours for pet
                        if (new Date(data.flight_takeoff_date).getTime() >= currentDate.getTime()) {
                            data.no_of_seats_left = seats
                            delete data.flight_seat
                            if (bookedFlightIds.includes(data._id.valueOf())) {
                                data.already_booked = true
                            } else {
                                data.already_booked = false
                            }
                            data.from_airport_abb = data.route[0]['from_airport_abb']
                            data.to_airport_abb = data.route[0]['to_airport_abb']
                            delete data.route
                            data.pilot_name = data.pilot[0]['full_name']
                            data.pilot_image = data.pilot[0]['Photo']
                            delete data.pilot
                            data.copilot_name = data.copilot[0]['full_name']
                            data.copilot_image = data.copilot[0]['Photo']
                            delete data.copilot
                            const flightTakeOffDateRef = data.flight_takeoff_date
                            let differences = await commonservices.getTimeDifference(flightTakeOffDateRef, data.takeoff_time, data.landing_time)
                            data['durationHours'] = differences.hours
                            data['durationMinutes'] = differences.mins
                            result_flights.push(data);
                            await check_for_lock_time_condition(data._id.valueOf())
                        }
                    } else {
                        let currentDate = new Date(takeoff_date);
                        currentDate.setHours(currentDate.getHours() + 2); // Add 2 hours for other than pet
                        if (data.flight_takeoff_date >= currentDate) {
                            data.no_of_seats_left = seats
                            delete data.flight_seat
                            if (bookedFlightIds.includes(data._id.valueOf())) {
                                data.already_booked = true
                            } else {
                                data.already_booked = false
                            }
                            data.from_airport_abb = data.route[0]['from_airport_abb']
                            data.to_airport_abb = data.route[0]['to_airport_abb']
                            delete data.route
                            data.pilot_name = data.pilot[0]['full_name']
                            data.pilot_image = data.pilot[0]['Photo']
                            delete data.pilot
                            data.copilot_name = data.copilot[0]['full_name']
                            data.copilot_image = data.copilot[0]['Photo']
                            delete data.copilot
                            const flightTakeOffDateRef = data.flight_takeoff_date
                            let differences = await commonservices.getTimeDifference(flightTakeOffDateRef, data.takeoff_time, data.landing_time)
                            data['durationHours'] = differences.hours
                            data['durationMinutes'] = differences.mins
                            result_flights.push(data)

                            await check_for_lock_time_condition(data._id.valueOf())
                        }
                    }
                }
            })
        }

        return successResponse(result_flights, "Data fetched successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.activate_membership = async (req, res) => {
    try {
        const id = req.payload._id;

        // Find the user's active membership
        const user_membership = await userMembershipModal.findOne({ user_id: id, status: "active" });

        if (!user_membership) {
            return failMessage('No membership found!', res);
        }

        // Calculate the new renewal date
        const current_Date = new Date();
        const startDate = new Date(current_Date);
        startDate.setHours(startDate.getHours() + 10);
        // startDate.setMinutes(startDate.getMinutes() + 30);
        startDate.setMonth(startDate.getMonth() + 1);

        // Activate the membership and set the renewal date
        const updatedMembership = await userMembershipModal.findByIdAndUpdate(
            user_membership._id,
            {
                is_activate: true,
                renewal_date: startDate
            },
            { new: true }
        );

        // Log the transaction
        await transactionModal.create({
            userId: id,
            type: "Membership Activate",
            purchaseTransactionId: user_membership._id,
            image: process.env.MEMBERSHIPLOGO,
            name: 'Unlimited Membership Activation'
        });

        // Find the referral document for the user
        const referDoc = await referModal.findOne({
            $or: [
                { user_id: id },
                { send_to: id }
            ]
        });


        let sendTo = {};
        const sendBy = await userModal.findOne({ _id: referDoc?.user_id, status: "active" });

        if (referDoc.send_to) {
            // Find the user being referred to (sendTo)
            sendTo = await userModal.findOne({ _id: referDoc?.send_to, status: "active" });
        }


        // Check if sendTo has an active membership
        const sendByMembership = await userMembershipModal.findOne({ user_id: sendBy?._id, status: "active" });
        const sendToMembership = sendTo?._id ? await userMembershipModal.findOne({ user_id: sendTo?._id, status: "active" }) : null;

        if (sendByMembership && sendByMembership.is_activate && sendToMembership && sendToMembership.is_activate) {
            // Update referral status to 'redeem'
            await referModal.findByIdAndUpdate(
                referDoc?._id,
                {
                    refer_status: 'redeem',
                    send_to_refer: 'redeem',
                    send_by_refer: 'redeem'
                },
                { new: true }
            );
            // Decrement 'underway' if it's greater than 0 using $inc and $gte condition
            await userModal.findOneAndUpdate(
                { _id: sendBy?._id, underway: { $gt: 0 } },
                { $inc: { underway: -1 } },
                { new: true }
            );

            await userModal.findOneAndUpdate(
                { _id: sendTo?._id, underway: { $gt: 0 } },
                { $inc: { underway: -1 } },
                { new: true }
            );

        }

        return successResponseWithoutData("Membership activated successfully!", res);

    } catch (err) {
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
};

exports.notify_at_leaveTime = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        let { booking_id, second_booking_id } = req.query

        let booking = await booking_modal.findOne({ _id: booking_id, user_id: req.payload._id, status: "active" })
        if (!booking) return failMessage('No booking found!', res)

        let flight = await flightModal.findOne({ _id: booking.flight_id, status: "active" })
        if (!flight) return failMessage("No flight found!", res)

        if (flight.flight_takeoff_date >= startDate) {
            const dateRef = flight.flight_takeoff_date
            let time1Ref = flight.takeoff_time
            let time1Timestamp = new Date(dateRef)
            let [time1Hours, time1Minutes] = time1Ref.split(':').map(Number);

            time1Timestamp = time1Timestamp.setHours(time1Hours, time1Minutes)
            let updated_time = new Date(time1Timestamp)
            updated_time.setHours(updated_time.getHours() - 2);

            //send notification to user at updated_time ---pending

        }
        if (second_booking_id) {
            let booking = await booking_modal.findOne({ _id: second_booking_id, user_id: req.payload._id, status: "active" })
            if (!booking) return failMessage('No booking found!', res)

            let flight = await flightModal.findOne({ _id: booking.flight_id, status: "active" })
            if (!flight) return failMessage("No flight found!", res)

            if (flight.flight_takeoff_date >= startDate) {
                const dateRef = flight.flight_takeoff_date
                let time1Ref = flight.takeoff_time
                let time1Timestamp = new Date(dateRef)
                let [time1Hours, time1Minutes] = time1Ref.split(':').map(Number);

                time1Timestamp = time1Timestamp.setHours(time1Hours, time1Minutes)
                let updated_time = new Date(time1Timestamp)
                updated_time.setHours(updated_time.getHours() - 2);

                //send notification to user at updated_time ---pending

            }
        }


        return successResponseWithoutData("We will notify you at leave time!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.notifyBefore2hours = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
        const endDate = new Date(currentDate);

        endDate.setHours(endDate.getHours() + 5);
        endDate.setMinutes(endDate.getMinutes() + 30);
        endDate.setHours(endDate.getHours() + 24);
        let booking = await booking_modal.aggregate([
            {
                $match: {
                    user_id: mongoose.Types.ObjectId(req.payload._id),
                    status: "active",
                    booking_status: 'confirmed',
                    is_demo: checkDemoSettings ? true : false
                }
            },
            {
                $lookup: {
                    from: 'flights',
                    let: { item_id: '$flight_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$item_id"] },
                                flight_canceled: false
                            }
                        },
                        {
                            $lookup: {
                                from: "routes",
                                let: { fromCityId: "$route" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$fromCityId"] }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "locations",
                                            let: { fromCityId: "$fromCity" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        _id: 1,
                                                        city_name: 1,
                                                        airport_abbreviation: 1,
                                                        image: 1,
                                                        airport_name: 1,
                                                        lat: 1,
                                                        long: 1
                                                    }
                                                }
                                            ],
                                            as: "from_airport_abb",
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "locations",
                                            let: { fromCityId: "$toCity" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$_id", "$$fromCityId"] }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        _id: 1,
                                                        city_name: 1,
                                                        airport_abbreviation: 1,
                                                        image: 1,
                                                        airport_name: 1,
                                                        lat: 1,
                                                        long: 1
                                                    }
                                                }
                                            ],
                                            as: "to_airport_abb",
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            to_airport_abb: 1,
                                            from_airport_abb: 1
                                        }
                                    }
                                ],
                                as: "route",
                            }
                        }

                    ],
                    as: 'flight_data'
                }
            },
            {
                $unwind: "$flight_data"
            },
            {
                $addFields: {
                    combined_takeoff_datetime: {
                        $toDate: {
                            $concat: [
                                { $dateToString: { format: "%Y-%m-%d", date: "$flight_data.flight_takeoff_date" } },
                                "T",
                                {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $eq: ["$flight_data.actual_takeoff_time", ""] },
                                                { $eq: ["$flight_data.flight_delayed", false] }
                                            ]
                                        },
                                        then: "$flight_data.takeoff_time",
                                        else: "$flight_data.actual_takeoff_time"
                                    }
                                }
                            ]
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: ["$combined_takeoff_datetime", startDate] },
                            { $lte: ["$combined_takeoff_datetime", endDate] }
                        ]

                    }

                }
            },
            {
                $sort: {
                    "combined_takeoff_datetime": 1
                }
            },
            {
                $limit: 1
            },
            {
                $project: {
                    flight_id: 0
                }
            }

        ])

        if (booking.length > 0) {
            if (new Date(booking[0]['combined_takeoff_datetime']).getTime() - startDate.getTime() <= 2 * 60 * 60 * 60 * 60) {
                let distance = getDistanceFromLatLonInKm(req.query.curr_lat, req.query.curr_long, booking[0]['flight_data']['route'][0]['from_airport_abb'][0]['lat'], booking[0]['flight_data']['route'][0]['from_airport_abb'][0]['long'])
                if (distance >= 10) {
                    await send_notification.sendNotificationBeforeLeaveTime(req.payload.firebase_device_token, req.payload, booking[0]['flight_data']['flight_name'], booking[0]['_id'])
                }
            }

        }
        return successResponse(booking, "Notification sent!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371; // Radius of the Earth in kilometers
    const deg2rad = (deg) => deg * (Math.PI / 180);
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c; // Distance in kilometers
    return distance;
}

exports.update_passes = async (req, res) => {
    try {
        let { guest_pass, pet_pass, reusable_booking, reset_vouchers } = req.query
        let user = req.payload
        let data
        if (guest_pass) {
            data = await userModal.findByIdAndUpdate({ _id: user._id }, {
                guest_passes: Number(guest_pass)
            }, { new: true })
        }
        if (pet_pass) {
            data = await userModal.findByIdAndUpdate({ _id: user._id }, {
                pet_passes: Number(pet_pass)
            }, { new: true })
        }
        if (reusable_booking) {
            data = await userModal.findByIdAndUpdate({ _id: user._id }, {
                reusable_bookings: Number(reusable_booking)
            }, { new: true })
        }
        if (reset_vouchers) {
            data = await userModal.findByIdAndUpdate({ _id: user._id }, {
                reset_vouchers: Number(reset_vouchers)
            }, { new: true })
        }


        return successResponse(data, "Done!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.oneTimeInitiationPayment = async (req, res) => {
    try {
        let { status } = req.body
        let user_veriff = await veriffModal.findOne({
            user_id: req.payload._id,
            status: "active",
            is_duplicated: true,
            payment_status: {
                $ne: "success"
            }
        })
        if (user_veriff) {
            if (status) {
                await veriffModal.findByIdAndUpdate({ _id: user_veriff._id }, {
                    payment_status: status
                }, { new: true })
            } else {
                await veriffModal.findByIdAndUpdate({ _id: user_veriff._id }, {
                    payment_status: "success"
                }, {
                    new: true
                })
            }
        }

        return successResponseWithoutData("Payment Initiated successfully!", res)


    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.deletePayment = async (req, res) => {
    try {
        const { id } = req.query;

        // Find the payment to be deactivated
        const payment = await paymentModal.findOne({ userId: req.payload._id, status: "active", _id: id });
        if (!payment) return failMessage('No payment found!', res);

        // Deactivate the specified payment
        await paymentModal.findByIdAndUpdate({ _id: id }, { status: "inactive" }, { new: true });

        // Find a backup card and activate it
        const backupCard = await paymentModal.findOne({ userId: req.payload._id, status: "active", isActive: false });
        if (backupCard) {
            await paymentModal.findByIdAndUpdate({ _id: backupCard._id }, { isActive: true }, { new: true });
        }
        let findFailedCard = await failedCardModel.findOne({
            userId: req.payload._id,
            cardId: id,
            status: "active",
        });
        if (findFailedCard) {
            await failedCardModel.findByIdAndUpdate({ _id: findFailedCard._id },
                { status: "inactive" },
                { new: true });
        }
        return successResponseWithoutData("Payment deleted successfully!", res);
    } catch (err) {
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.editPayment = async (req, res) => {
    try {
        let user_id = req.payload._id;

        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);

        let { payment_id, cardholderName, cardNumber, expiry, cvv, billingAddress, paymentMethod, abn, businessName } = req.body;
        let payment = await paymentModal.findOne({ userId: req.payload._id, status: "active", _id: payment_id });

        if (!payment) return failMessage('No payment found!', res);

        if (req.body.cardNumber) {
            let user_payments = await paymentModal.find({ userId: req.payload._id, status: "active" });
            if (user_payments && user_payments.length > 0) {
                let is_duplicate = user_payments.some(data => data.cardNumber === req.body.cardNumber && data._id != payment_id);
                if (is_duplicate) return failMessage('Card already exists!', res);
            }
        }

        let updated_obj = {};
        if (cardholderName) updated_obj.cardholderName = cardholderName;
        if (cardNumber) updated_obj.cardNumber = cardNumber;
        if (expiry) updated_obj.expiry = expiry;
        if (cvv) updated_obj.cvv = cvv;
        if (businessName) updated_obj.businessName = businessName;
        if (abn) updated_obj.abn = abn;
        if (billingAddress) updated_obj.billingAddress = billingAddress;

        let expiryDate = req.body.expiry || "";
        const [expiryMonth, expiryYear] = expiryDate ? expiryDate.split('/').map(str => parseInt(str.trim(), 10)) : [];
        if (expiryMonth && expiryYear) {
            const expirys = new Date('20' + expiryYear, expiryMonth - 1);
            if (expirys < startDate) {
                return failMessage('Card expiry date is invalid!', res); // Expiry date is before the current date
            }
        }

        //function for payment constent
        const paymentConsentResponse = await createPaymentConsent(user_id);
        if (!paymentConsentResponse.success) {
            return res.status(500).json({ message: paymentConsentResponse.message });
        }
        //function for verify constent
        const paymentVerifyResponse = await verifyPaymentConsent(user_id, req.body, paymentConsentResponse?.data?.id);
        if (!paymentVerifyResponse.success) {
            return res.status(500).json({ message: paymentVerifyResponse.message });
        }
        // Update Membership Agreement 
        await userModal.findOneAndUpdate({ _id: user_id, status: "active" }, {
            membershipAgreement: req.body.membershipAgreement
        }, { new: true });
        // Handle the payment method through external API
        // const apiResponse = await modifyPaymentSource(user_id, payment_id, req.body);
        // if (!apiResponse.success) {
        //     return res.status(500).json({ message: apiResponse.message });
        // }

        // // Extract the appropriate payment source _id
        // const paymentSources = apiResponse?.data?.resource?.data?.payment_sources;
        // if (!paymentSources || paymentSources.length === 0) {
        //     return res.status(500).json({ message: 'No payment sources found in the response.' });
        // }

        // const existingPaymentSources = await paymentModal.find({ userId: user_id, status: "active" }).distinct('powerBoardPaySrcId');
        // const newPaymentSources = paymentSources.map(ps => ps._id).filter(id => !existingPaymentSources.includes(id));

        // if (newPaymentSources.length === 0) {
        //     return failMessage('No new payment sources found!', res);
        // }

        // const paymentSourceId = newPaymentSources[newPaymentSources.length - 1]; // Use the last new payment source id

        if (paymentVerifyResponse?.success == true) {
            updated_obj.airwallexPaySrcId = paymentVerifyResponse?.data?.id;
        }

        if (Object.keys(updated_obj).length > 0) {
            updated_payment = await paymentModal.findByIdAndUpdate(
                { _id: payment_id },
                updated_obj,
                { new: true }
            );
        }

        // Fetch payment method details
        const findPayMethod = await paymentMethodModal.findById({ _id: paymentMethod });
        if (!findPayMethod) {
            return res.status(404).json({ message: 'Payment method not found' });
        }

        // Prepare payment method object
        const payment_method = {
            _id: req.body.paymentMethod,
            name: findPayMethod.name || "",
            type: findPayMethod.type || ""
        };

        let responseData = {
            _id: updated_payment._id,
            userId: user_id,
            paymentMethod: payment_method,
            cardType: updated_payment.cardType,
            cardholderName: updated_payment.cardholderName,
            cardNumber: updated_payment.cardNumber,
            expiry: updated_payment.expiry,
            // powerBoardPaySrcId: updated_payment.powerBoardPaySrcId,
            airwallexPaySrcId: updated_payment.airwallexPaySrcId,
            billingAddress: updated_payment.billingAddress,
            isActive: updated_payment.isActive,
            city: updated_payment.city,
            businessName: updated_payment.businessName || "",
            abn: updated_payment.abn || "",
            status: updated_payment.status
        };
        let findFailedCard = await failedCardModel.findOne({
            userId: user_id,
            cardId: payment_id,
            status: "active",
        });
        if (findFailedCard) {
            await failedCardModel.findByIdAndUpdate({ _id: findFailedCard._id },
                { status: "inactive" },
                { new: true });
        }
        return successResponse(responseData, 'Data Updated Successfully!', res);

    } catch (err) {
        console.log('error=>>>>>>', err);
        return internalServerError('Internal Server Error', res);
    }
};

exports.submitSurvey = async (req, res) => {
    try {
        let { survey_id, user_answer } = req.body
        let survey = await surveyModal.findOne({ user_id: req.payload._id, status: "active", _id: survey_id });
        if (!survey) return failMessage('No survey found!', res)

        await surveyModal.findByIdAndUpdate({
            _id: survey_id
        }, {
            user_answer
        }, {
            new: true
        })

        return successResponseWithoutData('Survey submitted Successfully!', res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.edit_guest = async (req, res) => {

    try {
        const user = req.payload
        // if (user.guest_passes == 0) {//If user has 0 guest passes then send error response
        //     return failMessage('User has not enough guest passes to edit guests!', res)
        // }
        let { guest_name, guest_phone_code, guest_phone, guest_id } = req.body

        let guest = await user_guest_mapping_modal.findOne({
            user_id: req.payload._id, _id: guest_id
        })
        if (!guest) return failMessage('No guest found!', res)
        let updated_obj = {}
        guest_name ? updated_obj.guest_name = guest_name : ""
        guest_phone_code ? updated_obj.guest_phone_code = guest_phone_code : ""
        guest_phone ? updated_obj.guest_phone = guest_phone : ""


        //Insert the guest record in the db
        let edit_guest = await user_guest_mapping_modal.findByIdAndUpdate({
            _id: guest_id
        }, updated_obj, { new: true })

        //send Notification to guests phone number-->
        if (guest_phone) {
            //check valid country for twilio
            const twilioCountry = await twilioCountryModel.findOne({ country_code: edit_guest.guest_phone_code });
            if (!twilioCountry) {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${edit_guest.guest_phone_code} country code`, res)
            }
            let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
            //red mean we are not support phone code, green,blue and yellow means different sender number 
            if (twilioCountry.colour == 'red') {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${edit_guest.guest_phone_code} country code`, res)
            } else if (twilioCountry.colour == 'green') {
                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
            } else if (twilioCountry.colour == 'blue') {
                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
            } else if (twilioCountry.colour == 'yellow') {
                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
            }
            const toPhoneNumber = edit_guest.guest_phone_code + edit_guest.guest_phone; // The recipient's phone number
            //sending sms
            //if (process.env.NODE_ENV == 'production') {
            // client.messages
            //     .create({
            //         body: `Hello ${edit_guest.guest_name}, you are added to the BlackJet flight by ${user.fullName} `,
            //         from: fromPhoneNumber,
            //         to: toPhoneNumber,
            //     })
            //     .then(message => console.log(`OTP sent with SID: ${message.sid}`))
            //     .catch(error => console.error(`Error sending OTP: ${error.message}`));
            //}

        }

        //Find the guest in user table by matching guest's phone and guest phone code
        let is_guest_verified = await userModal.findOne({
            "phone_code": edit_guest.guest_phone_code,
            "phone": edit_guest.guest_phone
        })
        //Check if the guest is verified user then getting the profile pic from user table
        edit_guest.guest_profile_pic = is_guest_verified && is_guest_verified.passportVerified && is_guest_verified.driverlicenseVerified
            ? is_guest_verified.profile_pic
            : '';
        if (edit_guest.guest_profile_pic) await user_guest_mapping_modal.findByIdAndUpdate({ _id: guest_id }, {
            guest_profile_pic: edit_guest.guest_profile_pic
        })
        let result = {
            guest_id: edit_guest._id,
            guest_name: edit_guest.guest_name,
            guest_phone: edit_guest.guest_phone,
            guest_phone_code: edit_guest.guest_phone_code,
            guest_profile_pic: edit_guest.guest_profile_pic,
            guest_passes: user.guest_passes,
            user_id: edit_guest.user_id
        }
        return successResponse(result, "Guest updated successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.reusable_booking_update = async (req, res) => {

    try {
        const user = req.payload
        if (user.guest_passes == 0) {//If user has 0 guest passes then send error response
            return failMessage('User has not enough guest passes to edit guests!', res)
        }
        let { guest_name, guest_phone_code, guest_phone, guest_id } = req.body

        let guest = await user_guest_mapping_modal.findOne({
            user_id: req.payload._id, _id: guest_id
        })
        if (!guest) return failMessage('No guest found!', res)
        let updated_obj = {}
        guest_name ? updated_obj.guest_name = guest_name : ""
        guest_phone_code ? updated_obj.guest_phone_code = guest_phone_code : ""
        guest_phone ? updated_obj.guest_phone = guest_phone : ""


        //Insert the guest record in the db
        let edit_guest = await user_guest_mapping_modal.findByIdAndUpdate({
            _id: guest_id
        }, updated_obj, { new: true })

        //send Notification to guests phone number-->
        if (guest_phone) {
            //check valid country for twilio
            const twilioCountry = await twilioCountryModel.findOne({ country_code: edit_guest.guest_phone_code });
            if (!twilioCountry) {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${edit_guest.guest_phone_code} country code`, res)
            }
            let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
            //red mean we are not support phone code, green,blue and yellow means different sender number 
            if (twilioCountry.colour == 'red') {
                return NotAcceptable(`Unfortunately, we do not support phone numbers with ${edit_guest.guest_phone_code} country code`, res)
            } else if (twilioCountry.colour == 'green') {
                fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
            } else if (twilioCountry.colour == 'blue') {
                fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
            } else if (twilioCountry.colour == 'yellow') {
                fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
            }
            const toPhoneNumber = edit_guest.guest_phone_code + edit_guest.guest_phone; // The recipient's phone number
            //sending sms
            //if (process.env.NODE_ENV == 'production') {
            client.messages
                .create({
                    body: `Hello ${edit_guest.guest_name}, you are added to the BlackJet flight by ${user.fullName} `,
                    from: fromPhoneNumber,
                    to: toPhoneNumber,
                })
                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                .catch(error => console.error(`Error sending OTP: ${error.message}`));
            //}

        }

        //Find the guest in user table by matching guest's phone and guest phone code
        let is_guest_verified = await userModal.findOne({
            "phone_code": edit_guest.guest_phone_code,
            "phone": edit_guest.guest_phone
        })
        //Check if the guest is verified user then getting the profile pic from user table
        edit_guest.guest_profile_pic = is_guest_verified && is_guest_verified.passportVerified && is_guest_verified.driverlicenseVerified
            ? is_guest_verified.profile_pic
            : '';
        if (edit_guest.guest_profile_pic) await user_guest_mapping_modal.findByIdAndUpdate({ _id: guest_id }, {
            guest_profile_pic: edit_guest.guest_profile_pic
        })
        let result = {
            guest_id: edit_guest._id,
            guest_name: edit_guest.guest_name,
            guest_phone: edit_guest.guest_phone,
            guest_phone_code: edit_guest.guest_phone_code,
            guest_profile_pic: edit_guest.guest_profile_pic,
            guest_passes: user.guest_passes,
            user_id: edit_guest.user_id
        }
        return successResponse(result, "Guest updated successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};
exports.signupcomplete = async (req, res) => {
    try {
        const { _id } = req.payload;

        // Retrieve user from database
        const user = await userModal.findOne({ _id });

        // Handle case where user is not found
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return successResponseWithoutData('Message Send Successfully!', res);
    } catch (err) {
        console.error('Error:', err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.send_referral = async (req, res) => {

    try {
        const id = req.payload._id;
        const currentDate = new Date();
        let { name } = req.body;
        // Remove spaces from the name
        name = name.replace(/\s+/g, '');
        let userDetails = await userModal.findOne({ _id: id, status: "active", onboard_status: true });
        if (!userDetails) {
            return failMessage('You Are Not On boarded Please On board Yourself', res);
        }
        //check valid country for twilio
        // const twilioCountry = await twilioCountryModel.findOne({ country_code: userDetails.phone_code });
        // if (!twilioCountry) {
        //     return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
        // }
        // let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
        // //red mean we are not support phone code, green,blue and yellow means different sender number 
        // if (twilioCountry.colour == 'red') {
        //     return NotAcceptable(`Unfortunately, we do not support phone numbers with ${phone_code} country code`, res)
        // } else if (twilioCountry.colour == 'green') {
        //     fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
        // } else if (twilioCountry.colour == 'blue') {
        //     fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
        // } else if (twilioCountry.colour == 'yellow') {
        //     fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
        // }
        // Generate a unique code
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters.charAt(randomIndex);
        }

        // Set default values for other fields
        // const refer_url = `https://referral.blackjet.au/refer/${name}${code}`;
        const refer_url = `https://theblackjet.biz/refer/${name}${code}`;

        // Calculate expiry time (48 hours from now)
        const expiry = new Date(currentDate);
        expiry.setMinutes(expiry.getMinutes() + 30);

        // expiry.setHours(expiry.getHours() + 72);

        // const toPhoneNumber = userDetails.phone_code + userDetails.phone_no; // The recipient's phone number
        // await client.messages
        //     .create({
        //         body: `Hi ${name},  ${refer_url} ${req.payload.fullName} invited you to join BLACK JET.  Use their referral link to become a member and get a free Guest Pass.`,
        //         from: fromPhoneNumber,
        //         to: toPhoneNumber,
        //     })
        //     .then(message => console.log(`Message SID: ${message.sid}`))
        //     .catch(error => console.error(`Error sending Message: ${error.message}`));
        // Save the unique code to the database
        const newReferalCode = new referModal({
            name,
            phone_no: userDetails.phone_no,
            phone_code: userDetails.phone_code,
            user_id: id,
            refer_url,
            expiry // Add expiry to the object being saved
        });
        await newReferalCode.save();
        let response = {
            refer_url: refer_url,
            fullName: userDetails.fullName
        }
        return successResponse(response, 'Unique code generated and stored successfully', res);

    } catch (error) {
        console.error('Error:', error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.sendAppLink = async (req, res) => {

    try {
        if (!req.query.phone_code) {
            return failMessage('Please Provide Country Code', res);
        }
        const type = req?.query?.type ? req.query.type : 'home';// type for define message content
        const phone = req?.query?.phone ? req.query.phone : req.payload.phone;// phone number 
        //If phone is empty
        if (!phone) {
            return failMessage(' Invalid Phone Number!', res);
        }
        //check valid country for twilio
        const twilioCountry = await twilioCountryModel.findOne({ country_code: req.query.phone_code });
        if (!twilioCountry) {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${req.query.phone_code} country code`, res)
        }
        let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
        //red mean we are not support phone code, green,blue and yellow means different sender number 
        if (twilioCountry.colour == 'red') {
            return NotAcceptable(`Unfortunately, we do not support phone numbers with ${req.query.phone_code} country code`, res)
        } else if (twilioCountry.colour == 'green') {
            fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
        } else if (twilioCountry.colour == 'blue') {
            fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
        } else if (twilioCountry.colour == 'yellow') {
            fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
        }
        // const user = await userModal.findOne({ phone });//Find the user using his/her phone number 
        const mobileAppLink = process.env.MOBILE_APP_LINK;
        // if (!user) {
        //     return res.status(404).json({ error: 'User not found' });
        // }
        //const message = `Hi ${user.fullName},\n\nGet our app for easier access! 📱\n ${mobileAppLink}`;
        let message;//message variable
        if (type == 'home') {
            //Message content from website home
            message = `Access our app at: https://blackjet.au/app Thank you for your interest in BLACK JET and enjoy your journey with us! `;
        } else if (type == 'free') {
            //Message Last step of Public to Free Preview DK/TB onboarding process- Finish button
            message = `Hi there! 👋 Welcome to BLACK JET.  We're thrilled you've signed up!  To get started, simply download our app at https://blackjet.au/app`;
        } else if (type == 'member') {
            //Message Last step of Public to member DK/TB onboarding
            message = `Hi there!  Welcome aboard BLACK JET.  We're thrilled to have you as a new member! 🤝  To get started, simply download our app at https://blackjet.au/getapp`;
        }

        // if (user) {

        const toPhoneNumber = req.query.phone_code + phone; // The recipient's phone number
        //if (process.env.NODE_ENV == 'production') {
        await client.messages
            .create({
                body: message,
                from: fromPhoneNumber,
                to: toPhoneNumber,
            })
            .then(message => console.log(`OTP sent with SID: ${message.sid}`))
            .catch(error => console.error(`Error sending OTP: ${error.message}`));
        //}
        return successResponse(mobileAppLink, 'Mobile App Link sent to the user successfully', res);
    } catch (error) {
        console.error('Error:', error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.freePreviewRegister = async (req, res) => {
    try {
        const _id = req.payload._id
        let user = await userModal.findByIdAndUpdate({ _id }, { onboard_status: true, is_member: true }, { new: true });

        return successResponse(user, 'User registered successfully!', res);
    } catch (error) {
        console.error('Error:', error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.getReferList = async (req, res) => {
    try {
        const userId = req.payload._id;
        const pageNumber = parseInt(req.query.page) || 1; // Default page number if not provided
        const limitNumber = parseInt(req.query.limit) || 10; // Default limit if not provided

        // Retrieve total count of referrals
        const totalCount = await referModal.countDocuments({ user_id: userId, status: 'active' });

        // Retrieve referral data from the database with pagination
        const referralData = await referModal.find({ user_id: userId })
            .sort({ _id: -1 }) // Sort by _id in descending order
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);

        // Check if any referrals were found, if not, return an empty response
        if (!referralData.length) return emptyResponse(referralData, res);

        // Prepare response data and update expired referrals
        const updatedReferrals = [];
        const currentDate = new Date(); // Get current date

        for (const referral of referralData) {
            const expiryTime = moment(referral.expiry);
            let timeDifference = expiryTime.diff(currentDate); // Calculate time difference using current date
            let timeLeft;

            if (referral.refer_status == 'pending' && timeDifference <= 0) {
                // If referral has expired, update the refer_status in the database
                await referModal.updateOne(
                    { refer_url: referral.refer_url },
                    {
                        refer_status: 'expired',
                        send_to_refer: 'expired',
                        send_by_refer: 'expired'
                    }
                );

                referral.refer_status = 'expired';
                referral.send_to_refer = 'expired';
                referral.send_by_refer = 'expired';
            }
            if (timeDifference <= 0 || timeDifference > 86400000) { // More than 1 day
                const daysLeft = Math.ceil(moment.duration(timeDifference).asDays());
                timeLeft = `${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
                console.log(timeLeft, 'timeLeft')

            } else {
                const hoursLeft = Math.floor(moment.duration(timeDifference).asHours());
                const minutesLeft = Math.floor(moment.duration(timeDifference).asMinutes() % 60);
                timeLeft = `${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`;
                console.log(timeLeft, 'inside ekse')

            }

            // Set the refer_status based on user_id and send_to
            let refer_status = referral.refer_status;
            if (referral.user_id.equals(userId)) {
                refer_status = referral.send_by_refer;
            } else if (referral.send_to == userId) {
                refer_status = referral.send_to_refer;
            }

            updatedReferrals.push({
                _id: referral._id,
                name: referral.name,
                refer_status: refer_status,
                refer_url: referral.refer_url,
                user_id: referral.user_id,
                send_to: referral.send_to,
                timeLeft: timeLeft,
                createdAt: referral.createdAt,
            });
        }

        // Return a success response with the list of referrals, total count, and pagination information
        return successResponseWithPagination(updatedReferrals, totalCount, 'Referrals fetched successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.error(err);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.uploadAnyFiles = async (req, res) => {
    try {
        if (req.files && req.files.length > 0) {
            let result = [] //Storing the urls
            req.files.map((data) => {
                result.push(data.location)
            })
            //return the uploaded urls for all the files
            return successResponse(result[0], 'Data fetched successfully.', res);
        } else {
            return notFoundResponse('No file provided', res);

        }
    } catch (err) {
        console.error(err, "errr");
        return errorResponse('Internal Server Error', res);
    }
};
exports.clearLockedSeats = async (req, res) => {
    try {
        const id = req.query.id;

        // Retrieve user from database
        const flight_seat = await flight_seat_mapping.findOne({ flight_id: id, status: "active" });
        if (!flight_seat) return failMessage('Invalid flight!', res)
        let update_seats = {}
        for (let i = 1; i <= 8; i++) {
            if (flight_seat[`seat${i}`] && flight_seat[`seat${i}_details`] && flight_seat[`seat${i}_details`].user_id.valueOf() == req.payload._id && !flight_seat[`seat${i}_details`].booking_id) {
                update_seats[`seat${i}`] = 0
                update_seats[`seat${i}_details`] = null

            }
        }
        if (update_seats) {
            await flight_seat_mapping.findByIdAndUpdate({ _id: flight_seat._id }, update_seats)
        }
        return successResponseWithoutData('Cleared all locked seats!', res);
    } catch (err) {
        console.error('Error:', err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.undoEditSeats = async (req, res) => {
    try {
        const id = req.query.id;

        // Retrieve user from database
        const flight_seat = await flight_seat_mapping.findOne({ flight_id: id, status: "active" });
        if (!flight_seat) return failMessage('Invalid flight!', res)
        let update_seats = {}
        for (let i = 1; i <= 8; i++) {
            if (flight_seat[`seat${i}`] && flight_seat[`seat${i}_details`] && flight_seat[`seat${i}_details`].user_id.valueOf() == req.payload._id && flight_seat[`seat${i}_details`].booking_id && flight_seat[`seat${i}_details`].isLocked) {
                let guest_passes_data = req.payload.guest_passes;
                //if guest detail exist then add pass guest 
                if (flight_seat[`seat${i}_details`].guest_id != undefined) {
                    guest_passes_data = parseInt(req.payload.guest_passes) + 1;
                }
                //resend user guest pass
                await userModal.findOneAndUpdate({ _id: req.payload._id, status: "active" }, {
                    guest_passes: guest_passes_data,
                })


                update_seats[`seat${i}`] = 0
                update_seats[`seat${i}_details`] = null
            }
            if (flight_seat[`seat${i}`] && flight_seat[`seat${i}_details`] && flight_seat[`seat${i}_details`].user_id.valueOf() == req.payload._id && flight_seat[`seat${i}_details`].booking_id && flight_seat[`seat${i}_details`].preserve && !flight_seat[`seat${i}_details`].isLocked) {

                update_seats[`seat${i}_details`] = flight_seat[`seat${i}_details`]
                update_seats[`seat${i}_details`].preserve = false
            }

        }

        if (update_seats) {
            await flight_seat_mapping.findByIdAndUpdate({ _id: flight_seat._id }, update_seats)
        }
        return successResponseWithoutData('Undo all edit seats!', res);
    } catch (err) {
        console.error('Error:', err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.generateics = async (req, res) => {
    try {
        const events = [
            {
                start: [2024, 4, 24, 9, 0],
                duration: { hours: 1 },
                title: 'First Event',
                description: 'This is the first event description.',
                location: 'First Event Location',
                status: 'CONFIRMED',
                busyStatus: 'BUSY',
                productId: 'NodeJS-ICS-Example'
            },
            {
                start: [2024, 4, 25, 12, 0],
                duration: { hours: 1 },
                title: 'Second Event',
                description: 'This is the second event description.',
                location: 'Second Event Location',
                status: 'CONFIRMED',
                busyStatus: 'BUSY',
                productId: 'NodeJS-ICS-Example'
            }
        ];
        createEvents(events, (error, value) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Failed to generate ICS');
            }

            res.setHeader('Content-Type', 'text/calendar');
            res.setHeader('Content-Disposition', 'attachment; filename="download.ics"');
            res.send(value);
        });

    } catch (err) {
        console.error('Error:', err);
        return internalServerError('Internal Server Error', res);
    }
};

exports.addCard = async (req, res) => {
    try {
        const userId = req.payload._id;

        // Extract card details from the request body
        const { cardType, cardholderName, cardNumber, expiry, cvv, billingAddress } = req.body;

        // Regular expressions for card number, expiry date, and CVV validation
        const regexPatterns = {
            cardNumber: /^\d{16}$/, // 16-digit card number
            expiry: /^(0[1-9]|1[0-2])\/\d{2}$/, // MM/YY format
            cvv: /^\d{3}$/ // 3-digit CVV
        };

        // Validate card details using regular expressions
        for (const field in regexPatterns) {
            if (!regexPatterns[field].test(req.body[field])) {
                return failMessage(`Invalid ${field}`, res)

            }
        }

        // Check if the card type is enabled in the payment gateway modal
        const paymentGateway = await paymentGatewayModal.findOne({ paymentType: cardType, enabled: true });
        if (!paymentGateway) {
            return failMessage(`${cardType} card is not allowed`, res);
        }

        // Check if the card already exists for the user
        const existingCard = await cardModal.findOne({ userId, cardNumber });
        if (existingCard) {
            return failMessage('Card already exists for this user', res);
        }

        // Create a new instance of the Card model with the provided details
        const card = new cardModal({
            cardholderName,
            cardNumber,
            cardType,
            userId, // Assign the userId obtained from the request
            expiry,
            cvv,
            billingAddress
        });

        await card.save();

        return successResponseWithoutData('Saved Successfully!', res);
    } catch (error) {
        console.error("Error connecting to MongoDB Atlas:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const getCurrentPrice = async (query) => {
    const currentUTCTime = new Date(); // Assuming this is defined elsewhere in your code
    const prices = await priceModal.find({
        ...query,
        effectiveDate: { $lte: currentUTCTime },
        $or: [
            { effectiveEndDate: null },
            { effectiveEndDate: { $gt: currentUTCTime } }
        ]
    }).sort({ effectiveDate: -1 }).lean();

    if (!prices || prices.length === 0) {
        throw new Error('Price not found');
    }

    return prices[0].price;
};

exports.createPayment = async (req, res) => {
    const { id, type, price, currency } = req.body;
    const userId = req.payload._id;

    if (!userId || !currency) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    // let price;
    try {
        //     if (type === 'membership') {
        //         const findMembership = await userMembershipModal.findOne({ user_id: userId, status: 'active', is_activate: true }).lean();
        //         if (!findMembership) {
        //             return res.status(404).json({ error: 'Active membership not found' });
        //         }
        //         price = findMembership.price;
        //     } else if (type === 'items') {
        //         price = await getCurrentPrice({ status: "active", items: id });
        //     } else {
        //         price = await getCurrentPrice({ status: "active", boutique: id });
        //     }

        const result = await createPayment({
            userId,
            price,
            id,
            currency,
            type: "user" // Static type for API calls
        });

        return successResponse(result.data, "Success", res);
    } catch (error) {
        console.error('Error:', error);
        return internalServerError(error.message || 'Internal Server Error', res);
    }
};

//country list for payment section
exports.getPeymentCountry = async (req, res) => {
    try {
        // Retrieve payment country from database
        const countryList = await paymentCountryModel.find({}, { country_name: 1 })
            .sort({ country_name: 1 });// Sort by country_name in ascending order
        // Check if any country were found, if not, return an empty response
        if (!countryList.length) return emptyResponse(countryList, res);

        return successResponse(countryList, 'Country List.', res);
    } catch (err) {
        console.error('Error:', err);
        return internalServerError('Internal Server Error', res);
    }
};
//get legal by category id
exports.getLegal = async (req, res) => {
    try {
        const { id } = req.query; // Assuming you pass the Legal Category ID as a parameter

        // Find the Legal by ID
        const legal = await legalModal.findOne({ _id: id, status: 'active' });
        //If Legal not found by ID
        if (!legal) {
            return notFoundResponse('No active legal document found', res);
        }

        // Construct the response object
        const responseObject = {
            legal_title: legal.legalTitle,
            legalContent: legal.legalContent
        };

        return successResponse(responseObject, 'Active legal documents fetched successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.getResetVoucher = async (req, res) => {
    try {

        // Get the current date and time in UTC
        const currentDate = new Date();
        // Find the Reset Voucher by ID
        const resetVoucher = await itemModal.findOne({
            name: "Reset Voucher",
            count: "1", status: 'active'
        });

        if (!resetVoucher) {
            return notFoundResponse('No reset voucher found', res);
        }
        // Find the prices with effective dates after the current UTC date and time
        const resetVoucherPrice = await priceModal.find({
            status: "active",
            items: resetVoucher._id,
            effectiveDate: { $lte: currentDate }, // Only select prices with effective dates less than or equal to the current 
        }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date
        //If Reset Voucher not found by ID
        if (resetVoucherPrice.length == 0) {
            return notFoundResponse('No reset voucher price not found', res);
        }
        let response = {
            _id: resetVoucher._id,
            name: resetVoucher.name,
            status: resetVoucher.status,
            count: resetVoucher.count,
            discount_price: "",
            flash_sale: resetVoucher.flash_sale,
            sale_end_date_time: resetVoucher.sale_end_date_time,
            sale_start_date_time: resetVoucher.sale_start_date_time,
            currentPrice: resetVoucherPrice[0].price || 0,
            nextCurrentPrice: ""
        }
        if (!response) {
            return notFoundResponse('No reset voucher found', res);
        }

        return successResponse(response, 'Reset Voucher fetched successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
//get flight dates for calender
exports.get_flights_date = async (req, res) => {
    try {
        let currentDate = new Date(); //current date time
        currentDate.setHours(0, 0, 0, 0); // Set time to midnight (00:00:00.000)
        let currentTime = new Date();
        let hours = currentTime.getHours();
        let minutes = currentTime.getMinutes();
        let hoursAndMinutes = `${hours}:${minutes}`; //concating hours and minutes
        const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });
        let { leaving_from, arriving_at } = req.body
        const leavingFromObjectId = mongoose.Types.ObjectId(leaving_from);//creating a new MongoDB ObjectId instance
        const arrivingAtObjectId = mongoose.Types.ObjectId(arriving_at);//creating a new MongoDB ObjectId instance
        let route = await routeModal.findOne({ fromCity: leavingFromObjectId, toCity: arrivingAtObjectId, status: 'active' })
        if (!route) return failMessage('No data found!', res)

        //Fetching flights for first_date
        //takeoff_time: { $gte: hoursAndMinutes },
        const get_first_flight_dates = await flightModal.aggregate([
            {
                $match: {
                    flight_takeoff_date: { $gte: currentDate },
                    route: route._id,
                    is_demo: checkDemoSettings ? true : false
                }
            },
            {
                $project: {
                    _id: 1,
                    flight_takeoff_date: { $dateToString: { format: "%Y-%m-%d", date: "$flight_takeoff_date" } },
                    takeoff_time: 1,
                    landing_time: 1
                }
            }
        ]);

        return successResponse(get_first_flight_dates, "Data fetched successfully!", res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};

exports.getVeriffResponse = async (req, res) => {
    let encryptionKey = process.env.VERIFF_ENCRYPTIONKEY;
    try {
        const user = req.payload;
        let currentDate = new Date(); //current date time
        currentDate.setHours(0, 0, 0, 0); // Set time to midnight (00:00:00.000)
        let currentTime = new Date();
        let hours = currentTime.getHours();
        let minutes = currentTime.getMinutes();
        let hoursAndMinutes = `${hours}:${minutes}`; //concating hours and minutes
        let { type, submitdate } = req.body
        //Fetching veriff data
        const get_veriffData = await veriffWebhookResponseModal
            .find({
                user_id: user._id,
                //'webhook_response.document.type': type,
                createdAt: { $gt: new Date(submitdate) }
            })
            .sort({ createdAt: -1 }) // Sort by created_at in descending order
            .limit(1) // Limiting to retrieve only one document 
            .exec();
        //,created_at: { $gte: new Date(currentDate) }
        if (!get_veriffData) {
            return notFoundResponse('No data found', res);
        }

        if (get_veriffData?.[0]?.webhook_response?.[0] == undefined) {
            return notFoundResponse('No data found', res);
        }
        //decrypt veriff response
        const decryptBuffer = decrypt(get_veriffData?.[0]?.webhook_response?.[0], encryptionKey);
        let webhook_response_data = JSON.parse(decryptBuffer.toString());
        // console.log('webhook_response_data==',webhook_response_data)
        // console.log(webhook_response_data.data)
        // console.log(webhook_response_data?.data?.verification?.person?.lastName)
        // console.log(webhook_response_data?.data?.verification?.person?.dateOfBirth)
        //return;
        if (webhook_response_data?.data?.verification?.decision != undefined && webhook_response_data?.data?.verification?.decision != 'approved') {
            let typeMessage = { type: "not_verified" };
            return successResponse(typeMessage, "We were unable to verify your identity", res);
        }
        let birthDate = 0;
        //If veriff date of birth
        if (webhook_response_data?.data?.verification?.person?.dateOfBirth?.value != undefined && webhook_response_data?.data?.verification?.person?.dateOfBirth?.value != null) {
            const date1 = new Date(user.birthday);
            const date2 = new Date(get_veriffData[0].webhook_response[0].data.verification.person.dateOfBirth.value);
            console.log(date1)
            console.log(date2)
            if (date1 > date2) {
                console.log('date1 is bigger than date2');
            } else if (date1 < date2) {
                console.log('date1 is later than date2');
            } else {
                console.log('same');
                birthDate = 1;
            }
        }

        let nameMatch = 0;
        //If veriff first and last name
        if (webhook_response_data?.data?.verification?.person?.firstName?.value != undefined && webhook_response_data?.data?.verification?.person?.firstName?.value != null) {
            let lastName = '';
            if (webhook_response_data?.data?.verification?.person?.lastName?.value != undefined && webhook_response_data?.data?.verification?.person?.lastName?.value != null) {
                lastName = ` ${get_veriffData[0].webhook_response[0].data.verification.person.lastName.value}`;
            }

            const name1 = `${get_veriffData[0].webhook_response[0].data.verification.person.firstName.value}${lastName}`;
            const name2 = `${user.fullName}`;
            console.log(name1)
            console.log(name2)
            if (name1.toLowerCase() === name2.toLowerCase()) {
                console.log('Names are equal');
                nameMatch = 1;
            }
        }

        if (nameMatch == 0 && birthDate == 0) {
            let typeMessage = { type: "name_dob_not_match" };
            return successResponse(typeMessage, "The full legal name and birthday in your profile doesn’t match your identity document.  Please correct your profile information and try again", res);
        } else if (nameMatch == 0) {
            let typeMessage = { type: "name_not_match" };
            return successResponse(typeMessage, "The full legal name in your profile doesn’t match your identity document.  Please correct your profile information and try again", res);
        } else if (birthDate == 0) {
            let typeMessage = { type: "dob_not_match" };
            return successResponse(typeMessage, "The birthday in your profile doesn’t match your identity document.  Please correct your profile information and try again", res);
        }

        //updating user verify status
        //await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'verified' }, { new: true })
        //return successResponse(get_veriffData, "Data fetched successfully!", res);
        let typeMessage = { type: "verified" };
        return successResponse(typeMessage, "You are verified", res);

    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
}

exports.redeemGuestPasses = async (req, res) => {
    try {
        const userId = req.payload._id; // Get the user ID from the payload
        const { _id } = req.body; // Get the referral ID from the request body

        // Find the referral document with the given ID, status, and refer status
        const referDoc = await referModal.findOne({ _id, status: 'active', refer_status: 'redeem' });

        // Check if the referral document exists
        if (!referDoc) {
            return notFoundResponse('No data found', res);
        }

        // Find the memberships for the sender and receiver of the referral
        const sendByMembership = await userMembershipModal.findOne({ user_id: referDoc?.user_id, status: 'active' });
        const sendToMembership = await userMembershipModal.findOne({ user_id: referDoc?.send_to, status: 'active' });

        // Check if both memberships are active
        if (!sendByMembership?.is_activate || !sendToMembership?.is_activate) {
            return failMessage('First activate the membership which you have sent the referral for', res);
        }
        // console.log(referDoc.user_id, 'referDoc.user_id');
        // Check if the user is the sender of the referral
        if (referDoc.user_id.equals(userId)) {
            // Update the sender's guest passes and underway count
            const userByUpdates = sendByMembership.underway > 0 ? { $inc: { guest_passes: 1, underway: -1 } } : { $inc: { guest_passes: 1 } };

            // Update the sender's user document
            await userModal.updateOne({ _id: referDoc.user_id, underway: { $gte: 0 } }, userByUpdates, { new: true });

            // Update the referral document to indicate the sender has redeemed the referral
            await referModal.findByIdAndUpdate(_id, { send_by_refer: 'redeemed' }, { new: true });
        }

        // Check if the user is the receiver of the referral
        if (referDoc.send_to == userId) {
            // Update the receiver's guest passes and underway count
            const userToUpdates = sendToMembership.underway > 0 ? { $inc: { guest_passes: 1, underway: -1 } } : { $inc: { guest_passes: 1 } };

            // Update the receiver's user document
            await userModal.updateOne({ _id: referDoc.send_to, underway: { $gte: 0 } }, userToUpdates, { new: true });

            // Update the referral document to indicate the receiver has redeemed the referral
            await referModal.findByIdAndUpdate(_id, { send_to_refer: 'redeemed' }, { new: true });
        }

        // If both the sender and receiver have redeemed the referral, update the referral status
        if (referDoc.send_by_refer === 'redeemed' && referDoc.send_to_refer === 'redeemed') {
            await referModal.findByIdAndUpdate(referDoc._id, { refer_status: 'redeemed' }, { new: true });
        }

        // Return success response
        return successResponseWithoutData('Redeemed successfully!', res);
    } catch (err) {
        // Log the error for debugging purposes
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
};

/**
 * Fetches routes based on predefined city-to-city routes.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.routes = async (req, res) => {
    try {
        // Extract city name from request query
        const { fromCity } = req.query;

        // Find routes based on fromCity
        const routes = await routeModal.find({
            fromCity: fromCity,
            status: 'active'
        });

        // Check if any routes found
        if (routes.length === 0) {
            return notFoundResponse('No routes found for the specified fromCity', res);
        }
        // Extract toCity values
        const toCities = routes.map(route => route.toCity);

        // Fetch destination details from the database
        let destinationDetails = await state_modal.find({
            _id: { $in: toCities },
            status: 'active'
        }).sort({ order: 1 });
        if (req.query.curr_lat != undefined && req.query.curr_lat != '' && req.query.curr_long != undefined && req.query.curr_long != '') {
            let lat = req.query.curr_lat;
            let long = req.query.curr_long;
            let arr = [parseFloat(long), parseFloat(lat)]
            destinationDetails = await state_modal.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: arr  // Example coordinates
                        },
                        key: "location",
                        distanceField: "distance",
                        query: {
                            _id: { $in: toCities },
                            status: 'active'
                        }
                    }
                },
                {
                    $sort: { distance: 1 }  // Sort by distance in ascending order
                }
            ]);
        }
        // Return successful response with destination details
        return successResponse(destinationDetails, 'Data fetched successfully!', res);
    } catch (error) {
        // Log and handle internal server error
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.getReferStatus = async (req, res) => {
    try {
        const { uniqueCode } = req.query;
        // Find the referral document by unique code
        let referralDoc = {};
        if (uniqueCode) {
            referralDoc = await referModal.findOne({ refer_url: { $regex: uniqueCode } });
        }
        return successResponse(referralDoc, 'Refer Docs Get Successfully!', res);
    } catch (err) {
        console.log(err, "error")
        return internalServerError('Internal Server Error', res);
    }
};

exports.resendGuestBookingMessage = async (req, res) => {

    try {
        let user = req.payload
        const { booking_id, guest_name, guest_phone_code, guest_phone } = req.body;
        //send sms to guest user
        //fetch booking first flight details
        let getFirstBooking = await booking_modal.findOne({ _id: booking_id, booking_status: 'confirmed' });
        if (getFirstBooking) {
            console.log('single flight 1')
            //getting booked flight data
            let firstFlightData = await flightModal.findById({ _id: getFirstBooking.flight_id })
                .populate({
                    path: 'route',
                    populate: [
                        { path: 'toCity', model: 'location' },
                        { path: 'fromCity', model: 'location' }
                    ]
                })
                .exec();
            if (firstFlightData) {
                //date format
                let firstformattedDate = moment(firstFlightData.flight_takeoff_date).format('Do MMMM');
                //time format
                const [hours, minutes] = firstFlightData.takeoff_time.split(':');
                const formattedHours = parseInt(hours, 10) % 12 || 12;  // Convert to 12-hour format
                const period = parseInt(hours, 10) < 12 ? 'AM' : 'PM';  // Determine AM/PM
                firstFlightData.takeoff_time = `${formattedHours}:${minutes} ${period}`;
                let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
                //check valid country for twilio
                const twilioCountry = await twilioCountryModel.findOne({ country_code: guest_phone_code });
                if (twilioCountry) {
                    if (twilioCountry.colour == 'green') {
                        fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;
                    } else if (twilioCountry.colour == 'blue') {
                        fromPhoneNumber = process.env.TWILIO_BLUE_ALPHA_NAME;
                    } else if (twilioCountry.colour == 'yellow') {
                        fromPhoneNumber = process.env.TWILIO_YELLOW_ALPHA_NAME;
                    }
                }
                let toPhoneNumber = guest_phone_code + guest_phone; // The recipient's phone number
                //if (process.env.NODE_ENV == 'production') {
                client.messages
                    .create({
                        body: `Hey ${guest_name},  You're invited on ${user.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}.  Confirm by registering with this mobile phone number on the BLACK JET APP: https://blackjet.au/getapp`,
                        from: fromPhoneNumber,
                        to: toPhoneNumber,
                    })
                    .then(message => console.log(`sms sent with SID: ${message.sid}`))
                    .catch(error => console.error(`Error sending sms: ${error.message}`));

                //}

            }

        }
        return successResponseWithoutData("Message Sent Successfully!", res)

    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error', res);
    }
};

// Controller function to get a category by ID
exports.getChatTime = async (req, res) => {
    try {
        const chatTime = await chatTimeModal.find();

        if (!chatTime) return emptyResponse(chatTime, res);
        // Return a success response with the list of subadmins
        return successResponse(chatTime[0], 'Data get successfully.', res);
    } catch (error) {
        // Log the error to the console
        console.error('Error in subAdminList:', error);

        // Return an internal server error response
        return internalServerError('Internal Server Error.', res);
    }
};