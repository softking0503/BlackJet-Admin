const dotenv = require('dotenv');
const passport = require('passport');
const momentTimezone = require('moment-timezone');

const { errorResponse, successResponse,
    emptyResponse,
    successResponseWithoutData,
    successResponseWithPagination,
    trimParams,
    failMessage,
    requiredIdResponse,
    customResponse,
    internalServerError,
    randomResponse,
    Forbidden,
    notFoundResponse,
    tokenError
} = require("../helpers/response");
const common = require('../helpers/v2/common');
const { toObjectId } = require('../helpers/v2/common');
const moment = require('moment');

const userModal = require("../models/users.model");
const adminModal = require("../models/admin");
const blackListCardModal = require("../models/blackListCards");
const homePageModal = require("../models/homePage");
const transactionModal = require("../models/payment");
const refundPdf = require('../helpers/refundPdf');
const prefernceModal = require("../models/preference");
const testimonialModal = require("../models/testimonial");
const jobApplicationModal = require("../models/jobApplication");
const refundHistoryModal = require("../models/refundHistory");
const contentModal = require("../models/contentManagement");
const cardModal = require("../models/card");
const petsModal = require("../models/pets");
const internalGroupModal = require("../models/internalGroup");
const userPetModal = require("../models/user_pet_mapping");
const columnWithDataModal = require("../models/columnWithIcon");
const chatTimeModal = require("../models/chatTime");
const deviceTokenModal = require("../models/deviceToken");
const investorsModal = require("../models/investors");
const flightBookingModal = require("../models/booking");
const halfTextImageModal = require("../models/halfTextImage");
const categoryModal = require("../models/category");
const hellozaiModal = require('../models/hellozaiLog');
const enquiryListModal = require("../models/enquiryList");
const enquiryModal = require("../models/enquiry");
const faqModal = require("../models/faq");
const discountModal = require("../models/discount");
const blogModal = require("../models/blog");
const legalModal = require("../models/legal");
const contactModal = require("../models/contactUs");
const boutiqueModal = require('../models/boutique');
const rolesModel = require("../models/roles");
const userPetMappingModel = require("../models/user_pet_mapping");
const membershipModal = require("../models/membership");
const locationModal = require("../models/navLocation");
const priceModal = require("../models/price");
const authorModal = require("../models/author");
const SavedNavLocationModal = require("../models/savedNavLocation");
const announcementModal = require("../models/announcement");
const itemModal = require("../models/item");
const careerModal = require("../models/career");
const pilotModal = require("../models/pilot");
const shortCodeModal = require("../models/shortCode");
const state_modal = require("../models/state"); //Its the location table
const routeModal = require("../models/route");
const mailHelper = require('../helpers/mailer');
const groupModal = require("../models/group");
const industryModal = require('../models/industries');
const flightModal = require("../models/flights");
const flight_seat_mapping = require("../models/flight_seats_mapping");
const userMembershipModal = require("../models/userMembership");
const userAnnouncementModal = require("../models/userAnnouncement");
const membershipPriceHistoryModal = require("../models/membershipPriceHistory");
const booking_modal = require("../models/booking");
const paymentMethodModal = require("../models/payment_method");
const commonservices = require("../helpers/v2/common");
const paymentGatewayModal = require("../models/payment_gateway");
const generatePassword = require('generate-password');
const { ObjectId } = require('mongoose').Types;
const { default: mongoose } = require('mongoose');
const { date, required } = require('joi');
const JobType = require("../models/jobType");  // JobType model
const JobLocation = require('../models/jobLocation');  // JobLocation model
const JobCategory = require('../models/jobCategory');  // JobCategory model
const legalUpdateUser = require('../models/legalUpdateUser');
const argon2 = require('argon2');
const uploadBase64 = require('../controllers/v2/upload'); // Assuming you have the uploadBase64 function
const jwt = require('jsonwebtoken');
const permission = require('../models/roles');
const mail = require('../helpers/mailer');
const { identitytoolkit_v2 } = require('googleapis');
const membership = require('../models/membership');
const contactuscategoriesModal = require('../models/contactUsCategory');
const airwallexLogModal = require('../models/airwallexLog');
const subadminSignatureModal = require('../models/subadminSignature');
const { Db } = require('mongodb');
const { admin } = require('googleapis/build/src/apis/admin');
const secretManagerAws = require('../helpers/secretManagerAws');
const socketIoClient = require('socket.io-client');
const randomize = require("randomatic");
const axios = require('axios');
const { saveAirwallexCustomer, refundPayment, createPaymentConsent, verifyPaymentConsent } = require('../helpers/airwallexPayment'); // Adjust the path to your utility file
const { createUser, createCardAccount, createCharge, deleteCardAccount, refundItem } = require('../helpers/hellozaiPayment'); // Adjust the path to your utility file

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { start } = require('repl');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const models = {
    legal: legalModal,
    category: categoryModal,
    faq: faqModal
};

exports.register = async (req, res) => {
    const { first_name, last_name, email, phone, password, country_code, roles_array } = trimParams(req.body);

    try {
        // Fetch role names corresponding to role IDs
        const roleNamesPromises = roles_array.map(async role => {
            const roleDetails = await rolesModel.findById({ _id: role.role_id });
            return roleDetails ? roleDetails.name : null;
        });
        const roleNames = await Promise.all(roleNamesPromises);

        // Create a new admin in the database
        const admin = await adminModal.create({
            first_name,
            last_name,
            email: email.toLowerCase(),
            password,
            phone,
            country_code,
            roles_array: roles_array.map((role, index) => ({
                role_id: role.role_id,
                role_name: roleNames[index], // Add role_name corresponding to the role ID
                role_status: role.role_status
            }))
        });

        // Check if the admin creation was successful
        if (!admin) return emptyResponse(admin, res);

        // Remove sensitive information from the admin data
        const user = admin.deletePassword();

        // Check if the admin data was successfully processed
        if (!user) return emptyResponse(user, res);

        // Return a success response with the admin data
        return successResponse(user, 'Admin created successfully.', res);
    } catch (err) {
        console.log(err, "err")
        return errorResponse(err, res);
    }
};

