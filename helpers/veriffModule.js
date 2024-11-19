const dotenv = require('dotenv');
const userModal = require("../models/users.model");
const inviteLinkModel = require("../models/inviteLink");
const cardModal = require("../models/card");
const booking_modal = require("../models/booking");
const mail = require('../helpers/mailer');
const flight_seat_mapping = require("../models/flight_seats_mapping");
const flightModal = require("../models/flights");
const user_guest_mapping_modal = require("../models/user_guest_mapping")
const userMembershipModal = require("../models/userMembership")
const membership_settings = require("../models/membership_settings");
const veriffResponseModel = require("../models/veriffResponse");
const send_notification = require("../helpers/third_party_function")

const { toObjectId } = require('../helpers/v2/common');

const { ObjectId } = require('mongoose').Types;
const { default: mongoose } = require('mongoose');
const secretManagerAws = require('../helpers/secretManagerAws');
const veriffWebhookResponseModal = require("../models/veriffWebhookResponse")
const { encrypt, decrypt } = require('node-encryption');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });
const updateUserSocket = async (postData, socket_id) => {
    try {
        let user = await userModal.findOne({ _id: postData.user_id })
        let res = { status_code: 401, success: false, message: 'User not found' }
        if (!user) {
            return res;

        }

        let userData = await userModal.findByIdAndUpdate(user._id, { socket_id: socket_id }, { new: true });
        let data = { _id: userData._id, socket_id: userData.socket_id }
        res = { "status_code": 200, "success": true, "message": "Success", "data": data }
        return res;

    } catch (err) {
        console.error(err);
        throw err;
    }
};

const getVeriffResponse = async (postData) => {

    try {
        let encryptionKey = process.env.VERIFF_ENCRYPTIONKEY;

        //, socket_id: postData.socket_id
        let user = await userModal.findOne({ _id: postData.user_id })
        let res = { status_code: 401, success: false, message: 'User not found' }
        if (!user) {
            return res;

        }
        let submitdate = postData.submitdate;
        let currDateTime = new Date();
        //Fetching veriff data
        const get_veriffData = await veriffWebhookResponseModal
            .find({
                user_id: user._id,
                createdAt: { $gt: new Date(submitdate) }
            })
            .sort({ createdAt: -1 }) // Sort by created_at in descending order
            .limit(1) // Limiting to retrieve only one document 
            .exec();

        console.log(get_veriffData)

        if (!get_veriffData) {
            res = { status_code: 404, success: false, message: 'No data found' }
            return res;
        }

        if (get_veriffData?.[0]?.webhook_response?.[0] == undefined) {
            res = { status_code: 404, success: false, message: 'No data found' }
            return res;
        }
        //decrypt veriff response
        const decryptBuffer = decrypt(get_veriffData?.[0]?.webhook_response?.[0], encryptionKey);
        let webhook_response_data = JSON.parse(decryptBuffer.toString());
        if (webhook_response_data?.verification?.status != undefined && webhook_response_data?.verification?.status != 'approved') {
            let typeMessage = { type: "not_verified", code: webhook_response_data?.verification?.reasonCode };

            const validValues = [543, 605, 606];
            if (validValues.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>Your selfie is unclear.</p><br><p style='text-align:center'>Please retake it, ensuring your face is clearly visible</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "Your selfie is unclear. Please retake it, ensuring your face is clearly visible", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>Your selfie is unclear.</p><br><p>Please retake it, ensuring your face is clearly visible</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues1 = [641];
            if (validValues1.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>It looks like there is more than one person in the selfie.</p><br><p style='text-align:center'>Please retake it, ensuring only your face is visible</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "It looks like there is more than one person in the selfie. Please retake it, ensuring only your face is visible", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>It looks like there is more than one person in the selfie.</p><br><p>Please retake it, ensuring only your face is visible</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues2 = [608];
            if (validValues2.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The front of your ID is unclear or missing.</p><br><p style='text-align:center'>Please retake it, ensuring it is clear</p>", "data": typeMessage }

                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "The front of your ID is unclear or missing. Please retake it, ensuring it is clear", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>The front of your ID is unclear or missing.</p><br><p>Please retake it, ensuring it is clear</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues3 = [614];
            if (validValues3.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The front of your ID is not fully visible.</p><br><p style='text-align:center'>Please retake it, ensuring the entire ID is shown</p>", "data": typeMessage }

                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "The front of your ID is not fully visible. Please retake it, ensuring the entire ID is shown", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>The front of your ID is not fully visible.</p><br><p>Please retake it, ensuring the entire ID is shown</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues4 = [609];
            if (validValues4.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The back of your ID is unclear or missing.</p><br><p style='text-align:center'>Please retake it, ensuring it is clear</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "The back of your ID is unclear or missing. Please retake it, ensuring it is clear", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>The back of your ID is unclear or missing.</p><br><p>Please retake it, ensuring it is clear</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues5 = [615];
            if (validValues5.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The back of your ID is not clear or missing.</p><br><p style='text-align:center'>Please retake it, ensuring the entire ID is shown</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "The back of your ID is not clear or missing. Please retake it, ensuring the entire ID is shown", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>The back of your ID is not clear or missing.</p><br><p>Please retake it, ensuring the entire ID is shown</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues6 = [515, 526];
            if (validValues6.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>It looks like you’re not taking a live selfie.</p><br><p style='text-align:center'>Please try again, ensuring the selfie is new and authentic</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "It looks like you're not taking a live selfie. Please try again, ensuring the selfie is new and authentic", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>It looks like you're not taking a live selfie.</p><br><p>Please try again, ensuring the selfie is new and authentic</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues7 = [201, 204, 619, 625, 626, 627, 629, 631, 635, 643, 654, 657];
            if (validValues7.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>One or more photos taken are unclear.</p><br><p style='text-align:center'>Please try again, ensuring they are all clear</p>", "data": typeMessage }

                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "One or more photos taken are unclear. Please try again, ensuring they are all clear", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>One or more photos taken are unclear.</p><br><p>Please try again, ensuring they are all clear</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues8 = [203];
            if (validValues8.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The full document is not visible.</p><br><p style='text-align:center'>Please try again, ensuring the entire document is shown</p>", "data": typeMessage }

                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "The full document is not visible. Please try again, ensuring the entire document is shown", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>The full document is not visible.</p><br><p >Please try again, ensuring the entire document is shown</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues9 = [205, 621];
            if (validValues9.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The document appears damaged.</p><br><p style='text-align:center'>Please try again with an undamaged document</p>", "data": typeMessage }

                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "The document appears damaged. Please try again with an undamaged document", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>The document appears damaged.</p><br><p >Please try again with an undamaged document</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues10 = [206, 510, 602, 647];
            if (validValues10.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>Unsupported document type.</p><br><p style='text-align:center'>Please try again with a valid supported document</p>", "data": typeMessage }

                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "Unsupported document type. Please try again with a valid supported document", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>Unsupported document type.</p><br><p >Please try again with a valid supported document</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues11 = [207, 511];
            if (validValues11.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>Document expired.</p><br><p style='text-align:center'>Please try again with a valid, unexpired document</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "Document expired. Please try again with a valid, unexpired document", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>Document expired.</p><br><p>Please try again with a valid, unexpired document</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues12 = [642];
            if (validValues12.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>It looks like you’re using multiple documents.</p><br><p style='text-align:center'>Please try again with only one physical document</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "It looks like you're using multiple documents. Please try again with only one physical document", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>It looks like you're using multiple documents.</p><br><p>Please try again with only one physical document</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues13 = [101, 102, 507, 508, 636, 637, 638];
            if (validValues13.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>It seems you’re not using a physical document.</p><br><p style='text-align:center'>You may try again with an actual physical document</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "It seems you're not using a physical document. You may try again with an actual physical document", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>It seems you're not using a physical document.</p><br><p>You may try again with an actual physical document</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues14 = [103, 120, 509];
            if (validValues14.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The person in the document doesn’t seem to match your selfie.</p><br><p style='text-align:center'>You may try again, ensuring both the document and selfie are yours</p>", "data": typeMessage }
                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "The person in the document doesn’t seem to match your selfie. You may try again, ensuring both the document and selfie are yours", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>The person in the document doesn't seem to match your selfie.</p><br><p>You may try again, ensuring both the document and selfie are yours</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }

            const validValues15 = [503, 504, 505];
            if (validValues15.includes(webhook_response_data?.verification?.reasonCode)) {
                await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

                res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>It appears you’re not taking photos of real physical documents or yourself.</p><br><p style='text-align:center'>Please try again using actual documents and a live image</p>", "data": typeMessage }

                //sending push to user
                await send_notification.sendVerificationResponseNotification(user._id, "It appears you're not taking photos of real physical documents or yourself. Please try again using actual documents and a live image", typeMessage)

                //check user applied for verification
                let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
                if (getUserVeriff.length > 0) {
                    await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                        type: typeMessage.type, code: typeMessage.code, message: "<p>It appears you're not taking photos of real physical documents or yourself.</p><br><p>Please try again using actual documents and a live image</p>", updatedAt: currDateTime
                    }, { new: true })

                    //inactive rest user verification info
                    await veriffResponseModel.updateMany(
                        { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                        { $set: { status: 'inactive' } }
                    );
                }

                return res;
            }
            await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

            res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>We were unable to verify your identity.</p><br><p style='text-align:center'>You may try again</p>", "data": typeMessage }
            //sending push to user
            await send_notification.sendVerificationResponseNotification(user._id, "We were unable to verify your identity. You may try again", typeMessage)

            //check user applied for verification
            let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
            if (getUserVeriff.length > 0) {
                await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                    type: typeMessage.type, code: typeMessage.code, message: "<p>We were unable to verify your identity.</p><br><p>You may try again</p>", updatedAt: currDateTime
                }, { new: true })

                //inactive rest user verification info
                await veriffResponseModel.updateMany(
                    { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                    { $set: { status: 'inactive' } }
                );
            }

            return res;
        }
        let birthDate = 0;
        //If veriff date of birth
        //webhook_response_data?.data?.verification?.person?.dateOfBirth?.value != undefined && webhook_response_data?.data?.verification?.person?.dateOfBirth?.value != null
        if (webhook_response_data?.verification?.person?.dateOfBirth != undefined && webhook_response_data?.verification?.person?.dateOfBirth != null) {
            const date1 = new Date(user.birthday);
            const date2 = new Date(webhook_response_data.verification.person.dateOfBirth);
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
        //webhook_response_data?.data?.verification?.person?.firstName?.value != undefined && webhook_response_data?.data?.verification?.person?.firstName?.value != null
        if (webhook_response_data?.verification?.person?.firstName != undefined && webhook_response_data?.verification?.person?.firstName != null) {
            let lastName = '';
            if (webhook_response_data?.verification?.person?.lastName != undefined && webhook_response_data?.verification?.person?.lastName != null) {
                lastName = ` ${webhook_response_data.verification.person.lastName}`;
            }

            const name1 = `${webhook_response_data.verification.person.firstName}${lastName}`;
            const name2 = `${user.fullName}`;
            console.log(name1)
            console.log(name2)
            if (name1.toLowerCase() === name2.toLowerCase()) {
                console.log('Names are equal');
                nameMatch = 1;
            }
        }

        if (nameMatch == 0 && birthDate == 0) {
            await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

            let typeMessage = { type: "name_dob_not_match", code: 52 };
            res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The full legal name and birthday in your profile doesn’t match your identity document, or the picture taken is too blurry.</p><br><p style='text-align:center'>Please verify your identity details and try again</p>", "data": typeMessage }

            //sending push to user
            await send_notification.sendVerificationResponseNotification(user._id, "The full legal name and birthday in your profile doesn't match your identity document, or the picture taken is too blurry. Please verify your identity details and try again", typeMessage)

            //check user applied for verification
            let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
            if (getUserVeriff.length > 0) {
                await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                    type: typeMessage.type, code: typeMessage.code, message: "<p>The full legal name and birthday in your profile doesn't match your identity document, or the picture taken is too blurry.</p><br><p>Please verify your identity details and try again</p>", updatedAt: currDateTime
                }, { new: true })

                //inactive rest user verification info
                await veriffResponseModel.updateMany(
                    { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                    { $set: { status: 'inactive' } }
                );
            }

            return res;
        } else if (nameMatch == 0) {
            await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

            let typeMessage = { type: "name_not_match", code: 53 };
            res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The full legal name in your profile doesn’t match the name on your identity document, or the picture taken is too blurry.</p><br><p style='text-align:center'>Please verify your identity details and try again</p>", "data": typeMessage }
            //sending push to user
            await send_notification.sendVerificationResponseNotification(user._id, "The full legal name in your profile doesn't match the name on your identity document, or the picture taken is too blurry. Please verify your identity details and try again", typeMessage)

            //check user applied for verification
            let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
            if (getUserVeriff.length > 0) {
                await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                    type: typeMessage.type, code: typeMessage.code, message: "<p>The full legal name in your profile doesn't match the name on your identity document, or the picture taken is too blurry.</p><br><p>Please verify your identity details and try again</p>", updatedAt: currDateTime
                }, { new: true })

                //inactive rest user verification info
                await veriffResponseModel.updateMany(
                    { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                    { $set: { status: 'inactive' } }
                );
            }

            return res;
        } else if (birthDate == 0) {
            await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'not verified' }, { new: true })

            let typeMessage = { type: "dob_not_match", code: 51 };
            res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>The birthday in your profile doesn’t match your identity document, or the picture taken is too blurry.</p><br><p style='text-align:center'>Please verify your identity details and try again</p>", "data": typeMessage }
            //sending push to user
            await send_notification.sendVerificationResponseNotification(user._id, "The birthday in your profile doesn’t match your identity document, or the picture taken is too blurry. Please verify your identity details and try again", typeMessage)

            //check user applied for verification
            let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
            if (getUserVeriff.length > 0) {
                await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                    type: typeMessage.type, code: typeMessage.code, message: "<p>The birthday in your profile doesn't match your identity document, or the picture taken is too blurry.</p><br><p>Please verify your identity details and try again</p>", updatedAt: currDateTime
                }, { new: true })

                //inactive rest user verification info
                await veriffResponseModel.updateMany(
                    { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                    { $set: { status: 'inactive' } }
                );
            }


            return res;
        }

        //updating user verify status
        await userModal.findByIdAndUpdate(user._id, { userVerifyStatus: 'verified' }, { new: true })
        //adding logic for invite guest
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(startDate.getHours() + 11);
        let checkLinkCodeValid = await inviteLinkModel.find({ link_used_by_user_id: user._id.valueOf(), status: 'active' })
        if (checkLinkCodeValid.length > 0) {
            const checkDemoSettings = await membership_settings.findOne({ is_demo_process: true });

            //checking user membership
            let user_membership = await userMembershipModal.findOne({ user_id: user._id, status: "active" });
            if (user_membership) {
                console.log('both V M')
                for (let jk = 0; jk < checkLinkCodeValid.length; jk++) {
                    if (checkLinkCodeValid[jk].round_trip == false) {
                        let booking = await booking_modal.aggregate([
                            {
                                $match: {
                                    _id: toObjectId(checkLinkCodeValid[jk].booking_id),
                                    status: "active",
                                    booking_status: 'confirmed',
                                    is_demo: false
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
                                            { $gte: ["$combined_takeoff_datetime", startDate] }
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
                                $project: {
                                    flight_id: 0
                                }
                            }

                        ]);
                        //console.log('booking===',booking)
                        if (booking && booking.length > 0) {
                            for (let data of booking) {
                                //create booking
                                let new_booking = await booking_modal.create({
                                    flight_id: toObjectId(data.flight_data._id),
                                    user_id: user._id.valueOf(),
                                    booking_status: "confirmed",
                                    reusable_booking_used: 1,
                                    is_demo: false
                                })
                                let booking_id = new_booking._id;
                                if (user.reusable_bookings > 0) {
                                    await userModal.findByIdAndUpdate({ _id: toObjectId(user._id) }, { reusable_bookings: Number(user.reusable_bookings - 1) })
                                }
                                let addSeatsObject = {}
                                // Iterate over seat details
                                for (let i = 1; i <= 8; i++) {
                                    const seat_details = data.flight_data?.flight_seat?.[0][`seat${i}_details`];
                                    if (seat_details) {

                                        if (seat_details.user_id && seat_details.user_id == checkLinkCodeValid[jk].invited_by_user_id) {

                                            if (seat_details.guest_id && seat_details.booking_id && seat_details.booking_id.valueOf() == data._id && seat_details.guest_id == checkLinkCodeValid[jk].guest_id) {

                                                addSeatsObject[`seat${i}`] = 1
                                                addSeatsObject[`seat${i}_details`] = {
                                                    "lock_date_time": "",
                                                    "pet_request_accepted": 1,
                                                    "booking_id": toObjectId(booking_id),
                                                    "user_id": toObjectId(checkLinkCodeValid[jk].link_used_by_user_id)
                                                }
                                            }
                                        }
                                    }
                                }
                                //adding guest user id on seat
                                let updateFlightseat = await flight_seat_mapping.findOneAndUpdate({ flight_id: toObjectId(data.flight_data._id) }, addSeatsObject);
                                if (updateFlightseat) {
                                    await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk]._id) }, {
                                        link_used_by_user_id: user._id.valueOf(), updated_at: currentDate, booking_assigned: true, status: 'inactive'
                                    }, { new: true })

                                    //removing guest pass from user booking
                                    await booking_modal.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk].booking_id) }, {
                                        guest_pass_used: Number(data.guest_pass_used - 1)
                                    }, { new: true })
                                    //ading guest pass to user who invite guest
                                    let getGuestpasses = await userModal.findOne({ _id: toObjectId(checkLinkCodeValid[jk].invited_by_user_id) })
                                    if (getGuestpasses) {
                                        await userModal.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk].invited_by_user_id) }, { guest_passes: Number(getGuestpasses.guest_passes + 1) })
                                    }
                                }
                            }
                        }
                    } else {
                        //Getting user booking data
                        let booking_data = await booking_modal.findOne({
                            _id: toObjectId(checkLinkCodeValid[jk].booking_id)
                        })
                        if (booking_data) {
                            let flightOne = false;
                            let flightSecond = false;
                            let firstBooking_id = '';
                            let secondBooking_id = '';
                            let newFirstBooking_id;
                            let newSecondBooking_id;
                            //checking round trip
                            if (booking_data.isRoundTrip == true && booking_data?.round_trip_id != undefined && booking_data?.round_trip_id != '') {
                                //assigning fiest and second booing ids 
                                firstBooking_id = toObjectId(booking_data.round_trip_id);
                                secondBooking_id = toObjectId(checkLinkCodeValid[jk].booking_id);
                            }

                            if (booking_data.isRoundTrip == true && booking_data?.round_trip_id == undefined) {
                                //assigning fiest and second booing ids 
                                firstBooking_id = toObjectId(checkLinkCodeValid[jk].booking_id);
                                let secondbooking_data = await booking_modal.findOne({
                                    round_trip_id: toObjectId(checkLinkCodeValid[jk].booking_id)
                                })
                                if (secondbooking_data) {
                                    secondBooking_id = toObjectId(secondbooking_data._id);
                                }
                            }

                            if (firstBooking_id != '') {
                                let booking = await booking_modal.aggregate([
                                    {
                                        $match: {
                                            _id: firstBooking_id,
                                            status: "active",
                                            booking_status: 'confirmed',
                                            is_demo: false
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
                                                    { $gte: ["$combined_takeoff_datetime", startDate] }
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
                                        $project: {
                                            flight_id: 0
                                        }
                                    }

                                ]);
                                //console.log('booking===',booking)
                                if (booking && booking.length > 0) {
                                    for (let data of booking) {
                                        //create booking
                                        let new_booking = await booking_modal.create({
                                            flight_id: toObjectId(data.flight_data._id),
                                            user_id: user._id.valueOf(),
                                            booking_status: "confirmed",
                                            reusable_booking_used: 1,
                                            is_demo: false
                                        })
                                        let booking_id = new_booking._id;
                                        if (user.reusable_bookings > 0) {
                                            await userModal.findByIdAndUpdate({ _id: toObjectId(user._id) }, { reusable_bookings: Number(user.reusable_bookings - 1) })
                                        }
                                        let addSeatsObject = {}
                                        // Iterate over seat details
                                        for (let i = 1; i <= 8; i++) {
                                            const seat_details = data.flight_data?.flight_seat?.[0][`seat${i}_details`];
                                            if (seat_details) {

                                                if (seat_details.user_id && seat_details.user_id == checkLinkCodeValid[jk].invited_by_user_id) {

                                                    if (seat_details.guest_id && seat_details.booking_id && seat_details.booking_id.valueOf() == data._id && seat_details.guest_id == checkLinkCodeValid[jk].guest_id) {
                                                        newFirstBooking_id = toObjectId(booking_id);
                                                        flightOne = true;
                                                        addSeatsObject[`seat${i}`] = 1
                                                        addSeatsObject[`seat${i}_details`] = {
                                                            "lock_date_time": "",
                                                            "pet_request_accepted": 1,
                                                            "booking_id": toObjectId(booking_id),
                                                            "user_id": toObjectId(checkLinkCodeValid[jk].link_used_by_user_id)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        //adding guest user id on seat
                                        let updateFlightseat = await flight_seat_mapping.findOneAndUpdate({ flight_id: toObjectId(data.flight_data._id) }, addSeatsObject);
                                        if (updateFlightseat) {
                                            await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk]._id) }, {
                                                link_used_by_user_id: user._id.valueOf(), updated_at: currentDate, booking_assigned: true, status: 'inactive'
                                            }, { new: true })
                                            //removing guest pass from user booking
                                            await booking_modal.findByIdAndUpdate({ _id: firstBooking_id }, {
                                                guest_pass_used: Number(data.guest_pass_used - 1)
                                            }, { new: true })
                                            //ading guest pass to user who invite guest
                                            let getGuestpasses = await userModal.findOne({ _id: toObjectId(checkLinkCodeValid[jk].invited_by_user_id) })
                                            if (getGuestpasses) {
                                                await userModal.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk].invited_by_user_id) }, { guest_passes: Number(getGuestpasses.guest_passes + 1) })
                                            }

                                        }
                                    }
                                }
                            }

                            if (secondBooking_id != '') {
                                let booking = await booking_modal.aggregate([
                                    {
                                        $match: {
                                            _id: secondBooking_id,
                                            status: "active",
                                            booking_status: 'confirmed',
                                            is_demo: false
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
                                                    { $gte: ["$combined_takeoff_datetime", startDate] }
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
                                        $project: {
                                            flight_id: 0
                                        }
                                    }

                                ]);
                                //console.log('booking===',booking)
                                if (booking && booking.length > 0) {
                                    for (let data of booking) {
                                        //create booking
                                        let new_booking = await booking_modal.create({
                                            flight_id: toObjectId(data.flight_data._id),
                                            user_id: user._id.valueOf(),
                                            booking_status: "confirmed",
                                            reusable_booking_used: 1,
                                            is_demo: false
                                        })
                                        let booking_id = new_booking._id;
                                        if (user.reusable_bookings > 0) {
                                            await userModal.findByIdAndUpdate({ _id: toObjectId(user._id) }, { reusable_bookings: Number(user.reusable_bookings - 1) })
                                        }
                                        let addSeatsObject = {}
                                        // Iterate over seat details
                                        for (let i = 1; i <= 8; i++) {
                                            const seat_details = data.flight_data?.flight_seat?.[0][`seat${i}_details`];
                                            if (seat_details) {

                                                if (seat_details.user_id && seat_details.user_id == checkLinkCodeValid[jk].invited_by_user_id) {

                                                    if (seat_details.guest_id && seat_details.booking_id && seat_details.booking_id.valueOf() == data._id && seat_details.guest_id == checkLinkCodeValid[jk].guest_id) {
                                                        newSecondBooking_id = toObjectId(booking_id);
                                                        flightSecond = true;
                                                        addSeatsObject[`seat${i}`] = 1
                                                        addSeatsObject[`seat${i}_details`] = {
                                                            "lock_date_time": "",
                                                            "pet_request_accepted": 1,
                                                            "booking_id": toObjectId(booking_id),
                                                            "user_id": toObjectId(checkLinkCodeValid[jk].link_used_by_user_id)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        //adding guest user id on seat
                                        let updateFlightseat = await flight_seat_mapping.findOneAndUpdate({ flight_id: toObjectId(data.flight_data._id) }, addSeatsObject);
                                        if (updateFlightseat) {
                                            await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk]._id) }, {
                                                link_used_by_user_id: user._id.valueOf(), updated_at: currentDate, booking_assigned: true, status: 'inactive'
                                            }, { new: true })
                                            //removing guest pass from user booking
                                            await booking_modal.findByIdAndUpdate({ _id: secondBooking_id }, {
                                                guest_pass_used: Number(data.guest_pass_used - 1)
                                            }, { new: true })
                                            //ading guest pass to user who invite guest
                                            let getGuestpasses = await userModal.findOne({ _id: toObjectId(checkLinkCodeValid[jk].invited_by_user_id) })
                                            if (getGuestpasses) {
                                                await userModal.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk].invited_by_user_id) }, { guest_passes: Number(getGuestpasses.guest_passes + 1) })
                                            }

                                        }
                                    }
                                }
                            }

                            if (flightOne == true && flightSecond == true) {
                                //updating round trip status first flight
                                await booking_modal.findByIdAndUpdate({ _id: newFirstBooking_id }, {
                                    isRoundTrip: true
                                }, { new: true })

                                //updating round trip status second flight
                                await booking_modal.findByIdAndUpdate({ _id: newSecondBooking_id }, {
                                    isRoundTrip: true, round_trip_id: newFirstBooking_id
                                }, { new: true })
                            }
                        }
                    }
                }
            } else if (!user_membership) {
                console.log('only V')
                for (let jk = 0; jk < checkLinkCodeValid.length; jk++) {
                    if (checkLinkCodeValid[jk].round_trip == false) {
                        let booking = await booking_modal.aggregate([
                            {
                                $match: {
                                    _id: toObjectId(checkLinkCodeValid[jk].booking_id),
                                    status: "active",
                                    booking_status: 'confirmed',
                                    is_demo: false
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
                                            { $gte: ["$combined_takeoff_datetime", startDate] }
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
                                $project: {
                                    flight_id: 0
                                }
                            }

                        ]);
                        //console.log('booking===',booking)
                        if (booking && booking.length > 0) {
                            for (let data of booking) {
                                let addSeatsObject = {}
                                // Iterate over seat details
                                for (let i = 1; i <= 8; i++) {
                                    const seat_details = data.flight_data?.flight_seat?.[0][`seat${i}_details`];
                                    if (seat_details) {

                                        if (seat_details.user_id && seat_details.user_id == checkLinkCodeValid[jk].invited_by_user_id) {

                                            if (seat_details.guest_id && seat_details.booking_id && seat_details.booking_id.valueOf() == data._id && seat_details.guest_id == checkLinkCodeValid[jk].guest_id) {

                                                addSeatsObject[`seat${i}`] = 1
                                                addSeatsObject[`seat${i}_details`] = {
                                                    "lock_date_time": "",
                                                    "pet_request_accepted": 1,
                                                    "user_id": toObjectId(checkLinkCodeValid[jk].invited_by_user_id),
                                                    "booking_id": toObjectId(data._id),
                                                    "guest_id": checkLinkCodeValid[jk].guest_id,
                                                    "guest_user_id": toObjectId(checkLinkCodeValid[jk].link_used_by_user_id)
                                                }
                                            }
                                        }
                                    }
                                }
                                //adding guest user id on seat
                                let updateFlightseat = await flight_seat_mapping.findOneAndUpdate({ flight_id: toObjectId(data.flight_data._id) }, addSeatsObject);
                                if (updateFlightseat) {
                                    await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk]._id) }, {
                                        link_used_by_user_id: user._id.valueOf(), updated_at: currentDate, booking_assigned: true, status: 'inactive'
                                    }, { new: true })

                                    //updating guest info
                                    await user_guest_mapping_modal.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk].guest_id) }, { guest_name: user.fullName, guest_phone_code: user.phone_code, guest_phone: user.phone, guest_profile_pic: user.profile_pic })
                                }
                            }
                        }
                    } else {
                        //Getting user booking data
                        let booking_data = await booking_modal.findOne({
                            _id: toObjectId(checkLinkCodeValid[jk].booking_id)
                        })
                        if (booking_data) {
                            let firstBooking_id = '';
                            let secondBooking_id = '';
                            //checking round trip
                            if (booking_data.isRoundTrip == true && booking_data?.round_trip_id != undefined && booking_data?.round_trip_id != '') {
                                //assigning fiest and second booing ids 
                                firstBooking_id = toObjectId(booking_data.round_trip_id);
                                secondBooking_id = toObjectId(checkLinkCodeValid[jk].booking_id);
                            }

                            if (booking_data.isRoundTrip == true && booking_data?.round_trip_id == undefined) {
                                //assigning fiest and second booing ids 
                                firstBooking_id = toObjectId(checkLinkCodeValid[jk].booking_id);
                                let secondbooking_data = await booking_modal.findOne({
                                    round_trip_id: toObjectId(checkLinkCodeValid[jk].booking_id)
                                })
                                if (secondbooking_data) {
                                    secondBooking_id = toObjectId(secondbooking_data._id);
                                }
                            }

                            //checking first and seconding id not empty
                            if (firstBooking_id != '') {
                                let booking = await booking_modal.aggregate([
                                    {
                                        $match: {
                                            _id: firstBooking_id,
                                            status: "active",
                                            booking_status: 'confirmed',
                                            is_demo: false
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
                                                    { $gte: ["$combined_takeoff_datetime", startDate] }
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
                                        $project: {
                                            flight_id: 0
                                        }
                                    }

                                ]);
                                //console.log('booking===',booking)
                                if (booking && booking.length > 0) {
                                    for (let data of booking) {
                                        let addSeatsObject = {}
                                        // Iterate over seat details
                                        for (let i = 1; i <= 8; i++) {
                                            const seat_details = data.flight_data?.flight_seat?.[0][`seat${i}_details`];
                                            if (seat_details) {

                                                if (seat_details.user_id && seat_details.user_id == checkLinkCodeValid[jk].invited_by_user_id) {

                                                    if (seat_details.guest_id && seat_details.booking_id && seat_details.booking_id.valueOf() == data._id && seat_details.guest_id == checkLinkCodeValid[jk].guest_id) {

                                                        addSeatsObject[`seat${i}`] = 1
                                                        addSeatsObject[`seat${i}_details`] = {
                                                            "lock_date_time": "",
                                                            "pet_request_accepted": 1,
                                                            "user_id": toObjectId(checkLinkCodeValid[jk].invited_by_user_id),
                                                            "booking_id": toObjectId(data._id),
                                                            "guest_id": checkLinkCodeValid[jk].guest_id,
                                                            "guest_user_id": toObjectId(checkLinkCodeValid[jk].link_used_by_user_id)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        //adding guest user id on seat
                                        let updateFlightseat = await flight_seat_mapping.findOneAndUpdate({ flight_id: toObjectId(data.flight_data._id) }, addSeatsObject);
                                        if (updateFlightseat) {
                                            //updating link status
                                            await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk]._id) }, {
                                                link_used_by_user_id: user._id.valueOf(), updated_at: currentDate, booking_assigned: true, status: 'inactive'
                                            }, { new: true })

                                            //updating guest info
                                            await user_guest_mapping_modal.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk].guest_id) }, { guest_name: user.fullName, guest_phone_code: user.phone_code, guest_phone: user.phone, guest_profile_pic: user.profile_pic })

                                        }
                                    }
                                }
                            }

                            if (secondBooking_id != '') {
                                let booking = await booking_modal.aggregate([
                                    {
                                        $match: {
                                            _id: secondBooking_id,
                                            status: "active",
                                            booking_status: 'confirmed',
                                            is_demo: false
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
                                                    { $gte: ["$combined_takeoff_datetime", startDate] }
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
                                        $project: {
                                            flight_id: 0
                                        }
                                    }

                                ]);
                                //console.log('booking===',booking)
                                if (booking && booking.length > 0) {
                                    for (let data of booking) {
                                        let addSeatsObject = {}
                                        // Iterate over seat details
                                        for (let i = 1; i <= 8; i++) {
                                            const seat_details = data.flight_data?.flight_seat?.[0][`seat${i}_details`];
                                            if (seat_details) {

                                                if (seat_details.user_id && seat_details.user_id == checkLinkCodeValid[jk].invited_by_user_id) {

                                                    if (seat_details.guest_id && seat_details.booking_id && seat_details.booking_id.valueOf() == data._id && seat_details.guest_id == checkLinkCodeValid[jk].guest_id) {

                                                        addSeatsObject[`seat${i}`] = 1
                                                        addSeatsObject[`seat${i}_details`] = {
                                                            "lock_date_time": "",
                                                            "pet_request_accepted": 1,
                                                            "user_id": toObjectId(checkLinkCodeValid[jk].invited_by_user_id),
                                                            "booking_id": toObjectId(data._id),
                                                            "guest_id": checkLinkCodeValid[jk].guest_id,
                                                            "guest_user_id": toObjectId(checkLinkCodeValid[jk].link_used_by_user_id)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        //adding guest user id on seat
                                        let updateFlightseat = await flight_seat_mapping.findOneAndUpdate({ flight_id: toObjectId(data.flight_data._id) }, addSeatsObject);
                                        if (updateFlightseat) {
                                            //updating link status
                                            await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk]._id) }, {
                                                link_used_by_user_id: user._id.valueOf(), updated_at: currentDate, booking_assigned: true, status: 'inactive'
                                            }, { new: true })

                                            //updating guest info
                                            await user_guest_mapping_modal.findByIdAndUpdate({ _id: toObjectId(checkLinkCodeValid[jk].guest_id) }, { guest_name: user.fullName, guest_phone_code: user.phone_code, guest_phone: user.phone, guest_profile_pic: user.profile_pic })

                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

        }

        let userData = await userModal.findOne({ _id: user._id, userVerifyStatus: 'verified' });
        let userCardData = await cardModal.find({ userId: user._id });

        if (userData && userData.userVerifyStatus === 'verified') {
            const userLastName = userData.last_name.toLowerCase();

            // Loop through each card to check for a last name mismatch
            for (const card of userCardData) {
                const cardholderLastName = card.cardholderName.split(' ').pop().toLowerCase();

                // If there's a mismatch in the last name
                if (cardholderLastName !== userLastName) {
                    // Send an email to notify about the mismatch for this specific card
                    await mail.sendFraudMail({
                        subject: `Alert: Last name mismatch on ${userData.fullName}'s credit card`,
                        message: `Alert: The last name on ${userData.fullName} credit card differs from his registered last name.`
                    });
                }
            }
        }

        //logic end here
        let typeMessage = { type: "verified", code: 200 };
        res = { "status_code": 200, "success": true, "message": "<p style='text-align:center'>You are verified</p>", "data": typeMessage }

        //sending push to user
        await send_notification.sendVerificationResponseNotification(user._id, "You are verified", typeMessage)

        //check user applied for verification
        let getUserVeriff = await veriffResponseModel.find({ user_id: toObjectId(user._id), status: 'active' }).sort({ createdAt: -1 }).limit(1).exec();
        if (getUserVeriff.length > 0) {
            let updateUserVeriffResponse = await veriffResponseModel.findByIdAndUpdate({ _id: toObjectId(getUserVeriff[0]._id) }, {
                type: typeMessage.type, code: typeMessage.code, message: "<p>You are verified</p>", updatedAt: currDateTime
            }, { new: true })

            if (user.profile_pic == '' && updateUserVeriffResponse && updateUserVeriffResponse.user_image != '') {
                await userModal.findByIdAndUpdate({ _id: toObjectId(user._id) }, {
                    profile_pic: updateUserVeriffResponse.user_image
                }, { new: true })

                //updating guest info
                await user_guest_mapping_modal.findOneAndUpdate({ guest_phone_code: user.phone_code, guest_phone: user.phone }, { guest_profile_pic: updateUserVeriffResponse.user_image })
            }
            //inactive rest user verification info
            await veriffResponseModel.updateMany(
                { user_id: toObjectId(user._id), status: 'active', _id: { $ne: toObjectId(getUserVeriff[0]._id) } },
                { $set: { status: 'inactive' } }
            );
        }

        return res;
    } catch (err) {
        console.error(err);
        throw err;
    }
};


module.exports = {
    updateUserSocket,
    getVeriffResponse
};