exports.login = async (req, res) => {
    const { email, phone, password } = req.body;

    try {
        // Validate input
        if (!email && !phone) {
            return randomResponse('Email or mobile number is required', res);
        }

        // Find the admin based on the provided email or phone
        const admin = email
            ? await adminModal.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') }, status: 'active' })
            : await adminModal.findOne({ phone, status: 'active' });

        // Check if the admin exists
        if (!admin) {
            return notFoundResponse('Admin not found', res);
        }

        // Validate password using Argon2
        const validatePassword = await argon2.verify(admin.password, password);
        if (!validatePassword) {
            return Forbidden('Invalid Password', res);
        }
        let JWT_SECRET;
        //JWT fetch

        if (process.env.NODE_ENV == 'production') {
            JWT_SECRET = process.env.JWT_SECRET;
        }
        else {
            JWT_SECRET = process.env.JWT_SECRET;
        }
        // Generate a JWT token with admin information
        const token = jwt.sign({ _id: admin._id }, JWT_SECRET);
        // Update the admin's token in the database
        const updateAdmin = await adminModal.findOneAndUpdate(
            { _id: admin._id },
            { token },
            { new: true }
        );

        // Create a admin data object with selected properties
        const adminData = {
            _id: updateAdmin._id || '',
            first_name: updateAdmin.first_name || '',
            last_name: updateAdmin.last_name || '',
            email: updateAdmin.email || '',
            phone: updateAdmin.phone || '',
            country_code: updateAdmin.country_code || '',
            status: updateAdmin.status || '',
            token: updateAdmin.token || '',
            type: updateAdmin.type || '',
            roles_array: updateAdmin.roles_array
        };

        // Return a success response with the admin data
        return successResponse(adminData, 'Login successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.error(err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.resetPassword = async (req, res) => {
    const { id, oldPassword, newPassword, confirmPassword } = req.body;
    try {
        // Find the user in the database based on the provided ID
        const user = await adminModal.findOne({ _id: id });
        if (!user) {
            return customResponse('Admin not found', res);
        }

        // Verify the old password using Argon2
        const isPasswordValid = await argon2.verify(user.password, oldPassword);
        if (!isPasswordValid) {
            return randomResponse('Incorrect old password', res);
        }

        // Check if the new password and confirm password match
        if (newPassword !== confirmPassword) {
            return randomResponse('New password and confirm password do not match', res);
        }

        // Hash the new password
        const hashedNewPassword = await argon2.hash(newPassword);

        // Update the user's password in the database
        await adminModal.findByIdAndUpdate(id, { password: hashedNewPassword });


        // Return a success response without data
        return successResponseWithoutData("Password Changed Successfully", res);
    } catch (err) {
        // Handle errors and return an error response
        console.error(err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getRoles = async (req, res) => {
    try {
        // Retrieve the list of roles from the database

        // Use the rolesModel to find all roles in the collection
        const response = await rolesModel.find({});

        // Check if any roles were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        // Return a success response with the list of roles
        return successResponse(response, 'Roles get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}

exports.getAdminProfile = async (req, res) => {
    try {
        // Use the MongoDB aggregation framework to retrieve an admin's profile
        let adminId = toObjectId(req.query.id);

        let data = await adminModal.aggregate([
            {
                $match: {
                    _id: adminId
                }
            },
            {
                $lookup: {
                    from: "roles",
                    localField: "roles_array.role_id",
                    foreignField: "_id",
                    as: "adminRoles"
                }
            },
            {
                $project: {
                    _id: 1,
                    first_name: 1,
                    last_name: 1,
                    email: 1,
                    phone: 1,
                    country_code: 1,
                    password: 1,
                    roles_array: {
                        _id: 1,
                        role_id: 1,
                        role_status: 1,
                        role_name: { $arrayElemAt: ["$adminRoles.name", 0] }
                    }
                }
            }
        ]);

        // Check if any data was found, if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        // Return a success response with the admin's profile details
        return successResponse(data[0], 'Data Retrieved Successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.error("Error fetching admin profile:", err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.adminForgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Find an active admin user with the provided email
        const admin = await adminModal.findOne({ email: email, status: 'active' });

        // Check if the user was found
        if (!admin) {
            return customResponse('Admin not found', res);
        }

        // Generate a new password (commented out in your code)
        const password = generatePassword.generate({
            length: 10,
            numbers: true
        });

        // Hash the generated password using Argon2
        const hashedPassword = await argon2.hash(password);

        // Update the user's password in the database
        await adminModal.updateOne({ email: email }, { $set: { password: hashedPassword } });

        // Send an email with a password reset link
        mailHelper.sendForgotMail({ email, password });

        // Return a success response
        return successResponseWithoutData(`Password reset successful. An email with a new password has been sent to ${email}`, res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getAllAdminProfiles = async (req, res) => {
    try {
        const { query } = req;
        const { skip = 1, limit = 100 } = query;
        let filter = {
            type: 'subadmin' // Add filter to fetch only subadmins
        };


        if (query.role) {
            filter['roles_array.role_id'] = query.role;
        }

        if (query.name) {
            const nameQuery = query.name;
            const nameRegex = new RegExp(nameQuery, 'i');
            filter['$or'] = [
                { 'first_name': nameRegex },
                { 'last_name': nameRegex }
            ];
        }

        const totalCount = await adminModal.countDocuments(filter);

        const parsedSkip = parseInt(skip);
        const parsedLimit = parseInt(limit);
        const offset = (parsedSkip - 1) * parsedLimit;

        const data = await adminModal.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: "roles",
                    localField: "roles_array.role_id",
                    foreignField: "_id",
                    as: "adminRoles"
                }
            },
            {
                $unwind: {
                    path: "$roles_array",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "roles",
                    localField: "roles_array.role_id",
                    foreignField: "_id",
                    as: "roleDetails"
                }
            },
            // {
            //     $addFields: {
            //         "roles_array.role_name": {
            //             $ifNull: [
            //                 { $arrayElemAt: ["$roleDetails.name", 0] },
            //                 []
            //             ]
            //         }
            //     }
            // },
            {
                $group: {
                    _id: "$_id",
                    first_name: { $first: "$first_name" },
                    last_name: { $first: "$last_name" },
                    email: { $first: "$email" },
                    phone: { $first: "$phone" },
                    country_code: { $first: "$country_code" },
                    type: { $first: "$type" },
                    status: { $first: "$status" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                    roles_array: { $push: "$roles_array" }
                }
            },
            { $sort: { _id: -1 } },
            { $skip: offset },
            { $limit: parsedLimit }
        ]);

        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        return successResponseWithPagination(data, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};



exports.updateAdminProfile = async (req, res) => {
    try {
        // Extract data from the request body
        const { id, first_name, last_name, roles_array, phone, country_code, email, password } = trimParams(req.body);

        // Check if the email or phone number already exist in the database
        // const existingUser = await adminModal.findOne({ _id: id });
        // if (existingUser.email == email) {
        //     return failMessage('Email already exists', res);
        // }
        // if (existingUser.phone == phone) {
        //     return failMessage('Phone number already exists', res);
        // }
        if (password.length > 15) {
            return failMessage('Password doesnot exceeded 15 letters', res);
        }

        const roleNamesPromises = roles_array.map(async role => {
            const roleDetails = await rolesModel.findById({ _id: role.role_id });
            return roleDetails ? roleDetails.name : null;
        });
        const roleNames = await Promise.all(roleNamesPromises);
        // Hash the password using Argon2
        const hashedPassword = await argon2.hash(password);
        // Create an object containing the data to update
        const updateData = {
            first_name,
            last_name,
            roles_array: roles_array.map((role, index) => ({
                role_id: role.role_id,
                role_name: roleNames[index], // Add role_name corresponding to the role ID
                role_status: role.role_status
            })),
            password: hashedPassword,
            email,
            phone,
            country_code,
        };

        // Update the admin profile in the database and retrieve the updated data
        const updatedAdmin = await adminModal.findByIdAndUpdate({ _id: id }, updateData, { new: true });

        // Check if the update was successful; if not, return an empty response
        if (!updatedAdmin) {
            return emptyResponse(updatedAdmin, res);
        }

        // Create a response data object with selected properties
        const responseData = {
            _id: updatedAdmin._id || '',
            first_name: updatedAdmin.first_name || '',
            last_name: updatedAdmin.last_name || '',
            roles_array: updatedAdmin.roles_array || [],
            email: updatedAdmin.email || '',
            phone: updatedAdmin.phone || '',
            country_code: updatedAdmin.country_code || '',
            status: updatedAdmin.status || '',
        };

        // Return a success response with the updated admin profile data
        return successResponseWithoutData('Admin profile updated successfully.', res);

    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.updateAdminStatus = async (req, res) => {
    try {
        const { id: adminId, status } = req.body; // Admin ID and new status value

        // Find the admin by ID and update the "status" field
        const findSubadmin = await adminModal.findByIdAndUpdate(
            adminId,
            { status },
            { new: true }
        );

        if (!findSubadmin) {
            return notFoundResponse('Admin not found', res);
        }

        // Find active groups that contain the subadmin
        const groups = await groupModal.find({
            "users._id": adminId,
            status: "active"
        });

        if (!groups.length) {
            return successResponseWithoutData('No active groups found for this admin', res);
        }

        let socketIds = []; // Array to store user socket IDs
        // Connect to the Socket.IO server
        const socket = socketIoClient(process.env.SOCKETURL);
        // Loop through the groups to update user status and collect their socket IDs
        for (let group of groups) {
            if (status === "inactive") {
                // Update the subadmin's status in the group to inactive
                await groupModal.updateOne(
                    {
                        _id: toObjectId(group._id), // Group ID
                        'users._id': adminId, // Match the subadmin by their ID
                        'users.type': 'subadmin',
                        'users.active': 'true' // Only update if currently active
                    },
                    {
                        $set: { 'users.$[elem].active': 'false' } // Set the active status to 'false'
                    },
                    {
                        arrayFilters: [{ 'elem._id': adminId, 'elem.type': 'subadmin' }], // Use arrayFilters to target matching elements
                        new: true // Return the updated document
                    }
                );

                // Decrement the request count for the admin if greater than 0
                await adminModal.findOneAndUpdate(
                    { _id: adminId, request_count: { $gt: 0 } },
                    { $inc: { request_count: -1 } },
                    { new: true }
                );

                // Find the active user in the group
                const user = group.users.find(user => user.type === 'user' && user.active === 'true');
                if (user) {
                    // Find the user's socket ID
                    const userData = await userModal.findById(user._id, 'socket_id');
                    if (userData && userData.socket_id) {
                        socket.emit('getSubadminStatus', { adminId: findSubadmin._id, newStatus: findSubadmin.status, group_id: group._id, socket_id: userData.socket_id });
                        socketIds.push(userData.socket_id);
                    }
                }
            }
        }

        // Return a success response with the updated admin data
        return successResponseWithoutData('Admin status updated successfully', res);
    } catch (error) {
        console.error('Error updating admin status:', error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.addUser = async (req, res) => {
    try {
        const admin_id = req.payload._id;

        // Get user data from the request
        const { fullName, preferredFirstName, country_code, gender, email, phone, birthday, status, reason, occupation, annual_income, industries } = req.body;

        // Check if the email or phone number already exist in the database
        const existingUser = await userModal.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return failMessage('Email or phone number already exists', res);
        }

        // Handle file upload
        const profile_pic = req.files && req.files[0] ? req.files[0].key : '';

        // Create a new user
        const newUser = new userModal({
            fullName,
            preferredFirstName,
            gender,
            country_code: country_code || 'IN',
            email,
            phone,
            birthday,
            profile_pic,
            status,
            reason,
            occupation,
            annual_income,
            onboard_status: true,
            is_information_page_completed: true,
            industries: industries,
            //industries: JSON.parse(industries),
            admin_id
        });

        // Save the user to the database
        await newUser.save();

        // Respond with success
        return successResponseWithoutData('User added successfully', res);
    } catch (error) {
        console.error(error);
        // Handle other types of errors
        return internalServerError('Internal Server Error.', res);
    }
};


exports.editUser = async (req, res) => {
    try {
        const userId = req.body.id;
        // Check if the user exists
        const existingUser = await userModal.findById(userId);
        if (!existingUser) {
            return failMessage('User not found', res);
        }

        // Get user data from the request
        const { fullName, preferredFirstName, country_code, phone_code, gender, email, phone, birthday, status, reason, occupation, annual_income, industries } = req.body;
        // console.log('industries==',industries)
        //console.log('JSON.parse(industries)==',JSON.parse(industries))
        // Update user details
        existingUser.fullName = fullName || existingUser.fullName;
        existingUser.preferredFirstName = preferredFirstName || existingUser.preferredFirstName;
        existingUser.gender = gender || existingUser.gender;
        existingUser.birthday = birthday || existingUser.birthday;
        existingUser.status = status || existingUser.status;
        existingUser.reason = reason || existingUser.reason;
        existingUser.phone = phone || existingUser.phone;
        existingUser.phone_code = phone_code || existingUser.phone_code;
        existingUser.occupation = occupation || existingUser.occupation;
        existingUser.annual_income = annual_income || existingUser.annual_income;
        existingUser.industries = industries ? industries : existingUser.industries;

        // Handle file upload
        if (req.files && req.files[0]) {
            existingUser.profile_pic = req.files[0].key;
        }

        // Save the updated user to the database using findByIdAndUpdate
        await userModal.findByIdAndUpdate(userId, existingUser, { new: true });

        // Respond with success
        return successResponseWithoutData('User updated successfully', res);
    } catch (error) {
        console.error(error);

        // Check for specific errors (e.g., validation errors) and provide appropriate responses
        if (error.name === 'ValidationError') {
            return failMessage('Validation failed', res, 422, error.errors);
        }

        // Handle other types of errors
        return internalServerError('Internal Server Error.', res);
    }
};


exports.updateUserStatus = async (req, res) => {
    try {
        const userId = req.body.id;

        // Check if the user exists
        const existingUser = await userModal.findById(userId);
        if (!existingUser) {
            return failMessage('User not found', res);
        }

        // Get status from the request
        const { status } = req.body;

        // Update user status
        existingUser.status = status;

        // Save the updated user to the database
        await existingUser.save();

        // Respond with success
        return successResponseWithoutData('User status updated successfully', res);
    } catch (error) {
        console.error(error);
        // Handle other types of errors
        return internalServerError('Internal Server Error.', res);
    }
};

exports.viewHomePage = async (req, res) => {
    try {
        // Query the MongoDB collection to retrieve the HomePage data
        const homePageData = await homePageModal.find({});

        // Check if no data is found
        if (!homePageData.length) return emptyResponse('Home Page not Found', res);         // Respond with an empty response

        // Send the HomePage data as a JSON response
        return successResponse(homePageData[0], 'HomePage retrieved successfully', res);

    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.updateHomePage = async (req, res) => {
    try {
        const newStatus = req.body.status; // Assuming you provide the new status in the request body

        // Query the MongoDB collection to find the HomePage data (you can assume there's only one HomePage)
        const homePageData = await homePageModal.findOne();

        if (homePageData) {
            // Update the status of the HomePage
            homePageData.status = newStatus;
            await homePageData.save();

            // Send a success response with a message
            return successResponseWithoutData('HomePage status updated successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('HomePage not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};



exports.addTestimonial = async (req, res) => {
    try {
        // Extract data from the request and create a testimonialData object
        const testimonialData = {
            image: req.files[0].key, // `req.files[0].location` contains the S3 URL
            comment: req.body.comment,
            name: req.body.name,
            // Add other fields like text, created_at, updated_at, and status as needed
        };
        // Create a new testimonial record using the testimonialModal
        const newTestimonial = await testimonialModal.create(testimonialData);

        // Respond with a success message and the created testimonial record
        return successResponse(newTestimonial, "'Testimonial added successfully'", res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.viewTestimonial = async (req, res) => {
    try {
        const testimonialId = req.query.id; // Assuming you provide the testimonial ID as a URL parameter

        // Query the MongoDB collection to retrieve a specific testimonial by its ID and ensure it is active
        const testimonialData = await testimonialModal.findOne({ _id: testimonialId, status: 'active' });

        if (testimonialData) {
            let checkUrl = await common.isValidUrl(testimonialData.image)
            if (checkUrl) {
                testimonialData.image = await common.fetchS3file(testimonialData.image, process.env.USER_MEDIA_BUCKET)
            } else {
                testimonialData.image = await common.fetchS3fileByKey(testimonialData.image, process.env.USER_MEDIA_BUCKET)
            }
            // Send the active testimonial data as a JSON response
            return successResponse(testimonialData, 'Active Testimonial retrieved successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('Active Testimonial not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.viewAllTestimonials = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1; // Updated to 0-based index
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Create an aggregation pipeline to filter records with 'active' status
        const pipeline = [
            { $match: { status: 'active' } },
            { $sort: { _id: -1 } }, // Sort by 'created_at' in descending order
            {
                $facet: {
                    paginatedTestimonials: [
                        { $skip: offset }, // Skip records based on pagination
                        { $limit: parsedLimit }, // Limit the number of records per page
                    ],
                    totalCount: [
                        { $count: 'count' },
                    ],
                },
            },
        ];

        // Execute the aggregation pipeline
        const [result] = await testimonialModal.aggregate(pipeline);

        // Extract paginated testimonials and total count from the result
        const paginatedTestimonials = result.paginatedTestimonials;
        const totalItems = paginatedTestimonials.length > 0 ? result.totalCount[0].count : 0;

        // If there are no testimonials, send a custom not found response with a message
        if (paginatedTestimonials.length === 0) {
            return notFoundResponse('No testimonials found', res);
        }

        // Map the paginated testimonials to a simplified format
        const simplifiedTestimonials = paginatedTestimonials.map((testimonial) => ({
            _id: testimonial._id,
            name: testimonial.name,
            image: testimonial.image,
            comment: testimonial.comment,
            status: testimonial.status,
            // Add other fields as needed
        }));

        // Send the paginated testimonials with total count in the response
        return successResponseWithPagination(simplifiedTestimonials, totalItems, 'All testimonials retrieved successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};



exports.updateTestimonial = async (req, res) => {
    try {
        const testimonialId = req.body.id; // Assuming you provide the testimonial ID in the request body
        const newStatus = req.body.status; // Assuming you provide the new status in the request body

        // Query the MongoDB collection to find the testimonial by its ID
        const testimonial = await testimonialModal.findById(testimonialId);

        if (testimonial) {
            // Update the status of the testimonial
            testimonial.status = newStatus;
            await testimonial.save();

            // Send a success response with a message
            return successResponseWithoutData('Testimonial status updated successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('Testimonial not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};



exports.addHalfTextImage = async (req, res) => {
    try {
        // Extract data from the request and create a halfTextImageData object
        const halfTextImageData = {
            image: req.files[0].key, // `req.files[0].location` contains the S3 URL
            image_link: req.body.image_link,
            section_heading: req.body.section_heading,
            heading: req.body.heading,
            sub_heading: req.body.sub_heading,
            text: req.body.text,
            // Add other fields like created_at, updated_at, and status as needed
        };

        // Create a new record in the halfTextImageDataModal
        const newHalfTextImageData = await halfTextImageModal.create(halfTextImageData);

        // Respond with a success message and the created halfTextImageData record
        return successResponse(newHalfTextImageData, "Half Text Image added successfully", res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};



exports.viewHalfTextImage = async (req, res) => {
    try {
        const halfTextImageId = req.query.id; // Assuming you provide the Half Text Image ID as a URL parameter

        // Query the MongoDB collection to retrieve a specific Half Text Image Data by its ID
        const halfTextImageData = await halfTextImageModal.findById(halfTextImageId);

        if (halfTextImageData) {
            // Send the Half Text Image Data as a JSON response
            return successResponse(halfTextImageData, 'Half Text Image Data retrieved successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('Half Text Image Data not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.viewAllHalfTextImageData = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1; // Updated to 0-based index
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Create an aggregation pipeline to filter records with 'active' status, sort, skip, and limit
        const pipeline = [
            { $match: { status: 'active' } }, // Filter records with 'active' status
            { $sort: { _id: -1 } }, // Sort by 'created_at' in descending order
            {
                $facet: {
                    paginatedHalfTextImageData: [
                        { $skip: offset }, // Skip records based on pagination
                        { $limit: parsedLimit }, // Limit the number of records per page
                    ],
                    totalCount: [
                        { $count: 'count' },
                    ],
                },
            },
        ];

        // Execute the aggregation pipeline
        const [result] = await halfTextImageModal.aggregate(pipeline);

        // Extract paginated half text image data and total count from the result
        const paginatedHalfTextImageData = result.paginatedHalfTextImageData;
        const totalItems = paginatedHalfTextImageData.length > 0 ? result.totalCount[0].count : 0;

        // If there is no half text image data, send a custom not found response with a message
        if (paginatedHalfTextImageData.length === 0) {
            return notFoundResponse('No Half Text Image Data found', res);
        }

        // Map the paginated half text image data to a simplified format
        const simplifiedHalfTextImageData = paginatedHalfTextImageData.map((halfTextImage) => ({
            _id: halfTextImage._id,
            section_heading: halfTextImage.section_heading,
            heading: halfTextImage.heading,
            image: halfTextImage.image,
            image_link: halfTextImage.image_link,
            sub_heading: halfTextImage.sub_heading,
            text: halfTextImage.text,
            status: halfstatusImage.text

            // Add other fields as needed
        }));

        // Send the paginated half text image data with total count in the response
        return successResponseWithPagination(simplifiedHalfTextImageData, totalItems, 'All Half Text Image Data retrieved successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.updateHalfTextImage = async (req, res) => {
    try {
        const halfTextImageId = req.body.id; // Assuming you provide the Half Text Image ID in the request body
        const newStatus = req.body.status; // Assuming you provide the new status in the request body

        // Query the MongoDB collection to find the Half Text Image Data by its ID
        const halfTextImageData = await halfTextImageModal.findById(halfTextImageId);

        if (halfTextImageData) {
            // Update the status of the Half Text Image Data
            halfTextImageData.status = newStatus;
            await halfTextImageData.save();

            // Send a success response with a message
            return successResponseWithoutData('Half Text Image Data status updated successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('Half Text Image Data not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.addColumnWithIcon = async (req, res) => {
    try {
        // Extract data from the request and create a columnData object
        const columnData = {
            image: req.files[0].key, // `req.files[0].location` contains the S3 URL
            image_link: req.body.image_link,
            icon_heading: req.body.icon_heading,
            heading: req.body.heading,
            sub_text: req.body.sub_text,
            // Add other fields like created_at, updated_at, and status as needed
        };

        // Create a new record in the columnWithDataModal
        const columnWithIcon = await columnWithDataModal.create(columnData);

        // Respond with a success message and the created columnWithIcon record
        return successResponseWithoutData("Column With Icon added successfully", res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.viewColumnWithIcon = async (req, res) => {
    try {
        const columnWithIconId = req.query.id; // Assuming you provide the `columnWithIcon` ID as a URL parameter

        // Query the MongoDB collection to retrieve a specific `columnWithIcon` data by its ID
        const columnWithIconData = await columnWithDataModal.findById(columnWithIconId);

        if (columnWithIconData) {
            // Send the `columnWithIcon` data as a JSON response
            return successResponse(columnWithIconData, 'Column With Icon Data retrieved successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('Column With Icon Data not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};



exports.viewAllColumnWithIconData = async (req, res) => {
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
            { $match: { status: 'active' } }, // Filter records with 'active' status
            { $sort: { _id: -1 } }, // Sort by 'created_at' in descending order
            { $skip: offset }, // Skip records based on pagination
            { $limit: parsedLimit }, // Limit the number of records per page
        ];

        // Execute the aggregation pipeline
        const allColumnWithIconData = await columnWithDataModal.aggregate(pipeline);

        if (allColumnWithIconData.length > 0) {
            // Send the retrieved `columnWithIcon` data as a JSON response
            return successResponse(allColumnWithIconData, 'All Column With Icon Data retrieved successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('Column With Icon Data not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};



exports.updateColumnWithIcon = async (req, res) => {
    try {
        const columnWithIconId = req.body.id; // Assuming you provide the `columnWithIcon` ID as a URL parameter
        const newStatus = req.body.status; // Assuming you provide the new status in the request body

        // Query the MongoDB collection to find the `columnWithIcon` data by its ID
        const columnWithIconData = await columnWithDataModal.findById(columnWithIconId);

        if (columnWithIconData) {
            // Update the status of the `columnWithIcon` data
            columnWithIconData.status = newStatus;
            await columnWithIconData.save();

            // Send a success response with a message
            return successResponseWithoutData('Column With Icon Data status updated successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('Column With Icon Data not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};



exports.addContent = async (req, res) => {
    try {
        const { type_of_content, message } = req.body;
        let resp;
        // Check if content with the same type_of_content exists
        const existingContent = await contentModal.findOne({ type_of_content });

        if (existingContent) {
            // Update the existing content
            const newContent = {
                type_of_content,
                message,
            };

            resp = await contentModal.findOneAndUpdate({ type_of_content: type_of_content }, newContent, { new: true });
        } else {
            // Create new content

            const newContent = {
                message,
                type_of_content
            };
            resp = await contentModal.create(newContent);
        }
        return successResponse(resp, "Content created successfully", res);

    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.contentList = async (req, res) => {
    try {
        const { type_of_content } = req.query;

        // Query the MongoDB database to find content matching the provided criteria
        const data = await contentModal.findOne({
            type_of_content
        });

        if (data) {
            return successResponse(data, "Content created successfully", res);
        } else {
            return notFoundResponse('No content found', res);
        }
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.addCategory = async (req, res) => {
    try {

        const { name } = req.body;
        // Check if 'image' is present in the files
        if (!req.files || Object.keys(req.files).length === 0) {
            return requiredIdResponse('Image is required.', res);
        }

        // const image = req.files[0].location
        const image = req.files[0].key;

        const errorMessage = !name && 'Name is required.';

        if (errorMessage) {
            return requiredIdResponse(errorMessage, res);
        }
        // Create a new category document
        const newCategory = new categoryModal({
            name,
            image
        });

        // Save the new category to the database
        await newCategory.save();
        return successResponse(newCategory, 'Category added successfully', res);
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.editCategory = async (req, res) => {
    try {
        const { categoryId, name, image } = req.body;

        const errorMessage = (!name && 'Name is required.') || (!categoryId && 'categoryId is required.');

        if (errorMessage) {
            return requiredIdResponse(errorMessage, res);
        }
        // Check if 'image' is present in the files
        // if (!req.files || Object.keys(req.files).length === 0) {
        //     return requiredIdResponse('Image is required.', res);
        // }

        // const image = req.files[0].location;

        // Update a category document
        const editCategory = await categoryModal.findByIdAndUpdate(
            categoryId,
            { name, image, updated_at: new Date(), },
            { new: true }
        );
        return successResponse(editCategory, 'Category updated successfully', res);
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        // Aggregation pipeline to filter active categories and sort them by 'order' in ascending order
        const pipeline = [
            { $match: { status: 'active' } }, // Match only active categories
            { $sort: { order: 1 } }, // Sort categories by 'order' field in ascending order
            {
                $project: {
                    _id: 1,
                    name: 1,
                    image: 1,
                    status: 1,
                    order: 1
                },
            },
        ];

        // Execute the aggregation pipeline
        const categories = await categoryModal.aggregate(pipeline);

        // Check if no categories were found
        if (categories.length === 0) {
            return notFoundResponse('No categories found', res);
        }

        for (let i = 0; i < categories.length; i++) {
            if (categories[i].image) {
                const isUrl = await common.isValidUrl(categories[i].image);
                if (isUrl) {
                    const bucketName = await common.checkBucketName(categories[i].image);
                    categories[i].image = bucketName === process.env.USER_MEDIA_BUCKET ? await common.fetchS3file(categories[i].image, process.env.USER_MEDIA_BUCKET) : categories[i].image;
                } else {
                    categories[i].image = await common.fetchS3fileByKey(categories[i].image, process.env.USER_MEDIA_BUCKET);
                }
            }
        }
        // Return the found categories with a success response
        return successResponse(categories, 'Categories retrieved successfully', res);
    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error fetching categories:', error);

        // Return an internal server error response
        return internalServerError('Internal Server Error', res);
    }
};

exports.getCategory = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { id } = req.query;

        // Execute the find query on the basis of id
        const categories = await categoryModal.findOne({ status: 'active', _id: id });

        // Check if there is any category
        if (categories) {
            let checkUrl = await common.isValidUrl(categories.image)
            if (checkUrl) {
                categories.image = await common.fetchS3file(categories.image, process.env.USER_MEDIA_BUCKET)
            } else {
                categories.image = await common.fetchS3fileByKey(categories.image, process.env.USER_MEDIA_BUCKET)
            }
            // Send the list of categories as a JSON response
            return successResponse(categories, 'Category retrieved successfully', res);
        } else {
            // Send a message if no categories are found
            return notFoundResponse('No categories found', res);
        }
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.updateCategoryStatus = async (req, res) => {
    try {
        // Extract body parameters from the request
        const { id, status } = req.body;

        // Update the status 
        const categories = await categoryModal.findByIdAndUpdate({ _id: id }, {
            status
        }, { new: true });

        return successResponse(categories, 'Category status updated successfully', res);

    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.addFaq = async (req, res) => {
    try {
        // Count the existing legal documents to determine the next order value
        const faqCount = await faqModal.countDocuments();

        let admin = await adminModal.findById(({ _id: req.payload._id }))
        // Extract data from the request
        const { question, answer, section_description, section_heading, title, category, delta_text } = req.body;

        // Convert category to array of ObjectIds
        const categoryIds = category.map(id => toObjectId(id));

        // Create a new FAQ document
        const newFAQ = new faqModal({
            question,
            answer,
            section_description,
            section_heading,
            title,
            order: faqCount + 1, // Set the order based on the count of existing documents
            type: admin.type,
            category: categoryIds, // Assuming you provide the category ID in the request body
            delta_text: delta_text
        });

        // Save the new FAQ to the database
        await newFAQ.save();

        // Respond with a success message and the created FAQ record
        return successResponseWithoutData('FAQ added successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.editFaq = async (req, res) => {
    try {

        let admin = await adminModal.findById(({ _id: req.payload._id }))

        // Extract data from the request
        const { id, question, answer, section_description, section_heading, title, category, delta_text } = req.body;

        // Convert category to array of ObjectIds
        const categoryIds = category.map(id => toObjectId(id));

        // Find and update the FAQ in the database
        const updatedFaq = await faqModal.findByIdAndUpdate(
            id,
            {
                $set: {
                    question,
                    answer,
                    section_description,
                    section_heading,
                    title,
                    type: admin.type,
                    category: categoryIds,
                    delta_text: delta_text
                },
            },
            { new: true }
        );

        // Check if the FAQ was found and updated
        if (!updatedFaq) {
            return notFound('FAQ not found', res);
        }

        // Respond with a success message and the updated FAQ
        return successResponseWithoutData('FAQ updated successfully', res);
    } catch (error) {
        // Log the specific error message
        console.error('Error updating FAQ:', error);
        // Respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.viewFAQ = async (req, res) => {
    try {
        // Extract the FAQ ID from the request parameters
        const faqId = req.query.id;

        // Query the database to find the FAQ by its ID with active or inactive status
        const faqData = await faqModal.findOne({ _id: faqId, status: { $in: ["active", "inactive"] } });

        if (faqData) {
            // Send the FAQ data as a JSON response
            return successResponse(faqData, 'FAQ retrieved successfully', res);
        } else {
            // Send a custom not found response with a message
            return notFoundResponse('FAQ not found', res);
        }
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.deleteFaq = async (req, res) => {
    try {
        const faqId = req.body.id;

        // Check if the FAQ with the provided ID exists
        const existingFaq = await faqModal.findById(faqId);
        if (!existingFaq) {
            return notFoundResponse('FAQ not found', res);
        }

        // Update the status to "delete" using findByIdAndUpdate
        await faqModal.findByIdAndUpdate(faqId, { status: 'delete' });

        // Respond with a success message
        return successResponseWithoutData('FAQ deleted successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error, 'error');
        return internalServerError('Internal Server Error', res);
    }
};

exports.viewAllFAQs = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { search, type, category } = req.query;

        // Construct the Mongoose query
        const filter = { status: { $in: ["active", "inactive"] } }; // Initialize the filter with status condition

        // Check if a search query parameter is provided and add it to the filter
        if (search && search !== 'null') {
            const questionRegex = new RegExp(search, 'i');
            filter.$or = [
                { question: questionRegex },
                { title: questionRegex }
            ];
        }

        // Check if a type query parameter is provided and add it to the filter
        if (type && type !== 'null') {
            filter.type = type;
        }

        // Check if a category query parameter is provided and add it to the filter
        if (category && category !== 'null') {
            const categoryDoc = await categoryModal.findOne({ name: category });
            if (categoryDoc) {
                filter.category = categoryDoc._id;
            } else {
                return notFoundResponse('Category not found', res);
            }
        }

        // Perform a find query to retrieve FAQs with the constructed filter
        const faqs = await faqModal.find(filter)
            .sort({ order: 1 }) // Sort by 'order' in ascending order
            .populate({
                path: 'category',
                model: 'category',
                select: 'name' // Choose the fields you want to populate from the referenced collection
            });

        // Format the result to include category names
        const result = faqs.map((item) => ({
            _id: item._id,
            question: item.question,
            answer: item.answer,
            section_description: item.section_description,
            section_heading: item.section_heading,
            title: item.title,
            categoryNames: item.category.map((cat) => cat.name), // Include all category names
            created_at: item.created_at,
            updated_at: item.updated_at,
            type: item.type,
            status: item.status,
            order: item.order,
            delta_text: item.delta_text
        }));

        // Send the FAQ data as a JSON response
        return successResponse(result, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error('Error fetching FAQs:', error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.updateFaqStatus = async (req, res) => {
    try {
        // Extract the Faq document ID and new status from the request
        const { _id, status } = req.body;

        // Find the Faq document by ID and update its status
        const updatedLegal = await faqModal.findByIdAndUpdate(
            _id,
            { status },
            { new: true } // Return the updated document
        );

        // Check if the Faq document was found and updated
        if (!updatedLegal) {
            return notFoundResponse('Faq document not found', res);
        }

        // Return a success response with the updated document
        return successResponseWithoutData('Faq status updated successfully', res);

    } catch (error) {
        console.error('Error updating Faq status:', error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.addMembership = async (req, res) => {
    try {
        // Extract data from request body
        const { name, bannerTag, content, text, preorder, highlightsArray } = req.body;

        // Create a new membership document
        const membership = new membershipModal({
            name, content, text, preorder, highlightsArray: highlightsArray || [], // Set to empty array if not provided
        });

        // Save the new membership to the database
        await membership.save();
        return successResponseWithoutData('Membership added successfully', res);
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.editMembership = async (req, res) => {
    try {
        const { name, bannerTag, content, text, preorder, highlightsArray } = req.body;
        const membershipId = req.body.id; // Assuming you pass the membership ID as a parameter

        // Fetch the current membership
        const currentMembership = await membershipModal.findById(membershipId);

        // If the membership doesn't exist, return an error
        if (!currentMembership) {
            return notFoundError('Membership not found.', res);
        }

        // Check if the membership type requires text
        if ((currentMembership.type === 1 || currentMembership.type === 2) && (!text || text.trim() === '')) {
            return failMessage('Text key should not be empty for membership', res);
        }
        // Update the membership fields
        currentMembership.name = name || currentMembership.name; // Keep the existing name if not provided
        currentMembership.content = content; // Keep the existing content if not provided
        currentMembership.text = text; // Keep the existing text if not provided
        currentMembership.preorder = preorder || currentMembership.preorder; // Keep the existing preorder if not provided
        currentMembership.bannerTag = bannerTag; // Keep the existing bannerTag if not provided

        if (highlightsArray) {
            currentMembership.highlightsArray = highlightsArray; // Update highlightsArray if provided
        }

        // Save the updated membership to the database
        await currentMembership.save();

        return successResponseWithoutData('Membership updated successfully', res);
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.editDowngradeCard = async (req, res) => {
    try {
        const { downgradeArray, downgradeText, name } = req.body;
        const membershipId = req.body.id; // Assuming you pass the membership ID as a parameter

        // Fetch the current membership
        const currentMembership = await membershipModal.findById(membershipId);

        // If the membership doesn't exist, return an error
        if (!currentMembership) {
            return notFoundError('Membership not found.', res);
        }

        // Update the membership fields
        currentMembership.downgradeText = downgradeText || currentMembership.downgradeText; // Keep the existing downgradeText if not provided
        currentMembership.name = name || currentMembership.name; // Keep the existing name if not provided

        if (downgradeArray) {
            currentMembership.downgradeArray = downgradeArray; // Update downgradeArray if provided
        }

        // Save the updated membership to the database
        await currentMembership.save();

        return successResponseWithoutData('Membership updated successfully', res);
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.setMembershipPreorder = async (req, res) => {
    try {
        const { preorderOn } = req.body;

        // Update the current memberships
        await membershipModal.updateMany({
            $set: { preorderOn: preorderOn }
        })
        return successResponseWithoutData('Membership preorder updated successfully', res);
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.addPrice = async (req, res) => {
    try {
        const currentDate = new Date();
        const { type, schedule_prices, membership, items, boutique, delete_ids } = req.body;

        const findMembership = await membershipModal.findOne({ type: 1 });
        const findBoutique = await boutiqueModal.findOne({ _id: boutique });

        // Convert delete_ids to an array if it's a string and deactivate specified prices
        if (delete_ids) {
            const deleteObjectIds = delete_ids.split(',').map(id => toObjectId(id));
            await priceModal.updateMany({ _id: { $in: deleteObjectIds } }, { $set: { status: 'inactive' } });
        }

        const processedPrices = [];

        // Loop through schedule prices and process each entry
        for (const schedulePrice of schedule_prices) {
            const { _id, price, initiationFees, effectiveDate, effectiveEndDate, discount_price, no_of_month } = schedulePrice;

            // Check for existing price conflicts
            const existingPrice = await priceModal.findOne({
                _id: { $ne: _id },
                effectiveDate,
                type,
                boutique: boutique || null,
                membership: membership || null,
                items: items || null
            });

            if (existingPrice) {
                const conflictFields = [];
                if (existingPrice.boutique) conflictFields.push('boutique');
                if (existingPrice.membership) conflictFields.push('membership');
                if (existingPrice.items) conflictFields.push('items');

                const conflictMessage = `Price with the same effective date, type, and conflicting ${conflictFields.join(', ')} already exists.`;
                return randomResponse(conflictMessage, res);
            }

            let priceValue = price;
            if (type === 'boutique' && findBoutique.gift_card === true) {
                // Fetch the most recent active membership price for calculations
                const membershipPrice = await priceModal.findOne({
                    status: "active",
                    membership: findMembership._id,
                    effectiveDate: { $lte: currentDate },
                    $or: [
                        { effectiveEndDate: null },
                        { effectiveEndDate: { $gt: currentDate } }
                    ]
                }).sort({ effectiveDate: -1 }).limit(1);

                if (membershipPrice) {
                    priceValue = (Number(membershipPrice.price) * Number(no_of_month)) - Number(discount_price);
                } else {
                    return notFoundResponse('Membership price not found', res);
                }
            }

            // Update existing price or create a new one
            const priceData = {
                effectiveDate,
                price: priceValue,
                initiationFees,
                no_of_month,
                discount_price,
                membership: type === 'membership' ? membership : undefined,
                items: type === 'item' ? items : undefined,
                boutique: type === 'boutique' ? boutique : undefined,
                type,
                effectiveEndDate
            };

            let updatedPrice;
            if (_id) {
                updatedPrice = await priceModal.findOneAndUpdate({ _id }, { $set: priceData }, { new: true });
            } else {
                updatedPrice = new priceModal(priceData);
                await updatedPrice.save();
            }
            processedPrices.push(updatedPrice);
        }
        await userMembershipModal.updateMany(
            {
                status: 'active',
                is_activate: true,
                type: 2
            },
            { $set: { price_updated: true } },
            { new: true }
        );

        // If no conflict occurred, send success response
        return successResponse(processedPrices, 'Prices added/updated successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.editPrice = async (req, res) => {
    try {
        const { price, initiationFees, effectiveDate, effectiveEndDate, id, type } = req.body;

        // Fetch the current price document
        const currentPrice = await priceModal.findById(id);
        if (!currentPrice) {
            return notFoundResponse('Price not found.', res);
        }

        // Get the existing effective date and effective end date
        const existingEffectiveDate = currentPrice.effectiveDate;
        const existingEffectiveEndDate = currentPrice.effectiveEndDate;

        // Validate the effective date based on the type
        const currentDate = new Date();

        if (type === 'boutique') {
            // Handle boutique price updates
            if (currentDate < new Date(existingEffectiveDate) || currentDate > new Date(existingEffectiveEndDate)) {
                currentPrice.price = price;
                // currentPrice.initiationFees = initiationFees;
                // currentPrice.effectiveDate = effectiveDate;
                // currentPrice.effectiveEndDate = effectiveEndDate;
            } else {
                return notFoundResponse('You cannot update the price within the effective date range.', res);
            }
        } else if (type === 'membership' || type === 'item') {
            // Handle membership and item price updates (similar to the previous logic)
            if (new Date(existingEffectiveDate) < currentDate) {
                currentPrice.price = price;
                if (initiationFees !== undefined) {
                    currentPrice.initiationFees = initiationFees;
                }
                // currentPrice.effectiveDate = effectiveDate;
            } else {
                return notFoundResponse('You cannot update the price before the effective date.', res);
            }
        } else {
            // Handle unknown or unsupported types
            return notFoundResponse('Unsupported type.', res);
        }

        // Save the updated price document
        await currentPrice.save();
        return successResponse(currentPrice, 'Price updated successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.updatePriceStatus = async (req, res) => {
    try {
        const { id, status } = req.body;

        // Find the Price by ID
        const price = await priceModal.findById({ _id: id, status: 'active' });

        if (!price) return notFoundResponse('Price not found', res);

        // Update the status of the Price
        price.status = status;

        // Save the updated Price to the database
        await price.save();

        // Return a success response with the updated Price
        return successResponseWithoutData('Price status updated successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};


exports.priceHistory = async (req, res) => {
    try {
        // Extract the item ID, type, skip, and limit from the request parameters
        const { id, type, skip = 1, limit = 10 } = req.query;
        let currentDate = new Date();

        // Define a mapping of type to the corresponding key
        const typeToKey = {
            1: 'membership',
            2: 'items',
            3: 'boutique'
        };

        // Determine the key based on the type, default to 'membership' if type is not recognized
        const key = typeToKey[type] || 'membership';

        // Calculate the skip value for pagination
        const page = (skip - 1) * limit;
        // Fetch prices with "active" status for the specified item, select specific fields, and apply pagination
        const prices = await priceModal
            .find({
                [key]: id,
                effectiveDate: { $lte: currentDate } // Add this condition to the filter
            }, 'effectiveDate effectiveEndDate price membership initiationFees status no_of_month discount_price createdAt')
            .skip(page)
            .limit(limit)
            .sort({ effectiveDate: -1 }) // Correct the field name to match the one in the projection
            .exec(); // Execute the query
        const totalCount = await priceModal.countDocuments({
            [key]: id,
            effectiveDate: { $lte: currentDate }
        });

        // Return a "Success" response with the active price history data for the specified item and pagination information
        return successResponseWithPagination(prices, totalCount, 'Price history successfully retrieved', res);
    } catch (error) {
        console.error(error);

        // Handle and return an "Internal Server Error" response for unexpected errors
        return internalServerError('Internal Server Error', res);
    }
};
exports.viewMembership = async (req, res) => {
    try {
        // Extract the membership ID from the request parameters
        const membershipId = req.query.id;

        // Query the database to find the membership by its ID
        const membershipData = await membershipModal.findOne({ _id: membershipId, status: 'active' });
        if (!membershipData) {
            return notFoundResponse('Membership not found', res);
        }

        // Get the current date and time in UTC
        const currentDate = new Date();

        // Fetch all active shortcodes
        const shortCodes = await shortCodeModal.find({ status: 'active' });

        // Prepare to store updated highlights
        const updatedHighlights = [...membershipData.highlightsArray];

        // Fetch sorted prices and other data as previously defined
        const sortedPrices = await priceModal.find({
            status: 'active',
            membership: membershipData._id,
            effectiveDate: { $gte: currentDate }
        }).sort({ effectiveDate: 1 });

        const prices = await priceModal.find({
            status: 'active',
            membership: membershipId,
            effectiveDate: { $lte: currentDate },
            $or: [
                { effectiveEndDate: null },
                { effectiveEndDate: { $gt: currentDate } }
            ]
        }).sort({ effectiveDate: -1 });

        let initiationFees = "";
        let priceValue = "";
        let smallestDiscount = null;

        if (membershipData.type == 1 || membershipData.type == 2) {
            if (!prices || prices.length === 0) {
                return notFoundResponse('Price not found', res);
            }

            const currentPrice = prices[0];
            priceValue = currentPrice.price;
            initiationFees = currentPrice.initiationFees;

            // Check for active discounts
            const activeDiscounts = await discountModal.find({
                membership_id: membershipId,
                status: 'active',
                $or: [
                    { start_date: { $lte: currentDate }, end_date: { $gte: currentDate } },
                    { start_date: { $lte: currentDate }, end_date: null }
                ]
            }).sort({ start_date: -1 });

            smallestDiscount = await common.findSmallestDiscount(activeDiscounts);
        }

        // Create a mapping of response keys to their corresponding values
        const responseKeyMapping = {
            initiationFees: initiationFees?.toString() || "",
            latestPrice: priceValue?.toString() || "",
            discountInitiationFees: smallestDiscount?.initiation_fees || "",
            discountPrice: smallestDiscount?.smallestDiscount?.discount_price || "",
            usedSeats: smallestDiscount?.smallestDiscount?.used_seats || 0,
        };

        // Process highlights inline with multiple replacements within a single shortCodeName
        const finalHighlights = [];
        for (const highlight of updatedHighlights) {
            let newHighlight = highlight.highlight;

            for (const shortCode of shortCodes) {
                if (newHighlight.includes(shortCode.shortCodeName)) {
                    let combinedValues = '';

                    // Iterate over each detail in the details array
                    for (const detail of shortCode.details) {
                        let replacementValue = '';

                        if (detail.tableName === 'unused') {
                            // Use the pre-mapped values if they exist in the responseKeyMapping
                            if (responseKeyMapping.hasOwnProperty(detail.keyName)) {
                                replacementValue = responseKeyMapping[detail.keyName] || '0';
                            }
                        } else {
                            try {
                                const modelPath = path.join('../', detail.tableName);
                                const Model = require(modelPath);
                                // Fetch the required data from the database model
                                const data = await Model.findOne({ membership: membershipId });
                                if (data && data[detail.keyName]) {
                                    replacementValue = data[detail.keyName] || '0';
                                } else {
                                    console.log(`Data not found for model  ${detail.tableName} and ID ${detail.value}`);
                                }
                            } catch (error) {
                                console.error(`Error loading model or querying data for table ${detail.tableName}:`, error);
                            }
                        }

                        // Append the replacement value for each detail with a space if needed
                        combinedValues += replacementValue + ' ';
                    }

                    // Trim any extra space at the end
                    combinedValues = combinedValues.trim();

                    // Replace the shortCodeName with the concatenated values in the newHighlight string
                    newHighlight = newHighlight.replace(shortCode.shortCodeName, combinedValues);
                }
            }

            const updatedHighlight = {
                highlight: newHighlight,
                strikeThroughHighlight: highlight.strikeThroughHighlight,
                check: highlight.check,
                _id: highlight._id
            };

            finalHighlights.push(updatedHighlight);
        }


        // Create the response object
        const responseObj = {
            _id: membershipData._id,
            name: membershipData.name,
            noOfSeats: membershipData.noOfSeats,
            content: membershipData.content,
            text: membershipData.text,
            bannerTag: membershipData.bannerTag,
            type: membershipData.type,
            highlightsArray: membershipData.highlightsArray,
            downgradeArray: membershipData.downgradeArray,
            downgradeText: membershipData.downgradeText,
            preorderOn: membershipData.preorderOn,
            status: membershipData.status,
            createdAt: membershipData.createdAt,
            updatedAt: membershipData.updatedAt,
            initiationFees: initiationFees?.toString() || "",
            latestPrice: priceValue?.toString() || "",
            discountInitiationFees: smallestDiscount?.initiation_fees || "",
            discountPrice: smallestDiscount?.smallestDiscount?.discount_price || "",
            usedSeats: smallestDiscount?.smallestDiscount?.used_seats || 0,
            schedule_prices: sortedPrices || []
        };

        return successResponse(responseObj, 'Membership Retrieved Successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};
// exports.viewMembership = async (req, res) => {
//     try {
//         // Retrieve membership data from the MembershipModel
//         const membershipData = await membershipModal.findById(req.query.id);

//         if (!membershipData) {
//             return notFoundMessage('Membership not found', res);
//         }

//         // Retrieve price data associated with the membership from the PriceModel
//         const priceData = await priceModal.find({ membership: membershipData._id, status: 'active' });

//         // Sort the prices based on the effectiveDate in descending order
//         const sortedPrices = priceData
//             // Filter only active prices
//             .filter(price => price.status === 'active')
//             // Sort the prices by effective date in descending order
//             .sort((a, b) => moment(b.effectiveDate).diff(moment(a.effectiveDate)));

//         // Construct the formatted response
//         const response = {
//             _id: membershipData._id,
//             name: membershipData.name,
//             content: membershipData.content,
//             text: membershipData.text,
//             created_at: membershipData.created_at,
//             updated_at: membershipData.updated_at,
//             status: membershipData.status,
//             highlightsArray: membershipData.highlightsArray || [],
//             schedule_prices: sortedPrices || [],
//         };

//         return successResponse(response, 'Membership Retrieved Successfully', res);
//     } catch (error) {
//         console.error(error);
//         return internalServerError('Internal Server Error.', res);
//     }
// };


exports.viewAllMemberships = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1;
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Use countDocuments to get the total count
        const totalCount = await membershipModal.countDocuments();

        // Retrieve only active memberships with pagination
        let memberships = await membershipModal.find({})
            .skip(offset)
            .limit(parsedLimit);

        // Get details of prices for the active memberships
        const membershipIds = memberships.map(membership => membership._id);
        const membershipDetails = await priceModal.find({ membership: { $in: membershipIds } }, 'membership effectiveDate initiationFees price').lean();

        // Check if no active memberships were found
        if (!memberships || memberships.length === 0) {
            return emptyResponse(memberships, res);
        }
        // Process the membership details to get the desired response
        const processedMemberships = memberships.map(membership => {
            // Filter current and next details for the membership
            const currentDetails = membershipDetails
                .filter(detail => detail.membership.equals(membership._id) && detail.effectiveDate <= new Date())
                .sort((a, b) => b.effectiveDate - a.effectiveDate);

            const nextDetails = membershipDetails
                .filter(detail => detail.membership.equals(membership._id) && detail.effectiveDate > new Date())
                .sort((a, b) => a.effectiveDate - b.effectiveDate);

            // Extract relevant information
            const currentPrice = currentDetails.length > 0 ? currentDetails[0].price : '';
            const initiationFees = currentDetails.length > 0 ? currentDetails[0].initiationFees : '';
            const nextCurrentPrice = nextDetails.length > 0 ? nextDetails[0].price : '';
            const nextInitiationFees = nextDetails.length > 0 ? nextDetails[0].initiationFees : '';
            const effectiveDate = nextDetails.length > 0 ? nextDetails[0].effectiveDate : '';

            return {
                _id: membership._id,
                name: membership.name,
                status: membership.status,
                currentPrice: currentPrice,
                initiationFees: initiationFees,
                nextCurrentPrice: nextCurrentPrice,
                nextInitiationFees: nextInitiationFees,
                effectiveDate: effectiveDate
            };
        });

        // Return a success response with pagination details
        return successResponseWithPagination(processedMemberships, totalCount, 'Data Fetched Successfully.', res, parsedSkip, parsedLimit);
    } catch (error) {
        // Handle and log any internal server error
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};



exports.updateMembership = async (req, res) => {
    try {
        const membershipId = req.body.id;
        const updates = req.body; // Assuming you send the updates in the request body

        // Find the membership by ID and update it
        const updatedMembership = await membershipModal.findByIdAndUpdate(
            membershipId,
            updates,
            { new: true } // To return the updated membership
        );
        if (!updatedMembership) {
            return notFoundResponse('membership not found', res);
        }
        return successResponseWithoutData('Membership status updated successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.addItems = async (req, res) => {
    try {
        const { name, gst } = req.body;

        // Create a new membership document
        const items = new itemModal({
            name,
            gst
        });
        // Save the new membership to the database
        await items.save();
        return successResponseWithoutData('Items added successfully', res);
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


// exports.viewItem = async (req, res) => {
//     try {
//         // Get the itemId from the request parameters
//         const itemId = req.query.id;

//         // Find the item by its _id and ensure it is active
//         const item = await itemModal.findOne({ _id: itemId, status: 'active' });

//         // Check if the item is not found or not active
//         if (!item) {
//             return notFoundResponse('Item not found or not active', res);
//         }

//         const currentDate = new Date(); // Get the current date and time

//         const itemPrice = await priceModal.findOne({
//             items: itemId,
//             effectiveDate: { $lte: currentDate }, // Find the prices effective before or on the current date
//         })
//             .sort({ effectiveDate: -1 }) // Sort in descending order to get the latest effective date first
//             .limit(1);

//         // If no price is found for the current date or earlier, get the latest price overall
//         const fallbackPrice = await priceModal.findOne({ items: itemId })
//             .sort({ effectiveDate: -1 })
//             .limit(1);

//         // Create a response object
//         const responseObj = {
//             ...item.toObject(),
//             initiationFees: itemPrice?.initiationFees?.toString() || "",
//             latestPrice: itemPrice?.price?.toString() || fallbackPrice?.price?.toString() || "", // Use the fallbackPrice if itemPrice is not available
//         };

//         // Return a success response with the item's data
//         return successResponse(responseObj, 'Item fetched successfully', res);
//     } catch (error) {
//         // Handle errors and respond with an internal server error message
//         console.error(error);
//         return internalServerError('Internal Server Error', res);
//     }
// };


exports.viewItem = async (req, res) => {
    try {
        const currentDate = new Date(); // Get the current date and time
        // Get the itemId from the request parameters
        const itemId = req.query.id;

        // Find the item by its _id and ensure it is active
        const item = await itemModal.findOne({ _id: itemId });

        // Check if the item is not found or not active
        if (!item) {
            return notFoundResponse('Item not found or not active', res);
        }

        // // Retrieve price data associated with the item from the PriceModel
        // const priceData = await priceModal.find({ items: item._id, status: 'active' });

        // // Sort the prices based on the effectiveDate in descending order
        // const sortedPrices = priceData
        //     // Filter only active prices
        //     .filter(price => price.status === 'active')
        //     // Sort the prices by effective date in descending order
        //     .sort((a, b) => moment(b.effectiveDate).diff(moment(a.effectiveDate)));
        // Get the current date and time in UTC

        // Sort the prices based on the effectiveDate in descending order
        const sortedPrices = await priceModal.find({
            status: "active",
            items: item._id,
            effectiveDate: { $gte: currentDate }
        }).sort({ effectiveDate: 1 });

        // Construct the formatted response
        const response = {
            _id: item._id,
            name: item.name,
            flash_sale: item.flash_sale,
            sale_start_date_time: item.sale_start_date_time,
            sale_end_date_time: item.sale_end_date_time,
            discount_price: item.discount_price,
            created_at: item.created_at,
            updated_at: item.updated_at,
            status: item.status,
            schedule_prices: sortedPrices || []
        };

        // Return a success response with the item's data
        return successResponse(response, 'Item fetched successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.editItem = async (req, res) => {
    try {
        // Extract itemId and name from the request body
        const { id, name, gst } = req.body;

        // Update the item's name by its itemId and retrieve the updated item
        const item = await itemModal.findByIdAndUpdate(
            id,
            { name, gst },
            { new: true }
        );

        // Check if the item is not found
        if (!item) {
            return notFoundResponse('Item not found', res);
        }

        // Return a success response with the updated item's data
        return successResponseWithoutData('Item updated successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.updateItemStatus = async (req, res) => {
    try {
        // Update the item's status by its itemId and retrieve the updated item
        const item = await itemModal.findByIdAndUpdate(
            req.body.id,
            { status: req.body.status },
            { new: true }
        );

        // Check if the item is not found
        if (!item) {
            return notFoundResponse('Item not found', res);
        }

        // Return a success response with the updated item's data
        return successResponseWithoutData('Item status updated successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.viewAllItems = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1;
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Use countDocuments to get the total count
        const totalCount = await itemModal.countDocuments({ status: 'active' });

        // Retrieve only active items with pagination
        let items = await itemModal.find({})
            .skip(offset)
            .limit(parsedLimit);

        // Get details of prices for the active items
        const itemIds = items.map(item => item._id);
        const itemDetails = await priceModal.find({ items: { $in: itemIds }, status: 'active' }, 'items effectiveEndDate effectiveDate initiationFees price').lean();

        // Check if no items were found
        if (!items || items.length === 0) {
            return emptyResponse(items, res);
        }

        // Process the item details to get the desired response
        const processedItems = items.map(item => {
            const currentDetails = itemDetails
                .filter(detail => detail.items.equals(item._id) && detail.effectiveDate <= new Date())
                .sort((a, b) => b.effectiveDate - a.effectiveDate)[0];

            const nextDetails = itemDetails
                .filter(detail => detail.items.equals(item._id) && detail.effectiveDate > new Date())
                .sort((a, b) => a.effectiveDate - b.effectiveDate)[0];

            const currentPrice = currentDetails ? currentDetails.price : '';
            const initiationFees = currentDetails ? currentDetails.initiationFees : '';
            const nextCurrentPrice = nextDetails ? nextDetails.price : '';
            const nextInitiationFees = nextDetails ? nextDetails.initiationFees : '';
            const effectiveDate = currentDetails ? currentDetails.effectiveDate : '';
            const effectiveEndDate = currentDetails ? currentDetails.effectiveEndDate : '';
            const nextEffectiveDate = nextDetails ? nextDetails.effectiveDate : '';
            const nextEffectiveEndDate = nextDetails ? nextDetails.effectiveEndDate : '';

            return {
                _id: item._id,
                name: item.name, // Replace 'name' with the actual field in your item document
                status: item.status,
                currentPrice: currentPrice,
                initiationFees: initiationFees,
                nextCurrentPrice: nextCurrentPrice,
                nextInitiationFees: nextInitiationFees,
                effectiveDate: effectiveDate,
                effectiveEndDate: effectiveEndDate,
                nextEffectiveDate: nextEffectiveDate,
                nextEffectiveEndDate: nextEffectiveEndDate
            };
        });

        // Return a success response with pagination details
        return successResponseWithPagination(processedItems, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle and log any internal server error
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.addBoutiqueItem = async (req, res) => {
    try {
        const { name, card_title, card_content, product_set, no_of_month,
            membership, is_month, gift_card, discount_price } = req.body;

        // Create a new Boutique item with the provided data
        const newBoutiqueItem = new boutiqueModal({
            name,
            card_title,
            card_content,
            product_set,
            no_of_month,
            is_month,
            gift_card,
            membership,
            discount_price
        });

        // Save the new Boutique item to the database
        let response = await newBoutiqueItem.save();

        // Return a success response with the created Boutique item
        return successResponse(response, 'Boutique item added successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};


exports.editBoutiqueItem = async (req, res) => {
    try {
        const { id, name, card_title, card_content, product_set, no_of_month,
            membership, is_month, gift_card, discount_price } = req.body;

        // Find the Boutique item by ID
        const boutiqueItem = await boutiqueModal.findOne({ _id: id, status: 'active' });

        if (!boutiqueItem) return notFoundResponse('Boutique item not found', res);

        // Update the Boutique item fields
        boutiqueItem.name = name;
        boutiqueItem.card_title = card_title;
        boutiqueItem.card_content = card_content;
        boutiqueItem.product_set = product_set;
        boutiqueItem.no_of_month = no_of_month;
        boutiqueItem.membership = membership;
        boutiqueItem.is_month = is_month;
        boutiqueItem.discount_price = discount_price;
        boutiqueItem.gift_card = gift_card;

        // Save the updated Boutique item to the database
        await boutiqueItem.save(); // Use save() on the instance

        // Return a success response with the updated Boutique item
        return successResponseWithoutData('Boutique item updated successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};


// exports.getBoutiqueItem = async (req, res) => {
//     try {
//         const boutiqueId = req.query.id; // Assuming you pass the Boutique item ID as a parameter

//         // Find the Boutique item by ID
//         const boutiqueItem = await boutiqueModal.findById({ _id: boutiqueId, status: 'active' });

//         if (!boutiqueItem) return notFoundResponse('Boutique item not found', res);

//         const currentDate = new Date(); // Get the current date and time

//         // Check if all effective end dates have passed for the given boutique item
//         const allPricesExpired = await priceModal.countDocuments({
//             boutique: boutiqueId,
//             effectiveEndDate: { $gte: currentDate }, // Check if any price has an end date greater than or equal to the current date
//         }) === 0;

//         if (allPricesExpired) {
//             return notFoundResponse('All prices for the Boutique item have expired', res);
//         }

//         // Find the latest effective price for the given boutique item
//         const boutiquePrice = await priceModal.findOne({
//             boutique: boutiqueId,
//             effectiveDate: { $lte: currentDate },
//             effectiveEndDate: { $gte: currentDate }, // Ensure the current date is within the effective date range
//         })
//             .sort({ effectiveDate: -1 }) // Sort in descending order to get the latest effective date first
//             .limit(1);

//         // If no price is found for the current date or earlier, get the latest price overall
//         const fallbackPrice = await priceModal.findOne({ boutique: boutiqueId })
//             .sort({ effectiveDate: -1 })
//             .limit(1);

//         // Create a response object
//         const responseObj = {
//             ...boutiqueItem.toObject(),
//             initiationFees: boutiquePrice?.initiationFees?.toString() || "",
//             latestPrice: boutiquePrice?.price?.toString() || fallbackPrice?.price?.toString() || "", // Use the fallbackPrice if itemPrice is not available
//         };

//         // Return a success response with the Boutique item
//         return successResponse(responseObj, 'Boutique Item fetched successfully', res);

//     } catch (error) {
//         console.error(error);
//         // Handle and respond with an internal server error message
//         return internalServerError('Internal Server Error', res);
//     }
// };


exports.getBoutiqueItem = async (req, res) => {
    try {
        const boutiqueId = req.query.id; // Assuming you pass the Boutique item ID as a parameter

        // Find the Boutique item by ID
        const boutiqueItem = await boutiqueModal.findOne({ _id: boutiqueId, status: { $in: ['active', 'inactive'] } });

        if (!boutiqueItem) return notFoundResponse('Boutique item not found', res);

        const currentDate = new Date(); // Get the current date and time

        // Check if all effective end dates have passed for the given boutique item
        // const allPricesExpired = await priceModal.countDocuments({
        //     boutique: boutiqueId,
        //     effectiveEndDate: { $gte: currentDate }, // Check if any price has an end date greater than or equal to the current date
        // }) === 0;

        // if (allPricesExpired) {
        //     return notFoundResponse('All prices for the Boutique item have expired', res);
        // }

        // Retrieve price data associated with the membership from the PriceModel
        // const priceData = await priceModal.find({ boutique: boutiqueItem._id, status: 'active' });
        // // Sort the prices based on the effectiveDate in descending order
        // const sortedPrices = priceData
        //     // Filter only active prices
        //     .filter(price => price.status === 'active')
        //     // Sort the prices by effective date in descending order
        //     .sort((a, b) => moment(b.effectiveDate).diff(moment(a.effectiveDate)));
        // Get the current date and time in UTC

        // Sort the prices based on the effectiveDate in descending order
        const sortedPrices = await priceModal.find({
            status: "active",
            boutique: boutiqueItem._id,
            effectiveDate: { $gte: currentDate }
        }).sort({ effectiveDate: 1 });
        // Construct the formatted response
        const response = {
            _id: boutiqueItem._id,
            name: boutiqueItem.name,
            card_title: boutiqueItem.card_title,
            card_content: boutiqueItem.card_content,
            product_set: boutiqueItem.product_set,
            flash_sale: boutiqueItem.flash_sale,
            sale_start_date_time: boutiqueItem.sale_start_date_time,
            sale_end_date_time: boutiqueItem.sale_end_date_time,
            no_of_month: boutiqueItem.no_of_month,
            status: boutiqueItem.status,
            membership: boutiqueItem.membership,
            is_month: boutiqueItem.is_month,
            discount_price: boutiqueItem.discount_price,
            created_at: boutiqueItem.created_at,
            updated_at: boutiqueItem.updated_at,
            status: boutiqueItem.status,
            schedule_prices: sortedPrices || []
        };

        // Return a success response with the Boutique item
        return successResponse(response, 'Boutique Item fetched successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};


exports.updateBoutiqueItemStatus = async (req, res) => {
    try {
        const { id, status } = req.body;

        // Find the Boutique item by ID
        const boutiqueItem = await boutiqueModal.findById({ _id: id });

        if (!boutiqueItem) return notFoundResponse('Boutique item not found', res);

        // Update the status of the Boutique item
        boutiqueItem.status = status;

        // Save the updated Boutique item to the database
        await boutiqueItem.save();

        // Return a success response with the updated Boutique item
        return successResponseWithoutData('Boutique item status updated successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};


exports.viewAllBoutique = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1;
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Use countDocuments to get the total count of boutiques with 'active' or 'inactive' status
        const totalCount = await boutiqueModal.countDocuments({ status: { $in: ['active', 'inactive'] } });

        // Retrieve only active and inactive items with pagination
        let boutiques = await boutiqueModal.find({ status: { $in: ['active', 'inactive'] } })
            .sort({ created_at: -1 }) // Sort by `createdAt` in descending order
            .skip(offset)
            .limit(parsedLimit);

        // Get details of prices for the active boutiques
        const botiqueIds = boutiques.map(boutique => boutique._id);
        const boutiqueDetails = await priceModal.find({ boutique: { $in: botiqueIds }, status: 'active' }, 'boutique effectiveEndDate effectiveDate initiationFees price').lean();
        // Check if no boutiques were found
        if (!boutiques || boutiques.length === 0) {
            return emptyResponse(boutiques, res);
        }

        // Process the item details to get the desired response
        const processedboutiques = boutiques.map(boutique => {
            const currentDetails = boutiqueDetails
                .filter(detail => detail.boutique.equals(boutique._id) && detail.effectiveDate <= new Date())
                .sort((a, b) => b.effectiveDate - a.effectiveDate)[0];

            const nextDetails = boutiqueDetails
                .filter(detail => detail.boutique.equals(boutique._id) && detail.effectiveDate > new Date())
                .sort((a, b) => a.effectiveDate - b.effectiveDate)[0];

            const currentPrice = currentDetails ? currentDetails.price : '';
            const initiationFees = currentDetails ? currentDetails.initiationFees : '';
            const nextCurrentPrice = nextDetails ? nextDetails.price : '';
            const nextInitiationFees = nextDetails ? nextDetails.initiationFees : '';
            const effectiveDate = currentDetails ? currentDetails.effectiveDate : '';
            const effectiveEndDate = currentDetails ? currentDetails.effectiveEndDate : '';

            return {
                _id: boutique._id,
                name: boutique.name, // Replace 'name' with the actual field in your boutique document
                card_title: boutique.card_title,
                card_content: boutique.card_content,
                product_set: boutique.product_set,
                flash_sale: boutique.flash_sale,
                sale_start_date_time: boutique.sale_start_date_time,
                sale_end_date_time: boutique.sale_end_date_time,
                no_of_month: boutique.no_of_month,
                gift_card: boutique.gift_card,
                status: boutique.status,
                membership: boutique.membership,
                currentPrice: currentPrice ? currentPrice : boutique.discount_price,
                initiationFees: initiationFees,
                nextCurrentPrice: nextCurrentPrice,
                nextInitiationFees: nextInitiationFees,
                effectiveDate: effectiveDate,
                effectiveEndDate: effectiveEndDate
            };
        });

        // Return a success response with pagination details
        return successResponseWithPagination(processedboutiques, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle and log any internal server error
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.updateEffectiveDate = async (req, res) => {
    try {
        const { id, effectiveDate, effectiveEndDate } = req.body;

        // Fetch the existing price document by its ID
        const existingPrice = await priceModal.findById(id);

        if (!existingPrice) return notFoundResponse('Not found', res);

        // Update the fields if they are provided in the request
        if (effectiveDate) {
            existingPrice.effectiveDate = effectiveDate;
        }

        if (effectiveEndDate !== undefined) {
            existingPrice.effectiveEndDate = effectiveEndDate;
        }

        // Save the updated price document
        await existingPrice.save();

        return successResponseWithoutData('Effective Date updated successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
}


exports.addLegal = async (req, res) => {
    try {
        // Count the existing legal documents to determine the next order value
        const legalCount = await legalModal.countDocuments();

        // Create a new legal document with the provided data
        const { legalTitle, legalContent, delta_text } = new legalModal(req.body);

        const newLegal = new legalModal({
            legalTitle,
            legalContent,
            order: legalCount + 1, // Set the order based on the count of existing documents
            delta_text: delta_text
        });

        // Save the new legal document to the database
        await newLegal.save();

        // Return a success response after successfully adding the legal document
        return successResponseWithoutData('Legal Added Successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.editLegal = async (req, res,) => {
    try {
        const { id, trigger_mail = false, ...updateData } = req.body;
        // const legal = await legalModal.findByIdAndUpdate(req.body.id, req.body, { new: true });
        const legal = await legalModal.findOneAndUpdate(
            { _id: id, status: 'active' }, // Only update if the document has an "active" status
            updateData,
            { new: true }
        );
        if (!legal) return notFoundResponse('Legal document not found', res);
        if (trigger_mail) {
            //getting all active users
            let getAllUsers = await userModal.aggregate([
                {
                    $match: {
                        status: 'active',
                        fullName: { $exists: true, $ne: '' }  // Ensure fullname is not empty
                    }
                },
                {
                    $group: {
                        _id: '$email',  // Group by email to find unique emails
                        fullName: { $first: '$fullName' },  // Keep fullname for each unique email
                        email: { $first: '$email' },  // Keep email for each unique email
                        id: { $first: '$_id' },  // Keep _id for each unique email
                        preferredFirstName: { $first: '$preferredFirstName' },
                        first_name: { $first: '$first_name' }
                    }
                },
                {
                    $project: {
                        _id: '$id',  // Rename 'id' field to '_id'
                        fullName: 1,  // Include fullname field
                        email: 1,  // Include email field
                        preferredFirstName: 1,
                        first_name: 1
                    }
                }
            ]).exec();
            //console.log('getAllUsers==', getAllUsers)
            // let emailsToMatch = ['newqa@yopmail.com', 'ruhii@yopmail.com', 'juhi.kumari@techugo.com'];

            // let getAllUsers = await userModal.aggregate([
            //     {
            //         $match: {
            //             status: 'active',
            //             fullName: { $exists: true, $ne: '' }, // Ensure fullname is not empty
            //             email: { $in: emailsToMatch } // Match emails from the array
            //         }
            //     },
            //     {
            //         $project: {
            //             _id: 1, // Exclude _id field
            //             fullName: 1, // Include fullname field
            //             email: 1, // Include email field
            //             preferredFirstName: 1,
            //             first_name: 1

            //         }
            //     }
            // ]).exec();

            if (legal.legalTitle == 'Membership Agreement') {
                for (let i = 0; i < getAllUsers.length; i++) {
                    console.log('legal email==', getAllUsers[i].email)
                    console.log('preferredFirstName==', getAllUsers[i].preferredFirstName)
                    let userFullName = getAllUsers[i].preferredFirstName || getAllUsers[i].first_name;
                    //Send mail verification 
                    await mailHelper.sendMembershipMail({ email: getAllUsers[i].email, body: `Membership Agreement`, fullName: userFullName, membershiplink: process.env.MEMBERSHIPLINK, termlink: process.env.TERMOFUSELINK, privacylink: process.env.PRIVACYLINK })
                    //adding for user home card 
                    await legalUpdateUser.create({
                        legal_title: 'Membership Agreement',
                        user_id: getAllUsers[i]._id
                    })
                }
            } else if (legal.legalTitle == 'Terms of Use') {
                for (let i = 0; i < getAllUsers.length; i++) {
                    console.log('legal email==', getAllUsers[i].email)
                    console.log('preferredFirstName==', getAllUsers[i].preferredFirstName)
                    let userFullName = getAllUsers[i].preferredFirstName || getAllUsers[i].first_name;
                    //Send mail verification 
                    await mailHelper.sendTermOfUseMail({ email: getAllUsers[i].email, body: `Term Of Use`, fullName: userFullName, termlink: process.env.TERMOFUSELINK, privacylink: process.env.PRIVACYLINK })

                    //adding for user home card 
                    await legalUpdateUser.create({
                        legal_title: 'Terms of Use',
                        user_id: getAllUsers[i]._id
                    })
                }
            } else if (legal.legalTitle == 'Referral Terms & Conditions') {
                for (let i = 0; i < getAllUsers.length; i++) {
                    console.log('legal email==', getAllUsers[i].email)
                    console.log('preferredFirstName==', getAllUsers[i].preferredFirstName)
                    let userFullName = getAllUsers[i].preferredFirstName || getAllUsers[i].first_name;
                    //Send mail verification 
                    await mailHelper.sendReferralTermMail({ email: getAllUsers[i].email, body: `Referral Terms & Conditions`, fullName: userFullName, referrallink: process.env.REFERRALCONDITIONLINK, termlink: process.env.TERMOFUSELINK, privacylink: process.env.PRIVACYLINK })

                    //adding for user home card 
                    await legalUpdateUser.create({
                        legal_title: 'Referral Terms & Conditions',
                        user_id: getAllUsers[i]._id
                    })
                }
            }
        }
        return successResponseWithoutData('Legal document updated successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.deleteLegal = async (req, res) => {
    try {
        const legalId = req.body.id; // Assuming the ID is passed as a route parameter

        // Find the legal document by ID and update its status to 'deleted'
        const updatedLegal = await legalModal.findByIdAndUpdate(
            legalId,
            { status: 'delete' }, // Set the status to 'deleted'
            { new: true } // Return the updated document
        );

        // Check if the legal document with the given ID exists
        if (!updatedLegal) {
            return notFoundResponse('Legal document not found', res);
        }

        // Return a success response with the deleted legal document
        return successResponseWithoutData('Legal document deleted successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.viewLegal = async (req, res) => {
    try {
        const { id } = req.query; // Assuming you pass the Legal item ID as a parameter

        // Find the Legal by ID
        const legal = await legalModal.findOne({ _id: id, $or: [{ status: 'active' }, { status: 'inactive' }] });

        if (!legal) {
            return notFoundResponse('No active legal document found', res);
        }

        // Construct the response object
        const responseObject = {
            legal_title: legal.legalTitle,
            legalContent: legal.legalContent,
            delta_text: legal.delta_text
        };

        return successResponse(responseObject, 'Active legal documents fetched successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.viewAllLegal = async (req, res) => {
    try {
        // Create an aggregation pipeline to sort and filter records
        const pipeline = [
            {
                $match: {
                    $or: [
                        { status: 'active' },
                        { status: 'inactive' }
                    ]
                }
            },
            { $sort: { order: 1 } }, // Sort by 'order' in ascending order
            {
                $project: {
                    _id: 1,
                    legalTitle: '$legalTitle',
                    legalContent: '$legalContent',
                    status: '$status',
                    createdAt: '$createdAt',
                    updatedAt: '$updatedAt'
                },
            },
        ];

        // Execute the aggregation pipeline
        const legals = await legalModal.aggregate(pipeline);

        return successResponse(legals, 'Data Fetched Successfully.', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.updateLegalStatus = async (req, res) => {
    try {
        // Extract the legal document ID and new status from the request
        const { _id, status } = req.body;

        // Find the legal document by ID and update its status
        const updatedLegal = await legalModal.findByIdAndUpdate(
            _id,
            { status },
            { new: true } // Return the updated document
        );

        // Check if the legal document was found and updated
        if (!updatedLegal) {
            return notFoundResponse('Legal document not found', res);
        }

        // Return a success response with the updated document
        return successResponseWithoutData('Legal status updated successfully', res);

    } catch (error) {
        console.error('Error updating legal status:', error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.contactUs = async (req, res) => {
    try {
        const { email, phone, subject, message, name, phone_code, id } = req.body;

        // Check if a record with the same email or phone already exists
        const existingContact = await contactModal.findOne({ $or: [{ email }, { phone }] });

        // Define a variable to store the response and an object to store contact data
        let resp;
        let contactData = {
            name,
            email,
            subject,
            message,
            phone,
            phone_code
        };

        if (!id) {
            // If no id is provided, create a new record
            if (existingContact) {
                return failMessage('Email or phone already exists', res);
            }
            resp = await contactModal.create(contactData);
        } else {
            // Update the existing record if id is provided
            if (!existingContact || existingContact._id.toString() === id) {
                resp = await contactModal.findOneAndUpdate({ _id: id }, contactData, { new: true });
            } else {
                return failMessage('Email or phone already exists', res);
            }
        }

        // Respond with a success message and the updated or newly created record
        return successResponse(resp, "Success", res);
    } catch (error) {
        // Handle any errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.viewContactUs = async (req, res) => {
    try {
        const contacts = await contactModal.find({
            $or: [
                { _id: req.query.id, status: 'active' },
                { _id: req.query.id, status: 'inactive' }
            ]
        });
        if (contacts.length > 0) {
            const contact = contacts[0]; // Get the first contact submission
            return successResponse(contact, "Contact submission retrieved successfully", res);
        } else {
            return successResponse({}, "No contact submissions found", res);
        }
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.delete_contact_us = async (req, res) => {
    try {
        const contactId = req.body.id;

        // Find the contact submission by ID and update its status to 'deleted'
        const updatedContact = await contactModal.findByIdAndUpdate(
            contactId,
            { status: 'delete' }, // Set the status to 'deleted'
            { new: true } // Return the updated document
        );

        // Check if a contact submission with the given ID exists
        if (!updatedContact) {
            return notFoundResponse('Contact submission not found', res);
        }

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.contact_us_list = async (req, res) => {
    try {
        const { skip = 1, limit = 10, search } = req.query;
        const page = (skip - 1) * limit;

        // Create a base query
        const baseQuery = {
            $or: [
                { status: 'active' },
                { status: 'inactive' }
            ]
        };

        // Add search conditions if search parameter is provided
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
            baseQuery.$or = [{ email: searchRegex }, { name: searchRegex }];
        }

        // Retrieve contacts with pagination and search
        const contacts = await contactModal.find(baseQuery)
            .skip(page)
            .limit(parseInt(limit));

        const totalCount = await contactModal.countDocuments(baseQuery);

        if (contacts.length > 0) {
            return successResponseWithPagination(contacts, totalCount, "Contact submissions retrieved successfully", res);
        } else {
            return successResponse({}, "No contact submissions found", res);
        }
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.getAllNavLocations = async (req, res) => {
    try {
        // Use the locationModal to find all locations in the collection and select specific fields
        const response = await locationModal.find({}, 'id name created_at status');

        // Check if any locations were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        // Return a success response with the selected fields
        return successResponse(response, 'Roles get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.addOrUpdateSavedLocation = async (req, res) => {
    try {
        // Extract data from the request body
        const {
            id,
            faqsLocationIds,
            legalLocationIds,
            aboutUsLocationIds,
            contactUsLocationIds,
            careersLocationIds,
            mediaPressLocationIds,
            investorsLocationIds,
            newsLocationIds
        } = req.body;

        // Prepare the update data
        const updateData = {
            faqsLocationIds: faqsLocationIds.map(item => ({ _id: item._id || null, isAdd: true })),
            legalLocationIds: legalLocationIds.map(item => ({ _id: item._id || null, isAdd: true })),
            aboutUsLocationIds: aboutUsLocationIds.map(item => ({ _id: item._id || null, isAdd: true })),
            contactUsLocationIds: contactUsLocationIds.map(item => ({ _id: item._id || null, isAdd: true })),
            careersLocationIds: careersLocationIds.map(item => ({ _id: item._id || null, isAdd: true })),
            mediaPressLocationIds: mediaPressLocationIds.map(item => ({ _id: item._id || null, isAdd: true })),
            investorsLocationIds: investorsLocationIds.map(item => ({ _id: item._id || null, isAdd: true })),
            newsLocationIds: newsLocationIds.map(item => ({ _id: item._id || null, isAdd: true })),
        };

        // Update or create the saved location
        const newSavedNavLocation = await SavedNavLocationModal.findOneAndUpdate(
            { _id: id },
            { $set: updateData },
            { new: true, upsert: true } // upsert option creates a new document if none exists
        );

        return successResponseWithoutData("Saved location added/updated successfully", res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.viewSavedLocation = async (req, res) => {
    try {
        const { type, id } = req.query;

        const savedLocation = await SavedNavLocationModal
            .findOne({ type, _id: id })
            .populate({
                path: 'faqsLocationIds._id',
                select: 'name'
            })
            .populate({
                path: 'legalLocationIds._id',
                select: 'name'
            })
            .populate({
                path: 'aboutUsLocationIds._id',
                select: 'name'
            })
            .populate({
                path: 'contactUsLocationIds._id',
                select: 'name'
            })
            .populate({
                path: 'careersLocationIds._id',
                select: 'name'
            })
            .populate({
                path: 'mediaPressLocationIds._id',
                select: 'name'
            })
            .populate({
                path: 'investorsLocationIds._id',
                select: 'name'
            })
            .populate({
                path: 'newsLocationIds._id',
                select: 'name'
            });

        if (!savedLocation) {
            return notFoundResponse("Saved location not found", res);
        }

        return successResponse(savedLocation, "Saved location retrieved successfully", res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.viewAllSavedLocation = async (req, res) => {
    try {
        // Fields to populate for each location type
        const locationFields = [
            'faqsLocationIds',
            'legalLocationIds',
            'aboutUsLocationIds',
            'contactUsLocationIds',
            'careersLocationIds',
            'mediaPressLocationIds',
            'investorsLocationIds',
            'newsLocationIds'
        ];

        // Find saved locations and populate necessary fields
        const savedLocations = await SavedNavLocationModal.find().populate(
            locationFields.map(field => ({ path: field + '._id', select: 'name' }))
        ).lean(); // Use lean to convert to plain JS objects

        if (!savedLocations || savedLocations.length === 0) {
            return notFoundResponse("Saved location not found", res);
        }

        // Format location ids for response
        const formatLocationIds = (locationArray) => {
            return locationArray.map(item => ({
                _id: item._id._id,
                name: item._id.name,
                isAdd: item.isAdd
            }));
        };

        // Transform saved locations
        const formattedLocations = savedLocations.map(location => ({
            ...location,
            ...Object.fromEntries(locationFields.map(field => [
                field,
                formatLocationIds(location[field])
            ]))
        }));

        return successResponse(formattedLocations[0], "Saved locations retrieved successfully", res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
}

exports.add = async (req, res) => {
    try {
        const { name, type, status } = req.body;

        // You can add more validation here if needed

        const newLocation = new locationModal({
            name,
            type
        });

        const savedLocation = await newLocation.save();

        res.json(savedLocation);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};
// Controller function for adding a new shortcode
exports.addShortcode = async (req, res) => {
    try {
        // Extract fields from request body
        const { shortCodeName, details = [], status = 'active' } = req.body;

        // Create a new shortcode document
        const newShortcode = new shortCodeModal({
            shortCodeName,
            details
        });

        // Save the document to the database
        await newShortcode.save();

        // Return success response
        return successResponseWithoutData('Shortcode created successfully!', res);
    } catch (err) {
        console.error('Error adding shortcode:', err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.addDiscount = async (req, res) => {
    try {
        // Destructure req.body for better readability
        const {
            discount_alias_name,
            membership_id,
            start_date,
            end_date,
            total_seats,
            initiation_fees,
            indefinite_seats,
            indefinite_end_date,
            tier: reqTier
        } = req.body;

        // Check if a discount with the same alias name already exists
        let existingDiscount = await discountModal.findOne({ discount_alias_name });
        if (existingDiscount) {
            return customResponse('Discount with this alias name already exists', res, 400);
        }
        // Create an array to hold tier objects
        const tier = [];

        // Iterate over the tier array from the request body
        for (const { discount_price, no_of_seats } of reqTier) {
            // Create a new tier object with the provided data
            const used_seats = no_of_seats; // Initially set used_seats equal to no_of_seats
            // Push the new tier object to the tier array
            tier.push({ discount_price, no_of_seats, used_seats });
        }

        // Create a new Discount with the provided data
        const newDiscount = new discountModal({
            discount_alias_name,
            membership_id,
            start_date,
            end_date,
            total_seats,
            tracked_seats: total_seats,
            initiation_fees,
            indefinite_seats,
            indefinite_end_date,
            tier
        });

        // Save the new Discount to the database
        await newDiscount.save();

        // Return a success response with the created Discount
        return successResponseWithoutData('Discount added successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.editDiscount = async (req, res) => {
    try {
        // Destructure relevant properties from req.body
        const { discount_id, discount_alias_name, start_date, end_date, total_seats, indefinite_end_date, indefinite_seats, tier: reqTier, initiation_fees } = req.body;

        // Find the discount with the provided ID
        const existingDiscount = await discountModal.findById(discount_id);
        // Check if the discount exists
        if (!existingDiscount) {
            return notFoundResponse('Discount not found', res);
        }

        // Check if a discount with the same alias name already exists
        let aliasNameExists = await discountModal.findOne({
            discount_alias_name,
            _id: { $ne: discount_id } // Exclude the current discount from the check
        });

        if (aliasNameExists) {
            // Respond with an error message if the discount_alias_name already exists
            return customResponse('Discount with this alias name already exists', res, 400);
        };


        let totalTrackSeats = Number(existingDiscount.total_seats) - Number(existingDiscount.tracked_seats);
        console.log(totalTrackSeats, 'totalTrackSeats')
        let noTotalSeats = Number(total_seats) + Number(totalTrackSeats);
        console.log(noTotalSeats, 'noTotalSeats')

        totalTrackSeats = Number(existingDiscount.tracked_seats) + Number(totalTrackSeats)
        console.log(totalTrackSeats, 'totalTrackSeats')

        // Update discount fields based on the destructured properties
        existingDiscount.discount_alias_name = discount_alias_name;
        existingDiscount.start_date = start_date;
        existingDiscount.end_date = end_date;
        existingDiscount.total_seats = noTotalSeats;
        existingDiscount.tracked_seats = total_seats;
        existingDiscount.indefinite_end_date = indefinite_end_date;
        existingDiscount.indefinite_seats = indefinite_seats;
        existingDiscount.initiation_fees = initiation_fees;
        // Update the tier array if provided in the request body
        if (reqTier && Array.isArray(reqTier)) {
            const updatedTier = [];

            // Iterate over the tier array from the request body
            for (const { discount_price, no_of_seats, claim_seat } of reqTier) {
                // Create a new tier object with the provided data

                const used_seats = no_of_seats; // Initially set used_seats equal to no_of_seats
                const totalSeats = Number(used_seats) + Number(claim_seat);
                // Push the new tier object to the updatedTier array
                updatedTier.push({ discount_price, no_of_seats: totalSeats, used_seats });
            }
            // Assign the updatedTier array to the existingDiscount
            existingDiscount.tier = updatedTier;
        }

        // Save the updated discount to the database
        await existingDiscount.save();

        // Respond with a success message
        return successResponseWithoutData('Discount updated successfully', res);
    } catch (error) {
        // Log the specific error message for debugging
        console.error('Error in editDiscount:', error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.updateDiscountStatus = async (req, res) => {
    try {
        // Find the existing discount by ID
        const existingDiscount = await discountModal.findByIdAndUpdate(
            req.body.id,
            { status: req.body.status },
            { new: true } // Set { new: true } to return the updated document
        );

        // Check if the discount with the given ID exists
        if (!existingDiscount) {
            return notFoundResponse('Discount not found', res);
        }

        // Update the status of the existing discount
        existingDiscount.status = req.body.status;

        // Save the updated discount to the database
        await existingDiscount.save();

        // Return a success response with the updated discount
        return successResponseWithoutData('Discount status updated successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.deleteDiscount = async (req, res) => {
    try {
        // Find the discount by ID and update its status to 'deleted'
        const deletedDiscount = await discountModal.findByIdAndUpdate(
            req.body.id,
            { status: 'delete' }, // Update to set status to 'deleted'
            { new: true } // Return the updated document
        );

        // Check if the discount with the given ID exists
        if (!deletedDiscount) {
            return notFoundResponse('Discount not found', res);
        }

        // Return a success response
        return successResponseWithoutData('Discount deleted successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.addDiscountTier = async (req, res) => {
    try {
        // Extract discount_id and tier array from the request body
        const { discount_id, tier } = req.body;

        // Find the discount with the provided ID
        const existingDiscount = await discountModal.findById(discount_id);

        // Check if the discount exists
        if (!existingDiscount) {
            return notFoundResponse('Discount not found', res);
        }

        // Destructure properties from the existing discount
        const { tier: existingTiers } = existingDiscount;

        // Calculate the total number of seats to be added
        // const remainingSeats = tier.reduce((acc, curr) => acc + curr.no_of_seats, 0);

        // // Calculate the remaining seats after the new addition
        // const check = tracked_seats === 0 ? total_seats - remainingSeats : tracked_seats - remainingSeats;

        // // Check if there are enough seats available
        // if (tracked_seats === 0 && remainingSeats > total_seats) {
        //     return failMessage('Not enough seats available', res);
        // }

        // Check if the remaining seats after the addition are within the limit
        // if (tracked_seats === 0 || remainingSeats <= existingDiscount.tracked_seats) {
        // Add new tiers to the existing discount
        tier.forEach(({ discount_price, no_of_seats }) => {
            existingTiers.push({ discount_price, no_of_seats });
        });

        // Update tracked_seats in the discount
        // existingDiscount.tracked_seats = check;

        // Update the updated_at field
        existingDiscount.updated_at = new Date();

        // Save the updated discount to the database
        await existingDiscount.save();

        return successResponseWithoutData('Discount Tiers added successfully', res);
        // } else {
        //     // Respond with a custom message for not enough seats available
        //     return customResponse('Not enough seats available', res);
        // }

    } catch (error) {
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};


exports.addInitiationDiscount = async (req, res) => {
    try {
        // Check if a record with the same `membership_id` already exists
        const existingDiscount = await discountModal.findOne({ membership_id: req.body.membership_id });

        // Define a variable to store the response and an object to store contact data
        let resp;
        let initiationDiscountData = {
            membership_id: existingDiscount ? existingDiscount.membership_id : toObjectId(req.body.membership_id),
            initiation_fees: req.body.initiation_fees,
            discount_alias_name: req.body.discount_alias_name,
            initiation_start_date: req.body.initiation_start_date,
            initiation_end_date: req.body.initiation_end_date,
        };

        if (!existingDiscount) {
            // If no record with the same `membership_id` exists, create a new record
            resp = await discountModal.create(initiationDiscountData);
        } else {
            // Update the existing record
            resp = await discountModal.findOneAndUpdate({ membership_id: existingDiscount.membership_id }, initiationDiscountData, { new: true });
        }

        // Respond with a success message and the updated or newly created record
        return successResponse(resp, "Success", res);

    } catch (error) {
        // Handle any errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.getDiscount = async (req, res) => {
    try {
        // Extract discount ID from the request parameters
        const { id } = req.query;

        // Find the discount with the provided ID
        const discount = await discountModal.findOne({
            _id: id,
            status: { $in: ["active", "inactive"] } // Change to include both active and inactive if required
        }, { created_at: 0, updated_at: 0 });

        // Check if the discount exists
        if (!discount) {
            return notFoundResponse('Discount not found', res);
        }

        // Manually structure the response object
        const responseData = {
            _id: discount._id,
            discount_alias_name: discount.discount_alias_name,
            membership_id: discount.membership_id,
            start_date: discount.start_date,
            end_date: discount.end_date,
            total_seats: discount.total_seats,
            tracked_seats: discount.tracked_seats,
            tier: discount.tier.map(t => ({
                discount_price: t.discount_price,
                no_of_seats: t.no_of_seats,
                used_seats: t.used_seats,
                claim_seat: t.no_of_seats - t.used_seats, // Calculate claim seats
                _id: t._id
            })),
            initiation_fees: discount.initiation_fees || "", // Default to empty string if not set
            indefinite_end_date: discount.indefinite_end_date,
            indefinite_seats: discount.indefinite_seats,
            status: discount.status
        };

        // Respond with the manually structured discount data
        return successResponse(responseData, 'Discount retrieved successfully', res);
    } catch (error) {
        // Handle and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.discountList = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // Count documents with an active or inactive status
        const totalCount = await discountModal.countDocuments({
            status: { $in: ["active", "inactive"] } // Filter by status
        });
        const discounts = await discountModal
            .find({
                status: { $in: ["active", "inactive"] } // Filter by status
            })
            .sort({ _id: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const uniqueMembershipIds = [...new Set(discounts.map(discount => discount.membership_id))];

        const pricesPromises = uniqueMembershipIds.map(membershipId =>
            priceModal.find({ membership: membershipId }).sort({ effectiveDate: -1 }).limit(1)
        );

        const pricesResults = await Promise.all(pricesPromises);

        const response = {
            data: await Promise.all(uniqueMembershipIds.map(async (membershipId, index) => {
                const discountData = discounts.find(discount => discount.membership_id === membershipId);
                const latestPrice = pricesResults[index][0];
                const membership = await membershipModal.findById({ _id: membershipId });

                const tierArray = discountData.tier || [];
                // Calculate the total of no_of_seats and used_seats for the entire tier array
                const totalNoOfSeats = tierArray.reduce((total, tier) => total + (tier.no_of_seats || 0), 0);
                const totalUsedSeats = tierArray.reduce((total, tier) => total + (tier.used_seats || 0), 0);

                // Calculate claim_seat at the discount level
                const claimSeat = totalNoOfSeats - totalUsedSeats;
                const beginingDiscountPrice = tierArray.length > 0 ? tierArray[tierArray.length - 1].discount_price : null;
                const endingDiscountPrice = tierArray.length > 0 ? tierArray[0].discount_price : null;

                // Omit the 'tier' property and preserve null values
                const { tier, ...restDiscountData } = discountData._doc;

                // Preserve null values without converting them to empty strings
                const sanitizedData = Object.fromEntries(
                    Object.entries(restDiscountData).map(([key, value]) => [key, value])
                );

                return {
                    ...sanitizedData,
                    membershipId,
                    membershipName: membership ? membership.name : null,
                    latestEffectiveDate: latestPrice ? latestPrice.effectiveDate || null : null,
                    standardPrice: latestPrice ? latestPrice.price || 0 : 0,
                    standardInitiationFees: latestPrice ? latestPrice.initiationFees || 0 : 0,
                    beginingDiscountPrice,
                    endingDiscountPrice,
                    totalNoOfSeats,
                    totalUsedSeats,
                    claimSeat
                };
            })),
            totalItems: discounts.length,
        };

        return successResponseWithPagination(response.data, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.getAllUsers = async (req, res) => {
    try {
        // Get query parameters
        const search_query = req.query.search;
        const page = parseInt(req.query.skip, 10) || 1;
        const per_page = parseInt(req.query.limit, 10) || 5;
        const is_member = req.query.is_member;

        // Build the filter object for the search and include only active users
        const filter = {
            ...(
                search_query
                    ? {
                        $or: [
                            { fullName: { $regex: search_query, $options: 'i' } },
                            { email: { $regex: search_query, $options: 'i' } },
                            { phone: { $regex: search_query, $options: 'i' } },
                        ],
                    }
                    : {}
            ),
            ...(is_member !== '' ? { is_member: is_member } : {}),
        };

        // Find total count of active users based on the filter
        const totalCount = await userModal.countDocuments(filter);

        // Find active users based on the filter
        const users = await userModal.find(filter)
            .skip((page - 1) * per_page)
            .limit(per_page)
            .sort({ _id: -1 }); // Default to ascending order

        // Return specific details for each user
        let result = users.map((user) => ({
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            preferredFirstName: user.preferredFirstName,
            country_code: user.country_code,
            phone: user.phone,
            phone_code: user.phone_code,
            is_member: user.is_member,
            status: user.status,
        }));

        // Return success response with pagination information
        successResponseWithPagination(result, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors
        console.error('Error in userList:', error);
        return errorResponse('Internal Server Error', res);
    }
};

exports.getUser = async (req, res) => {
    try {
        const userId = req.query.id; // Assuming userId is part of the URL

        const userWithIndustries = await userModal.aggregate([
            {
                $match: {
                    _id: toObjectId(userId)
                },
            },
            {
                $lookup: {
                    from: 'industries', // Assuming the name of the industry collection is 'industries'
                    localField: 'industries',
                    foreignField: '_id',
                    as: 'industries',
                },
            },
        ]);

        if (userWithIndustries.length === 0) {
            return notFoundResponse('User not found', res);
        }

        // Extract the user and industries from the result
        const [user] = userWithIndustries;
        let userMembership = await userMembershipModal.find({ user_id: user._id.valueOf(), status: "active" }, { name: 1, price: 1, renewal_date: 1, _id: 0 }).sort({ createdAt: -1 }).limit(1);

        if (user.profile_pic) {
            const isUrl = await common.isValidUrl(user.profile_pic);
            if (isUrl) {
                const bucketName = await common.checkBucketName(user.profile_pic);
                user.profile_pic = bucketName === process.env.USER_MEDIA_BUCKET
                    ? await common.fetchS3file(user.profile_pic, process.env.USER_MEDIA_BUCKET)
                    : user.profile_pic;
            } else {
                user.profile_pic = await common.fetchS3fileByKey(user.profile_pic, process.env.USER_MEDIA_BUCKET);
            }
        }
        const result = {
            id: user._id,
            fullName: user.fullName,
            preferredFirstName: user.preferredFirstName,
            country_code: user.country_code,
            email: user.email,
            phone_code: user.phone_code,
            phone: user.phone,
            profile_pic: user.profile_pic,
            birthday: user.birthday,
            gender: user.gender,
            occupation: user.occupation,
            annual_income: user.annual_income,
            email_verified: user.email_verified,
            reason: user.reason,
            status: user.status,
            membership: userMembership,
            is_member: userMembership.length > 0 ? 'member' : 'freeUser',
            // Other user details

            industries: user.industries.map(industry => ({
                id: industry._id,
                name: industry.name, // Include the 'name' field in each industry object
            })),
            verified: user.passportVerified && user.driverlicenseVerified,
            verifiedDate: user.passportVerified && user.driverlicenseVerified
                ? new Date(Math.max(user.passport_verification_date, user.driver_license_verification_date))
                : null,
        };

        return successResponse(result, 'User details with industries fetched successfully.', res);
    } catch (error) {
        console.error('Error in getUser:', error);
        return errorResponse('Internal Server Error', res);
    }
};


exports.addVideo = async (req, res) => {
    try {
        if (req.files && req.files.length > 0 && req.files[0].key) {
            const videoUrl = await common.fetchS3fileByKey(req.files[0].key, process.env.USER_MEDIA_BUCKET);
            // You can do something with the videoUrl, e.g., save it to a database
            return successResponse(videoUrl, 'Url fetched successfully.', res);
        } else {
            return notFoundResponse('No video file provided', res);

        }
    } catch (err) {
        console.error(err, "errr");
        return errorResponse('Internal Server Error', res);
    }
};

exports.getUserPets = async (req, res) => {
    try {
        const userId = req.query.id;
        const page = parseInt(req.query.skip) || 1; // Default to page 1 if not provided
        const pageSize = parseInt(req.query.limit) || 10; // Default to 10 items per page if not provided
        const search = req.query.search || '';

        const query = {
            user_id: userId,
            pet_name: { $regex: new RegExp(search, 'i') } // Case-insensitive search on pet name
        };

        // Fetch pets with pagination
        const userPets = await userPetModal.find(query)
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        if (!userPets || userPets.length === 0) {
            return notFoundResponse('No pets found for the user', res);
        }

        // Extracting all pet details from the 'userPets' array
        // const allPetDetails = userPets.map((pet) => ({
        //     _id: pet._id,
        //     pet_name: pet.pet_name,
        //     pet_image: pet.pet_image,
        //     pet_breed: pet.pet_breed,
        //     pet_weight: pet.pet_weight,
        //     pet_type: pet.type_of_pet,
        //     assistance_animal_proof: pet.assistance_animal_proof,
        //     pet_liability_signature: pet.pet_liability_signature ? true : false, // Check if it has a value
        //     status: pet.status
        //     // Add other fields as needed
        // }));

        const allPetDetails = await Promise.all(userPets.map(async (pet) => {
            let petImage = '';
            let assistance_animal_proof = '';
            if (pet.pet_image) {
                const isUrl = await common.isValidUrl(pet.pet_image);
                if (isUrl) {
                    const bucketName = await common.checkBucketName(pet.pet_image);
                    petImage = bucketName === process.env.USER_MEDIA_BUCKET
                        ? await common.fetchS3file(pet.pet_image, process.env.USER_MEDIA_BUCKET)
                        : pet.pet_image;
                } else {
                    petImage = await common.fetchS3fileByKey(pet.pet_image, process.env.USER_MEDIA_BUCKET);
                }
            }

            if (pet.assistance_animal_proof) {
                const isUrl = await common.isValidUrl(pet.assistance_animal_proof);
                if (isUrl) {
                    const bucketName = await common.checkBucketName(pet.assistance_animal_proof);
                    assistance_animal_proof = bucketName === process.env.USER_MEDIA_BUCKET
                        ? await common.fetchS3file(pet.assistance_animal_proof, process.env.USER_MEDIA_BUCKET)
                        : pet.assistance_animal_proof;
                } else {
                    assistance_animal_proof = await common.fetchS3fileByKey(pet.assistance_animal_proof, process.env.USER_MEDIA_BUCKET);
                }
            }

            return {
                _id: pet._id,
                pet_name: pet.pet_name,
                pet_image: petImage,
                pet_breed: pet.pet_breed,
                pet_weight: pet.pet_weight,
                pet_type: pet.type_of_pet,
                assistance_animal_proof: assistance_animal_proof,
                pet_liability_signature: !!pet.pet_liability_signature, // Check if it has a value
                status: pet.status,
                //state:pet?.state ? pet?.state:'',
                pvets_license_no: pet.vets_license_no,
                pvets_license_date: pet.vets_license_date,
                rabbies_vaccine_date: pet.rabbies_vaccine_date,
                rabbies_vaccine_valid_to_date: pet.rabbies_vaccine_valid_to_date,
                distemper_vaccine_date: pet.distemper_vaccine_date,
                distemper_vaccine_valid_to_date: pet.distemper_vaccine_valid_to_date
                // Add other fields as needed
            };
        }));

        // Count total number of pets matching the query (for pagination)
        const totalPets = await userPetModal.countDocuments(query);

        // Respond with paginated pet details
        successResponseWithPagination(allPetDetails, totalPets, 'Data Fetched Successfully.', res);

    } catch (error) {
        console.error(error);
        return errorResponse('Internal Server Error', res);
    }
}

exports.getUserPet = async (req, res) => {
    try {
        const petId = req.query.id;

        // Assuming your pet model has a 'user_id' field to associate pets with users
        const userPet = await userPetModal.findOne({ _id: petId })
            .populate('pet_breed', 'breed_name'); // Populate the 'pet_breed' field with 'breed_name'

        if (!userPet) {
            return notFoundResponse('No pet found for the provided ID', res);
        }

        let petImage = '';
        let assistance_animal_proof = '';
        if (userPet.pet_image) {
            const isUrl = await common.isValidUrl(userPet.pet_image);
            if (isUrl) {
                const bucketName = await common.checkBucketName(userPet.pet_image);
                petImage = bucketName === process.env.USER_MEDIA_BUCKET
                    ? await common.fetchS3file(userPet.pet_image, process.env.USER_MEDIA_BUCKET)
                    : userPet.pet_image;
            } else {
                petImage = await common.fetchS3fileByKey(userPet.pet_image, process.env.USER_MEDIA_BUCKET);
            }
        }

        if (userPet.assistance_animal_proof) {
            const isUrl = await common.isValidUrl(userPet.assistance_animal_proof);
            if (isUrl) {
                const bucketName = await common.checkBucketName(userPet.assistance_animal_proof);
                assistance_animal_proof = bucketName === process.env.USER_MEDIA_BUCKET
                    ? await common.fetchS3file(userPet.assistance_animal_proof, process.env.USER_MEDIA_BUCKET)
                    : userPet.assistance_animal_proof;
            } else {
                assistance_animal_proof = await common.fetchS3fileByKey(userPet.assistance_animal_proof, process.env.USER_MEDIA_BUCKET);
            }
        }
        // Extracting all pet breeds from the 'pet_breed' arrays
        let allPetDetails = {
            _id: userPet._id,
            pet_name: userPet.pet_name,
            pet_image: petImage,
            pet_breed: userPet.pet_breed.map(pet => ({
                _id: pet._id,
                breed_name: pet.breed_name
            })),
            pet_weight: userPet.pet_weight,
            pet_type: userPet.type_of_pet,
            Bio: userPet.Bio,
            assistance_animal_proof: assistance_animal_proof,
            pet_liability_signature: userPet.pet_liability_signature,
            status: userPet.status
            // Add other fields as needed
        };

        return successResponse(allPetDetails, 'Data Fetched Successfully.', res);

    } catch (error) {
        console.error(error);
        return errorResponse('Internal Server Error', res);
    }
};


exports.getUserFlights = async (req, res) => {
    try {
        const userId = req.query.id;
        const userFlights = await flightBookingModal.aggregate([
            {
                $match: { user_id: toObjectId(userId) }
            },
            {
                $lookup: {
                    from: "flights",
                    localField: "flight_id",
                    foreignField: "_id",
                    as: "flightDetails"
                }
            },
            {
                $unwind: "$flightDetails"
            },
            {
                $lookup: {
                    from: "routes",
                    localField: "flightDetails.route",
                    foreignField: "_id",
                    as: "routeDetails"
                }
            },
            {
                $unwind: "$routeDetails"
            },
            {
                $lookup: {
                    from: "pilots",
                    localField: "flightDetails.pilot",
                    foreignField: "_id",
                    as: "pilotDetails"
                }
            },
            {
                $unwind: "$pilotDetails"
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "routeDetails.fromCity",
                    foreignField: "_id",
                    as: "fromCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$fromCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "routeDetails.toCity",
                    foreignField: "_id",
                    as: "toCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$toCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    booking_status: 1,
                    Total_pet_price_with_gst: 1,
                    status: 1,
                    createdAt: 1,
                    flight_name: "$flightDetails.flight_name",
                    route_name: "$routeDetails.route_name",
                    flight_takeoff_date: "$flightDetails.flight_takeoff_date",
                    takeoff_time: "$flightDetails.takeoff_time",
                    landing_time: "$flightDetails.landing_time",
                    pilot_name: "$pilotDetails.full_name",
                    copilot_name: "$flightDetails.copilot",
                    pilot_id: "$flightDetails.pilot",
                    fromCity_name: { $ifNull: ["$fromCityDetails.city_name", "Unknown"] },
                    fromCity_airport_abbreviation: { $ifNull: ["$fromCityDetails.airport_abbreviation", "Unknown"] },
                    fromCity_lat: { $ifNull: ["$fromCityDetails.lat", 0] },
                    fromCity_long: { $ifNull: ["$fromCityDetails.long", 0] },
                    toCity_name: { $ifNull: ["$toCityDetails.city_name", "Unknown"] },
                    toCity_airport_abbreviation: { $ifNull: ["$toCityDetails.airport_abbreviation", "Unknown"] },
                    toCity_lat: { $ifNull: ["$toCityDetails.lat", 0] },
                    toCity_long: { $ifNull: ["$toCityDetails.long", 0] }
                }
            }
        ]).exec(); // Use .exec() to execute the aggregation

        return successResponse(userFlights, 'Data Fetched Successfully.', res);
    } catch (error) {
        console.error(error);
        return errorResponse('Internal Server Error', res);
    }
};

exports.sendAppUrl = async (req, res) => {
    try {
        // Extract user information from the request body
        const user = req.body;

        // Construct the recipient's phone number by combining phone code and phone number
        const toPhoneNumber = user.phone_code + user.phone;

        // Retrieve Twilio phone number from environment variables
        const fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO;

        // Define the URL of your app
        const appUrl = 'https://your-app-url.com'; // Replace with your actual app URL

        // Create the message body containing the app URL
        const messageBody = `Download our app: ${appUrl}`;

        // Use Twilio client to send the message
        const message = await client.messages.create({
            body: messageBody,
            from: fromPhoneNumber,
            to: toPhoneNumber,
        });

        // Send a success response to the client
        return successResponseWithoutData('Sent app URL successfully.', res);
    } catch (error) {
        // Log the error message if an error occurs during the process
        console.error(`Error sending app URL: ${error.message}`);
        // Send an internal server error response to the client
        return internalServerError('Internal Server Error', res);
    }
};

// Controller function to get details of related enquiries with pagination and search
exports.getEnquiry = async (req, res) => {
    try {
        // Extract search parameters and type filter from query parameters
        const searchParams = req.query.search || {};
        const typeFilter = req.query.type || '';

        // Pagination parameters: skip and limit
        const page = parseInt(req.query.skip) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default limit is 10 items per skip

        // Calculate the starting index for pagination
        const startIndex = (page - 1) * limit;

        // Build the base query
        const baseQuery = {
            // status: 'active'
        };

        // Add search conditions if provided
        if (searchParams) {
            baseQuery.$or = [
                { email: { $regex: new RegExp(searchParams, 'i') } },
                { firstName: { $regex: new RegExp(searchParams, 'i') } },
                { type: { $regex: new RegExp(searchParams, 'i') } },
                { subject: { $regex: new RegExp(searchParams, 'i') } },
                { enQuiry: { $regex: new RegExp(searchParams, 'i') } }
            ];
        }

        // Extend the base query based on the type filter
        const query = typeFilter ? { ...baseQuery, type: { $regex: new RegExp(typeFilter, 'i') } } : baseQuery;

        // Add status filter for active enquiries
        query.status = 'active';

        const totalCount = await enquiryModal.countDocuments(query);

        // Use async/await to fetch enquiries with pagination, search, and type filter
        const enQuiry = await enquiryModal.find(query)
            .skip(startIndex)
            .limit(limit)
            .sort({ _id: -1 }); // Sorting in descending order based on _id

        // Check if no enquiries are found, return a not found response
        if (!enQuiry || enQuiry.length === 0) {
            return notFoundResponse('No enQuiry found', res);
        }

        // Map the fetched enquiries to a simplified format
        const allEnQuiryDetails = enQuiry.map((data) => ({
            _id: data._id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            subject: data.subject,
            enQuiry: data.enQuiry,
            type: data.type,
            status: data.status,
            ipv4: data.ipv4,
            ipv6: data.ipv6,
            isRead: data.isRead,
            computerScreen: data.computerScreen,
            device: data.device,
            acctType: data.acctType,
            readBy: data.readBy,
            browserWindow: data.browserWindow,
            // Add other fields as needed
        }));

        return successResponseWithPagination(allEnQuiryDetails, totalCount, 'Data Fetched Successfully.', res);

    } catch (error) {
        // Log any errors to the console
        console.error(error);

        // Return an error response in case of an internal server error
        return errorResponse('Internal Server Error', res);
    }
}

// Function to fetch a particular enquiry by ID
exports.getSingleEnquiry = async (req, res) => {
    try {
        // Extract enquiry ID from the request parameters
        const id = req.query.id;
        const mailbox = req.query.mailbox;

        // Use async/await to fetch a single enquiry by ID
        const singleEnquiry = await enquiryModal.findOne({
            "wildduck_mail_id.id": { $all: [id] },
            "wildduck_mailbox_id.mailbox": { $all: [mailbox] }
        });
        // Check if no enquiry is found, return a not found response
        if (!singleEnquiry) {
            return notFoundResponse('Enquiry not found', res);
        }

        // Map the fetched enquiry to a simplified format
        const enquiryDetails = {
            _id: singleEnquiry._id,
            firstName: singleEnquiry.firstName,
            lastName: singleEnquiry.lastName,
            email: singleEnquiry.email,
            phone: singleEnquiry.phone,
            subject: singleEnquiry.subject,
            enQuiry: singleEnquiry.enQuiry,
            type: singleEnquiry.type,
            ipv4: singleEnquiry.ipv4,
            ipv6: singleEnquiry.ipv6,
            isRead: singleEnquiry.isRead,
            computerScreen: singleEnquiry.computerScreen,
            device: singleEnquiry.device,
            acctType: singleEnquiry.acctType,
            browserWindow: singleEnquiry.browserWindow,
            status: singleEnquiry.status
            // Add other fields as needed
        };

        // Return the response with the single enquiry details
        return successResponse(enquiryDetails, 'Enquiry Fetched Successfully.', res);
    } catch (error) {
        // Handle errors...
        return errorResponse('Internal Server Error', res);
    }
}

// Controller function to get list of enquiries
exports.getEnquiryList = async (req, res) => {
    try {
        // Retrieve the list of roles from the database

        // Use the enquiryListModal to find all enQuiry in the collection
        const response = await enquiryListModal.find({});

        // Check if any enQuiry were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        // Return a success response with the list of enQuiry
        return successResponseWithPagination(response, response.length, 'enQuiry get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}

exports.addCareer = async (req, res) => {
    try {
        const {
            job_name,
            job_type_id,     // Now accepting ObjectId for Job Type
            job_location_id,  // Now accepting ObjectId for Job Location
            job_category_id,  // Now accepting ObjectId for Job Category
            requirements
        } = req.body;

        // Create a new career object
        const newCareer = new careerModal({
            job_name,
            job_type: job_type_id,          // Store ObjectId for Job Type
            job_location: job_location_id,  // Store ObjectId for Job Location
            job_category: job_category_id,  // Store ObjectId for Job Category
            requirements: requirements ? requirements : []  // Add requirements if provided
        });

        // Save the career document in the database
        await newCareer.save();

        // Return a success response
        successResponseWithoutData('Career added successfully', res);

    } catch (error) {
        console.error('Error in adding career:', error);
        return errorResponse('Internal Server Error', res);
    }
};

exports.updateCareer = async (req, res) => {
    try {
        const { career_id, job_name, job_type_id, job_location_id, job_category_id, requirements } = req.body;

        const updatedFields = {};
        if (job_name) updatedFields.job_name = job_name;
        if (job_type_id) updatedFields.job_type = job_type_id;
        if (job_location_id) updatedFields.job_location = job_location_id;
        if (job_category_id) updatedFields.job_category = job_category_id;
        if (requirements) updatedFields.requirements = requirements;

        const updateCareer = await careerModal.findOneAndUpdate(
            { _id: career_id, status: 'active' },
            updatedFields,
            { new: true }
        );

        if (updateCareer) successResponse(updateCareer, 'Data Updated Successfully.', res);
        else return notFoundResponse('Career Not found', res);
    } catch (error) {
        console.error('Error in updating career:', error);
        return errorResponse('Internal Server Error', res);
    }
};

exports.getAllCareers = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { skip, limit } = req.query;

        // Set default values for skip, limit, and sort
        const parsedSkip = skip ? parseInt(skip) : 1; // Default to the first page
        const parsedLimit = limit ? parseInt(limit) : 10; // Default page size to 10 careers

        // Calculate the number of records to skip
        const offset = (parsedSkip - 1) * parsedLimit;

        // Use countDocuments to get the total count
        const totalCount = await careerModal.countDocuments({ status: 'active' });

        // Fetch all active careers with pagination
        const careers = await careerModal.find({ status: 'active' })
            .populate('job_type', 'name')
            .populate('job_location', 'name')
            .populate('job_category', 'name')
            .sort({ _id: -1 }) // Sort by '_id' in descending order (latest first))
            .skip(offset)
            .limit(Number(parsedLimit))
            .lean();

        // Check if data was found; if not, return an empty response
        if (!careers || careers.length === 0) {
            return emptyResponse(data, res);
        }

        // Transform populated fields to return only 'name'
        careers.forEach(career => {
            if (career.job_type) career.job_type = career.job_type.name;
            if (career.job_location) career.job_location = career.job_location.name;
            if (career.job_category) career.job_category = career.job_category.name;
        });
        // Return a success response with the user details
        return successResponseWithPagination(careers, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getCareerbyID = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        const career = await careerModal.findById(id)
            .populate('job_type', 'name')
            .populate('job_location', 'name')
            .populate('job_category', 'name');

        if (!career) return notFoundResponse('Career Not found', res);

        successResponse(career, 'Career fetched successfully', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.deleteCareer = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        // Find a career by id and active status and update the status to inactive, we are just soft deleting the career
        const data = await careerModal.findOneAndUpdate({ _id: id, status: 'active' }, { status: 'inactive' })

        // Check if data was updated or not
        if (data) {
            return successResponseWithoutData('Successfully deleted.', res);
        } else {
            return notFoundResponse('Career not found', res)
        }

    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.addPilot = async (req, res) => {
    try {
        //Get the phone and email from request to check for duplicate phone and email
        const { phone, email } = req.body

        //Check for duplicate phone or email 
        const pilot = await pilotModal.findOne({
            $or: [
                { phone }, { email }
            ]
        }, {
            phone: 1, email: 1, _id: 0
        })

        //If pilot is already exists for same phone and email then send an error message
        if (pilot) {
            //Added dynamic error message for Email or phone number already exists
            let errorMessage = ""
            if (pilot.phone == phone && pilot.email == email) errorMessage = "Email and phone number already exists"
            else if (pilot.phone == phone) errorMessage = "Phone number already exists"
            else if (pilot.email == email) errorMessage = "Email already exists"
            return failMessage(errorMessage, res);
        }

        //Insert whole req body object as we are allowing only those fields which are needed for insertion
        const data = await pilotModal.create(req.body)
        // Return success response with inserted data
        successResponse(data, 'Data Added Successfully.', res);
    } catch (error) {
        // Handle errors
        console.error('Error in adding pilot:', error);
        return errorResponse('Internal Server Error', res);
    }
};

exports.updatePilot = async (req, res) => {
    try {
        const { phone, email, pilot_id } = req.body;

        if (!pilot_id) {
            return failMessage("Pilot ID is required", res);
        }

        const whereClause = [];

        if (phone) whereClause.push({ phone });
        if (email) whereClause.push({ email });

        // Check for phone or email if they already exist
        if (phone || email) {
            const pilot = await pilotModal.findOne({ $or: whereClause }, { phone: 1, email: 1, _id: 1 });

            if (pilot && pilot._id.toString() !== pilot_id) {
                let errorMessage = '';

                if (pilot.phone === phone && pilot.email === email) {
                    errorMessage = 'Both email and phone number already exist';
                } else if (pilot.phone === phone) {
                    errorMessage = 'Phone number already exists';
                } else if (pilot.email === email) {
                    errorMessage = 'Email already exists';
                }

                if (errorMessage) return failMessage(errorMessage, res);
            }
        }

        // List of fields to update based on the pilot schema
        const fieldsToUpdate = [
            'first_name', 'last_name', 'dateOfBirth', 'phone', 'email', 'phone_code', 'Address', 'Nationality', 'Photo',
            'LicenseNumber', 'LicenseType', 'LiIssuingAuthority', 'LiDateOfIssue', 'LiExpirationDate',
            'FlightSchoolAttended', 'Certifications', 'TotalFlightHr', 'FlightHrByAircraftType',
            'SpecialQualifications', 'MedicalCertType', 'MeIssuingDoctor', 'MeDateOfIssue', 'MeExpiryDate',
            'MeRestrictions', 'ScannedCopiesOfLiCert', 'PassportCopy', 'AnyOtherDocs', 'BackgroundChecksStatus',
            'SecurityClearanceLevel', 'EmergencyName', 'EmergencyRelation', 'EmergencyPhone',
            'EmergencyEmail', 'EmergencyPhoneCode'
        ];

        const updatedFields = {};
        fieldsToUpdate.forEach(field => {
            if (req.body[field] !== undefined) {
                updatedFields[field] = req.body[field];
            }
        });

        // Update pilot based on pilot_id and active status
        const updatedPilot = await pilotModal.findOneAndUpdate(
            { _id: pilot_id },
            updatedFields,
            { new: true }
        );

        if (updatedPilot) {
            return successResponse(updatedPilot, 'Data Updated Successfully', res);
        } else {
            return notFoundResponse('Pilot not found or inactive', res);
        }

    } catch (error) {
        console.error('Error in updating pilot:', error);
        return errorResponse('Internal Server Error', res);
    }
};


exports.getAllPilots = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { skip, limit, search } = req.query;

        // Set default values for skip, limit, and sort
        const parsedSkip = skip ? parseInt(skip) : 1; // Default to the first page
        const parsedLimit = limit ? parseInt(limit) : 10; // Default page size to 10 careers

        // Calculate the number of records to skip
        const offset = (parsedSkip - 1) * parsedLimit;
        let conditionClause = { status: 'active' }
        if (search) {
            let regex = new RegExp(search, 'i');
            conditionClause.full_name = regex
        }
        // Use countDocuments to get the total count
        const totalCount = await pilotModal.countDocuments({ status: 'active' });

        // Perform an aggregation query to retrieve careers
        const data = await pilotModal.aggregate([
            {
                $match: conditionClause
            },
            {
                $sort: { _id: -1 } // Sort by '_id' in descending order (latest first)
            },
            {
                $skip: offset
            },
            {
                $limit: parsedLimit
            }
        ]);

        // Check if data was found; if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        // Return a success response with the user details
        return successResponseWithPagination(data, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getPilotbyID = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        // Find a pilot by id and active status
        const data = await pilotModal.findOne({ _id: id, status: 'active' })

        // Check if data was found; if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        // Return a success response with the pilot details
        return successResponse(data, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.deletePilot = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        // Find a pilot by id and active status and update the status to inactive, we are just soft deleting the pilot
        const data = await pilotModal.findOneAndUpdate({ _id: id, status: 'active' }, { status: 'inactive' })

        // Check if data was updated or not
        if (data) {
            return successResponseWithoutData('Successfully deleted.', res);
        } else {
            return notFoundResponse('Pilot not found', res)
        }

    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};
exports.uploadMultipleFiles = async (req, res) => {
    try {
        if (req.files && req.files.length > 0) {
            const types = JSON.parse(req.body.type);  // Parsing the type array
            let result = [];
            for (let index = 0; index < req.files.length; index++) {
                let getUrl = await common.fetchS3fileByKey(req.files[index].key, process.env.CHAT_MEDIA_BUCKET);
                console.log(getUrl)
                if (getUrl != '') {
                    req.files[index].location = getUrl;
                }
                // Pairing each file URL with its corresponding type
                result.push({
                    url: req.files[index].location,
                    type: types[index],  // Assuming the order matches the files
                    key: req.files[index].key
                });

            }
            // Return the uploaded URLs along with their types
            return successResponse(result, 'Files uploaded successfully.', res);
        } else {
            return notFoundResponse('No file provided', res);
        }
    } catch (err) {
        console.error(err, "error");
        return errorResponse('Internal Server Error', res);
    }
};

exports.uploadMultipleChatFiles = async (req, res) => {
    try {
        if (req.files && req.files.length > 0) {
            const types = JSON.parse(req.body.type);  // Parsing the type array
            let result = [];
            for (let index = 0; index < req.files.length; index++) {
                console.log('req.files[index]==', req.files[index])
                let getUrl = await common.fetchS3fileByKey(req.files[index].key, process.env.CHAT_MEDIA_BUCKET);
                console.log(getUrl)
                if (getUrl != '') {
                    req.files[index].location = getUrl;
                }
                // Pairing each file URL with its corresponding type
                result.push({
                    url: req.files[index].location,
                    type: types[index],  // Assuming the order matches the files
                    key: req.files[index].key
                });

            }

            // Return the uploaded URLs along with their types
            return successResponse(result, 'Files uploaded successfully.', res);
        } else {
            return notFoundResponse('No file provided', res);
        }
    } catch (err) {
        console.error(err, "error");
        return errorResponse('Internal Server Error', res);
    }
};

exports.uploadAnyFiles = async (req, res) => {
    try {
        if (req.files && req.files.length > 0) {
            // let result = [] //Storing the urls
            // let key;
            // req.files.map((data) => {
            //     key = data.key;
            //     result.push(data.location)
            // })

            // //getting view url
            // let getUrl = await common.fetchS3fileByKey(key, process.env.USER_MEDIA_BUCKET);
            // if (getUrl != '') {
            //     result[0] = getUrl;
            // }

            // //return the uploaded urls for all the files
            // return successResponse(result[0], 'Data fetched successfully.', res);

            let imageUrl;
            let key;
            //get s3 file data
            req.files.map((data) => {
                key = data.key;
                imageUrl = data.location;
            })
            //getting view url
            let getUrl = await common.fetchS3fileByKey(key, process.env.USER_MEDIA_BUCKET);
            if (getUrl != '') {
                imageUrl = getUrl;
            }
            let result = { 'key': key, 'imageUrl': imageUrl }
            //return the uploaded urls for all the files
            return successResponse(result, 'Data fetched successfully.', res);
        } else {
            return notFoundResponse('No file provided', res);

        }
    } catch (err) {
        console.error(err, "errr");
        return errorResponse('Internal Server Error', res);
    }
};

exports.uploadAnyChatFiles = async (req, res) => {
    try {
        if (req.files && req.files.length > 0) {
            let imageUrl;
            let key;
            //get s3 file data
            req.files.map((data) => {
                key = data.key;
                imageUrl = data.location;
            })
            //getting view url
            let getUrl = await common.fetchS3fileByKey(key, process.env.CHAT_MEDIA_BUCKET);
            if (getUrl != '') {
                imageUrl = getUrl;
            }
            let result = { 'key': key, 'imageUrl': imageUrl }
            //return the uploaded urls for all the files
            return successResponse(result, 'Data fetched successfully.', res);
        } else {
            return notFoundResponse('No file provided', res);

        }
    } catch (err) {
        console.error(err, "errr");
        return errorResponse('Internal Server Error', res);
    }
};

exports.addLocation = async (req, res) => {
    try {
        //Insert whole request body in the db
        let location = await state_modal.create(req.body)
        return successResponse(location, 'Data Added Successfully!', res)

    } catch (err) {
        // Handle errors and return an internal server error response
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.getLocation = async (req, res) => {
    try {
        let { skip, limit } = req.query
        let conditionClause = { status: 'active' }
        let data
        if (skip && limit) {
            // Set default values for skip, limit, and sort
            const parsedSkip = parseInt(skip); // Default to the first page
            const parsedLimit = parseInt(limit); // Default page size to 10 careers

            // Calculate the number of records to skip
            const offset = (parsedSkip - 1) * parsedLimit;
            // Perform an aggregation query to retrieve careers
            data = await state_modal.aggregate([
                {
                    $match: conditionClause
                },
                {
                    $sort: { _id: -1 } // Sort by '_id' in descending order (latest first)
                },
                {
                    $skip: offset
                },
                {
                    $limit: parsedLimit
                }
            ]);
        } else {
            // Perform an aggregation query to retrieve careers
            data = await state_modal.aggregate([
                {
                    $match: conditionClause
                },
                {
                    $sort: { _id: -1 } // Sort by '_id' in descending order (latest first)
                }
            ]);
        }
        // Use countDocuments to get the total count
        const totalCount = await state_modal.countDocuments({ status: 'active' });

        // Check if data was found; if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        for (const imageData of data) {
            imageData.filename = imageData.image;
            if (imageData.image) {
                const isUrl = await common.isValidUrl(imageData.image);
                if (isUrl) {
                    const bucketName = await common.checkBucketName(imageData.image);
                    imageData.image = bucketName === process.env.USER_MEDIA_BUCKET
                        ? await common.fetchS3file(imageData.image, process.env.USER_MEDIA_BUCKET)
                        : imageData.image;
                } else {
                    imageData.image = await common.fetchS3fileByKey(imageData.image, process.env.USER_MEDIA_BUCKET);
                }
            }
        }
        // Return a success response with the user details
        return successResponseWithPagination(data, totalCount, 'Data Fetched Successfully.', res);

    } catch (err) {
        console.log("err=", err)
        return internalServerError('Internal Server Error', res);
    }
};
exports.getLocationById = async (req, res) => {
    try {
        let { id } = req.query
        let state = await state_modal.findOne({ _id: id, status: "active" })
        return successResponse(state, 'Data Fetched Successfully!', res)

    } catch (err) {
        // Handle errors and return an internal server error response
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.updateLocation = async (req, res) => {
    try {
        //Storing all the fields to an array
        const fieldsToUpdate = [
            'city_name', 'airport_abbreviation', 'lat', 'long', 'image', 'state_name', 'airport_name', 'iata_code', 'icao_code', 'address', 'image_type'
        ];

        const updatedFields = {};
        fieldsToUpdate.forEach(field => {
            if (req.body[field]) updatedFields[field] = req.body[field];
        });

        const { location_id } = req.body;

        //Updated the location on the basis of location id and active status
        const updatelocation = await state_modal.findOneAndUpdate(
            { _id: location_id, status: 'active' },
            updatedFields,
            { new: true }
        );

        if (updatelocation) {
            return successResponse(updatelocation, 'Data Updated Successfully.', res);
        } else {
            return notFoundResponse('Location Not found', res);
        }

    } catch (err) {
        // Handle errors and return an internal server error response
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.deleteLocation = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        // Find a location by id and active status and update the status to inactive, we are just soft deleting the location
        const data = await state_modal.findOneAndUpdate({ _id: id, status: 'active' }, { status: 'inactive' })

        // Check if data was updated or not
        if (data) {
            return successResponseWithoutData('Successfully deleted.', res);
        } else {
            return notFoundResponse('Location not found', res)
        }

    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};
// Controller function to get list of membership
exports.membershipList = async (req, res) => {
    try {
        // Retrieve only id and name fields for active memberships
        const response = await membershipModal.find({ status: 'active' }, 'id name');

        // Check if any memberships were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        // Return a success response with the list of memberships
        return successResponse(response, 'Memberships retrieved successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.error(err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.addRoute = async (req, res) => {
    try {
        //Insert whole request body in the db
        let route = await routeModal.create(req.body)
        return successResponse(route, 'Data Added Successfully!', res)

    } catch (err) {
        return internalServerError('Internal Server Error', res);
    }
};

exports.updateRoute = async (req, res) => {
    try {
        const { route_id, toCity, fromCity } = req.body;

        //Check for To city and From city, it cannot be same if same then send error message
        if (toCity && fromCity && toCity == fromCity) return failMessage('To and From cities cannot be same.', res)

        let route = await routeModal.findById({ _id: route_id })
        if (!route) return failMessage('No route found.', res)

        //Storing all the fields to an array
        const fieldsToUpdate = ['route_name', 'toCity', 'fromCity'];

        const updatedFields = {};
        fieldsToUpdate.forEach(field => {
            if (req.body[field]) updatedFields[field] = req.body[field];
        });

        //Updated the route on the basis of route id and active status
        const updateroute = await routeModal.findOneAndUpdate(
            { _id: route_id, status: 'active' },
            updatedFields,
            { new: true }
        );

        return successResponse(updateroute, 'Data Updated Successfully.', res);

    } catch (error) {
        console.error('Error in updating route:', error);
        return errorResponse('Internal Server Error', res);
    }
};


exports.getAllRoutes = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { skip, limit, search } = req.query;

        // Set default values for skip, limit, and sort
        const parsedSkip = skip ? parseInt(skip) : 1; // Default to the first page
        const parsedLimit = limit ? parseInt(limit) : 10; // Default page size to 10 routes

        // Calculate the number of records to skip
        const offset = (parsedSkip - 1) * parsedLimit;

        // Define a match query for the pilot_name search
        const matchQuery = {};
        if (search) {
            matchQuery.route_name = { $regex: new RegExp(search, 'i') }; // Case-insensitive search
        }

        // Use countDocuments to get the total count
        const totalCount = await routeModal.countDocuments({ status: 'active', ...matchQuery });

        // Perform an aggregation query to retrieve routes with pagination and search
        const data = await routeModal.aggregate([
            {
                $match: { status: 'active', ...matchQuery },
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "fromCity",
                    foreignField: "_id",
                    as: "fromCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$fromCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "toCity",
                    foreignField: "_id",
                    as: "toCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$toCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    route_name: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    fromCity_name: { $ifNull: ["$fromCityDetails.city_name", "Unknown"] },
                    fromCity_airport_abbreviation: { $ifNull: ["$fromCityDetails.airport_abbreviation", "Unknown"] },
                    fromCity_lat: { $ifNull: ["$fromCityDetails.lat", 0] },
                    fromCity_long: { $ifNull: ["$fromCityDetails.long", 0] },
                    toCity_name: { $ifNull: ["$toCityDetails.city_name", "Unknown"] },
                    toCity_airport_abbreviation: { $ifNull: ["$toCityDetails.airport_abbreviation", "Unknown"] },
                    toCity_lat: { $ifNull: ["$toCityDetails.lat", 0] },
                    toCity_long: { $ifNull: ["$toCityDetails.long", 0] }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            { $skip: offset }, // Skip records based on pagination
            { $limit: parsedLimit } // Limit the number of records based on pagination
        ]).exec(); // Use .exec() to execute the aggregation

        // Check if data was found; if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        // Return a success response with the route details
        return successResponseWithPagination(data, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getRoutebyID = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        // Find a route by id and active status
        const data = await routeModal.aggregate([
            {
                $match: { _id: toObjectId(id), status: 'active' }
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "fromCity",
                    foreignField: "_id",
                    as: "fromCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$fromCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "toCity",
                    foreignField: "_id",
                    as: "toCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$toCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    route_name: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    fromCityId: { $ifNull: ["$fromCityDetails._id", "Unknown"] },
                    fromCity: { $ifNull: ["$fromCityDetails.city_name", "Unknown"] },
                    fromCity_airport_abbreviation: { $ifNull: ["$fromCityDetails.airport_abbreviation", "Unknown"] },
                    fromCity_lat: { $ifNull: ["$fromCityDetails.lat", 0] },
                    fromCity_long: { $ifNull: ["$fromCityDetails.long", 0] },
                    toCityId: { $ifNull: ["$toCityDetails._id", "Unknown"] },
                    toCity: { $ifNull: ["$toCityDetails.city_name", "Unknown"] },
                    toCity_airport_abbreviation: { $ifNull: ["$toCityDetails.airport_abbreviation", "Unknown"] },
                    toCity_lat: { $ifNull: ["$toCityDetails.lat", 0] },
                    toCity_long: { $ifNull: ["$toCityDetails.long", 0] }
                }
            },
        ]);

        // Check if data was found; if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        // Return a success response with the pilot details
        return successResponse(data[0], 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.deleteRoute = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        // Find a Route by id and active status and update the status to inactive, we are just soft deleting the Route
        const data = await routeModal.findOneAndUpdate({ _id: id, status: 'active' }, { status: 'inactive' })

        // Check if data was updated or not
        if (data) {
            return successResponseWithoutData('Successfully deleted.', res);
        } else {
            return notFoundResponse('Route not found', res)
        }

    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};
async function createFlightForDate(dates, flight_name, route, recurrLastDate, takeoff_time, landing_time, pilot, copilot, aircraftAssignment, lastMaintenanceDate, diff) {
    try {
        const flightsData = await Promise.all(dates.map(async (date) => {
            console.log('date==', date)
            const routeData = await routeModal.aggregate([
                {
                    $match: {
                        _id: toObjectId(route)
                    }
                },
                {
                    $lookup: {
                        from: "locations",
                        localField: "fromCity",
                        foreignField: "_id",
                        as: "fromCityDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$fromCityDetails",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "locations",
                        localField: "toCity",
                        foreignField: "_id",
                        as: "toCityDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$toCityDetails",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        fromCity_name: { $ifNull: ["$fromCityDetails.city_name", "Unknown"] },
                        fromCity_airport_abbreviation: { $ifNull: ["$fromCityDetails.airport_abbreviation", "Unknown"] },
                        fromCity_lat: { $ifNull: ["$fromCityDetails.lat", 0] },
                        fromCity_long: { $ifNull: ["$fromCityDetails.long", 0] },
                        fromCity_timezone: { $ifNull: ["$fromCityDetails.timezone", ''] },
                        toCity_name: { $ifNull: ["$toCityDetails.city_name", "Unknown"] },
                        toCity_airport_abbreviation: { $ifNull: ["$toCityDetails.airport_abbreviation", "Unknown"] },
                        toCity_lat: { $ifNull: ["$toCityDetails.lat", 0] },
                        toCity_long: { $ifNull: ["$toCityDetails.long", 0] },
                        toCity_timezone: { $ifNull: ["$toCityDetails.timezone", ''] }
                    }
                }
            ]);
            //console.log('routeData==',routeData)
            let flight_takeoff_utcdatetime;
            let flight_landing_utcdatetime;
            for (let i = 0; i < routeData.length; i++) {
                const newdate = new Date(date);
                console.log("newdate==", newdate)
                // Extract the year, month, and day from the date
                const year = newdate.getUTCFullYear();
                const month = String(newdate.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
                const day = String(newdate.getUTCDate()).padStart(2, '0');
                // Combine the date with the takeoff time
                const fromDateTime = `${year}-${month}-${day}T${takeoff_time}`;
                console.log("fromDateTime==", fromDateTime)
                const fromtimeZone = routeData[i].fromCity_timezone; // Specify your timezone
                // Convert to UTC
                const fromUtcDate = momentTimezone.tz(fromDateTime, fromtimeZone).utc();
                console.log("fromUtcDate==", fromUtcDate)
                // Combine the date with the takeoff time
                const toDateTime = `${year}-${month}-${day}T${landing_time}`;
                const totimeZone = routeData[i].toCity_timezone; // Specify your timezone
                // Convert to UTC
                const toUtcDate = momentTimezone.tz(toDateTime, totimeZone).utc();

                flight_takeoff_utcdatetime = fromUtcDate.format(),
                    flight_landing_utcdatetime = toUtcDate.format()


            }

            return {
                flight_name,
                route,
                day: getDayName(date.getDay()), // Store the day of the week for the flight
                isRecurr: true,
                recurrLastDate,
                flight_takeoff_date: date, // Set the flight takeoff date to the current date
                takeoff_time,
                landing_time,
                pilot,
                copilot,
                aircraftAssignment,
                lastMaintenanceDate,
                NextMaintenanceIn: diff,
                flight_takeoff_utcdatetime,
                flight_landing_utcdatetime
            };
        }));
        // const flightsData = dates.map(date => ({
        //     flight_name,
        //     route,
        //     day: getDayName(date.getDay()), // Store the day of the week for the flight
        //     isRecurr: true,
        //     recurrLastDate,
        //     flight_takeoff_date: date, // Set the flight takeoff date to the current date
        //     takeoff_time,
        //     landing_time,
        //     pilot,
        //     copilot,
        //     aircraftAssignment,
        //     lastMaintenanceDate,
        //     NextMaintenanceIn: diff
        // }));

        // Bulk insert flights
        const flights = await flightModal.insertMany(flightsData);

        // // Extract flight IDs
        const flightIds = flights.map(flight => flight._id.valueOf());

        // // Insert seats record in flight_seat_mapping for the newly created flights
        await flight_seat_mapping.insertMany(flightIds.map(flight_id => ({ flight_id })));
    } catch (error) {
        console.error('Error creating flights:', error);
    }
}


// Function to get the name of the day from its index (0-6)
function getDayName(dayIndex) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return daysOfWeek[dayIndex];
}
exports.addFlights = async (req, res) => {
    try {
        let {
            flight_name,
            route,
            day,
            isRecurr,
            recurrLastDate,
            flight_takeoff_date,
            takeoff_time,
            landing_time,
            pilot,
            copilot,
            aircraftAssignment,
            lastMaintenanceDate,
            timezone
        } = req.body;
        // const combinedDateTime = moment(`${flight_takeoff_date}T${takeoff_time}`);
        // const combinedDateTimeAsDate = combinedDateTime.toDate();
        // // const indiaTime = momentTimezone.tz(combinedDateTimeAsDate, timezone);
        // // const utcTime = indiaTime.utc();

        // flight_takeoff_date=utcTime
        // flight_takeoff_date = utcTime.format('YYYY-MM-DD'); // Extract date
        // takeoff_time = utcTime.format('HH:mm'); // Extract time

        if (isRecurr && !recurrLastDate) {
            return failMessage('Please enter the recurring last date.', res);
        }

        if (isRecurr && recurrLastDate) {
            const currTime = Date.now();
            console.log('recurrLastDate==', recurrLastDate)
            const recurrLastDateTime = new Date(recurrLastDate).setHours(0, 0, 0, 0);
            console.log('recurrLastDateTime==', recurrLastDateTime)
            let LastDate = new Date(recurrLastDateTime)
            console.log('LastDate==', LastDate)
            const diff = Math.round((recurrLastDateTime - currTime) / (1000 * 60 * 60));

            if (recurrLastDateTime < currTime) {
                return failMessage('Please enter a recurring last date greater than the current date.', res);
            }
            flight_takeoff_date = new Date(flight_takeoff_date)
            let dates = []
            console.log(flight_takeoff_date, '<=', LastDate)
            // Iterate over the dates until the end date is reached
            while (flight_takeoff_date <= LastDate) {
                console.log(flight_takeoff_date, '=====', LastDate)
                console.log('flight_takeoff_d==', flight_takeoff_date)
                // Check if the current day matches any of the days in the recurrence pattern
                let currentDay = flight_takeoff_date.getDay(); // Sunday: 0, Monday: 1, ..., Saturday: 6
                console.log('currentDay==', currentDay)
                if (day.includes(getDayName(currentDay))) {
                    console.log('flight_takeoff_date==', flight_takeoff_date)
                    dates.push(new Date(flight_takeoff_date))
                }

                // Move to the next date based on the recurrence pattern
                flight_takeoff_date.setDate(flight_takeoff_date.getDate() + 1);
                console.log('flight_tate==', flight_takeoff_date)
            }
            await createFlightForDate(dates, flight_name, route, recurrLastDate, takeoff_time, landing_time, pilot, copilot, aircraftAssignment, lastMaintenanceDate, diff);
        } else {
            const routeData = await routeModal.aggregate([
                {
                    $match: {
                        _id: toObjectId(route)
                    }
                },
                {
                    $lookup: {
                        from: "locations",
                        localField: "fromCity",
                        foreignField: "_id",
                        as: "fromCityDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$fromCityDetails",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "locations",
                        localField: "toCity",
                        foreignField: "_id",
                        as: "toCityDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$toCityDetails",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        fromCity_name: { $ifNull: ["$fromCityDetails.city_name", "Unknown"] },
                        fromCity_airport_abbreviation: { $ifNull: ["$fromCityDetails.airport_abbreviation", "Unknown"] },
                        fromCity_lat: { $ifNull: ["$fromCityDetails.lat", 0] },
                        fromCity_long: { $ifNull: ["$fromCityDetails.long", 0] },
                        fromCity_timezone: { $ifNull: ["$fromCityDetails.timezone", ''] },
                        toCity_name: { $ifNull: ["$toCityDetails.city_name", "Unknown"] },
                        toCity_airport_abbreviation: { $ifNull: ["$toCityDetails.airport_abbreviation", "Unknown"] },
                        toCity_lat: { $ifNull: ["$toCityDetails.lat", 0] },
                        toCity_long: { $ifNull: ["$toCityDetails.long", 0] },
                        toCity_timezone: { $ifNull: ["$toCityDetails.timezone", ''] }
                    }
                }
            ]);
            //console.log('routeData==',routeData)
            let flight_takeoff_utcdatetime;
            let flight_landing_utcdatetime;
            for (let i = 0; i < routeData.length; i++) {
                const date = new Date(flight_takeoff_date);
                // Extract the year, month, and day from the date
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
                const day = String(date.getUTCDate()).padStart(2, '0');
                // Combine the date with the takeoff time
                const fromDateTime = `${year}-${month}-${day}T${takeoff_time}`;
                const fromtimeZone = routeData[i].fromCity_timezone; // Specify your timezone
                // Convert to UTC
                const fromUtcDate = momentTimezone.tz(fromDateTime, fromtimeZone).utc();
                // Combine the date with the takeoff time
                const toDateTime = `${year}-${month}-${day}T${landing_time}`;
                const totimeZone = routeData[i].toCity_timezone; // Specify your timezone
                // Convert to UTC
                const toUtcDate = momentTimezone.tz(toDateTime, totimeZone).utc();

                flight_takeoff_utcdatetime = fromUtcDate.format(),
                    flight_landing_utcdatetime = toUtcDate.format()


            }
            // Create flight record in the flightModal without NextMaintenanceIn
            let flight = await flightModal.create({
                flight_name,
                route,
                day,
                isRecurr,
                flight_takeoff_date,
                takeoff_time,
                landing_time,
                pilot,
                copilot,
                aircraftAssignment,
                lastMaintenanceDate,
                flight_takeoff_utcdatetime,
                flight_landing_utcdatetime
            });

            // Insert seats record in flight_seat_mapping for the newly created flight
            await flight_seat_mapping.create({
                flight_id: flight._id.valueOf()
            });
        }

        return successResponseWithoutData('Data Added Successfully!', res);
    } catch (err) {
        console.log('err=', err);
        return internalServerError('Internal Server Error', res);
    }
};
exports.updateFlight = async (req, res) => {
    try {
        const { flight_id, isRecurr, recurrLastDate } = req.body;

        //Check for recurring last date, it cannot be empty if isRecurr is true
        if (isRecurr && !recurrLastDate) {
            return failMessage('Please enter the recurring last date.', res);
        }
        const updatedFields = {};

        if (isRecurr && recurrLastDate) {
            const currTime = Date.now();
            const recurrLastDateTime = new Date(recurrLastDate).setHours(0, 0, 0, 0);
            const diff = Math.round((recurrLastDateTime - currTime) / (1000 * 60 * 60));

            if (recurrLastDateTime < currTime) {
                return failMessage('Please enter a recurring last date greater than the current date.', res);
            }
            updatedFields.NextMaintenanceIn = diff
        }

        //Storing all the fields to an array
        const fieldsToUpdate = ['flight_name', 'route', 'day', 'isRecurr', 'flight_takeoff_date', 'takeoff_time', 'landing_time', 'pilot', 'copilot', 'aircraftAssignment', 'lastMaintenanceDate'];
        if (req.body.isRecurr == false) {
            updatedFields.isRecurr = false
        }
        fieldsToUpdate.forEach(field => {
            if (req.body[field]) {
                updatedFields[field] = req.body[field];
            }
        });

        //Updated the flight on the basis of flight id and active status
        const updateflight = await flightModal.findOneAndUpdate(
            { _id: flight_id, status: 'active' },
            updatedFields,
            { new: true }
        );

        return successResponse(updateflight, 'Data Updated Successfully.', res);

    } catch (error) {
        console.error('Error in updating flight:', error);
        return errorResponse('Internal Server Error', res);
    }
};
exports.getAllFlights = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { skip, limit, search } = req.query;

        // Set default values for skip, limit, and sort
        const parsedSkip = skip ? parseInt(skip) : 1; // Default to the first page
        const parsedLimit = limit ? parseInt(limit) : 10; // Default page size to 10 flights

        // Calculate the number of records to skip
        const offset = (parsedSkip - 1) * parsedLimit;

        // Define a match query for the flight_name search
        const matchQuery = { status: 'active' };
        if (search) {
            matchQuery.flight_name = { $regex: new RegExp(search, 'i') }; // Case-insensitive search
        }

        // Use countDocuments to get the total count
        const totalCount = await flightModal.countDocuments(matchQuery);

        // Perform an aggregation query to retrieve flights with pagination, search, and sorting
        const data = await flightModal.aggregate([
            {
                $match: matchQuery
            },
            {
                $lookup: {
                    from: "routes",
                    localField: "route",
                    foreignField: "_id",
                    as: "routeDetails"
                }
            },
            {
                $unwind: "$routeDetails"
            },
            {
                $lookup: {
                    from: "pilots",
                    localField: "pilot",
                    foreignField: "_id",
                    as: "pilotDetails"
                }
            },
            {
                $unwind: "$pilotDetails"
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "routeDetails.fromCity",
                    foreignField: "_id",
                    as: "fromCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$fromCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "routeDetails.toCity",
                    foreignField: "_id",
                    as: "toCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$toCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    booking_status: 1,
                    Total_pet_price_with_gst: 1,
                    flight_name: "$flight_name",
                    route_name: "$routeDetails.route_name",
                    flight_takeoff_date: "$flight_takeoff_date",
                    takeoff_time: "$takeoff_time",
                    landing_time: "$landing_time",
                    pilot_name: "$pilotDetails.full_name",
                    copilot_name: "$copilot",
                    pilot_id: "$pilot",
                    fromCity_name: { $ifNull: ["$fromCityDetails.city_name", "Unknown"] },
                    fromCity_airport_abbreviation: { $ifNull: ["$fromCityDetails.airport_abbreviation", "Unknown"] },
                    fromCity_lat: { $ifNull: ["$fromCityDetails.lat", 0] },
                    fromCity_long: { $ifNull: ["$fromCityDetails.long", 0] },
                    toCity_name: { $ifNull: ["$toCityDetails.city_name", "Unknown"] },
                    toCity_airport_abbreviation: { $ifNull: ["$toCityDetails.airport_abbreviation", "Unknown"] },
                    toCity_lat: { $ifNull: ["$toCityDetails.lat", 0] },
                    toCity_long: { $ifNull: ["$toCityDetails.long", 0] },
                    status: 1,
                    createdAt: 1,
                    route: 1,
                    isRecurr: 1,
                    recurrLastDate: 1,
                    day: 1,
                    copilot: 1,
                    pilot: 1,
                    lastMaintenanceDate: 1,
                    aircraftAssignment: 1
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            { $skip: offset }, // Skip records based on pagination
            { $limit: parsedLimit } // Limit the number of records based on pagination
        ]);

        // Check if data was found; if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        // Return a success response with the flight details
        return successResponseWithPagination(data, totalCount, 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.getFlightbyID = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        // Find a flight by id and active status
        const data = await flightModal.aggregate([
            {
                $match: { _id: toObjectId(id), status: 'active' }
            },
            {
                $lookup: {
                    from: "routes",
                    localField: "route",
                    foreignField: "_id",
                    as: "routeDetails"
                }
            },
            {
                $unwind: "$routeDetails"
            },
            {
                $lookup: {
                    from: "pilots",
                    localField: "pilot",
                    foreignField: "_id",
                    as: "pilotDetails"
                }
            },
            {
                $unwind: "$pilotDetails"
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "routeDetails.fromCity",
                    foreignField: "_id",
                    as: "fromCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$fromCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "locations",
                    localField: "routeDetails.toCity",
                    foreignField: "_id",
                    as: "toCityDetails"
                }
            },
            {
                $unwind: {
                    path: "$toCityDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    booking_status: 1,
                    Total_pet_price_with_gst: 1,
                    flight_name: "$flight_name",
                    route_name: "$routeDetails.route_name",
                    flight_takeoff_date: "$flight_takeoff_date",
                    takeoff_time: "$takeoff_time",
                    landing_time: "$landing_time",
                    pilot_name: "$pilotDetails.full_name",
                    copilot_name: "$copilot",
                    pilot_id: "$pilot",
                    fromCity_name: { $ifNull: ["$fromCityDetails.city_name", "Unknown"] },
                    fromCity_airport_abbreviation: { $ifNull: ["$fromCityDetails.airport_abbreviation", "Unknown"] },
                    fromCity_lat: { $ifNull: ["$fromCityDetails.lat", 0] },
                    fromCity_long: { $ifNull: ["$fromCityDetails.long", 0] },
                    toCity_name: { $ifNull: ["$toCityDetails.city_name", "Unknown"] },
                    toCity_airport_abbreviation: { $ifNull: ["$toCityDetails.airport_abbreviation", "Unknown"] },
                    toCity_lat: { $ifNull: ["$toCityDetails.lat", 0] },
                    toCity_long: { $ifNull: ["$toCityDetails.long", 0] },
                    status: 1,
                    createdAt: 1,
                    route: 1,
                    isRecurr: 1,
                    recurrLastDate: 1,
                    day: 1,
                    copilot: 1,
                    pilot: 1,
                    lastMaintenanceDate: 1,
                    aircraftAssignment: 1

                }
            },

        ]);

        // Check if data was found; if not, return an empty response
        if (!data || data.length === 0) {
            return emptyResponse(data, res);
        }

        // Return a success response with the flight details
        return successResponse(data[0], 'Data Fetched Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};
exports.deleteFlight = async (req, res) => {
    try {
        // Destructure the properties you need from the request object
        const { id } = req.query;

        // Find a flight by id and active status and update the status to inactive, we are just soft deleting the flight
        const data = await flightModal.findOneAndUpdate({ _id: id, status: 'active' }, { status: 'inactive' })
        const flightseat = await flight_seat_mapping.findOneAndUpdate({ flight_id: id, status: 'active' }, { status: 'inactive' })

        // Check if data was updated or not
        if (data && flightseat) {
            return successResponseWithoutData('Successfully deleted.', res);
        } else {
            return notFoundResponse('Flight not found', res)
        }

    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};
exports.addPet = async (req, res) => {
    try {
        const admin_id = req.payload._id;
        const userId = req.body.userId;

        const existingPets = await userModal.aggregate([
            {
                $match: { _id: userId }
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

        const userPetsCount = existingPets[0]?.pets?.length || 0;

        if (userPetsCount >= 2) {
            return notFoundResponse('User can add only 2 pets!', res);
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
            distemper_vaccine_valid_to_date = ""
        } = req.body;

        if (pet_weight > 40) {
            return failMessage("Your pet exceeds the combined weight of 40kg for us to safely transport on-board!", res);
        }

        if (pet_liability_signature) {
            const base64signature = pet_liability_signature;
            const uploadBase64 = require("../controllers/v2/upload");
            pet_liability_signature = await uploadBase64.uploadBase64FileToS3(base64signature);
        }
        //req.files.find(file => file.fieldname === 'pet_image')?.location
        //req.files.find(file => file.fieldname === 'assistance_animal_proof')?.location
        const newPetData = {
            admin_id,
            user_id: userId,
            pet_image: req.body.pet_image ? pet_image : req.files.find(file => file.fieldname === 'pet_image')?.key,
            type_of_pet: pet_type,
            admin_id: req.payload._id,
            pet_name,
            //pet_breed: JSON.parse(pet_breed),
            pet_breed: pet_breed,
            pet_weight,
            pet_liability_signature,
            assistance_animal_proof: req.body.assistance_animal_proof ? assistance_animal_proof : req.files.find(file => file.fieldname === 'assistance_animal_proof')?.key,
            Bio: bio,
            vets_name,
            state,
            vets_license_no,
            vets_license_date,
            rabbies_vaccine_date,
            rabbies_vaccine_valid_to_date,
            distemper_vaccine_date,
            distemper_vaccine_valid_to_date
        };

        if (!state) {
            delete newPetData.state;
        }

        const newPet = await userPetMappingModel.create(newPetData);

        const petProfileComplete =
            newPet.distemper_vaccine_valid_to_date &&
            newPet.distemper_vaccine_date &&
            newPet.rabbies_vaccine_valid_to_date &&
            newPet.rabbies_vaccine_date &&
            newPet.vets_license_date &&
            newPet.vets_license_no &&
            newPet.state &&
            newPet.pet_image &&
            newPet.type_of_pet &&
            newPet.pet_breed.length > 0 &&
            newPet.pet_weight &&
            newPet.pet_liability_signature &&
            newPet.vets_name;

        if (petProfileComplete) {
            await userPetMappingModel.updateOne({ _id: newPet._id }, { pet_profile_completed: true });
        }

        return successResponseWithoutData("Pet added successfully!", res);
    } catch (err) {
        console.error(err); // Log detailed error information
        return internalServerError('Internal Server Error', res);
    }
};

exports.editPet = async (req, res) => {
    try {
        const { petId } = req.body;

        // Fetch existing pet data by ID
        const existingPet = await userPetMappingModel.findById(petId);
        if (!existingPet) {
            return notFoundResponse('Pet not found!', res);
        }
        //req.files.find(file => file.fieldname === 'pet_image')?.location
        //req.files.find(file => file.fieldname === 'assistance_animal_proof')?.location
        // Extract file locations from req.files or use defaults
        const pet_image = req.body.pet_image ? req.body.pet_image : (req.files.find(file => file.fieldname === 'pet_image')?.key || '');
        const assistance_animal_proof = req.body.assistance_animal_proof ? req.body.assistance_animal_proof : (req.files.find(file => file.fieldname === 'assistance_animal_proof')?.key || '');

        // Update pet data with the request body
        const {
            pet_type = existingPet.type_of_pet,
            pet_name = existingPet.pet_name,
            pet_breed = existingPet.pet_breed,
            pet_weight = existingPet.pet_weight,
            pet_liability_signature = existingPet.pet_liability_signature,
            bio = existingPet.Bio,
            vets_name = existingPet.vets_name,
            state = existingPet.state,
            vets_license_no = existingPet.vets_license_no,
            vets_license_date = existingPet.vets_license_date,
            rabbies_vaccine_date = existingPet.rabbies_vaccine_date,
            rabbies_vaccine_valid_to_date = existingPet.rabbies_vaccine_valid_to_date,
            distemper_vaccine_date = existingPet.distemper_vaccine_date,
            distemper_vaccine_valid_to_date = existingPet.distemper_vaccine_valid_to_date
        } = req.body;

        // Check pet weight limit
        if (pet_weight > 40) {
            return failMessage("Your pet exceeds the combined weight of 40kg for us to safely transport on-board!", res);
        }

        // Upload pet liability signature if provided
        let pet_liability = existingPet.pet_liability_signature;
        if (pet_liability_signature) {
            const uploadBase64 = require("../controllers/v2/upload");
            const base64signature = pet_liability_signature;
            pet_liability = await uploadBase64.uploadBase64FileToS3(base64signature);
        }

        // Prepare updated pet data
        const updatedPetData = {
            pet_image: pet_image,
            type_of_pet: pet_type,
            pet_name,
            //pet_breed: JSON.parse(pet_breed),
            pet_breed: pet_breed,
            pet_weight,
            admin_id: req.payload._id,
            pet_liability_signature: pet_liability,
            assistance_animal_proof: assistance_animal_proof,
            Bio: bio,
            vets_name,
            state,
            vets_license_no,
            vets_license_date,
            rabbies_vaccine_date,
            rabbies_vaccine_valid_to_date,
            distemper_vaccine_date,
            distemper_vaccine_valid_to_date
        };

        // Remove 'state' field if not provided
        if (!state) {
            delete updatedPetData.state;
        }

        // Update the existing pet data
        await userPetMappingModel.findByIdAndUpdate(petId, updatedPetData);

        return successResponseWithoutData('Pet updated successfully!', res);
    } catch (err) {
        console.error(err);
        return internalServerError('Internal Server Error', res);
    }
};

exports.enquiries = async (req, res) => {
    try {
        const { type } = req.query;


        // Query the database based on the provided 'type'
        const enquiries = await enquiryModal
            .find({ type })
            .populate({
                path: 'relatedEnquiry',
                model: 'enQuiryList',
                select: 'name'
            })
            .exec();

        // Manually construct the desired response format
        const formattedEnquiries = enquiries.map(enquiry => {
            const relatedEnquiry = enquiry.relatedEnquiry || {}; // Handle null relatedEnquiry

            return {
                _id: enquiry._id,
                firstName: enquiry.firstName,
                lastName: enquiry.lastName,
                subject: enquiry.subject,
                email: enquiry.email,
                enQuiry: enquiry.enQuiry,
                phone: enquiry.phone,
                relatedEnquiryName: relatedEnquiry.name || 'N/A', // Provide a default value if name is null
                type: enquiry.type,
                status: enquiry.status,
                createdAt: enquiry.createdAt,
                updatedAt: enquiry.updatedAt,
            };
        });
        // Respond with the list of enquiries
        return successResponseWithPagination(formattedEnquiries, formattedEnquiries.length, 'Data Fetched Successfully.', res);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateReadStatus = async (req, res) => {
    try {
        const adminId = req.payload._id;
        const enquiryId = req.body.id;

        // Check if the Enquiry exists
        const existingEnquiry = await enquiryModal.findById(enquiryId);
        if (!existingEnquiry) {
            return notFoundResponse('Enquiry not found', res);
        }

        // Get isRead and type from the request
        let { isRead, type, status } = req.body;



        // Update type if it has a value in the request
        if (type) {
            existingEnquiry.type = type;
        }

        // Update isRead if it has a value in the request
        if (typeof isRead !== 'undefined') {
            existingEnquiry.isRead = isRead;
            const adminName = await adminModal.findById(adminId);
            if (adminName) {
                const readBy = `${adminName.first_name} ${adminName.last_name}`;

                existingEnquiry.readBy = readBy;
                existingEnquiry.isRead = 'true';
            }
        }
        if (isRead == 'false') {
            existingEnquiry.readBy = '';
            existingEnquiry.isRead = 'false';


        }
        // Convert empty string to false for isRead
        if (isRead === '') {
            isRead = 'false';
        }

        // Update status if it has a value in the request
        if (status) {
            existingEnquiry.status = status;
        }

        // Save the updated enquiry to the database
        await existingEnquiry.save();

        // Respond with success
        return successResponseWithoutData('Updated successfully', res);
    } catch (error) {
        console.error(error);
        // Handle other types of errors
        return internalServerError('Internal Server Error.', res);
    }
};


exports.addHomePage = async (req, res) => {
    try {
        const existingHomePage = await homePageModal.find();
        let resp;
        let homePageData = {};

        const {
            frame1Logo,
            frame1Video,
            frame2Text,
            frame2Video,
            frame2Card,
            frame3Logo,
            frame3Video,
            frame4Text,
            frame4Card,
            frame5Video,
            frame6Card,
            frame7Video,
            frame7Text,
            frame8Text
        } = req.body;

        homePageData = {
            frame1Logo: req.body.frame1Logo ? frame1Logo : req.files.find(file => file.fieldname === 'frame1Logo')?.key,
            frame1Video: req.body.frame1Video ? frame1Video : req.files.find(file => file.fieldname === 'frame1Video')?.key,
            frame2Text,
            frame2Video: req.body.frame2Video ? frame2Video : req.files.find(file => file.fieldname === 'frame2Video')?.key,
            frame2Card: JSON.parse(frame2Card),
            frame3Video: req.body.frame3Video ? frame3Video : req.files.find(file => file.fieldname === 'frame3Video')?.key,
            frame3Logo: req.body.frame3Logo ? frame3Logo : req.files.find(file => file.fieldname === 'frame3Logo')?.key,
            frame4Text,
            frame4Card: JSON.parse(frame4Card),
            frame5Video: req.body.frame5Video ? frame5Video : req.files.find(file => file.fieldname === 'frame5Video')?.key,
            frame6Card: JSON.parse(frame6Card),
            frame7Video: req.body.frame7Video ? frame7Video : req.files.find(file => file.fieldname === 'frame7Video')?.key,
            frame7Text,
            frame8Text
        };

        if (existingHomePage.length <= 0) {
            // Create a new HomePage instance
            const newHomePage = new homePageModal(homePageData);

            // Save the new HomePage to the database
            resp = await newHomePage.save();
        } else {
            // Update the existing HomePage
            resp = await homePageModal.findOneAndUpdate({ _id: existingHomePage[0]._id }, homePageData, { new: true });
        }

        // Respond with a success message and the updated or newly created record
        return successResponse(resp, 'Success', res);
    } catch (error) {
        console.error(error);
        // Generic internal server error
        return internalServerError('Internal Server Error.', res);
    }
};


exports.editHomePage = async (req, res) => {
    try {
        // Extract data from the request body
        const {
            frame1Logo,
            frame1Video,
            frame2Text,
            frame2Video,
            fram2Card,
            frame3Text,
            frame3Video,
            frame4Text,
            fram4Card,
            frame5Video,
            fram6Card,
            frame7Video,
            frame7Text,
            frame8Text,
            status
        } = req.body;

        // Find the HomePage by ID
        const homePage = await homePageModal.findById(req.params.id);

        // If HomePage is not found, return an error
        if (!homePage) {
            return notFoundResponse('HomePage not found', res);
        }

        // Update the HomePage fields
        homePage.frame1Logo = req.files.frame1Logo ? req.files.frame1Logo[0].key : homePage.frame1Logo;
        homePage.frame1Video = req.files.frame1Video ? req.files.frame1Video[0].key : homePage.frame1Video;
        homePage.frame2Text = frame2Text || homePage.frame2Text;
        homePage.frame2Video = req.files.frame2Video ? req.files.frame2Video[0].key : homePage.frame2Video;
        homePage.fram2Card = fram2Card || homePage.fram2Card;
        homePage.frame3Text = frame3Text || homePage.frame3Text;
        homePage.frame3Video = req.files.frame3Video ? req.files.frame3Video[0].key : homePage.frame3Video;
        homePage.frame4Text = frame4Text || homePage.frame4Text;
        homePage.fram4Card = fram4Card || homePage.fram4Card;
        homePage.frame5Video = req.files.frame5Video ? req.files.frame5Video[0].key : homePage.frame5Video;
        homePage.fram6Card = fram6Card || homePage.fram6Card;
        homePage.frame7Video = req.files.frame7Video ? req.files.frame7Video[0].key : homePage.frame7Video;
        homePage.frame7Text = frame7Text || homePage.frame7Text;
        homePage.frame8Text = frame8Text || homePage.frame8Text;
        homePage.status = status || homePage.status;

        // Save the updated HomePage to the database
        await homePage.save();

        // Respond with success
        return successResponse(homePage, 'HomePage updated successfully', res);
    } catch (error) {
        console.error(error);
        // Generic internal server error
        return internalServerError(res, 500, 'Internal Server Error');
    }
};


exports.getIndustry = async (req, res) => {
    try {
        // Retrieve the list of industry from the database

        // Use the industryModel to find all industry in the collection
        const response = await industryModal.find({});

        // Check if any industry were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        // Return a success response with the list of industry
        return successResponse(response, 'industry get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}


exports.breedList = async (req, res) => {
    try {
        let response = await petsModal.find()

        // Check if any petBreed were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        // Return a success response with the list of petBreed
        return successResponse(response, 'pet breed get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.stateList = async (req, res) => {
    try {
        // Retrieve the list of state from the database
        let get_state_data = await state_modal.find({});

        // Return a success response with the list of states
        return successResponse(get_state_data, "Data fetched successfully!", res)

    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.user_jobs_list = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit, search } = req.query;

        const query = {};

        // If search query is provided, filter by first_name and last_name combination
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { $and: [{ first_name: { $regex: searchRegex } }, { last_name: { $regex: searchRegex } }] },
                { first_name: { $regex: searchRegex } },
                { last_name: { $regex: searchRegex } },
            ];
        }

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1; // Updated to 0-based index
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Create an aggregation pipeline to filter records with 'active' status
        const pipeline = [
            { $sort: { _id: -1 } }, // Sort by '_id' in descending order
            {
                $facet: {
                    paginated_user_jobs: [
                        { $match: query }, // Match the combined search conditions
                        { $skip: offset }, // Skip records based on pagination
                        { $limit: parsedLimit }, // Limit the number of records per page
                    ],
                    totalCount: [
                        { $match: query }, // Match the combined search conditions for total count
                        { $count: 'count' },
                    ],
                },
            },
        ];

        const [result] = await jobApplicationModal.aggregate(pipeline);

        // Extract paginated _user_jobs and total count from the result
        const paginated_user_jobs = result.paginated_user_jobs || [];
        const totalItems = paginated_user_jobs.length > 0 ? result.totalCount[0].count : 0;

        // If there are no _user_jobs, send a custom not found response with a message
        if (paginated_user_jobs.length === 0) {
            return notFoundResponse('No _user_jobs found', res);
        }

        const simplifiedCareers = paginated_user_jobs.map((career) => ({
            _id: career._id,
            first_name: career.first_name,
            last_name: career.last_name,
            email: career.email,
            phone: career.phone,
            phone_code: career.phone_code,
            salary: career.salary,
            desired_salary: career.desired_salary,
            is_visa_sponsorship: career.is_visa_sponsorship,
            cv: career.cv,
            information: career.information,
            status: career.status,
            // Add other fields as needed
        }));

        return successResponseWithPagination(simplifiedCareers, totalItems, 'Job applications retrieved successfully', res);
    } catch (error) {
        console.log(error, "err");
        return internalServerError('Internal Server Error', res);
    }
};

exports.getUserJob = async (req, res) => {
    try {
        const jobId = req.query.id; // Assuming the user ID is provided as a route parameter

        // Find the user by ID in the job application model
        const userJobs = await jobApplicationModal.findById({ _id: jobId });

        // If no job applications are found for the user, send a custom not found response
        if (!userJobs || userJobs.length === 0) {
            return notFoundResponse('No job applications found for the user', res);
        }

        // Simplify the user job applications data as needed
        const simplifiedUserJobs = {
            _id: userJobs._id,
            first_name: userJobs.first_name,
            last_name: userJobs.last_name,
            email: userJobs.email,
            phone: userJobs.phone,
            phone_code: userJobs.phone_code,
            salary: userJobs.salary,
            desired_salary: userJobs.desired_salary,
            is_visa_sponsorship: userJobs.is_visa_sponsorship,
            cv: userJobs.cv,
            information: userJobs.info
            // Add other fields as needed}
        }
        return successResponse(simplifiedUserJobs, 'User job applications retrieved successfully', res);
    } catch (error) {
        console.log(error, "err");
        return internalServerError('Internal Server Error', res);
    }
};

exports.addInvestors = async (req, res) => {
    try {
        // Check if a record with the same `image_text` already exists
        const existInvestor = await investorsModal.find();

        // Define a variable to store the response and an object to store contact data
        let resp;
        let investorData = {
            frame1_image: req.body.frame1_image ? req.body.frame1_image : (req.files.find(file => file.fieldname === 'frame1_image')?.key || ''),
            frame2_image: req.body.frame2_image ? req.body.frame2_image : (req.files.find(file => file.fieldname === 'frame2_image')?.key || ''),
            frame3_image: req.body.frame3_image ? req.body.frame3_image : (req.files.find(file => file.fieldname === 'frame3_image')?.key || ''),
            frame4_content: req.body.frame4_content
        };

        if (existInvestor.length <= 0) {
            // Create a new HomePage instance
            const newInvestor = new investorsModal(investorData);

            // Save the new HomePage to the database
            resp = await newInvestor.save();
        } else {
            // Update the existing record
            resp = await investorsModal.findOneAndUpdate({ _id: existInvestor[0]._id }, investorData, { new: true });
        }

        // Respond with a success message and the updated or newly created record
        return successResponse(resp, "Success", res);

    } catch (error) {
        // Handle any errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.view_investors = async (req, res) => {
    try {
        const investors = await investorsModal.find({});
        if (investors.length > 0) {
            const contact = investors[0]; // Get the first investors submission
            return successResponse(contact, "Investors retrieved successfully", res);
        } else {
            return notFoundResponse("No investors found", res);
        }
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.add_blog = async (req, res) => {
    try {
        // Extract data from the request body
        const {
            blog_title,
            blog_category,
            blog_slug,
            blog_image,
            blog_section,
            author_title,
            author_name,
            author_image
        } = req.body;

        // Extract file locations from req.files or use defaults
        const blogImageLocation = req.body.blog_image ? req.body.blog_image : (req.files.find(file => file.fieldname === 'blog_image')?.key || '');
        const authorImageLocation = req.body.author_image ? req.body.author_image : (req.files.find(file => file.fieldname === 'author_image')?.key || '');

        // Create a new author instance
        const author = new authorModal({
            author_title,
            author_name,
            author_image: authorImageLocation,
        });

        // Save the new author to the database
        await author.save();

        // Create a new blog instance
        const newBlog = new blogModal({
            blog_title,
            blog_category,
            blog_slug,
            blog_image: blogImageLocation,
            blog_section,
            author_title,
            author_name,
            author_image: authorImageLocation
        });

        // Save the new blog entry to the database
        const savedBlog = await newBlog.save();

        return successResponse(savedBlog, "Blog Added Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.edit_blog = async (req, res) => {
    try {
        // Extract data from the request body
        const {
            blog_title,
            blog_category,
            blog_slug,
            blog_image,
            blog_section,
            author_title,
            author_name,
            author_image
        } = req.body;

        // Extract file locations from req.files or use defaults
        const blogImageLocation = req.body.blog_image ? req.body.blog_image : (req.files.find(file => file.fieldname === 'blog_image')?.key || '');
        const authorImageLocation = req.body.author_image ? req.body.author_image : (req.files.find(file => file.fieldname === 'author_image')?.key || '');

        // Find the blog entry by ID
        const blogId = req.body.id; // Assuming you pass the blog ID in the URL
        const existingBlog = await blogModal.findById(blogId);

        if (!existingBlog) {
            return notFoundResponse('Blog not found.', res);
        }

        // Update the existing author
        existingBlog.author_title = author_title;
        existingBlog.author_name = author_name;
        existingBlog.author_image = authorImageLocation;

        // Update the existing blog entry
        existingBlog.blog_title = blog_title;
        existingBlog.blog_category = blog_category;
        existingBlog.blog_slug = blog_slug;
        existingBlog.blog_image = blogImageLocation;
        existingBlog.blog_section = blog_section;

        // Save the updated blog entry to the database
        const updatedBlog = await existingBlog.save();

        return successResponse(updatedBlog, "Blog Updated Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.get_blog = async (req, res) => {
    try {
        // Get the blog ID from the URL parameters
        const blogId = req.query.id;

        // Find the blog entry by ID
        const blogEntry = await blogModal.findOne({ _id: blogId, status: { $in: ["active", "inactive"] } });

        if (!blogEntry) {
            return notFoundResponse('Blog not found.', res);
        }

        // Return the retrieved blog entry
        return successResponse(blogEntry, "Blog Retrieved Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.blogs_list = async (req, res) => {
    try {
        // Extracting query parameters from the request
        const { skip = 1, limit = 10, search } = req.query;

        // Creating search parameters based on the presence of the 'search' query parameter
        const searchParams = {
            status: { $in: ["active", "inactive"] }
        };
        if (search) {
            // Using case-insensitive regular expressions to search for blog title or author name
            searchParams.$or = [
                { blog_title: new RegExp(search, 'i') },
                { author_name: new RegExp(search, 'i') }
            ];
        }

        // Fetching blogs from the database based on the search parameters
        const blogs = await blogModal
            .find(searchParams)
            .skip((skip - 1) * limit) // Calculating the number of documents to skip based on pagination
            .limit(limit) // Limiting the number of documents to retrieve per request
            .sort({ blog_published_date: -1 }); // Sorting blogs by the published date in descending order

        // Counting the total number of blogs that match the search criteria
        const totalBlogs = await blogModal.countDocuments({
            status: { $in: ["active", "inactive"] } // Filter by status
        });


        // Returning a success response with paginated blog data
        return successResponseWithPagination(blogs, totalBlogs, "Blog List Retrieved Successfully", res);

    } catch (error) {
        // Handling errors and returning an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.delete_blog = async (req, res) => {
    try {
        // Find the blog entry by ID and update its status to 'deleted'
        const blogEntry = await blogModal.findByIdAndUpdate(
            req.body.id,
            { status: 'delete' }, // Set the status to 'deleted'
            { new: true } // Return the updated document
        );

        // Check if the blog entry with the given ID exists
        if (!blogEntry) {
            return notFoundResponse('Blog not found.', res);
        }
        return successResponseWithoutData("Blog Deleted Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.update_blog_status = async (req, res) => {
    try {
        const { id, status, blog_published_date } = req.body;


        // Find the blog entry by ID
        const blogEntry = await blogModal.findById(id);

        if (!blogEntry) {
            return notFoundResponse('Blog not found.', res);
        }

        // Update the status
        blogEntry.status = status;
        blogEntry.blog_published_date = blog_published_date;

        // Save the updated blog entry to the database
        await blogEntry.save();

        return successResponseWithoutData("Blog Status Updated Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.update_payment_status = async (req, res) => {
    try {
        const { updateArr } = req.body;

        // Calculate the sum of payment_gateway_limit values
        const sumOfLimits = updateArr.reduce((sum, update) => sum + parseInt(update.payment_gateway_limit), 0);

        // Fetch all payment entries to calculate the sum of payment_gateway_limit values
        const totalLimitForGateway = await paymentModal.find();

        // Calculate the sum of payment_gateway_limit values from existing documents
        const existingSumOfLimits = totalLimitForGateway.reduce((sum, p) => sum + parseInt(p.payment_gateway_limit), 0);

        // Check if the total payment_gateway_limit does not exceed 100%
        if (existingSumOfLimits + sumOfLimits > 100) {
            return randomResponse("Total payment gateway limit cannot exceed 100%.", res);
        }

        // Check if the total payment_gateway_limit count should not be less than 100%
        if (existingSumOfLimits + sumOfLimits !== 100) {
            return randomResponse("Total payment gateway limit count should be exactly 100%.", res);
        }

        // Prepare the update object with the new values for each entry
        const updateObjects = updateArr.map(update => ({
            updateOne: {
                filter: { _id: toObjectId(update.id) },
                update: {
                    $set: {
                        payment_gateway_order: update.payment_gateway_order,
                        payment_gateway_limit: update.payment_gateway_limit,
                        status: update.status,
                    },
                },
            },
        }));

        // Update fields and save to the database in bulk
        await paymentModal.bulkWrite(updateObjects);

        return successResponseWithoutData("Payment Status and Order Updated Successfully", res);

    } catch (error) {
        // Log and handle errors
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};



exports.payment_list = async (req, res) => {
    try {
        // Fetching payments from the database and sorting by payment_gateway_order in ascending order
        const payments = await paymentModal.find().sort({ payment_gateway_order: 1 });

        // Returning a success response with the retrieved payment data
        return successResponse(payments, "Payment List Retrieved Successfully", res);

    } catch (error) {
        // Handling errors and returning an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.user_membership_List = async (req, res) => {
    try {
        // Extract page, limit, and search from the query parameters, with default values if not provided
        const { skip = 0, limit = 10, search } = req.query;

        // Create a search filter based on the provided search query
        const searchFilter = {
            status: "active"
        };

        // Add a condition to apply the regex only when a valid search string is provided
        if (search && typeof search === 'string' && search.trim() !== '') {
            searchFilter.name = { $regex: new RegExp(search, 'i') };
        }

        // Use countDocuments to get the total count based on the search filter
        const totalCount = await userMembershipModal.countDocuments(searchFilter);

        // Retrieve userMembershipModal data with selected fields, sorting by _id in descending order, with pagination
        const memberships = await userMembershipModal
            .find(searchFilter)
            .sort({ _id: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean()  // Use lean queries for improved performance
            .exec();

        // Retrieve user details directly from the users collection
        const userIDs = memberships.map(membership => membership.user_id);
        const userDetails = await userModal.find({ _id: { $in: userIDs } }, 'fullName').lean();

        // Map the response to a flat structure
        const flatResponse = memberships.map(membership => {
            const userDetail = userDetails.find(user => user._id.equals(membership.user_id));
            return {
                isAutoRenew: membership.isAutoRenew,
                _id: membership._id,
                fullName: userDetail ? userDetail.fullName : null,
                membership_id: membership.membership_id,
                name: membership.name,
                user_id: membership.user_id,
                price: membership.price,
                renewal_date: membership.renewal_date,
                status: membership.status,
                createdAt: membership.createdAt,
                updatedAt: membership.updatedAt,
                change_date: membership.change_date || "",
                changed_price: membership.changed_price || ""
            };
        });
        // Use the successResponseWithPagination function to send the response
        return successResponseWithPagination(flatResponse, totalCount, 'Data Fetched Successfully.', res);

    } catch (error) {
        console.error(error);
        // Return an internal server error response
        return internalServerError('Internal Server Error', res);
    }
};


exports.update_user_membership = async (req, res) => {
    try {
        // Extract the membership ID and new price from the request body
        const { id, change_date, user_id, changed_price, mail_message, price } = req.body;

        // Find the user membership by ID
        const userMembership = await userMembershipModal.findById(id);

        const user = await userModal.findById({ _id: userMembership.user_id });


        // Check if the membership exists
        if (!userMembership) {
            return notFoundResponse('User membership not found', res);
        }

        // Save the current values to history before updating
        const historyEntry = new membershipPriceHistoryModal({
            user_membership_id: id,
            user_id: user_id,
            change_date,
            changed_price,
            price,
            membership_id: userMembership.membership_id
        });

        await historyEntry.save();

        // Update the changed_price field with the new changed_price
        userMembership.changed_price = changed_price;
        userMembership.change_date = change_date;

        // Fix: Add parentheses around the object being passed to mailHelper.changeMemberShip
        mailHelper.changeMemberShip({ email: user.email }, mail_message);


        // Save the updated user membership to the database
        await userMembership.save();

        // Respond with a success message
        return successResponseWithoutData('Membership price updated successfully', res);

    } catch (error) {
        console.error(error);
        // Return an internal server error response
        return internalServerError('Internal Server Error', res);
    }
};

exports.membership_price_history = async (req, res) => {
    try {
        const query = { user_membership_id: req.query.id }; // Assuming 'user_membership_id' is the correct field

        // Find the membership price history based on the query
        const memberShipPriceHistory = await membershipPriceHistoryModal.find(query);

        // Organize the data by date in international time format
        const organizedData = memberShipPriceHistory.reduce((result, entry) => {
            const changeDate = new Date(entry.change_date).toUTCString();

            // Check if the changeDate key already exists in the result
            if (!result.hasOwnProperty(changeDate)) {
                result[changeDate] = [];
            }

            // Add the relevant information to the array under the changeDate key
            result[changeDate].push({
                price: entry.price,
                changed_price: entry.changed_price,
            });

            return result;
        }, {});

        // Wrap the organizedData in an array and respond
        const responseData = [{ price_arr: [organizedData] }];
        return successResponse(responseData[0], 'User memberships retrieved successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.view_user_membership = async (req, res) => {
    try {
        const { id } = req.query;

        // Retrieve userMembershipModal data with selected fields, sorting by _id in descending order, with pagination
        const userMembership = await userMembershipModal.findOne({
            _id: id,
            status: "active" // Filter by active status
        });

        // Check if the result is empty
        if (!userMembership) {
            return notFoundResponse('User membership not found', res);
        }

        const { user_id, membership_id } = userMembership;

        // Fetch membership details using membership_id
        const membership = await userMembershipModal.findOne({
            user_id: user_id,
            membership_id: membership_id,
        }, 'createdAt').lean().exec();

        // Construct the response object
        const response = {
            _id: userMembership._id,
            user_membership_id: userMembership.user_membership_id,
            membership_id: membership_id,
            createdAt: membership.createdAt,
            renewal_date: userMembership.renewal_date,
            name: userMembership.name,
            price: userMembership.price, // Assuming 'price' is a field in userMembership
            change_date: userMembership.change_date,
            status: userMembership.status,
            updatedAt: userMembership.updatedAt
        };

        // Use the successResponse function to send the response
        return successResponse(response, 'Data Fetched Successfully.', res);
    } catch (error) {
        console.error(error);
        // Return an internal server error response
        return internalServerError('Internal Server Error', res);
    }
};


exports.view_updated_user_membership = async (req, res) => {
    try {
        const { user_membership_id } = req.query;

        // Find the document with the greatest change_date for the given user_membership_id
        const userMembership = await membershipPriceHistoryModal
            .find({ user_membership_id }) // Note: It should be find instead of findOne
            .sort({ change_date: -1 }) // Sort in descending order based on change_date
            .limit(1) // Limit the result to only one document
        // effectiveEndDate: { $gte: currentDate }, // Ensure the current date is within the effective date range

        // Check if the result array is empty
        if (userMembership.length === 0) {
            return notFoundResponse('User membership not found', res);
        }

        const { user_id, membership_id, changed_price, change_date, status, createdAt, updatedAt } = userMembership[0];

        // Fetch user details using user_id
        const user = await userModal.findById(user_id, 'fullName');

        // Fetch membership details using membership_id
        const membership = await membershipModal.findById(membership_id, 'name');

        // Construct the response object
        const response = {
            _id: userMembership[0]._id,
            user_membership_id: userMembership[0].user_membership_id,
            user_id: user_id,
            fullName: user.fullName,
            membership_id: membership_id,
            name: membership.name,
            changed_price: changed_price,
            change_date: change_date,
            status: status,
            createdAt: createdAt,
            updatedAt: updatedAt
        };

        // Use the successResponse function to send the response
        return successResponse(response, 'Data Fetched Successfully.', res);
    } catch (error) {
        console.error(error);
        // Return an internal server error response
        return internalServerError('Internal Server Error', res);
    }
};


exports.updated_membership_list = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        const userMemberships = await membershipPriceHistoryModal.aggregate([
            {
                $sort: { user_membership_id: 1, change_date: -1 },
            },
            {
                $group: {
                    _id: "$user_membership_id",
                    latestMembership: { $first: "$$ROOT" },
                },
            },
            {
                $replaceRoot: { newRoot: "$latestMembership" },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "userDetails",
                }
            },
            {
                $unwind: "$userDetails",
            },
            {
                $skip: (pageNumber - 1) * limitNumber,
            },
            {
                $limit: limitNumber,
            },
        ]);

        // Fetch user details based on user IDs
        const userIDs = userMemberships.map(membership => membership.user_id);
        const userDetails = await userModal.find({ _id: { $in: userIDs } }, 'fullName').lean();

        // Fetch membership price based on membership IDs
        const userMembershipIds = userMemberships.map(membership => membership.user_membership_id);
        const membershipDetails = await userMembershipModal.find({ _id: { $in: userMembershipIds } }, 'price').lean();

        // Map the response to a flat structure
        const flatResponse = userMemberships.map(membership => {
            const userDetail = userDetails.find(user => user._id.equals(membership.user_id));
            const membershipDetail = membershipDetails.find(detail => detail._id.equals(membership.user_membership_id));

            return {
                _id: membership._id,
                user_membership_id: membership.user_membership_id,
                user_id: membership.user_id,
                membership_id: membership.membership_id,
                changed_price: membership.changed_price,
                change_date: membership.change_date,
                status: membership.status,
                createdAt: membership.createdAt,
                updatedAt: membership.updatedAt,
                user_name: userDetail ? userDetail.fullName : null,
                price: membershipDetail ? membershipDetail.price : null,
            };
        });

        // Check if the result array is empty
        if (userMemberships.length === 0) {
            return notFoundResponse('User membership not found', res);
        }

        // Use the successResponseWithPagination function to send the response
        return successResponseWithPagination(flatResponse, userMemberships.length, 'Data Fetched Successfully.', res);

    } catch (error) {
        console.error(error);
        // Return an internal server error response
        return internalServerError('Internal Server Error', res);
    }
};

// these code are wrong and need to be re-written after we launch
exports.add_sale = async (req, res) => {
    try {
        const { id, type, flash_sale, sale_start_date_time, sale_end_date_time, discount_price } = req.body;

        let model, itemName;

        if (type === "item") {
            model = itemModal;
            itemName = 'Item';
        } else {
            model = boutiqueModal;
            itemName = 'Boutique';
        }

        // Find the item by ID
        const item = await model.findOne({ _id: id, status: 'active' });

        if (!item) {
            return notFoundResponse(`${itemName} not found`, res);
        }

        // Update the item fields
        item.flash_sale = flash_sale;
        item.sale_start_date_time = sale_start_date_time;
        item.sale_end_date_time = sale_end_date_time;
        item.discount_price = discount_price;

        // Save the updated item to the database
        await item.save(); // Use save() on the instance

        // Return a success response with the updated item
        return successResponseWithoutData('Sales price added successfully', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.edit_discount_price = async (req, res) => {
    try {
        const { id, type, discount_price } = req.body;

        let model, itemName;

        if (type === "item") {
            model = itemModal;
            itemName = 'Item';
        } else {
            model = boutiqueModal;
            itemName = 'Boutique';
        }

        // Find the item by ID
        const item = await model.findOne({ _id: id, status: 'active' });

        if (!item) {
            return notFoundResponse(`${itemName} not found`, res);
        }

        // Update the discount price
        item.discount_price = discount_price;

        // Save the updated item to the database
        await item.save();

        // Return a success response with the updated item
        return successResponseWithoutData('Discount price updated successfully', res);
    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

// these code are wrong and need to be re-written after we launch
exports.get_all_sale = async (req, res) => {
    try {
        const { skip, limit, search } = req.query;

        const pageNumber = parseInt(skip) || 1;
        const limitNumber = parseInt(limit) || 10;

        // Construct the search criteria for items
        const itemSearchCriteria = { flash_sale: true };
        if (search) {
            itemSearchCriteria.name = { $regex: new RegExp(search, 'i') };
        }

        // Fetch flash sales for items
        const itemFlashSales = await itemModal.find(itemSearchCriteria)
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .exec();

        // Add 'type' property to each object in itemFlashSales
        const itemFlashSalesWithType = itemFlashSales.map(item => ({ ...item.toObject(), type: 'item' }));

        // Construct the search criteria for boutiques
        const boutiqueSearchCriteria = { flash_sale: true };
        if (search) {
            boutiqueSearchCriteria.name = { $regex: new RegExp(search, 'i') };
        }

        // Fetch flash sales for boutiques
        const boutiqueFlashSales = await boutiqueModal.find(boutiqueSearchCriteria)
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .exec();

        // Add 'type' property to each object in boutiqueFlashSales
        const boutiqueFlashSalesWithType = boutiqueFlashSales.map(boutique => ({ ...boutique.toObject(), type: 'boutique' }));

        // Combine the results
        const flashSales = [...itemFlashSalesWithType, ...boutiqueFlashSalesWithType];

        // Return a success response with the updated item
        return successResponseWithPagination(flashSales, flashSales.length, 'Discount price updated successfully', res);
    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

// these code are wrong and need to be re-written after we launch
exports.get_items_and_boutiques = async (req, res) => {
    try {

        // Fetch All items
        const itemFlashSales = await itemModal.find({ status: 'active' })

        // Fetch All boutiques
        const boutiqueFlashSales = await boutiqueModal.find({ status: 'active' })

        // Combine the results
        const flashSales = [{
            itemsArr: itemFlashSales,
            boutiqueArr: boutiqueFlashSales
        }]
        // Return a success response with the updated item
        return successResponse(flashSales, 'Data fetched successfully', res);
    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.sendAnnouncement = async (req, res) => {
    try {
        const { _id, title, message, type, user_ids } = req.body;
        let image = '';

        if (req.files && req.files[0]) {
            image = req.files[0].key;
        }

        // Validate user_ids
        if (!user_ids || !user_ids.trim()) {
            return errorResponse('User IDs cannot be empty', res);
        }

        const userIdsArray = user_ids.split(',');

        // Validate userIdsArray
        if (userIdsArray.length === 0) {
            return errorResponse('No valid user IDs provided', res);
        }

        // Convert user IDs from strings to ObjectIds
        const userIdsObjectIds = userIdsArray.map(userId => toObjectId(userId));

        const commonData = {
            title,
            type,
            image,
            message,
            admin_id: req.payload._id
        };

        let announcement;

        if (_id) {
            // Update existing announcement
            announcement = await announcementModal.findOneAndUpdate(
                { _id },
                { $set: commonData },
                { new: true, upsert: true }
            );
            // Update user IDs associated with the announcement
            await announcementModal.updateOne(
                { _id },
                { $set: { user_ids: userIdsObjectIds } }
            );

            // Update existing entries
            await userAnnouncementModal.updateMany(
                { announcement_id: _id },
                { $set: commonData }
            );

        } else {
            // Create new entries
            announcement = await announcementModal.create({
                ...commonData,
                user_ids: userIdsObjectIds
            });

            const userAnnouncements = userIdsObjectIds.map(userId => ({
                ...commonData,
                announcement_id: announcement._id,
                user_ids: userId
            }));
            await userAnnouncementModal.create(userAnnouncements);
        }

        // Return the updated or newly created announcement
        return successResponseWithoutData('Announcement saved/updated successfully', res);
    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

// exports.getAnnouncements = async (req, res) => {
//     try {
//         const { skip, limit } = req.query; // Assuming you filter by the 'type' query parameter

//         // Aggregation pipeline
//         const announcements = await announcementModal.aggregate([
//             // {
//             //     $match: { type: type }
//             // },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "user_id",
//                     foreignField: "_id",
//                     as: "userDetails",
//                 }
//             },
//             {
//                 $unwind: "$userDetails",
//             },
//             {
//                 $replaceRoot: {
//                     newRoot: {
//                         $mergeObjects: ["$$ROOT", { userDetails: "$userDetails" }]
//                     }
//                 },
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     title: 1,
//                     message: 1,
//                     image: 1,
//                     type: 1,
//                     snooze_till: 1,
//                     status: 1,
//                     createdAt: 1,
//                     updatedAt: 1,
//                     userName: '$userDetails.fullName' // Assuming 'name' is a field in your User model
//                 }
//             },
//             {
//                 $sort: { createdAt: -1 } // Sort by createdAt field in descending order
//             }
//         ]);
//         const groupedByTitle = announcements.reduce((result, item) => {
//             const existingItem = result.find((group) => group.title === item.title);
//             // 
//             if (existingItem) {
//                 existingItem.users.push(item.userName);
//             } else {
//                 result.push({
//                     _id: item._id,
//                     title: item.title,
//                     message: item.message,
//                     image: item.image,
//                     type: item.type,
//                     snooze_till: item.snooze_till,
//                     status: item.status,
//                     createdAt: item.createdAt,
//                     updatedAt: item.updatedAt,
//                     users: [item.userName],
//                 });
//             }
//             // 
//             return result;
//         }, []);

//         // Total count of announcements
//         const totalCount = groupedByTitle.length;
//         // Apply skip and limit on the client side
//         const pageNumber = parseInt(skip) || 1;
//         const limitNumber = parseInt(limit) || 10;
//         const skipValue = (pageNumber - 1) * limitNumber;
//         const slicedAnnouncements = groupedByTitle.slice(skipValue, skipValue + limitNumber);

//         // Return the response
//         return successResponseWithPagination(slicedAnnouncements, totalCount, 'Announcements fetched successfully', res);
//     } catch (error) {
//         console.error(error);
//         // Handle and respond with an internal server error message
//         return internalServerError('Internal Server Error', res);
//     }
// };

exports.getAnnouncements = async (req, res) => {
    try {
        let { skip, limit } = req.query;

        const pageNumber = parseInt(skip) || 1;
        const limitNumber = parseInt(limit) || 10;


        // Aggregation pipeline to get total count
        const totalCount = await announcementModal.countDocuments({ status: 'active' });


        // Aggregation pipeline
        const announcements = await announcementModal.aggregate([
            {
                $match: { status: 'active' }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_ids",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    message: 1,
                    image: 1,
                    type: 1,
                    snooze_till: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    userNames: "$userDetails.fullName" // Assuming 'fullName' is the field in user model
                }
            },
            {
                $skip: (pageNumber - 1) * limitNumber,
            },
            {
                $limit: limitNumber
            }
        ]);

        // Array to store all user names
        let allUserNames = [];

        // Concatenate all user names into one array
        announcements.forEach(announcement => {
            allUserNames = allUserNames.concat(announcement.userNames);
        });

        // Return the response with all user names
        return successResponseWithPagination(announcements, totalCount, 'Announcements fetched successfully', res);
    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.getAnnouncement = async (req, res) => {
    try {
        const { _id } = req.query;

        // Find the announcement by ID
        const announcement = await announcementModal.findOne({ _id, status: 'active' }).populate('user_ids', 'fullName');

        if (!announcement) {
            return notFoundResponse('Announcement not found', res);
        }

        // Return the response with the announcement
        return successResponse(announcement, 'Announcement fetched successfully', res);
    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};

exports.getUsers = async (req, res) => {
    try {
        // Retrieve the list of roles from the database

        // Use the User sModel to find all Users in the collection
        const response = await userModal.find({ status: 'active' });

        // Check if any Users were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);
        for (let i = 0; i < response.length; i++) {
            if (response[i].profile_pic) {
                const isUrl = await common.isValidUrl(response[i].profile_pic);
                if (isUrl) {
                    const bucketName = await common.checkBucketName(response[i].profile_pic);
                    response[i].profile_pic = bucketName === process.env.USER_MEDIA_BUCKET
                        ? await common.fetchS3file(response[i].profile_pic, process.env.USER_MEDIA_BUCKET)
                        : response[i].profile_pic;
                } else {
                    response[i].profile_pic = await common.fetchS3fileByKey(response[i].profile_pic, process.env.USER_MEDIA_BUCKET);
                }
            }

        }
        // Return a success response with the list of Users
        return successResponse(response, 'Users get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}


exports.editPaymentMethodStatus = async (req, res) => {
    try {
        const { id, status } = req.body;


        // Find the Payment entry by ID
        const payment = await paymentMethodModal.findById(id);

        if (!payment) {
            return notFoundResponse('Payment method not found.', res);
        }

        // Update the status
        payment.status = status;

        // Save the updated Payment entry to the database
        await payment.save();

        return successResponseWithoutData("Payment Method Status Updated Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getPaymentMethodList = async (req, res) => {
    try {
        // Use the payment Method Model to find all payment Methods in the collection
        const response = await paymentMethodModal.find();

        // Check if any payment Methods were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        // Return a success response with the list of payment Methods
        return successResponse(response, 'Payment Methods Get Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
}

exports.addPaymentGateway = async (req, res) => {
    try {
        const paymentGatewayData = req.body;
        const { _id } = req.body;

        // Validate that the sum of percentages is 100 for each payment type
        const validatePercentages = (gatewayPercentages) => {
            for (const item of gatewayPercentages) {
                const totalPercentage = Object.values(item.percentages).reduce((acc, percentage) => acc + percentage, 0);
                if (totalPercentage !== 100) {
                    return failMessage(`Sum of percentages for ${item.paymentType} must be 100. Found ${totalPercentage}.`, res);
                }
            }
        };

        validatePercentages(paymentGatewayData.australiaRegion.gatewayPercentages);
        validatePercentages(paymentGatewayData.nonAustraliaRegion.gatewayPercentages);

        // Update the payment gateway data
        const updatedPaymentGateway = await paymentGatewayModal.findByIdAndUpdate(_id, paymentGatewayData, { new: true, runValidators: true });

        // Return success response without data
        return successResponseWithoutData("Payment Gateway Updated Successfully", res);
    } catch (error) {
        // Catch and handle any errors
        console.error(error);
        // Return appropriate error response
        if (error.message.includes('Invalid paymentType') || error.message.includes('Sum of charges')) {
            return failMessage(error.message, res);
        } else {
            return internalServerError('Internal Server Error.', res);
        }
    }
};

exports.editPaymentStatus = async (req, res) => {
    try {
        const { id, enabled } = req.body;
        const payment = await paymentGatewayModal.findOne();

        // Iterate through the paymentArray to update the enabled value
        let found = false;
        payment.paymentArray.forEach(item => {
            if (item._id.toString() === id) {
                item.enabled = enabled;
                found = true;
            }
        });

        if (!found) {
            return notFoundResponse('Payment Array Item Not Found.', res);
        }

        // Save the updated Payment entry to the database
        await payment.save();

        return successResponseWithoutData("Payment Gateway Status Updated Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getPaymentList = async (req, res) => {
    try {
        // Retrieve the list of payment gateways from the database

        // Check if the user provided a type filter in the request query
        // const types = req.query.type; // Change to types to accommodate multiple values
        // let query = {};

        // // If types are provided and not empty, include them in the query
        // if (types && types.length > 0) {
        //     // Split the types string by comma to get individual types
        //     const typeArray = types.split(',');

        //     // Include each type in the query
        //     query.type = { $in: typeArray };
        // }

        // Use the paymentGatewayModal to find payment gateways matching the query
        const paymentGateways = await paymentGatewayModal.find();

        // Check if any payment gateways were found
        if (!paymentGateways.length) {
            // Return an empty response if no payment gateways match the query
            return emptyResponse(paymentGateways, res);
        }

        // Return a success response with the list of payment gateways
        return successResponse(paymentGateways[0], 'Payment gateways retrieved successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
}


exports.getPaymentGateway = async (req, res) => {
    try {
        // Get the payment gateway ID from the URL parameters
        const paymentId = req.query.id;

        // Find the payment entry by ID
        const paymentEntry = await paymentGatewayModal.findById(paymentId);

        if (!paymentEntry) {
            return notFoundResponse('payment not found.', res);
        }

        // Return the retrieved payment entry
        return successResponse(paymentEntry, "Payment Gateway Retrieved Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.get_upcoming_booking_list = async (req, res) => {
    try {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 10);
        //startDate.setMinutes(startDate.getMinutes() + 30);

        let data = await booking_modal.aggregate([
            {
                $match: {
                    status: "active"
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
            }

        ])

        if (!data || data.length === 0) {
            let responseData = { bookings: [] }
            return successResponse(responseData, 'No Data found!', res);
        }
        let filteredData = [];
        // Filter pending flights
        filteredData = data.filter((flight) => {
            const flightTakeOffDateRef = new Date(flight.flight_data[0].flight_takeoff_date);
            const [time1Hours, time1Minutes] = flight.flight_data[0].takeoff_time.split(':').map(Number);
            flightTakeOffDateRef.setHours(time1Hours, time1Minutes);
            const currTimestamp = startDate.getTime();
            return flightTakeOffDateRef >= currTimestamp && flight.booking_status !== "canceled";
        });

        return successResponse(filteredData, 'Upcoming booking list fetched Successfully.', res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.update_booking_checkedIn_status = async (req, res) => {
    try {
        const { id, checked_in } = req.body;
        const updateBooking = await booking_modal.findByIdAndUpdate({ _id: id }, { checked_in }, { new: true })
        if (!updateBooking) {
            return failMessage('Booking Not Found!', res)
        }
        return successResponseWithoutData("Booking checkedIn Status Updated Successfully", res);

    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.addAdminToGroup = async (req, res) => {
    try {
        const { group_id, id, type } = req.body;

        // Find the group by group_id
        const group = await groupModal.findById(group_id);

        if (!group) {
            return notFoundResponse('Group not found', res);
        }
        // Push the new user object into the users array
        group.users.push({ _id: id, type: type });

        // Save the updated group
        await group.save();

        return successResponse(group, 'Admin added to group successfully', res);
    } catch (error) {
        console.error('Error adding user to group:', error);
        return internalServerError('Internal Server Error.', res);
    }
};

// POST endpoint to update guest name
exports.updateGuestName = async (req, res) => {
    const { id, guest_name } = req.body;

    try {
        // Find the group by ID
        const group = await groupModal.findById(id);

        if (!group) {
            return notFoundResponse('Group not found', res);
        }
        // Find the user within the users array
        const userToUpdate = group.users.find(user => user.type === 'guest');

        if (!userToUpdate) {
            return notFoundResponse('Guest user not found in the group', res);
        }
        // Update guest name
        userToUpdate.guest_name = guest_name;
        await group.save();

        return successResponse(group, 'Guest name updated successfully', res);

    } catch (error) {
        console.error('Error updating guest name:', error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.sendInboxMail = async (req, res) => {
    const { message, id } = req.body;

    try {
        // Find an active admin user with the provided email
        const enquiry = await enquiryModal.findOne({ _id: id });

        // Check if the user was found
        if (!enquiry) {
            return customResponse('Admin not found', res);
        }
        // Send an email with a password reset link
        mailHelper.sendInbox({ email: enquiry.email }, message);

        // Return a success response
        return successResponseWithoutData(`Mail Send successfully. An email with a new password has been sent to ${enquiry.email}`, res);
    } catch (error) {
        // Handle errors and return an internal server error response
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};

// Reorder endpoint
exports.reorder = async (req, res) => {
    const { collectionName, items } = req.body;

    if (!models[collectionName]) {
        return notFoundResponse('Invalid collection name', res);
    }

    try {
        const Model = models[collectionName];
        // Update the order of each item
        for (let i = 0; i < items.length; i++) {
            await Model.findByIdAndUpdate(items[i]._id, { order: i });
        }
        return successResponseWithoutData('Order updated successfully', res);

    } catch (error) {
        console.error('Error updating order:', error);
        return internalServerError('Internal Server Error.', res);
    }
};

/**
 * Controller function to add a new blacklisted card.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
exports.addBlackListCard = async (req, res) => {
    try {
        // Extract cardNumber from request body
        const { cardNumber } = req.body;

        // Check if cardNumber already exists in the blacklist
        const existingCard = await blackListCardModal.findOne({ cardNumber });
        if (existingCard) {
            // Return error response if cardNumber is already blacklisted
            return failMessage('Card number already blacklisted', res);
        }

        // Create a new blacklisted card entry
        const newBlackListCard = new blackListCardModal({
            cardNumber
        });

        // Save the new blacklisted card to the database
        const savedCard = await newBlackListCard.save();

        // Return success response with the saved card data
        return successResponse(savedCard, 'Blacklisted Card Saved Successfully', res);
    } catch (error) {
        // Handle any errors that occur during the process
        console.error('Error adding blacklisted card:', error);
        return internalServerError('Internal Server Error', res);
    }
};

/**
 * Controller function to list all blacklisted cards.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
exports.listBlackListCards = async (req, res) => {
    try {
        // Retrieve all blacklisted cards from the database
        const blacklistCards = await blackListCardModal.find();

        // Return success response with the list of blacklisted cards
        return successResponse(blacklistCards, 'Blacklisted Cards Fetched Successfully', res);

    } catch (error) {
        // Handle any errors that occur during the process
        console.error('Error listing blacklisted cards:', error);
        return internalServerError('Internal Server Error', res);
    }
};
//faq questions
exports.getFaqQuestions = async (req, res) => {
    try {
        const categoryId = req.query.id;
        // Pagination parameters: skip and limit
        const page = parseInt(req.query.skip) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default limit is 10 items per page
        // Calculate the starting index for pagination
        const startIndex = (page - 1) * limit;
        // Assuming your faq model has a 'category_id' field to associate faq with categories
        const category = await faqModal.find({ category: categoryId, status: 'active' })
            .populate({
                path: 'category',
                match: { _id: categoryId },
                model: 'category',
                select: 'name' // Choose the fields you want to populate from the referenced collection
            })
            .sort({ order: 1 })  // Sort by created_at in descending order (-1)
            .skip(startIndex)
            .limit(limit);

        if (!category || category.length === 0) {
            return notFoundResponse('No FAQs found for the category', res);
        }

        // Extracting all FAQs from the result
        const allCategoryDetails = category.map((data) => ({
            _id: data._id,
            question: data.question,
            answer: data.answer,
            section_description: data.section_description,
            section_heading: data.section_heading,
            title: data.title,
            status: data.status,
            categoryNames: data.category.map((cat) => cat.name), // Include all category names
            type: data.type
            // Add other fields as needed
        }));

        return successResponseWithPagination(allCategoryDetails, allCategoryDetails.length, 'Data Fetched Successfully.', res);

    } catch (error) {
        console.error(error);
        return errorResponse('Internal Server Error', res);
    }
};

exports.discountHistory = async (req, res) => {
    try {
        const currentDate = new Date();
        // Extract page and limit from the query parameters, with default values if not provided
        const { page = 1, limit = 10 } = req.query;

        // Calculate the number of documents to skip based on the requested page and limit
        const skip = (page - 1) * limit;

        // Use countDocuments to get the total count with the end_date condition
        const totalCount = await discountModal.countDocuments({
            end_date: { $lte: currentDate }, // Add this condition to the filter
            status: { $in: ["active", "inactive"] } // Filter by status
        });

        // Retrieve all discounts, excluding unnecessary fields and sorting by _id in descending order, with pagination
        const discounts = await discountModal
            .find({
                end_date: { $lte: currentDate }, // Add this condition to the filter
                status: { $in: ["active", "inactive"] } // Filter by status
            })
            .sort({ _id: -1 })
            .skip(skip)
            .limit(parseInt(limit, 10));

        // Extract unique membershipIds from the retrieved discounts
        const uniqueMembershipIds = [...new Set(discounts.map((discount) => discount.membership_id))];

        // Retrieve latest prices for each unique membershipId
        const pricesPromises = uniqueMembershipIds.map((membershipId) =>
            priceModal.find({ membership: membershipId }).sort({ effectiveDate: -1 }).limit(1)
        );

        // Wait for all price queries to complete
        const pricesResults = await Promise.all(pricesPromises);

        // Prepare the response object
        const responseData = await Promise.all(
            uniqueMembershipIds.map(async (membershipId, index) => {
                // Find the discount data for the current membershipId
                const discountData = discounts.find((discount) => discount.membership_id === membershipId);

                // Retrieve the latest price data for the current membershipId
                const latestPrice = pricesResults[index][0];

                // Retrieve membership name from membership modal
                const membership = await membershipModal.findById({ _id: membershipId });

                // Extract tier array and calculate beginningDiscountPrice and endingDiscountPrice
                const tierArray = discountData.tier || [];
                const beginningDiscountPrice = tierArray.length > 0 ? tierArray[0].discount_price : '';
                const endingDiscountPrice = tierArray.length > 0 ? tierArray[tierArray.length - 1].discount_price : '';

                // Omit the 'tier' property from the response
                const { tier, ...restDiscountData } = discountData._doc;

                // Replace null values with empty strings
                const sanitizedData = Object.fromEntries(
                    Object.entries(restDiscountData).map(([key, value]) => [key, value === null ? '' : value])
                );

                // Assemble the final object for the current membershipId
                return {
                    ...sanitizedData,
                    membershipId,
                    membershipName: membership ? membership.name : '', // Ensure to check if membership exists
                    latestEffectiveDate: latestPrice ? latestPrice.effectiveDate || '' : '',
                    standardPrice: latestPrice ? latestPrice.price || 0 : 0,
                    standardInitiationFees: latestPrice ? latestPrice.initiationFees || 0 : 0,
                    beginningDiscountPrice,
                    endingDiscountPrice,
                };
            })
        );

        const response = {
            data: responseData,
            totalItems: discounts.length,
        };

        // Return a "Success" response with the active price history data for the specified item and pagination information
        return successResponseWithPagination(response.data, totalCount, 'Price history successfully retrieved', res);
    } catch (error) {
        console.error(error);

        // Handle and return an "Internal Server Error" response for unexpected errors
        return internalServerError('Internal Server Error', res);
    }
};


exports.getContactUsCategory = async (req, res) => {
    try {
        // Retrieve the list of category from the database
        const response = await contactuscategoriesModal.find({ status: 'active' });
        // Check if any category were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        return successResponse(response, 'Categories get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}

exports.addUpdateContactCategory = async (req, res) => {
    try {
        let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;
        let PASSWORD;
        if (process.env.NODE_ENV == 'production') {
            // const secret1 = await secretManagerAws.getSecretKeys('Prod_Webmail_Password')
            // PASSWORD = secret1.webmail_password;
            PASSWORD = '_zJMqjE-AGiwf2*FLUPB27uW';
        }
        else {
            //for mail password
            //const secret1 = await secretManagerAws.getSecretKeys('Test_Webmail_Password')
            //PASSWORD = secret1.webmail_password;
            PASSWORD = 'DU@9Wuc-!CKyqKauLYHiXhsw';
        }
        const { oldArray, newArray } = req.body;
        console.log('oldArray==', oldArray);
        console.log('newArray==', newArray);
        if (!oldArray && !Array.isArray(oldArray) && !newArray && !Array.isArray(newArray)) {
            return failMessage('Both oldArray and newArray either one array is required.', res);
        }

        // Add newArray items to the collection
        if (newArray && newArray.length > 0) {
            //await contactuscategoriesModal.insertMany(newArray.map(item => ({ ...item })));
            const catArr = [];
            // Check if email already exists
            for (let k = 0; k < newArray.length; k++) {
                const { email, category, main } = newArray[k];
                const checkEmail = await contactuscategoriesModal.findOne({ email });

                if (!checkEmail) {
                    catArr.push({
                        email,
                        category,
                        main,
                        status: '',
                        categoryMatch: false,
                        id: '',
                        user_id: '',
                        address_id: ''
                    });
                } else {
                    //If category and email already exists and active
                    if (checkEmail.category === category && checkEmail.status === 'active') {
                        return failMessage(`Email ${email} already exists for ${category}`, res);
                    }
                    //If category and email already exists and inactive
                    if (checkEmail.category === category && checkEmail.status === 'inactive') {
                        catArr.push({
                            email,
                            category,
                            main,
                            status: checkEmail.status,
                            categoryMatch: true,
                            id: checkEmail._id,
                            user_id: checkEmail.user_id,
                            address_id: checkEmail.address_id
                        });
                    }
                    //If email exists but not for given category and status inactive
                    if (checkEmail.category !== category && checkEmail.status === 'inactive') {
                        catArr.push({
                            email,
                            category,
                            main,
                            status: checkEmail.status,
                            categoryMatch: false,
                            id: checkEmail._id,
                            user_id: checkEmail.user_id,
                            address_id: checkEmail.address_id
                        });
                    }
                }
            }
            console.log('catArr==', catArr)
            //insert new category
            for (let i = 0; i < newArray.length; i++) {
                if (catArr[i].status == '' && catArr[i].categoryMatch == false) {
                    if (newArray[i].user_id != undefined && newArray[i].user_id != '') {
                        console.log('thereee')
                        //wildduck user create
                        const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${newArray[i].user_id}/addresses`;
                        const wildDuckResponse = await axios.post(
                            wildDuckApiUrl,
                            {
                                address: newArray[i].email,
                                name: newArray[i].display_name,
                                main: newArray[i].main
                            },
                            {
                                headers: {
                                    'X-Access-Token': `${ACCESS_TOKEN}`
                                }
                            }
                        );
                        // console.log(wildDuckResponse?.data)
                        if (wildDuckResponse?.data?.success === true) {
                            //get mailbox ids
                            const wildDuckMailboxResponse = await axios.get(
                                `${process.env.WILDDUCKAPIBASEURL}/users/${newArray[i].user_id}/mailboxes`,
                                {
                                    headers: {
                                        'X-Access-Token': `${ACCESS_TOKEN}`
                                    }
                                }
                            );
                            let inbox = '';
                            let drafts = '';
                            let initial_contact_sent = '';
                            let junk = '';
                            let sent_mail = '';
                            let trash = '';
                            if (wildDuckMailboxResponse?.data?.success === true) {
                                let results = wildDuckMailboxResponse.data.results;
                                //loop for get inbox id
                                for (let jk = 0; jk < results.length; jk++) {
                                    if (results[jk].path == 'Sent Mail') {
                                        sent_mail = results[jk].id;
                                    }
                                    if (results[jk].path == 'Initial Contact Sent') {
                                        initial_contact_sent = results[jk].id;
                                    }
                                    if (results[jk].path == 'INBOX') {
                                        inbox = results[jk].id;
                                    }
                                    if (results[jk].path == 'Drafts') {
                                        drafts = results[jk].id;
                                    }
                                    if (results[jk].path == 'Junk') {
                                        junk = results[jk].id;
                                    }
                                    if (results[jk].path == 'Trash') {
                                        trash = results[jk].id;
                                    }
                                }
                            }
                            //category info add
                            let mailData = {
                                category: newArray[i].category,
                                email: newArray[i].email,
                                display_name: newArray[i].display_name,
                                main: newArray[i].main,
                                user_id: newArray[i].user_id,
                                address_id: wildDuckResponse.data.id,
                                inbox: inbox,
                                drafts: drafts,
                                initial_contact_sent: initial_contact_sent,
                                junk: junk,
                                sent_mail: sent_mail,
                                trash: trash
                            }
                            let addEmail = contactuscategoriesModal(mailData);
                            await addEmail.save();
                        }
                    } else {
                        //wildduck user create
                        const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users`;
                        const wildDuckResponse = await axios.post(
                            wildDuckApiUrl,
                            {
                                username: newArray[i].username,
                                address: newArray[i].email,
                                name: newArray[i].category,
                                password: PASSWORD,
                                quota: 25000000000
                            },
                            {
                                headers: {
                                    'X-Access-Token': `${ACCESS_TOKEN}`
                                }
                            }
                        );

                        if (wildDuckResponse?.data?.success === true) {
                            //adding mailbox menu
                            await axios.post(
                                `${process.env.WILDDUCKAPIBASEURL}/users/${wildDuckResponse.data.id}/mailboxes`,
                                {
                                    path: "Initial Contact Sent",
                                    hidden: false,
                                    retention: 0
                                },
                                {
                                    headers: {
                                        'X-Access-Token': `${ACCESS_TOKEN}`
                                    }
                                }
                            );
                            //getting address id
                            const wildDuckResponse1 = await axios.get(
                                `${process.env.WILDDUCKAPIBASEURL}/users/${wildDuckResponse.data.id}/addresses`,
                                {
                                    headers: {
                                        'X-Access-Token': `${ACCESS_TOKEN}`
                                    }
                                }
                            );
                            let address_id = '';
                            if (wildDuckResponse1?.data?.success === true) {
                                let results = wildDuckResponse1.data.results;
                                for (let jk = 0; jk < results.length; jk++) {
                                    if (results[jk].address == newArray[i].email) {
                                        address_id = results[jk].id;
                                    }
                                }
                            }
                            if (address_id != '') {
                                //add display name
                                await axios.put(
                                    `${process.env.WILDDUCKAPIBASEURL}/users/${wildDuckResponse.data.id}/addresses/${address_id}`,
                                    {
                                        name: newArray[i].display_name
                                    },
                                    {
                                        headers: {
                                            'X-Access-Token': `${ACCESS_TOKEN}`
                                        }
                                    }
                                );
                            }
                            //get mailbox ids
                            const wildDuckMailboxResponse = await axios.get(
                                `${process.env.WILDDUCKAPIBASEURL}/users/${wildDuckResponse.data.id}/mailboxes`,
                                {
                                    headers: {
                                        'X-Access-Token': `${ACCESS_TOKEN}`
                                    }
                                }
                            );
                            let inbox = '';
                            let drafts = '';
                            let initial_contact_sent = '';
                            let junk = '';
                            let sent_mail = '';
                            let trash = '';
                            if (wildDuckMailboxResponse?.data?.success === true) {
                                let results = wildDuckMailboxResponse.data.results;
                                //loop for get inbox id
                                for (let jk = 0; jk < results.length; jk++) {
                                    if (results[jk].path == 'Sent Mail') {
                                        sent_mail = results[jk].id;
                                    }
                                    if (results[jk].path == 'Initial Contact Sent') {
                                        initial_contact_sent = results[jk].id;
                                    }
                                    if (results[jk].path == 'INBOX') {
                                        inbox = results[jk].id;
                                    }
                                    if (results[jk].path == 'Drafts') {
                                        drafts = results[jk].id;
                                    }
                                    if (results[jk].path == 'Junk') {
                                        junk = results[jk].id;
                                    }
                                    if (results[jk].path == 'Trash') {
                                        trash = results[jk].id;
                                    }
                                }
                            }
                            //category info add
                            let mailData = {
                                category: newArray[i].category,
                                email: newArray[i].email,
                                display_name: newArray[i].display_name,
                                main: newArray[i].main,
                                user_id: wildDuckResponse.data.id,
                                address_id: address_id,
                                inbox: inbox,
                                drafts: drafts,
                                initial_contact_sent: initial_contact_sent,
                                junk: junk,
                                sent_mail: sent_mail,
                                trash: trash
                            }
                            let addEmail = contactuscategoriesModal(mailData);
                            await addEmail.save();
                        }
                    }
                } else if (catArr[i].status == 'inactive' && catArr[i].categoryMatch == true) {
                    //category status activate
                    let mailData = {
                        status: 'active',
                        main: newArray[i].main
                    }
                    await contactuscategoriesModal.findByIdAndUpdate({ _id: catArr[i].id }, mailData);
                } else if (catArr[i].status == 'inactive' && catArr[i].categoryMatch == false) {
                    //add name
                    let nameRes = await axios.put(
                        `${process.env.WILDDUCKAPIBASEURL}/users/${catArr[i].user_id}`,
                        {
                            name: catArr[i].category
                        },
                        {
                            headers: {
                                'X-Access-Token': `${ACCESS_TOKEN}`
                            }
                        }
                    );
                    if (nameRes?.data?.success === true) {
                        //add display name
                        await axios.put(
                            `${process.env.WILDDUCKAPIBASEURL}/users/${catArr[i].user_id}/addresses/${catArr[i].address_id}`,
                            {
                                name: newArray[i].display_name
                            },
                            {
                                headers: {
                                    'X-Access-Token': `${ACCESS_TOKEN}`
                                }
                            }
                        );
                        //category status activate
                        let mailData = {
                            status: 'active',
                            main: newArray[i].main,
                            category: catArr[i].category,
                            display_name: newArray[i].display_name
                        }
                        await contactuscategoriesModal.findByIdAndUpdate({ _id: catArr[i].id }, mailData);
                    }
                }
            }
        }

        // Update existing documents in oldArray
        if (oldArray && oldArray.length > 0) {

            for (let k = 0; k < oldArray.length; k++) {
                const checkEmail = await contactuscategoriesModal.findOne({ email: oldArray[k].email, _id: { $ne: toObjectId(oldArray[k]._id) }, status: 'active' });
                if (checkEmail) {
                    return failMessage(`Email ${oldArray[k].email} already exists for ${oldArray[k].category}`, res);
                }
            }
            for (let j = 0; j < oldArray.length; j++) {
                const checkEmail = await contactuscategoriesModal.findOne({ email: oldArray[j].email, _id: { $ne: toObjectId(oldArray[j]._id) }, status: 'inactive' });
                console.log('data==', checkEmail)
                const getEmail = await contactuscategoriesModal.findOne({ _id: toObjectId(oldArray[j]._id) });
                if (checkEmail) {
                    if (checkEmail.category == oldArray[j].category) {
                        //wildDuck user update
                        const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${checkEmail.user_id}/addresses/${checkEmail.address_id}`;
                        await axios.put(
                            wildDuckApiUrl,
                            {
                                name: oldArray[j].display_name
                            },
                            {
                                headers: {
                                    'X-Access-Token': `${ACCESS_TOKEN}`
                                },
                            }
                        );
                        //category status activate
                        let mailData = {
                            status: 'active',
                            main: oldArray[j].main,
                            category: oldArray[j].category,
                            email: oldArray[j].email,
                            user_id: checkEmail.user_id,
                            address_id: checkEmail.address_id,
                            display_name: oldArray[j].display_name,
                            inbox: checkEmail.inbox,
                            drafts: checkEmail.drafts,
                            initial_contact_sent: checkEmail.initial_contact_sent,
                            junk: checkEmail.junk,
                            sent_mail: checkEmail.sent_mail
                        }
                        console.log(mailData)
                        //updating user id , address id if category and email already exists as inactive
                        await contactuscategoriesModal.findByIdAndUpdate({ _id: toObjectId(oldArray[j]._id) }, mailData,
                            { new: true });


                        //update old 
                        let oldMailData = {
                            status: 'inactive',
                            email: getEmail.email,
                            user_id: getEmail.user_id,
                            address_id: getEmail.address_id,
                            display_name: getEmail.display_name
                        }
                        //await contactuscategoriesModal.deleteOne({ _id: checkEmail._id })
                        //updating user id , address id to inactive category
                        await contactuscategoriesModal.findByIdAndUpdate({ _id: toObjectId(checkEmail._id) }, oldMailData,
                            { new: true });
                    }

                    if (checkEmail.category != oldArray[j].category) {
                        console.log('hereee')
                        //wildDuck user update
                        await axios.put(
                            `${process.env.WILDDUCKAPIBASEURL}/users/${checkEmail.user_id}/addresses/${checkEmail.address_id}`,
                            {
                                name: oldArray[j].display_name
                            },
                            {
                                headers: {
                                    'X-Access-Token': `${ACCESS_TOKEN}`
                                },
                            }
                        );

                        //update name
                        await axios.put(
                            `${process.env.WILDDUCKAPIBASEURL}/users/${checkEmail.user_id}`,
                            {
                                name: oldArray[j].category
                            },
                            {
                                headers: {
                                    'X-Access-Token': `${ACCESS_TOKEN}`
                                }
                            }
                        );
                        //category status activate
                        let mailData = {
                            status: 'active',
                            main: oldArray[j].main,
                            category: oldArray[j].category,
                            email: oldArray[j].email,
                            user_id: checkEmail.user_id,
                            address_id: checkEmail.address_id,
                            display_name: oldArray[j].display_name,
                            inbox: checkEmail.inbox,
                            drafts: checkEmail.drafts,
                            initial_contact_sent: checkEmail.initial_contact_sent,
                            junk: checkEmail.junk,
                            sent_mail: checkEmail.sent_mail
                        }
                        //updating user id , address id if category and email already exists as inactive
                        await contactuscategoriesModal.findByIdAndUpdate({ _id: toObjectId(oldArray[j]._id) }, mailData,
                            { new: true });

                        //deleting old 
                        //await contactuscategoriesModal.deleteOne({ _id: checkEmail._id })
                        //update old 
                        let oldMailData = {
                            status: 'inactive',
                            category: getEmail.category,
                            email: getEmail.email,
                            user_id: getEmail.user_id,
                            address_id: getEmail.address_id,
                            display_name: getEmail.display_name
                        }
                        //await contactuscategoriesModal.deleteOne({ _id: checkEmail._id })
                        //updating user id , address id to inactive category
                        await contactuscategoriesModal.findByIdAndUpdate({ _id: toObjectId(checkEmail._id) }, oldMailData,
                            { new: true });
                    }
                }

                if (!checkEmail) {
                    //wildDuck user update
                    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${oldArray[j].user_id}/addresses/${oldArray[j].address_id}`;
                    const wildDuckResponse = await axios.put(
                        wildDuckApiUrl,
                        {
                            address: oldArray[j].email,
                            name: oldArray[j].display_name
                        },
                        {
                            headers: {
                                'X-Access-Token': `${ACCESS_TOKEN}`
                            },
                        }
                    );
                    if (wildDuckResponse?.data?.success === true) {
                        //update name
                        await axios.put(
                            `${process.env.WILDDUCKAPIBASEURL}/users/${oldArray[j].user_id}`,
                            {
                                name: oldArray[j].category
                            },
                            {
                                headers: {
                                    'X-Access-Token': `${ACCESS_TOKEN}`
                                }
                            }
                        );
                        //category info add
                        let mailData = {
                            category: oldArray[j].category,
                            email: oldArray[j].email,
                            display_name: oldArray[j].display_name,
                            main: oldArray[j].main
                        }
                        await contactuscategoriesModal.findByIdAndUpdate({ _id: toObjectId(oldArray[j]._id) }, mailData);

                    }
                }
            }
        }

        // Return a success response without data
        return successResponseWithoutData("Categories updated successfully.", res);
    } catch (err) {
        console.error(err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.searchSubadmin = async (req, res) => {
    try {
        const { search } = req.query;

        let getSubadmin = await adminModal.find({
            status: 'active'
        },
            {
                _id: 1,
                first_name: 1,
                last_name: 1,
                full_name: { $concat: ["$first_name", " ", "$last_name"] }
            });

        if (search != undefined && search != '') {
            const searchParts = search.split(' ').map(part => part.trim()).filter(part => part);
            if (searchParts.length === 0) {
                return [];
            }
            getSubadmin = await adminModal.find({
                status: 'active',
                $or: searchParts.flatMap(part => [
                    { first_name: { $regex: new RegExp(part, "i") } },
                    { last_name: { $regex: new RegExp(part, "i") } }
                ])
            },
                {
                    _id: 1,
                    first_name: 1,
                    last_name: 1,
                    full_name: { $concat: ["$first_name", " ", "$last_name"] }
                });
        }


        // Check if any subadmin were found, if not, return an empty response
        if (!getSubadmin.length) return emptyResponse(getSubadmin, res);

        return successResponse(getSubadmin, 'Subadmin get successfully.', res);
    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error.', res)
    }
}

exports.getSubadminSignature = async (req, res) => {
    try {
        // Retrieve the list of subadmin signature from the database
        const response = await subadminSignatureModal.find({ status: 'active' });
        // Check if any subadmin signature were found, if not, return an empty response
        if (!response.length) return emptyResponse(response, res);

        return successResponse(response, 'Signature get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}

exports.addUpdateSubadminSignature = async (req, res) => {
    try {
        const { oldArray, newArray } = req.body;
        console.log('oldArray==', oldArray);
        console.log('newArray==', newArray);
        if (!oldArray && !Array.isArray(oldArray) && !newArray && !Array.isArray(newArray)) {
            return failMessage('Both oldArray and newArray either one array is required.', res);
        }

        // Add newArray items to the collection
        if (newArray && newArray.length > 0) {
            await subadminSignatureModal.insertMany(newArray.map(item => ({ ...item })));
        }

        // Update existing documents in oldArray
        if (oldArray && oldArray.length > 0) {
            await Promise.all(oldArray.map(async (item) => {
                //item contains _id and the new values to update
                const { _id, ...updateFields } = item;
                await subadminSignatureModal.findByIdAndUpdate(_id, updateFields, { new: true });
            }));
        }

        // Return a success response without data
        return successResponseWithoutData("Signature updated successfully.", res);
    } catch (err) {
        console.error(err);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.deleteContactUsCategory = async (req, res) => {
    try {
        const { id } = req.body;
        //inactive category
        await contactuscategoriesModal.findByIdAndUpdate(id, { status: 'inactive' }, { new: true })

        return successResponseWithoutData('Contact Us Category deleted successfully.', res);
    } catch (err) {
        console.log(err)
        return internalServerError('Internal Server Error.', res)
    }
}

/**
 * Controller to get the list of subadmins excluding the one
 * associated with the token.
 */
exports.subAdminList = async (req, res) => {
    try {
        const { group_id } = req.query; // Assuming group_id is passed as a query parameter
        let response;

        // Initialize an array to store IDs of subadmins in the specified group
        let groupSubadmins = [];

        if (group_id) {
            // Convert group_id to ObjectId if it's a string
            const groupId = toObjectId(group_id);

            // Find the group by ID using findOne
            const group = await internalGroupModal.findById(groupId);

            if (group) {
                // Extract subadmin IDs from the group
                groupSubadmins = group.users
                    .filter(user => user.type === 'subadmin')
                    .map(user => user._id);

                // Query for active subadmins excluding the token user and those in the specified group
                response = await adminModal.find({
                    status: 'active',
                    type: 'subadmin',
                    _id: { $nin: groupSubadmins } // Exclude subadmins already in the specified group
                });
                // Check if any subadmins were found, if not, return an empty response
                if (!response.length) {
                    return emptyResponse(response, res);
                }
                // Return a success response with the list of subadmins
                return successResponse(response, 'Subadmin retrieved successfully.', res);
            } else {
                // Return an empty response if the group was not found
                return emptyResponse([], res);
            }
        }
        // Query the database for active subadmins excluding the token user
        response = await adminModal.find({
            status: 'active',
            type: 'subadmin',
            _id: { $ne: req.payload._id }
        });

        // Check if any subadmins were found, if not, return an empty response
        if (!response.length) {
            return emptyResponse(response, res);
        }

        // Return a success response with the list of subadmins
        return successResponse(response, 'Subadmin retrieved successfully.', res);
    } catch (err) {
        // Log the error to the console
        console.error('Error in subAdminList:', err);

        // Return an internal server error response
        return internalServerError('Internal Server Error.', res);
    }
};


// Controller function to create a new category
exports.createCategory = async (req, res) => {
    const { from, to } = req.body;

    // Static timezone for Australia
    const timezone = 'Australia/Sydney';

    try {
        const data = new chatTimeModal({
            from,
            to,
            timezone
        });

        await data.save();

        res.status(201).json({ message: 'Category created successfully', data });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Error creating category', error });
    }
};

//get subadmin self signature
exports.getSelfSignature = async (req, res) => {
    try {
        const { subadmin_id } = req.query;

        // Retrieve the list of subadmin signature from the database
        const response = await subadminSignatureModal.findOne({ subadmin_id: toObjectId(subadmin_id) });
        // Check if any subadmin signature were found, if not, return an empty response
        if (!response) return emptyResponse(response, res);

        return successResponse(response, 'Signature get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}

exports.connectDatabase = async (req, res) => {
    try {
        exec('pm2 restart all', (error, stdout, stderr) => {
            console.log('server restarted===')
            if (error) {
                console.error(`Error restarting server: ${error}`);
                return errorResponse(`Error restarting server: ${error}`, res);
            }
            console.log(`Server restarted: ${stdout}`);
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }

            return successResponseWithoutData('Server restarted successfully', res);
        });
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}

//get wildduck access token
exports.getWildduckAccessToken = async (req, res) => {
    try {
        let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;;
        let response = { 'accesstoken': ACCESS_TOKEN }
        return successResponse(response, 'Success.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
}

exports.getAdminRole = async (req, res) => {
    try {
        // Retrieve admin ID from request payload
        const adminId = toObjectId(req.payload._id);

        // Find the admin by their ID
        const admin = await adminModal.findOne({ _id: adminId });
        if (!admin) {
            return notFoundResponse('Admin not found.', res);
        }

        let roles = [];

        // Check if the admin is of type 'admin' before fetching roles
        if (admin.type === 'admin') {
            const activeRoles = await rolesModel.find({ status: 'active' });

            if (!activeRoles || activeRoles.length === 0) {
                return notFoundResponse('No roles found for this admin.', res);
            }

            // Map the roles to the desired structure
            roles = activeRoles.map((role) => ({
                role_id: role._id,
                role_status: 'write', // Admins have write access to all roles
                role_name: role.name,
                type: role.type,
                _id: new mongoose.Types.ObjectId(), // Generate a unique ID
            }));
        } else {
            // For non-admin, map through their roles array and fetch the role type from rolesModel
            roles = await Promise.all(
                admin.roles_array.map(async (role) => {
                    const roleDetails = await rolesModel.findById(role.role_id);
                    return {
                        role_id: role.role_id,
                        role_status: role.role_status, // Use the role's assigned status
                        role_name: role.name,
                        type: roleDetails.type,
                        _id: role._id
                    };
                })
            );
        }

        // Return a success response with the roles
        return successResponse(roles, 'Roles Retrieved Successfully.', res);
    } catch (err) {
        // Log the error and return an internal server error response
        console.error('Error fetching admin roles:', err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.addOrUpdateJobDetails = async (req, res) => {
    try {
        const { job_types, job_locations, job_categories } = req.body;

        // Step 1: Fetch current job types, locations, and categories from the database
        const existingJobTypes = await JobType.find({});
        const existingJobLocations = await JobLocation.find({});
        const existingJobCategories = await JobCategory.find({});

        // Step 2: Update or create job types
        const updatedJobTypeIds = [];
        for (const jobType of job_types) {
            if (jobType._id) {
                // Update existing JobType
                await JobType.findByIdAndUpdate(jobType._id, { name: jobType.name }, { new: true });
                updatedJobTypeIds.push(jobType._id); // Keep track of updated types
            } else {
                // Create new JobType
                const newJobType = await JobType.create({ name: jobType.name });
                updatedJobTypeIds.push(newJobType._id); // Keep track of new type ID
            }
        }

        // Remove job types that were not included in the request
        const jobTypesToDelete = existingJobTypes.filter(
            existing => !updatedJobTypeIds.includes(existing._id.toString())
        );
        await JobType.deleteMany({ _id: { $in: jobTypesToDelete.map(job => job._id) } });

        // Step 3: Update or create job locations
        const updatedJobLocationIds = [];
        for (const jobLocation of job_locations) {
            if (jobLocation._id) {
                await JobLocation.findByIdAndUpdate(jobLocation._id, { name: jobLocation.name }, { new: true });
                updatedJobLocationIds.push(jobLocation._id);
            } else {
                const newJobLocation = await JobLocation.create({ name: jobLocation.name });
                updatedJobLocationIds.push(newJobLocation._id);
            }
        }

        // Remove job locations that were not included in the request
        const jobLocationsToDelete = existingJobLocations.filter(
            existing => !updatedJobLocationIds.includes(existing._id.toString())
        );
        await JobLocation.deleteMany({ _id: { $in: jobLocationsToDelete.map(job => job._id) } });

        // Step 4: Update or create job categories
        const updatedJobCategoryIds = [];
        for (const jobCategory of job_categories) {
            if (jobCategory._id) {
                await JobCategory.findByIdAndUpdate(jobCategory._id, { name: jobCategory.name }, { new: true });
                updatedJobCategoryIds.push(jobCategory._id);
            } else {
                const newJobCategory = await JobCategory.create({ name: jobCategory.name });
                updatedJobCategoryIds.push(newJobCategory._id);
            }
        }

        // Remove job categories that were not included in the request
        const jobCategoriesToDelete = existingJobCategories.filter(
            existing => !updatedJobCategoryIds.includes(existing._id.toString())
        );
        await JobCategory.deleteMany({ _id: { $in: jobCategoriesToDelete.map(job => job._id) } });

        // Step 5: Return response with the created/updated job types, locations, and categories
        return successResponseWithoutData('Job Types, Locations, and Categories added/updated successfully', res);

    } catch (error) {
        // Log the error and return an internal server error response
        console.error('Error adding or updating job details:', error);
        return internalServerError('Internal Server Error.', res);
    }
};

// GET API to retrieve all job types, locations, and categories
exports.getJobDetails = async (req, res) => {
    try {
        // Retrieve all job types
        const job_types = await JobType.find({});

        // Retrieve all job locations
        const job_locations = await JobLocation.find({});

        // Retrieve all job categories
        const job_categories = await JobCategory.find({});
        let data = {
            job_types,
            job_locations,
            job_categories
        }
        // Send the combined data in the response
        return successResponse(data, 'Job Details Retrieved Successfully.', res);
    } catch (error) {
        // Log the error and return an internal server error response
        console.error('Error fetching admin roles:', err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.getTransactionList = async (req, res) => {
    try {
        const { skip = 1, limit = 10, userId } = req.query;

        // Convert pagination parameters to numbers and calculate skip value
        const pageNumber = parseInt(skip, 10);
        const limitNumber = parseInt(limit, 10);
        const page = (pageNumber - 1) * limitNumber;

        // Define filter for active transactions of the specific user
        const filter = { userId: toObjectId(userId), status: 'active' };

        // Fetch paginated transactions for the specified user
        let transactions = await transactionModal.find(filter)
            .skip(page)
            .limit(limitNumber)
            .sort({ createdAt: -1 });

        // Modify each transaction with additional details
        const modifiedTransactions = await Promise.all(transactions.map(async (transaction) => {
            // Fetch card details if cardId exists
            const card = transaction.cardId ? await cardModal.findOne({ _id: transaction.cardId }) : null;
            const cardName = card ? card.cardType : '';
            // Calculate `isRefund` based on `renewalDate`
            const renewalDate = new Date(transaction.createdAt);
            const currentDate = new Date();
            const futureDate = new Date(currentDate.setDate(currentDate.getDate() + 60));

            const isRefund = renewalDate <= futureDate;
            // Prepare response for each transaction
            return {
                refunded: transaction.refunded,
                refundAmount: transaction.refundAmount,
                _id: transaction._id.toString(),
                userId: transaction.userId.toString(),
                price: transaction.price || '',
                normalPrice: transaction.normalPrice || '',
                initiationFees: transaction.initiationFees || '',
                normalInitiationFees: transaction.normalInitiationFees || '',
                transactionId: transaction.transactionId || '',
                name: transaction.name || '',
                type: transaction.type || '',
                transactionType: transaction.transactionType || '',
                paymentStatus: transaction.paymentStatus || '',
                count: transaction.count || 0,
                qty: transaction.count || 0,
                isMembership: transaction.type === 'Membership',
                paymentDate: transaction.createdAt || '',
                cardName: cardName,
                isRefund: isRefund,
                refund: 'Refunded'
            };
        }));
        // Count total transactions matching the filter
        const totalTransactions = await transactionModal.countDocuments(filter);

        // Return paginated response
        return successResponseWithPagination(
            modifiedTransactions,
            totalTransactions,
            'Transactions fetched successfully.',
            res
        );
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.getTransactionDetail = async (req, res) => {
    try {
        const { transactionId } = req.query;

        // Validate transaction ID
        const transaction = await transactionModal.findOne({ _id: transactionId });
        if (!transaction) {
            return notFoundResponse('Transaction not found.', res);
        }

        // Fetch user's active membership
        const membership = await userMembershipModal.findOne({ user_id: transaction.userId, status: 'active' });

        // Calculate refund eligibility based on membership activation status
        let isRefund = false;
        if (membership?.is_activate === false) {
            // If membership is not active, always mark as refundable
            isRefund = true;
        } else {
            // Otherwise, calculate refund eligibility based on renewalDate
            const renewalDate = new Date(transaction.createdAt);
            const currentDate = new Date();
            const futureDate = new Date(currentDate);
            futureDate.setDate(futureDate.getDate() + 60);
            isRefund = renewalDate <= futureDate;
        }

        // Determine the price based on membership activation status
        let price = membership?.price || 0;
        if (!membership?.is_activate) {
            price = await calculateAlternativePrice(new Date(), membership?.renewal_date, membership?.price);
        }

        // Fetch card details if cardId exists
        const card = transaction.cardId ? await cardModal.findOne({ _id: transaction.cardId }) : null;
        const cardName = card?.cardType || '';

        // Fetch multiple refund history entries or an empty array if none are found
        const refundHistoryRecords = await refundHistoryModal.find({ transaction_id: transactionId, status: 'active' }) || [];
        const refundHistoryResponse = refundHistoryRecords.map((record) => ({
            user_id: record.user_id || null,
            membership_id: record.membership_id || null,
            transaction_id: record.transaction_id || null,
            name: record.name || '',
            price: record.price || 0,
            normalPrice: record.normalPrice || 0,
            effectiveCancelDate: record.effectiveCancelDate || null,
            refunded: record.refunded || false,
            refundedType: record.refundedType || '',
            refundAmount: record.refundAmount || '',
            refund: record.refund || 'Refunded'
        }));

        // Construct the transaction detail response
        const transactionDetail = {
            refunded: transaction.refunded,
            refundAmount: price,
            _id: transaction._id.toString(),
            userId: transaction.userId.toString(),
            price: transaction.price || '',
            normalPrice: transaction.normalPrice || '',
            initiationFees: transaction.initiationFees || '',
            normalInitiationFees: transaction.normalInitiationFees || '',
            transactionId: transaction.transactionId || '',
            name: transaction.name || '',
            type: transaction.type || '',
            transactionType: transaction.transactionType || '',
            paymentStatus: transaction.paymentStatus || '',
            count: transaction.count || 0,
            isMembership: transaction.type === 'Membership',
            paymentDate: transaction.createdAt || '',
            effectiveCancelDate: new Date(),
            qty: transaction.count || 0,
            cardName: cardName,
            isRefund: isRefund,
            refundHistoryResponse
        };

        // Return the transaction detail response
        return successResponse(
            transactionDetail,
            'Transaction details fetched successfully.',
            res
        );
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        return internalServerError('Internal Server Error', res);
    }
};
exports.emailInvoice = async (req, res) => {
    try {
        let { userId, transactionId } = req.body;

        let transaction = await transactionModal.findOne({
            _id: transactionId,
            status: "active",
            $or: [
                { type: "Membership" },
                { type: "Initiation and Verification Fee" },
                { type: "Refund" },
                { type: "Pet Passes" },
                { type: "Guest Passes" },
                { type: "Gift Card" },
                { type: "Reset Voucher" },
                { type: "Renewed Unlimited Membership" },
                { type: "Renewed Unlimited Elite Membership" }
            ]
        });

        if (!transaction) {
            return emptyResponse(transaction, res);
        }

        let preference = await prefernceModal.findOne({
            user_id: userId,
            status: "active"
        });

        let userData = await userModal.findOne({
            _id: userId,
            status: "active"
        });
        console.log(transaction, 'transaction')
        //const generatedFileName = await generateInvoice(transaction, user);

        // Determine the recipient email based on preference settings
        let recipientEmail;

        recipientEmail = userData.email

        if (preference) {
            if (preference.automaticInvoiceToMail && preference.automaticMail && preference.automaticMail.trim() !== "") {
                // Only use automaticMail if it has a non-empty value
                recipientEmail = preference.automaticMail;
            } else {
                recipientEmail = userData.email;
            }
        }
        // After PDF generation completes, send the email
        // await mail.sendMailInvoice({
        //     email: recipientEmail,
        //     file: generatedFileName
        // });

        if (transaction.invoiceUrl) {
            //get user name 
            let fullName;
            let getUserDta = await userModal.findOne({ _id: req.payload._id });
            if (getUserDta) {
                fullName = getUserDta.preferredFirstName || getUserDta.first_name;
            }
            const isUrl = await commonservices.isValidUrl(transaction.invoiceUrl);
            if (isUrl) {
                const bucketName = await commonservices.checkBucketName(transaction.invoiceUrl);
                transaction.invoiceUrl = bucketName === process.env.INVOICE_CONTRACT_FILE_BUCKET
                    ? await commonservices.fetchS3file(transaction.invoiceUrl, process.env.INVOICE_CONTRACT_FILE_BUCKET)
                    : transaction.invoiceUrl;
            } else {
                transaction.invoiceUrl = await commonservices.fetchS3fileByKey(transaction.invoiceUrl, process.env.INVOICE_CONTRACT_FILE_BUCKET);
            }
            await mail.sendMailMembershipInvoice({
                email: recipientEmail,
                subject: transaction.emailSubject,
                file: transaction.invoiceUrl,
                fullName: fullName
            });
            // Return a success response with data
            return successResponseWithoutData('Invoice sent to your mail!', res);
        }
        return failMessage('No Data Found', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
exports.downloadInvoice = async (req, res) => {
    try {
        let { transactionId } = req.body;

        let transaction = await transactionModal.findOne({
            _id: transactionId,
            status: "active",
            $or: [
                { type: "Membership" },
                { type: "Initiation and Verification Fee" },
                { type: "Refund" },
                { type: "Pet Passes" },
                { type: "Guest Passes" },
                { type: "Gift Card" },
                { type: "Reset Voucher" },
                { type: "Renewed Unlimited Membership" },
                { type: "Renewed Unlimited Elite Membership" }
            ]
        });

        if (!transaction) {
            return emptyResponse(transaction, res);
        }

        if (transaction.invoiceUrl) {
            const isUrl = await commonservices.isValidUrl(transaction.invoiceUrl);
            if (isUrl) {
                const bucketName = await commonservices.checkBucketName(transaction.invoiceUrl);
                transaction.invoiceUrl = bucketName === process.env.INVOICE_CONTRACT_FILE_BUCKET
                    ? await commonservices.fetchS3file(transaction.invoiceUrl, process.env.INVOICE_CONTRACT_FILE_BUCKET)
                    : transaction.invoiceUrl;
            } else {
                transaction.invoiceUrl = await commonservices.fetchS3fileByKey(transaction.invoiceUrl, process.env.INVOICE_CONTRACT_FILE_BUCKET);
            }
            let result = { "invoiceUrl": transaction.invoiceUrl }
            return successResponse(result, 'Invoice downloaded successfully.', res);
        }
        return failMessage('No Data Found', res);

    } catch (error) {
        console.error(error);
        // Handle and respond with an internal server error message
        return internalServerError('Internal Server Error', res);
    }
};
// Refund Controller
exports.refund = async (req, res) => {
    try {
        const { userId, effectiveCancelDate, transactionId } = req.body;
        console.log(req.body, 'req.body')
        // Step 1: Retrieve user data
        const user = await userModal.findById(userId);
        if (!user) {
            return notFoundResponse('User not found.', res);
        }

        // Step 2: Retrieve the user's active membership
        const membership = await userMembershipModal.findOne({ user_id: userId, status: 'active' });
        if (!membership) {
            return notFoundResponse('Membership not found.', res);
        }

        // Step 3: Retrieve the transaction by ID and verify it belongs to the specified user
        const transaction = await transactionModal.findOne({ _id: transactionId, userId: userId });
        console.log(transaction, 'transaction')
        if (!transaction) {
            return notFoundResponse('Transaction not found.', res);
        }

        // Step 4: Format effectiveCancelDate to the desired timezone (Australia/Sydney)
        const timezone = 'Australia/Sydney';
        const currentDateTime = new Date(effectiveCancelDate);
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

        const formattedDateTime = currentDateTime.toLocaleString('en-US', options);
        const [datePart, timePart] = formattedDateTime.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        const ISOformat = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
        const startDate = new Date(ISOformat);

        // Step 5: Determine the price for refund
        let price;
        if (membership.is_activate) {
            // Membership is active; use the membership price
            price = membership.price;
        } else {
            // Membership is not active; calculate an alternative price based on effective cancellation
            price = await calculateAlternativePrice(startDate, membership.renewalDate, membership.price);
        }
        let businessName;
        let abn;
        // Find user's active card
        let userCardInfo = await cardModal.findOne({ userId, status: 'active' });
        if (userCardInfo) {
            businessName = userCardInfo.businessName;
            abn = userCardInfo.abn;
        }
        // Extract additional necessary details
        const description = `Refund for ${membership.name}`;
        // Step 6: Call `processRefund` function
        const refundResult = await processRefund(
            userId,
            membership._id,
            membership.membershipPurchaseDate,
            membership.renewal_date,
            membership.payIntId,
            user,
            membership.name,
            description,
            transaction.transactionType,
            price,
            businessName,
            abn,
            transactionId
        );

        // Step 7: Handle refund process result
        if (!refundResult.success) {
            return failMessage(refundResult.message, res);
        }

        // Step 8: Update the transaction with refund details
        await transactionModal.updateOne(
            { _id: transactionId },
            {
                $set: {
                    refunded: true,
                    refundAmount: price,
                    refund: 'Refunded'
                }
            }
        );


        // Step 9: Log the refund details in refundHistory
        const refundHistoryData = new refundHistoryModal({
            user_id: userId,
            membership_id: membership._id,
            transaction_id: transactionId,
            name: membership.name,
            price: membership.price,
            normalPrice: membership.normalPrice,
            initiationFees: transaction.initiationFees,
            normalInitiationFees: transaction.normalInitiationFees,
            renewal_date: renewalDate,
            effectiveCancelDate: startDate,
            refunded: true,
            refundAmount: price,
            refundedType: 'Prorated',
            refund: 'Partial Refund'
        });

        await refundHistoryData.save();

        // Send success response
        return successResponse(refundHistoryData, 'Refund processed successfully.', res);
    } catch (error) {
        console.error('Error processing refund:', error);
        return internalServerError('Internal Server Error.', res);
    }
};

const processRefund = async (userId, membership_id, purchaseDate, renewal_date, payIntId, userData, membershipName, description, type, amount, businessName, abn, transactionId) => {
    let result;

    if (type == 'hellozai') {
        result = await refundItem(payIntId, amount);
    } else if (type == 'airwallex') {
        result = await refundPayment(payIntId, amount);
    }

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
    console.log(invoiceData, 'invoiceData')
    let generatedFileName = await refundPdf.generateRefundMembershipInvoicePdf(invoiceData, userData);

    await transactionModal.findByIdAndUpdate(transactionId, {
        invoiceNumber: invoiceNo,
        emailSubject: description,
        invoiceUrl: generatedFileName
    }, { new: true });

    if (type == 'hellozai') {
        await saveHellozaiLog(userId, result);
    } else if (type == 'airwallex') {
        await saveAirwallexLog(userId, result);
    }
    //get user name 
    let fullName;
    let getUserDta = await userModal.findOne({ _id: userId });
    if (getUserDta) {
        fullName = getUserDta.preferredFirstName || getUserDta.first_name;
    }
    generatedFileName = await commonservices.fetchS3fileByKey(generatedFileName, process.env.INVOICE_CONTRACT_FILE_BUCKET);

    await mail.sendMailMembershipInvoice({
        email: userData.email,
        subject: invoiceNo,
        file: generatedFileName,
        fullName: fullName
    });

    return result;
};

const saveAirwallexLog = async (userId, result) => {
    console.log(result, 'result')
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

const saveHellozaiLog = async (userId, result) => {
    console.log(result?.data[0].items, 'result1111')
    const cardId = result?.data?.[0]?.items.cardId || null; // Set cardId to null if it's not provided

    const hellozaiLog = new hellozaiModal({
        cardId,
        userId,
        price: result?.data?.[0]?.amount,
        transactionId: result?.data[0].payment_intent_id,
        paymentStatus: result?.data[0].status,
        airwallexData: JSON.stringify(result),
        paymentType: 'Hellozai'
    });
    await hellozaiLog.save();
};

const calculateAlternativePrice = async (effectiveCancelDate, renewalDate, price) => {
    try {
        console.log(effectiveCancelDate, 'effectiveCancelDate')
        console.log(renewalDate, 'renewalDate')
        console.log(price, 'price')


        // Calculate the number of days remaining between the cancellation date and the renewal date (exclusive)
        const daysRemaining = Math.ceil((renewalDate - effectiveCancelDate) / (1000 * 60 * 60 * 24));
        console.log(daysRemaining, 'daysRemaining')
        // Calculate the prorated daily cost
        const daysInMonth = new Date(effectiveCancelDate.getFullYear(), effectiveCancelDate.getMonth() + 1, 0).getDate();
        const proratedDailyCost = price / daysInMonth;
        console.log(daysInMonth, 'daysInMonth')
        console.log(proratedDailyCost, 'proratedDailyCost')

        // Calculate the prorated refund amount
        const proratedRefundAmount = proratedDailyCost * daysRemaining;
        console.log(proratedRefundAmount, 'proratedRefundAmount')
        return Math.trunc(proratedRefundAmount);
    } catch (error) {
        console.error("Error in calculating prorated price:", error);
        return 0; // Return 0 if there's an error in calculation
    }
};

// exports.getAllsFlights = async (req, res) => {
//     try {

//         //let flightData = await flightModal.find({flight_takeoff_date:{ $gt: "2024-10-10T00:00:00Z"}, flight_takeoff_date:{ $lt: "2024-10-11T00:00:00Z"}});
//         //console.log('flightData==',flightData.length)
//         const startDate = new Date("2024-10-11T00:00:00.000Z");
//         //const endDate = new Date("2024-10-11T00:00:00.000Z");
//         const flightData = await flightModal.aggregate([
//             {
//                 $match: {
//                     $expr: {
//                         $and: [
//                             { $gte: ["$flight_takeoff_date", startDate] },
//                             //{ $lte: ["$flight_takeoff_date", endDate] }
//                         ]

//                     }
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "routes",
//                     localField: "route",
//                     foreignField: "_id",
//                     as: "routeDetails"
//                 }
//             },
//             {
//                 $unwind: "$routeDetails"
//             },
//             {
//                 $lookup: {
//                     from: "pilots",
//                     localField: "pilot",
//                     foreignField: "_id",
//                     as: "pilotDetails"
//                 }
//             },
//             {
//                 $unwind: "$pilotDetails"
//             },
//             {
//                 $lookup: {
//                     from: "locations",
//                     localField: "routeDetails.fromCity",
//                     foreignField: "_id",
//                     as: "fromCityDetails"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: "$fromCityDetails",
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "locations",
//                     localField: "routeDetails.toCity",
//                     foreignField: "_id",
//                     as: "toCityDetails"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: "$toCityDetails",
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     booking_status: 1,
//                     Total_pet_price_with_gst: 1,
//                     flight_name: "$flight_name",
//                     route_name: "$routeDetails.route_name",
//                     flight_takeoff_date: "$flight_takeoff_date",
//                     takeoff_time: "$takeoff_time",
//                     landing_time: "$landing_time",
//                     pilot_name: "$pilotDetails.full_name",
//                     copilot_name: "$copilot",
//                     pilot_id: "$pilot",
//                     fromCity_name: { $ifNull: ["$fromCityDetails.city_name", "Unknown"] },
//                     fromCity_airport_abbreviation: { $ifNull: ["$fromCityDetails.airport_abbreviation", "Unknown"] },
//                     fromCity_lat: { $ifNull: ["$fromCityDetails.lat", 0] },
//                     fromCity_long: { $ifNull: ["$fromCityDetails.long", 0] },
//                     fromCity_timezone: { $ifNull: ["$fromCityDetails.timezone", ''] },
//                     toCity_name: { $ifNull: ["$toCityDetails.city_name", "Unknown"] },
//                     toCity_airport_abbreviation: { $ifNull: ["$toCityDetails.airport_abbreviation", "Unknown"] },
//                     toCity_lat: { $ifNull: ["$toCityDetails.lat", 0] },
//                     toCity_long: { $ifNull: ["$toCityDetails.long", 0] },
//                     toCity_timezone: { $ifNull: ["$toCityDetails.timezone", ''] },
//                     status: 1,
//                     createdAt: 1,
//                     route: 1,
//                     isRecurr: 1,
//                     recurrLastDate: 1,
//                     day: 1,
//                     copilot: 1,
//                     pilot: 1,
//                     lastMaintenanceDate: 1,
//                     aircraftAssignment: 1
//                 }
//             }
//         ]);
//         console.log('flightData==', flightData.length)
//         for (let i = 0; i < flightData.length; i++) {
//             // const flight_takeoff = new Date(flightData[i].flight_takeoff_date);
//             // const [takeoffHours, takeoffMinutes] = flightData[i].takeoff_time.split(':').map(Number);
//             // flight_takeoff.setUTCHours(takeoffHours, takeoffMinutes, 0, 0);
//             // console.log(flight_takeoff)
//             // const localDateTime = flight_takeoff.toISOString();
//             // console.log(localDateTime)

//             const date = new Date(flightData[i].flight_takeoff_date);
//             // Extract the year, month, and day from the date
//             const year = date.getUTCFullYear();
//             const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
//             const day = String(date.getUTCDate()).padStart(2, '0');

//             // Combine the date with the takeoff time
//             const fromDateTime = `${year}-${month}-${day}T${flightData[i].takeoff_time}`;
//             const fromtimeZone = flightData[i].fromCity_timezone; // Specify your timezone
//             // Convert to UTC
//             const fromUtcDate = momentTimezone.tz(fromDateTime, fromtimeZone).utc();

//             //  console.log('Local from Date and Time:', fromDateTime);
//             // console.log('UTC to Date and Time:', fromUtcDate.format()); // ISO 8601 format

//             // Combine the date with the takeoff time
//             const toDateTime = `${year}-${month}-${day}T${flightData[i].landing_time}`;
//             const totimeZone = flightData[i].toCity_timezone; // Specify your timezone
//             // Convert to UTC
//             const toUtcDate = momentTimezone.tz(toDateTime, totimeZone).utc();

//             //  console.log('Local to Date and Time:', toDateTime);
//             //  console.log('UTC to Date and Time:', toUtcDate.format()); // ISO 8601 format
//             const updateData = {
//                 flight_takeoff_utcdatetime: fromUtcDate.format(),
//                 flight_landing_utcdatetime: toUtcDate.format()
//             }
//             //updating utc from and to date time
//             await flightModal.findByIdAndUpdate({ _id: toObjectId(flightData[i]._id) }, updateData, { new: true })
//         }
//         // Return a success response with the flight details
//         return successResponseWithoutData('Data Fetched Successfully.', res);
//         //return successResponse(flightData,'Data Fetched Successfully.', res);
//     } catch (error) {
//         // Handle errors and return an internal server error response
//         console.error(error);
//         return internalServerError('Internal Server Error.', res);
//     }
// };


