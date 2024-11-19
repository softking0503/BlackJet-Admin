const dotenv = require('dotenv');
const cron = require('node-cron');
const dayjs = require('dayjs');
let bookingModal = require('../models/booking')
const flightModal = require("../models/flights")
const userModal = require('../models/users.model');
const tempUserModal = require("../models/tempUsers");
const cronmodal = require("../models/cronData")
const flight_seats_mapping = require('../models/flight_seats_mapping');
const flight_seat_mapping = require("../models/flight_seats_mapping");
const twilioCountryModel = require("../models/twilioCountry");
const inviteLinkModel = require("../models/inviteLink");
const user_guest_mapping_modal = require("../models/user_guest_mapping")
const send_notification = require("../helpers/third_party_function")
const userMembershipModal = require("../models/userMembership")
const demo_flight = require('../models/demoFlight');
const { processPayment, toObjectId } = require('../helpers/v2/common');
const routeModel = require('../models/route');
const transactionModal = require("../models/payment");
const membership_settings = require("../models/membership_settings")
const moment = require('moment');
const path = require('path');

// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '../', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// '*/0.5 * * * *' - Run every
let time = {
    runAt00_30_am: `0 30 0 * * *`,//every day 12:30 am
    runEveryMinuteAt30sec: '0 */5 * * * *',//every 5 mins
    runOnDemand: `0 */1 * * * *`,
    runEverySundayAt10am: '0 0 10 * * 0', // every Sunday at 10 AM
    runEveryDay12pm: '0 0 * * *', // every day at 12 AM
    runEveryDay03amSydney: '0 0 17 * * *'
}

const petOnboardjob = cron.schedule(
    time.runEveryMinuteAt30sec,
    async () => {
        try {
            console.log("pet request cron")
            const pendingBookings = await bookingModal.aggregate([
                {
                    $match: {
                        booking_status: "pending",
                        pet_pass_used: { $gte: 1 }
                    }
                },
                {
                    $lookup: {
                        from: "flight_seats_mappings",
                        let: { flightID: "$flight_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$flight_id", "$$flightID"] },
                                }
                            },
                            {
                                $lookup: {
                                    from: "flights",
                                    localField: "flight_id",
                                    foreignField: "_id",
                                    as: "flights"
                                }
                            },
                        ],
                        as: "flight_seat_data",
                    }
                },
                {
                    $unwind: "$flight_seat_data"
                },
                {
                    $lookup: {
                        from: "users",
                        let: { userID: "$user_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$userID"] },
                                }
                            },
                        ],
                        as: "user_data",
                    }
                },
            ]);
            let result = []
            let booking_count = 0

            // Process bookings in batches
            pendingBookings.forEach(async (booking) => {
                try {
                    let userdata = await userModal.findOne({ _id: booking.user_id });
                    booking_count++
                    // console.log("booking==********", booking)
                    if (booking.flight_seat_data && booking.flight_seat_data.flights && booking.flight_seat_data.flights.length > 0) {
                        // console.log("***********", booking.flight_seat_data.flights)
                        const flight_takeoff = new Date(booking.flight_seat_data.flights[0]['flight_takeoff_date'])
                        const [time1Hours, time1Minutes] = booking.flight_seat_data.flights[0]['takeoff_time'].split(':').map(Number);
                        flight_takeoff.setHours(time1Hours, time1Minutes);
                        if (booking.petOnBoardRequestStarts) {
                            let requestDateTime = new Date(booking.petOnBoardRequestStarts);
                            requestDateTime.setHours(requestDateTime.getHours() + 1);
                            requestDateTime = requestDateTime.getTime();
                            const currentDate = new Date();
                            const startDate = new Date(currentDate);
                            //startDate.setHours(startDate.getHours() + 10);
                            let currtime = startDate.getTime()

                            console.log(currtime, '>=', requestDateTime)
                            //If lock_date_time is >1hour 
                            if (currtime >= requestDateTime) {
                                console.log("**********BOOKING NO-**********", booking_count)
                                let ispet = false, pet_request_accepted = true, confirm_booking_ids = [], updates = [], update = {}
                                result.push(booking._id)
                                for (let i = 1; i <= 8; i++) {
                                    if (booking.flight_seat_data[`seat${i}_details`] && booking.flight_seat_data[`seat${i}_details`].booking_id && booking.flight_seat_data[`seat${i}_details`].booking_id == booking._id && booking.flight_seat_data[`seat${i}_details`].pet_id && booking.flight_seat_data[`seat${i}_details`].pet_id.length > 0 && booking.flight_seat_data[`seat${i}_details`].lock_date_time) {
                                        ispet = true
                                        confirm_booking_ids.push(booking.flight_seat_data[`seat${i}_details`].booking_id)
                                        updates.push({
                                            seatNumber: i,
                                            user_id: booking.flight_seat_data[`seat${i}_details`].user_id,

                                        });
                                        update[`seat${i}_details.lock_date_time`] = ""
                                    }
                                    if (booking.flight_seat_data[`seat${i}_details`] && !booking.flight_seat_data[`seat${i}_details`].pet_request_accepted) {
                                        pet_request_accepted = false
                                    }
                                }
                                if (pet_request_accepted) {
                                    if (booking.isRoundTrip) {
                                        let firstBooking_id = '';
                                        let secondBooking_id = '';
                                        if (booking?.round_trip_id != undefined && booking?.round_trip_id != '') {
                                            //assigning fiest and second booing ids 
                                            firstBooking_id = toObjectId(booking.round_trip_id);
                                            secondBooking_id = toObjectId(booking._id);
                                        }

                                        if (booking?.round_trip_id == undefined) {
                                            //assigning fiest and second booing ids 
                                            firstBooking_id = toObjectId(booking._id);
                                            let secondbooking_data = await bookingModal.findOne({
                                                round_trip_id: toObjectId(booking._id)
                                            })
                                            if (secondbooking_data) {
                                                secondBooking_id = toObjectId(secondbooking_data._id);
                                            }
                                        }

                                        if (firstBooking_id != '' && secondBooking_id == '') {
                                            //Getting first booking data
                                            let firstbooking_data = await bookingModal.findOne({
                                                _id: firstBooking_id
                                            })
                                            //pet on board key added on first flight table
                                            await flightModal.findByIdAndUpdate({ _id: firstbooking_data.flight_id }, {
                                                pet_on_board: true
                                            }, { new: true })
                                            //update the first booking status 
                                            await bookingModal.findByIdAndUpdate({ _id: firstbooking_data._id }, {
                                                booking_status: "confirmed"
                                            }, { new: true })


                                            //Getting second booking data
                                            let secondbooking_data = await bookingModal.findOne({
                                                _id: secondBooking_id
                                            })
                                            //pet on board key added on second flight table
                                            await flightModal.findByIdAndUpdate({ _id: secondbooking_data.flight_id }, {
                                                pet_on_board: true
                                            }, { new: true })
                                            //update the second booking status
                                            await bookingModal.findByIdAndUpdate({ _id: secondbooking_data._id }, {
                                                booking_status: "confirmed"
                                            }, { new: true })

                                            //round trip invite send to guest
                                            let firstbookingObjectId = firstBooking_id;
                                            let secondbookingObjectId = secondBooking_id;
                                            console.log('single flight 123')
                                            let firstGuests = [];
                                            let secondGuests = [];
                                            let firstformattedDate = '';
                                            let secondformattedDate = '';
                                            let firstFlightData;
                                            let secondFlightData;
                                            let getUserName = await userModal.findOne({ _id: toObjectId(secondbooking_data.user_id) });
                                            //fetch booking first flight details
                                            firstFlightData = await flightModal.findById({ _id: firstbooking_data.flight_id })
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


                                                let seat_details = await flight_seat_mapping.findOne({ flight_id: firstbooking_data.flight_id })
                                                for (let j = 1; j <= 8; j++) {
                                                    if (seat_details?.[`seat${j}_details`]?.user_id != undefined && seat_details?.[`seat${j}_details`]?.booking_id != undefined) {
                                                        if (seat_details?.[`seat${j}_details`]?.user_id.equals(firstbooking_data.user_id) && seat_details?.[`seat${j}_details`]?.booking_id.equals(firstbookingObjectId)) {
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

                                            //fetch booking second flight details
                                            secondFlightData = await flightModal.findById({ _id: secondbooking_data.flight_id })
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

                                                let seat_details = await flight_seat_mapping.findOne({ flight_id: secondbooking_data.flight_id })
                                                for (let j = 1; j <= 8; j++) {
                                                    if (seat_details?.[`seat${j}_details`]?.user_id != undefined && seat_details?.[`seat${j}_details`]?.booking_id != undefined) {
                                                        if (seat_details?.[`seat${j}_details`]?.user_id.equals(secondbooking_data.user_id) && seat_details?.[`seat${j}_details`]?.booking_id.equals(secondbookingObjectId)) {
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

                                            let fromPhoneNumber = process.env.TWILIO_FROM_PHONE_NO; // Twilio phone number
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
                                                        let invitelinkData = { guest_id: commonObjects[fi].guest_id.toString(), guest_name: commonObjects[fi].guest_name, guest_phone_code: commonObjects[fi].guest_phone_code, guest_phone: commonObjects[fi].guest_phone, invited_by_user_id: secondbooking_data.user_id.valueOf(), booking_id: secondbookingObjectId, round_trip: true }

                                                        const addInviteLinkData = new inviteLinkModel(invitelinkData);
                                                        await addInviteLinkData.save();
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
                                                        let inviteLinkUrl = `https://theblackjet.biz/invite/${addInviteLinkData._id.valueOf()}`
                                                        if (process.env.NODE_ENV == 'production') {
                                                            inviteLinkUrl = `https://blackjet.au/invite/${addInviteLinkData._id.valueOf()}`;
                                                        }
                                                        client.messages
                                                            .create({
                                                                body: `Hey ${commonObjects[fi].guest_name}, You're invited on ${getUserName.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}.  ${secondFlightData.route.fromCity.city_name} - ${secondFlightData.route.toCity.city_name} ${secondformattedDate} ${secondFlightData.takeoff_time}. Confirm by registering with this mobile phone number at ${inviteLinkUrl}`,
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
                                                            let invitelinkData = { guest_id: remainingObjects[si].guest_id.toString(), guest_name: remainingObjects[si].guest_name, guest_phone_code: remainingObjects[si].guest_phone_code, guest_phone: remainingObjects[si].guest_phone, invited_by_user_id: firstbooking_data.user_id.valueOf(), booking_id: firstbooking_data._id }

                                                            const addInviteLinkData = new inviteLinkModel(invitelinkData);
                                                            await addInviteLinkData.save();
                                                            let inviteLinkUrl = `https://theblackjet.biz/invite/${addInviteLinkData._id.valueOf()}`
                                                            if (process.env.NODE_ENV == 'production') {
                                                                inviteLinkUrl = `https://blackjet.au/invite/${addInviteLinkData._id.valueOf()}`;
                                                            }
                                                            client.messages
                                                                .create({
                                                                    body: `Hey ${remainingObjects[si].guest_name}, You're invited on ${getUserName.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}. Confirm by registering with this mobile phone number at ${inviteLinkUrl}`,
                                                                    from: fromPhoneNumber,
                                                                    to: toPhoneNumber,
                                                                })
                                                                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                                                                .catch(error => console.error(`Error sending OTP: ${error.message}`));


                                                        } else if (remainingObjects[si].sourceArray == 'secondGuests') {
                                                            let invitelinkData = { guest_id: remainingObjects[si].guest_id.toString(), guest_name: remainingObjects[si].guest_name, guest_phone_code: remainingObjects[si].guest_phone_code, guest_phone: remainingObjects[si].guest_phone, invited_by_user_id: secondbooking_data.user_id.valueOf(), booking_id: secondbookingObjectId }

                                                            const addInviteLinkData = new inviteLinkModel(invitelinkData);
                                                            await addInviteLinkData.save();
                                                            let inviteLinkUrl = `https://theblackjet.biz/invite/${addInviteLinkData._id.valueOf()}`;
                                                            if (process.env.NODE_ENV == 'production') {
                                                                inviteLinkUrl = `https://blackjet.au/invite/${addInviteLinkData._id.valueOf()}`;
                                                            }
                                                            client.messages
                                                                .create({
                                                                    body: `Hey ${remainingObjects[si].guest_name}, You're invited on ${getUserName.fullName}'s BLACK JET.  ${secondFlightData.route.fromCity.city_name} - ${secondFlightData.route.toCity.city_name} ${secondformattedDate} ${secondFlightData.takeoff_time}. Confirm by registering with this mobile phone number at ${inviteLinkUrl}`,
                                                                    from: fromPhoneNumber,
                                                                    to: toPhoneNumber,
                                                                })
                                                                .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                                                                .catch(error => console.error(`Error sending OTP: ${error.message}`));


                                                        }
                                                    }
                                                }

                                            } else if (firstGuests.length > 0) {
                                                console.log('hereeee==')
                                                for (let si = 0; si < firstGuests.length; si++) {
                                                    let invitelinkData = { guest_id: firstGuests[si].guest_id.toString(), guest_name: firstGuests[si].guest_name, guest_phone_code: firstGuests[si].guest_phone_code, guest_phone: firstGuests[si].guest_phone, invited_by_user_id: firstbooking_data.user_id.valueOf(), booking_id: firstbooking_data._id }

                                                    const addInviteLinkData = new inviteLinkModel(invitelinkData);
                                                    await addInviteLinkData.save();
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
                                                    let inviteLinkUrl = `https://theblackjet.biz/invite/${addInviteLinkData._id.valueOf()}`
                                                    if (process.env.NODE_ENV == 'production') {
                                                        inviteLinkUrl = `https://blackjet.au/invite/${addInviteLinkData._id.valueOf()}`;
                                                    }
                                                    client.messages
                                                        .create({
                                                            body: `Hey ${firstGuests[si].guest_name}, You're invited on ${getUserName.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}. Confirm by registering with this mobile phone number at ${inviteLinkUrl}`,
                                                            from: fromPhoneNumber,
                                                            to: toPhoneNumber,
                                                        })
                                                        .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                                                        .catch(error => console.error(`Error sending OTP: ${error.message}`));


                                                }
                                            } else if (secondGuests.length > 0) {
                                                console.log('hereeee121==')
                                                for (let si = 0; si < secondGuests.length; si++) {
                                                    let invitelinkData = { guest_id: secondGuests[si].guest_id.toString(), guest_name: secondGuests[si].guest_name, guest_phone_code: secondGuests[si].guest_phone_code, guest_phone: secondGuests[si].guest_phone, invited_by_user_id: secondbooking_data.user_id.valueOf(), booking_id: secondbooking_data._id }

                                                    const addInviteLinkData = new inviteLinkModel(invitelinkData);
                                                    await addInviteLinkData.save();
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
                                                    let inviteLinkUrl = `https://theblackjet.biz/invite/${addInviteLinkData._id.valueOf()}`
                                                    if (process.env.NODE_ENV == 'production') {
                                                        inviteLinkUrl = `https://blackjet.au/invite/${addInviteLinkData._id.valueOf()}`;
                                                    }
                                                    client.messages
                                                        .create({
                                                            body: `Hey ${secondGuests[si].guest_name},  You're invited on ${getUserName.fullName}'s BLACK JET.  ${secondFlightData.route.fromCity.city_name} - ${secondFlightData.route.toCity.city_name} ${secondformattedDate} ${secondFlightData.takeoff_time}.  Confirm by registering with this mobile phone number at ${inviteLinkUrl}`,
                                                            from: fromPhoneNumber,
                                                            to: toPhoneNumber,
                                                        })
                                                        .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                                                        .catch(error => console.error(`Error sending OTP: ${error.message}`));


                                                }
                                            }

                                        }
                                    } else {
                                        //pet on board key added on flight table
                                        await flightModal.findByIdAndUpdate({ _id: booking.flight_id }, {
                                            pet_on_board: true
                                        }, { new: true })

                                        //update the booking status to purchase-pending
                                        await bookingModal.findByIdAndUpdate({ _id: booking._id }, {
                                            booking_status: "confirmed"
                                        }, { new: true })

                                        if (booking.guest_pass_used > 0) {
                                            let getUserName = await userModal.findOne({ _id: toObjectId(booking.user_id) });
                                            //getting booked flight data
                                            let firstFlightData = await flightModal.findById({ _id: booking.flight_id })
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


                                                let seat_details = await flight_seat_mapping.findOne({ flight_id: booking.flight_id })
                                                for (let j = 1; j <= 8; j++) {
                                                    if (seat_details?.[`seat${j}_details`]?.user_id != undefined && seat_details?.[`seat${j}_details`]?.booking_id != undefined) {
                                                        if (seat_details?.[`seat${j}_details`]?.user_id.equals(booking.user_id) && seat_details?.[`seat${j}_details`]?.booking_id.equals(booking._id)) {

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
                                                if (firstGuests.length > 0) {
                                                    for (let si = 0; si < firstGuests.length; si++) {
                                                        let invitelinkData = { guest_id: firstGuests[si].guest_id.toString(), guest_name: firstGuests[si].guest_name, guest_phone_code: firstGuests[si].guest_phone_code, guest_phone: firstGuests[si].guest_phone, invited_by_user_id: booking.user_id.valueOf(), booking_id: booking._id }

                                                        const addInviteLinkData = new inviteLinkModel(invitelinkData);
                                                        await addInviteLinkData.save();
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
                                                        let inviteLinkUrl = `https://theblackjet.biz/invite/${addInviteLinkData._id.valueOf()}`
                                                        if (process.env.NODE_ENV == 'production') {
                                                            inviteLinkUrl = `https://blackjet.au/invite/${addInviteLinkData._id.valueOf()}`;
                                                        }
                                                        client.messages
                                                            .create({
                                                                body: `Hey ${firstGuests[si].guest_name}, You're invited on ${getUserName.fullName}'s BLACK JET.  ${firstFlightData.route.fromCity.city_name} - ${firstFlightData.route.toCity.city_name} ${firstformattedDate} ${firstFlightData.takeoff_time}. Confirm by registering with this mobile phone number at ${inviteLinkUrl}`,
                                                                from: fromPhoneNumber,
                                                                to: toPhoneNumber,
                                                            })
                                                            .then(message => console.log(`OTP sent with SID: ${message.sid}`))
                                                            .catch(error => console.error(`Error sending OTP: ${error.message}`));


                                                    }
                                                }
                                            }
                                        }

                                    }

                                    //empty the lock date time from pet seats
                                    //await flight_seats_mapping.findOneAndUpdate({ flight_id: booking.flight_id }, update, { new: true })
                                    //deduct pet pass
                                    // await userModal.findByIdAndUpdate({ _id: booking.user_id }, {
                                    //     pet_passes: booking.user_data[0]['pet_passes'] - confirm_booking_ids.length
                                    // })
                                    // if (booking.Total_pet_price_with_gst != "") {
                                    //     let user_update = await userModal.findByIdAndUpdate({ _id: booking.user_id }, {
                                    //         reusable_bookings: booking.user_data[0].reusable_bookings - 1
                                    //     }, { new: true })
                                    //     //update the booking status to purchase-pending
                                    //     let update_booking = await bookingModal.findByIdAndUpdate({ _id: booking._id }, {
                                    //         booking_status: "purchase-pending"
                                    //     }, { new: true })
                                    //     send_notification.sendNotificationToRequester(booking.user_id, "accept", booking._id) //modify this

                                    // } else {
                                    send_notification.sendNotificationToRequester(booking.user_id, "confirm", booking._id) //modify this

                                    //PAYMENT FUNCTION
                                    const paymentResult = await processPayment(userdata, booking.Total_pet_price_with_gst, booking.pet_pass_used);

                                    if (!paymentResult.success) {
                                        // Handle failed payment
                                        console.log("Payment failed:", paymentResult.message);
                                        return { success: false, message: "Payment failed" };
                                    }

                                    //}
                                    //*********************************************************
                                    // SEND NOTIFICATIONSSSSSSSSSSSSSSSSSSSSSS */

                                }
                                // else {
                                //     //booking cancels
                                //     await bookingModal.updateMany({
                                //         _id: {
                                //             $in: confirm_booking_ids
                                //         }
                                //     }, {
                                //         booking_status: "canceled"
                                //     }, { new: true })
                                //     //empty seats
                                //     updates.forEach((data) => {
                                //         update[`seat${data.seatNumber}`] = 0
                                //         update[`seat${data.seatNumber}_details`] = null

                                //     })
                                //     await flight_seats_mapping.findOneAndUpdate({ flight_id: booking.flight_id }, update, { new: true })

                                //     //*********************************************************
                                //     // SEND NOTIFICATIONSSSSSSSSSSSSSSSSSSSSSS */
                                // }
                            }
                        }

                        //If lock_date_time is >1hour 
                        // if (flight_takeoff >= currtime && ((flight_takeoff - currtime) <= 3600000)) {//1 hr=36,00,000 milliseconds
                        //     console.log("**********BOOKING NO-**********", booking_count)
                        //     let ispet = false, pet_request_accepted = true, confirm_booking_ids = [], updates = [], update = {}
                        //     result.push(booking._id)
                        //     for (let i = 1; i <= 8; i++) {
                        //         if (booking.flight_seat_data[`seat${i}_details`] && booking.flight_seat_data[`seat${i}_details`].booking_id && booking.flight_seat_data[`seat${i}_details`].booking_id == booking._id && booking.flight_seat_data[`seat${i}_details`].pet_id && booking.flight_seat_data[`seat${i}_details`].pet_id.length > 0 && booking.flight_seat_data[`seat${i}_details`].lock_date_time) {
                        //             ispet = true
                        //             confirm_booking_ids.push(booking.flight_seat_data[`seat${i}_details`].booking_id)
                        //             updates.push({
                        //                 seatNumber: i,
                        //                 user_id: booking.flight_seat_data[`seat${i}_details`].user_id,

                        //             });
                        //             update[`seat${i}_details.lock_date_time`] = ""
                        //         }
                        //         if (booking.flight_seat_data[`seat${i}_details`] && !booking.flight_seat_data[`seat${i}_details`].pet_request_accepted) {
                        //             pet_request_accepted = false
                        //         }
                        //     }
                        //     if (pet_request_accepted) {

                        //         //pet on board key added on flight table
                        //         await flightModal.findByIdAndUpdate({ _id: booking.flight_id }, {
                        //             pet_on_board: true
                        //         }, { new: true })
                        //         //empty the lock date time from pet seats
                        //         await flight_seats_mapping.findOneAndUpdate({ flight_id: booking.flight_id }, update, { new: true })
                        //         //deduct pet pass
                        //         await userModal.findByIdAndUpdate({ _id: booking.user_id }, {
                        //             pet_passes: booking.user_data[0]['pet_passes'] - confirm_booking_ids.length
                        //         })
                        //         if (booking.Total_pet_price_with_gst != "") {
                        //             let user_update = await userModal.findByIdAndUpdate({ _id: booking.user_id }, {
                        //                 reusable_bookings: booking.user_data[0].reusable_bookings - 1
                        //             }, { new: true })
                        //             //update the booking status to purchase-pending
                        //             let update_booking = await bookingModal.findByIdAndUpdate({ _id: booking._id }, {
                        //                 booking_status: "purchase-pending"
                        //             }, { new: true })
                        //             send_notification.sendNotificationToRequester(booking.user_id, "accept", booking._id) //modify this

                        //         } else {
                        //             //update the booking status to purchase-pending
                        //             let update_booking = await bookingModal.findByIdAndUpdate({ _id: booking._id }, {
                        //                 booking_status: "confirmed"
                        //             }, { new: true })
                        //             send_notification.sendNotificationToRequester(booking.user_id, "confirm", booking._id) //modify this

                        //         }
                        //         //*********************************************************
                        //         // SEND NOTIFICATIONSSSSSSSSSSSSSSSSSSSSSS */

                        //     } else {
                        //         //booking cancels
                        //         await bookingModal.updateMany({
                        //             _id: {
                        //                 $in: confirm_booking_ids
                        //             }
                        //         }, {
                        //             booking_status: "canceled"
                        //         }, { new: true })
                        //         //empty seats
                        //         updates.forEach((data) => {
                        //             update[`seat${data.seatNumber}`] = 0
                        //             update[`seat${data.seatNumber}_details`] = null

                        //         })
                        //         await flight_seats_mapping.findOneAndUpdate({ flight_id: booking.flight_id }, update, { new: true })

                        //         //*********************************************************
                        //         // SEND NOTIFICATIONSSSSSSSSSSSSSSSSSSSSSS */
                        //     }
                        // }


                    }


                } catch (e) {
                    console.error(e, `Error processing booking ${booking._id}: ${e.message}`);
                }
            })
            //await cronmodal.create({ cron_ends: new Date(), booking_id: result })
        } catch (e) {
            console.error(e, `CRON JOB FAILED TO START: ${e.message}`);
        }
    },
    { scheduled: true }
);
const membership = cron.schedule(
    time.runAt00_30_am,
    async () => {
        try {
            console.log("membership cron", new Date())
            let users_membership = await userMembershipModal.find({ status: "active" })
            // console.log("users_membership******", users_membership)
            let membership_ids = []

            if (users_membership && users_membership.length > 0) {
                let curr_date = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
                console.log("curr_date=", curr_date)
                let add_passes_ids = [], unlimited_user_ids = [], elite_user_ids = []
                users_membership.forEach((data) => {
                    let purchaseDate = data.updated_purchase_date ? data.updated_purchase_date : data.createdAt
                    console.log("purchase date=", purchaseDate)
                    const currentDate = new Date();
                    const futureDate = new Date(currentDate);
                    futureDate.setMonth(futureDate.getMonth() + 3);
                    const timeDiffMs = futureDate - currentDate;

                    let actualTimeDiff = currentDate - new Date(purchaseDate);
                    if (actualTimeDiff > timeDiffMs) {
                        if (data.name == 'Unlimited') unlimited_user_ids.push(data.user_id)
                        else if (data.name == 'Unlimited Elite') elite_user_ids.push(data.user_id)
                        add_passes_ids.push(data._id.valueOf())
                    }
                    let renewal_date = new Date(new Date(data.renewal_date).setHours(0, 0, 0, 0)).toISOString()
                    if (curr_date == renewal_date) {
                        membership_ids.push(data._id.valueOf())
                        console.log("renewal_date=", renewal_date);
                    } else {
                        console.log("else************renewal_date=", renewal_date);

                    }
                })

                await userModal.updateMany({
                    _id: {
                        $in: unlimited_user_ids
                    }
                }, {
                    guest_passes: 1
                })
                await userModal.updateMany({
                    _id: {
                        $in: elite_user_ids
                    }
                }, {
                    guest_passes: 2, reset_vouchers: 4
                })
                await userMembershipModal.updateMany(
                    {
                        _id:
                        {
                            $in: add_passes_ids
                        }
                    }, {
                    updated_purchase_date: new Date()
                })
                await userMembershipModal.updateMany(
                    {
                        _id:
                        {
                            $in: membership_ids
                        }, isAutoRenew: false
                    }, {
                    status: "inactive"
                })
            }


            await cronmodal.create({ cron_ends: new Date(), membership_id: membership_ids })
        } catch (e) {
            console.error(e, `CRON JOB FAILED TO START: ${e.message}`);
        }
    },
    { scheduled: true }
);
const createDemoFlights = cron.schedule(
    time.runEverySundayAt10am,
    async () => {
        try {
            console.log("Demo Flight creation cron", new Date())
            const checkDemoMode = await membership_settings.findOne({ is_demo_process: true });
            if (checkDemoMode) {
                // Calculate the start date (Monday) and end date (next Sunday)
                const today = moment().startOf('day');
                let startDate = today.clone().day(1); // Start of current week (Monday)
                let endDate = today.clone().endOf('week').add(1, 'day').startOf('day'); // Start of next Sunday

                // Create flights for each day of the week
                let dates = [];
                let demo_flight_id = [];
                let currentDate = startDate.clone();
                let getDemoRoute = await routeModel.findOne({ isDemo: true })
                while (currentDate <= endDate) {
                    dates.push(currentDate.format('YYYY-MM-DD'));
                    currentDate.add(1, 'day');
                }
                for (let date of dates) {
                    const createFlight = new flightModal({ flight_name: "Demo Flight", route: getDemoRoute?._id, flight_takeoff_date: date, takeoff_time: "10:00", landing_time: "12:00", is_demo: true, day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] });
                    const saveFlights = await createFlight.save();
                    demo_flight_id.push(saveFlights._id);
                    const flightMapping = new flight_seats_mapping({ flight_id: saveFlights._id });
                    await flightMapping.save();
                }
                console.log("Demo Flights created successfully for the week starting from Monday and ending on next Sunday.");
                await cronmodal.create({ cron_ends: new Date(), demo_flight_id: demo_flight_id })
            }
        } catch (e) {
            console.error(e, `CRON JOB FAILED TO START: ${e.message}`);
        }
    },
    { scheduled: true }
);
//cron job for truncate temp user collection
const tempUserTruncate = cron.schedule(
    time.runAt00_30_am,
    async () => {
        try {
            //deleting all temp users data if they not complete on board process 
            await tempUserModal.deleteMany({});
            console.log('temp user collection truncated')
        } catch (e) {
            console.error(e, `CRON JOB FAILED TO START: ${e.message}`);
        }
    },
    {
        scheduled: true
    }
);

// Define the main function to update guest_passes and reset_vouchers
// cron.schedule('*/30 * * * * *', async () => {
//     try {
//         console.log("Cron is running");

//         const today = new Date();
//         const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
//         const fiveMinutesAgo = new Date(today.getTime() - 5 * 60 * 1000);
//         let activeUserMemberships = [];

//         const findMembership = await userMembershipModal.find({
//             user_id: '67173dd88f427705e74f90bb', // Filter by specific user ID
//             status: 'active',
//         }).sort({ _id: -1 });

//         // Processing each membership
//         for (const membershipRes of findMembership) {
//             if (membershipRes.isReward === true) {
//                 if (membershipRes.type === 1) {
//                     // Fetch memberships with rewardDate < threeMonthsAgo
//                     activeUserMemberships = await userMembershipModal.find({
//                         status: 'active',
//                         rewardDate: { $lt: fiveMinutesAgo }
//                     }).sort({ _id: -1 });
//                 } else if (membershipRes.type === 2) {

//                     const LastAwardDate = membershipRes.rewardDate;
//                     const UpgradeDate = membershipRes.createdAt;

//                     // Calculate the daysBtwInclusive
//                     const daysBtwInclusive = Math.abs(
//                         (UpgradeDate - LastAwardDate) / (1000 * 60 * 60 * 24) + 1
//                     );

//                     // Round down of daysBtwInclusive / 2
//                     const daysAdjustment = Math.floor(daysBtwInclusive / 2);

//                     // Calculate 3 Calendar Months after UpgradeDate
//                     const threeMonthsLater = new Date(
//                         UpgradeDate.getFullYear(),
//                         UpgradeDate.getMonth() + 3,
//                         UpgradeDate.getDate()
//                     );
//                     console.log(threeMonthsLater, 'threeMonthsLater')
//                     // Calculate 1stA_Date by subtracting daysAdjustment
//                     const firstA_Date = new Date(
//                         threeMonthsLater.getTime() - daysAdjustment * 24 * 60 * 60 * 1000
//                     );
//                     console.log(LastAwardDate, 'LastAwardDate')
//                     console.log(UpgradeDate, 'UpgradeDate')
//                     console.log(firstA_Date, 'firstA_Date')

//                     // Fetch memberships with rewardDate < firstA_Date
//                     activeUserMemberships = await userMembershipModal.find({
//                         user_id: '67173dd88f427705e74f90bb', // Filter by specific user ID
//                         status: 'active',
//                         rewardDate: { $lt: firstA_Date }
//                     }).sort({ _id: -1 });
//                 }
//             } else {
//                 console.log("inside else")
//                 // For memberships without rewards, fetch based on purchase date
//                 activeUserMemberships = await userMembershipModal.find({
//                     user_id: '67173dd88f427705e74f90bb', // Filter by specific user ID
//                     status: 'active',
//                     membershipPurchaseDate: { $lt: fiveMinutesAgo }
//                 }).sort({ _id: -1 });
//             }
//         }


//         // Process each active membership
//         for (const membership of activeUserMemberships) {
//             try {
//                 const user = await userModal.findOne({ _id: membership.user_id });
//                 console.log(user._id, "user")
//                 console.log(membership.membership_id, "membership.membership_id,")


//                 if (user) {
//                     if (membership.type === 2) {
//                         user.guest_passes += 2;
//                         user.reset_vouchers += 4;
//                         await createTransaction(user._id, membership.membership_id, "2 Guest Passes", "Reset Vouchers", 4);
//                     } else if (membership.type === 1) {
//                         user.guest_passes += 1;
//                         user.reset_vouchers += 2;
//                         await createTransaction(user._id, membership._id, "1 Guest Pass", "Reset Vouchers", 2);
//                     }
//                     await user.save();

//                     // Use findOneAndUpdate to update rewardDate and isReward in one operation
//                     await userMembershipModal.findOneAndUpdate(
//                         { _id: membership._id },
//                         {
//                             rewardDate: new Date(),
//                             isReward: true
//                         },
//                         { new: true } // Option to return the updated document
//                     );
//                     console.log(`Updated membership offers for user with ID: ${membership.user_id}`);
//                 }
//             } catch (userError) {
//                 console.error(`Error processing user with ID: ${membership.user_id}`, userError);
//             }
//         }

//         console.log('Cron job completed successfully.');
//     } catch (error) {
//         console.error('Error running cron job:', error);
//     }
// });
function getNextRenewalDate(renewalDate) {
    let nextMonth = renewalDate.getMonth() + 3; // Add 3 months
    let nextYear = renewalDate.getFullYear();

    // Adjust the year if the month exceeds December
    if (nextMonth > 11) {
        nextYear += Math.floor(nextMonth / 12); // Increase the year
        nextMonth = nextMonth % 12; // Adjust the month to stay within 0-11
    }

    // Get the number of days in the next month
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    console.log(daysInNextMonth, 'daysInNextMonth');

    // Get the current renewal date's day
    const currentDay = renewalDate.getDate();
    console.log(currentDay, 'currentDay');

    // If the current renewal day exceeds the number of days in the next month,
    // set the renewal date to the last day of the next month
    const dayToSet = currentDay > daysInNextMonth ? daysInNextMonth : currentDay;
    console.log(dayToSet, 'dayToSet');

    // Return the new renewal date with time preserved
    return new Date(nextYear, nextMonth, dayToSet, renewalDate.getHours(), renewalDate.getMinutes(), renewalDate.getSeconds());
}

// Define the main function to update guest_passes and reset_vouchers
cron.schedule('0 0 * * *', async () => {
    try {
        console.log("Cron is running");

        const today = new Date();
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
        const fiveMinutesAgo = new Date(today.getTime() - 5 * 60 * 1000);
        let activeUserMemberships = [];

        const findMembership = await userMembershipModal.find({
            status: 'active',
            is_activate: true
        }).sort({ _id: -1 });

        // Processing each membership
        for (const membershipRes of findMembership) {
            if (membershipRes.isReward === true) {
                if (membershipRes.type === 1) {
                    // Fetch memberships with rewardDate < threeMonthsAgo
                    activeUserMemberships = await userMembershipModal.find({
                        status: 'active',
                        is_activate: true,
                        rewardDate: { $lt: threeMonthsAgo }
                    }).sort({ _id: -1 });
                } else if (membershipRes.type === 2) {

                    const LastAwardDate = membershipRes.rewardDate;
                    const UpgradeDate = membershipRes.createdAt;

                    // Calculate the daysBtwInclusive
                    const daysBtwInclusive = Math.abs(
                        (UpgradeDate - LastAwardDate) / (1000 * 60 * 60 * 24) + 1
                    );

                    // Round down of daysBtwInclusive / 2
                    const daysAdjustment = Math.floor(daysBtwInclusive / 2);

                    // Calculate 3 Calendar Months after UpgradeDate
                    const threeMonthsLater = getNextRenewalDate(UpgradeDate);

                    console.log(threeMonthsLater, 'threeMonthsLater')
                    // Calculate 1stA_Date by subtracting daysAdjustment
                    const firstA_Date = new Date(
                        threeMonthsLater.getTime() - daysAdjustment * 24 * 60 * 60 * 1000
                    );
                    console.log(LastAwardDate, 'LastAwardDate')
                    console.log(UpgradeDate, 'UpgradeDate')
                    console.log(firstA_Date, 'firstA_Date')

                    // Fetch memberships with rewardDate < firstA_Date
                    activeUserMemberships = await userMembershipModal.find({
                        status: 'active',
                        is_activate: true,
                        rewardDate: { $lt: firstA_Date }
                    }).sort({ _id: -1 });
                }
            } else {
                console.log("inside else")
                // For memberships without rewards, fetch based on purchase date
                activeUserMemberships = await userMembershipModal.find({
                    status: 'active',
                    is_activate: true,
                    membershipPurchaseDate: { $lt: threeMonthsAgo }
                }).sort({ _id: -1 });
            }
        }

        // Process each active membership
        for (const membership of activeUserMemberships) {
            try {
                const user = await userModal.findOne({ _id: membership.user_id });
                console.log(user._id, "user")
                console.log(membership.membership_id, "membership.membership_id,")


                if (user) {
                    if (membership.type === 2) {
                        user.guest_passes += 2;
                        user.reset_vouchers += 4;
                        await createTransaction(user._id, membership.membership_id, "2 Guest Passes", "Reset Vouchers", 4);
                    } else if (membership.type === 1) {
                        user.guest_passes += 1;
                        user.reset_vouchers += 2;
                        await createTransaction(user._id, membership._id, "1 Guest Pass", "Reset Vouchers", 2);
                    }
                    await user.save();

                    // Use findOneAndUpdate to update rewardDate and isReward in one operation
                    await userMembershipModal.findOneAndUpdate(
                        { _id: membership._id },
                        {
                            rewardDate: new Date(),
                            isReward: true
                        },
                        { new: true } // Option to return the updated document
                    );
                    console.log(`Updated membership offers for user with ID: ${membership.user_id}`);
                }
            } catch (userError) {
                console.error(`Error processing user with ID: ${membership.user_id}`, userError);
            }
        }

        console.log('Cron job completed successfully.');
    } catch (error) {
        console.error('Error running cron job:', error);
    }
});
// // // Function to create transactions for guest_passes and reset_vouchers
const createTransaction = async (userId, membershipId, guestPassName, resetVoucherName, resetVoucherCount) => {
    await transactionModal.create({
        userId,
        type: "Guest Passes",
        purchaseTransactionId: membershipId,
        image: process.env.GUESTPASSLOGO,
        name: guestPassName,
        complimentary: true
    });

    await transactionModal.create({
        userId,
        type: "Reset Vouchers",
        purchaseTransactionId: membershipId,
        image: process.env.GUESTPASSLOGO,
        name: resetVoucherName,
        reset_voucher: resetVoucherCount,
        complimentary: true
    });
};

const inviteLinkExpire = cron.schedule(
    time.runEveryMinuteAt30sec,
    async () => {
        try {
            console.log("expire invite link cron")
            //getting invited booking data
            let getInvitedBooking = await inviteLinkModel.find({ status: "active" });
            if (getInvitedBooking.length > 0) {
                for (let ik = 0; ik < getInvitedBooking.length; ik++) {
                    console.log('getInvitedBooking==', getInvitedBooking[ik].booking_id)
                    const bookings = await bookingModal.aggregate([
                        {
                            $match: {
                                _id: toObjectId(getInvitedBooking[ik].booking_id)
                            }
                        },
                        {
                            $lookup: {
                                from: "flight_seats_mappings",
                                let: { flightID: "$flight_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$flight_id", "$$flightID"] },
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "flights",
                                            localField: "flight_id",
                                            foreignField: "_id",
                                            as: "flights"
                                        }
                                    },
                                ],
                                as: "flight_seat_data",
                            }
                        },
                        {
                            $unwind: "$flight_seat_data"
                        },
                        {
                            $lookup: {
                                from: "users",
                                let: { userID: "$user_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$userID"] },
                                        }
                                    },
                                ],
                                as: "user_data",
                            }
                        },
                    ]);

                    bookings.forEach(async (booking) => {
                        try {
                            console.log('booking==', booking._id)
                            //checking booking is round trip
                            if (booking.isRoundTrip) {
                                if (booking.booking_status == 'canceled') {
                                    await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(getInvitedBooking[ik]._id) }, { status: "inactive" })
                                } else {
                                    let firstBooking_id = '';
                                    let secondBooking_id = '';
                                    if (booking?.round_trip_id != undefined && booking?.round_trip_id != '') {
                                        //assigning fiest and second booing ids 
                                        firstBooking_id = toObjectId(booking.round_trip_id);
                                        secondBooking_id = toObjectId(booking._id);
                                    }

                                    if (booking?.round_trip_id == undefined) {
                                        //assigning fiest and second booing ids 
                                        firstBooking_id = toObjectId(booking._id);
                                        let secondbooking_data = await bookingModal.findOne({
                                            round_trip_id: toObjectId(booking._id)
                                        })
                                        if (secondbooking_data) {
                                            secondBooking_id = toObjectId(secondbooking_data._id);
                                        }
                                    }

                                    if (firstBooking_id != '' && secondBooking_id == '') {
                                        //Getting first booking data
                                        let firstbooking_data = await bookingModal.aggregate([
                                            {
                                                $match: {
                                                    _id: firstBooking_id,
                                                    guest_pass_used: { $gte: 1 }
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: "flight_seats_mappings",
                                                    let: { flightID: "$flight_id" },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: { $eq: ["$flight_id", "$$flightID"] },
                                                            }
                                                        },
                                                        {
                                                            $lookup: {
                                                                from: "flights",
                                                                localField: "flight_id",
                                                                foreignField: "_id",
                                                                as: "flights"
                                                            }
                                                        },
                                                    ],
                                                    as: "flight_seat_data",
                                                }
                                            },
                                            {
                                                $unwind: "$flight_seat_data"
                                            },
                                            {
                                                $lookup: {
                                                    from: "users",
                                                    let: { userID: "$user_id" },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: { $eq: ["$_id", "$$userID"] },
                                                            }
                                                        },
                                                    ],
                                                    as: "user_data",
                                                }
                                            },
                                        ]);
                                        if (firstbooking_data.length > 0) {
                                            firstbooking_data.forEach(async (first_booking) => {
                                                try {
                                                    console.log('firstflight_id==', first_booking.flight_id)
                                                    // const flight_takeoff = new Date(first_booking.flight_seat_data.flights[0]['flight_takeoff_date'])
                                                    // const [time1Hours, time1Minutes] = booking.flight_seat_data.flights[0]['takeoff_time'].split(':').map(Number);
                                                    // flight_takeoff.setHours(time1Hours, time1Minutes);
                                                    // console.log('flight_takeoff==', flight_takeoff)
                                                    const flight_takeoff = new Date(first_booking.flight_seat_data.flights[0]['flight_takeoff_utcdatetime'])
                                                    const currentDate = new Date();
                                                    const currentTime = new Date(currentDate);
                                                    //currentTime.setHours(currentTime.getHours() + 10);
                                                    console.log('currentTime==', currentTime)

                                                    // Calculate the time difference
                                                    const timeDifference = flight_takeoff.getTime() - currentTime.getTime();
                                                    console.log(flight_takeoff.getTime(), ' - ', currentTime.getTime());
                                                    console.log('timeDifference==', timeDifference)
                                                    // Convert milliseconds to minutes (or any other unit you prefer)
                                                    const minutesDifference = timeDifference / (1000 * 60);
                                                    console.log('minutesDifference==', minutesDifference);
                                                    //minutesDifference <= 30
                                                    //minutesDifference >= 0 && 
                                                    if (minutesDifference <= 2) {
                                                        //deactivate invite link
                                                        await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(getInvitedBooking[ik]._id) }, { status: "inactive" })

                                                        //removing guest from seat
                                                        // let updatedObj = {}
                                                        // let canceled_seat_details = [];
                                                        // if (first_booking.canceled_seat_details.length > 0) {
                                                        //     canceled_seat_details = first_booking.canceled_seat_details;
                                                        // }
                                                        // for (let i = 1; i <= 8; i++) {
                                                        //     if (first_booking.flight_seat_data[`seat${i}_details`] && first_booking.flight_seat_data[`seat${i}_details`].user_id && first_booking.flight_seat_data[`seat${i}_details`].user_id.valueOf() == first_booking.user_id.valueOf() && first_booking.flight_seat_data[`seat${i}_details`].booking_id.valueOf() == first_booking._id.valueOf()) {
                                                        //         if (first_booking.flight_seat_data[`seat${i}_details`].guest_id == getInvitedBooking[ik].guest_id && first_booking.flight_seat_data[`seat${i}_details`].guest_user_id == null) {
                                                        //             updatedObj[`seat${i}`] = 0
                                                        //             updatedObj[`seat${i}_details`] = null
                                                        //             canceled_seat_details.push({ seat_no: i, seat_details: first_booking.flight_seat_data[`seat${i}_details`] })
                                                        //         }
                                                        //     }
                                                        // }
                                                        // //adding guest seat cancel data in cancel seat detail
                                                        // await bookingModal.findByIdAndUpdate({ _id: first_booking._id }, { canceled_seat_details, guest_pass_used: Number(first_booking.guest_pass_used - 1) }, { new: true })
                                                        // //removing guest seat from flight
                                                        // await flight_seat_mapping.findOneAndUpdate({ flight_id: first_booking.flight_id }, updatedObj, { new: true })

                                                        // //giving guest pass to user back
                                                        // await userModal.findByIdAndUpdate({ _id: first_booking.user_id }, {
                                                        //     guest_passes: Number(first_booking.user_data[0].guest_passes + 1)
                                                        // })

                                                    }
                                                } catch (e) {
                                                    console.error(e, `Error processing`);
                                                }
                                            })
                                        }

                                        //Getting second booking data
                                        let secondbooking_data = await bookingModal.aggregate([
                                            {
                                                $match: {
                                                    _id: secondBooking_id,
                                                    guest_pass_used: { $gte: 1 }
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: "flight_seats_mappings",
                                                    let: { flightID: "$flight_id" },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: { $eq: ["$flight_id", "$$flightID"] },
                                                            }
                                                        },
                                                        {
                                                            $lookup: {
                                                                from: "flights",
                                                                localField: "flight_id",
                                                                foreignField: "_id",
                                                                as: "flights"
                                                            }
                                                        },
                                                    ],
                                                    as: "flight_seat_data",
                                                }
                                            },
                                            {
                                                $unwind: "$flight_seat_data"
                                            },
                                            {
                                                $lookup: {
                                                    from: "users",
                                                    let: { userID: "$user_id" },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: { $eq: ["$_id", "$$userID"] },
                                                            }
                                                        },
                                                    ],
                                                    as: "user_data",
                                                }
                                            },
                                        ]);
                                        if (secondbooking_data.length > 0) {
                                            secondbooking_data.forEach(async (first_booking) => {
                                                try {
                                                    console.log('secondflight_id==', secondbooking_data.flight_id)
                                                    // const flight_takeoff = new Date(secondbooking_data.flight_seat_data.flights[0]['flight_takeoff_date'])
                                                    // const [time1Hours, time1Minutes] = booking.flight_seat_data.flights[0]['takeoff_time'].split(':').map(Number);
                                                    // flight_takeoff.setHours(time1Hours, time1Minutes);
                                                    // console.log('flight_takeoff==', flight_takeoff)
                                                    const flight_takeoff = new Date(secondbooking_data.flight_seat_data.flights[0]['flight_takeoff_utcdatetime'])

                                                    const currentDate = new Date();
                                                    const currentTime = new Date(currentDate);
                                                    //currentTime.setHours(currentTime.getHours() + 10);
                                                    console.log('currentTime==', currentTime)

                                                    // Calculate the time difference
                                                    const timeDifference = flight_takeoff.getTime() - currentTime.getTime();
                                                    console.log(flight_takeoff.getTime(), ' - ', currentTime.getTime());
                                                    console.log('timeDifference==', timeDifference)
                                                    // Convert milliseconds to minutes (or any other unit you prefer)
                                                    const minutesDifference = timeDifference / (1000 * 60);
                                                    console.log('minutesDifference==', minutesDifference);
                                                    //minutesDifference <= 30
                                                    //minutesDifference >= 0 && 
                                                    if (minutesDifference <= 2) {
                                                        //deactivate invite link
                                                        await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(getInvitedBooking[ik]._id) }, { status: "inactive" })

                                                        //removing guest from seat
                                                        // let updatedObj = {}
                                                        // let canceled_seat_details = [];
                                                        // if (secondbooking_data.canceled_seat_details.length > 0) {
                                                        //     canceled_seat_details = secondbooking_data.canceled_seat_details;
                                                        // }
                                                        // for (let i = 1; i <= 8; i++) {
                                                        //     if (secondbooking_data.flight_seat_data[`seat${i}_details`] && secondbooking_data.flight_seat_data[`seat${i}_details`].user_id && secondbooking_data.flight_seat_data[`seat${i}_details`].user_id.valueOf() == secondbooking_data.user_id.valueOf() && secondbooking_data.flight_seat_data[`seat${i}_details`].booking_id.valueOf() == secondbooking_data._id.valueOf()) {
                                                        //         if (secondbooking_data.flight_seat_data[`seat${i}_details`].guest_id == getInvitedBooking[ik].guest_id && secondbooking_data.flight_seat_data[`seat${i}_details`].guest_user_id == null) {
                                                        //             updatedObj[`seat${i}`] = 0
                                                        //             updatedObj[`seat${i}_details`] = null
                                                        //             canceled_seat_details.push({ seat_no: i, seat_details: secondbooking_data.flight_seat_data[`seat${i}_details`] })
                                                        //         }
                                                        //     }
                                                        // }
                                                        // //adding guest seat cancel data in cancel seat detail
                                                        // await bookingModal.findByIdAndUpdate({ _id: secondbooking_data._id }, { canceled_seat_details, guest_pass_used: Number(secondbooking_data.guest_pass_used - 1) }, { new: true })
                                                        // //removing guest seat from flight
                                                        // await flight_seat_mapping.findOneAndUpdate({ flight_id: secondbooking_data.flight_id }, updatedObj, { new: true })

                                                        // //giving guest pass to user back
                                                        // await userModal.findByIdAndUpdate({ _id: secondbooking_data.user_id }, {
                                                        //     guest_passes: Number(secondbooking_data.user_data[0].guest_passes + 1)
                                                        // })

                                                    }
                                                } catch (e) {
                                                    console.error(e, `Error processing`);
                                                }
                                            })

                                        }

                                    }
                                }
                            } else {
                                if (booking.booking_status == 'canceled') {
                                    await inviteLinkModel.findByIdAndUpdate({ _id: getInvitedBooking[ik].booking_id }, { status: "inactive" })
                                } else {
                                    console.log('flight_id==', booking.flight_id)
                                    // const flight_takeoff = new Date(booking.flight_seat_data.flights[0]['flight_takeoff_date'])
                                    // const [time1Hours, time1Minutes] = booking.flight_seat_data.flights[0]['takeoff_time'].split(':').map(Number);
                                    // flight_takeoff.setHours(time1Hours, time1Minutes);
                                    // console.log('flight_takeoff==', flight_takeoff)
                                    const flight_takeoff = new Date(booking.flight_seat_data.flights[0]['flight_takeoff_utcdatetime'])

                                    const currentDate = new Date();
                                    const currentTime = new Date(currentDate);
                                    //currentTime.setHours(currentTime.getHours() + 10);
                                    console.log('currentTime==', currentTime)

                                    // Calculate the time difference
                                    const timeDifference = flight_takeoff.getTime() - currentTime.getTime();
                                    console.log(flight_takeoff.getTime(), ' - ', currentTime.getTime());
                                    console.log('timeDifference==', timeDifference)
                                    // Convert milliseconds to minutes (or any other unit you prefer)
                                    const minutesDifference = timeDifference / (1000 * 60);
                                    console.log('minutesDifference==', minutesDifference);
                                    //minutesDifference <= 30
                                    //minutesDifference >= 0 && 
                                    if (minutesDifference <= 2) {
                                        console.log('invite link==', getInvitedBooking[ik]._id)
                                        //deactivate invite link
                                        await inviteLinkModel.findByIdAndUpdate({ _id: toObjectId(getInvitedBooking[ik]._id) }, { status: "inactive" })

                                        //removing guest from seat
                                        // let updatedObj = {}
                                        // let canceled_seat_details = [];
                                        // if (booking.canceled_seat_details.length > 0) {
                                        //     canceled_seat_details = booking.canceled_seat_details;
                                        // }
                                        // for (let i = 1; i <= 8; i++) {
                                        //     if (booking.flight_seat_data[`seat${i}_details`] && booking.flight_seat_data[`seat${i}_details`].user_id && booking.flight_seat_data[`seat${i}_details`].user_id.valueOf() == booking.user_id.valueOf() && booking.flight_seat_data[`seat${i}_details`].booking_id.valueOf() == booking._id.valueOf()) {
                                        //         if (booking.flight_seat_data[`seat${i}_details`].guest_id != '' && booking.flight_seat_data[`seat${i}_details`].guest_user_id == null) {
                                        //             updatedObj[`seat${i}`] = 0
                                        //             updatedObj[`seat${i}_details`] = null
                                        //             canceled_seat_details.push({ seat_no: i, seat_details: booking.flight_seat_data[`seat${i}_details`] })
                                        //         }
                                        //     }
                                        // }
                                        // //adding guest seat cancel data in cancel seat detail
                                        // await bookingModal.findByIdAndUpdate({ _id: toObjectId(booking._id) }, { canceled_seat_details, guest_pass_used: Number(booking.guest_pass_used - 1) }, { new: true })
                                        // //removing guest seat from flight
                                        // await flight_seat_mapping.findOneAndUpdate({ flight_id: toObjectId(booking.flight_id) }, updatedObj, { new: true })

                                        // //giving guest pass to user back
                                        // await userModal.findByIdAndUpdate({ _id: toObjectId(booking.user_id) }, {
                                        //     guest_passes: Number(booking.user_data[0].guest_passes + 1)
                                        // })

                                    }
                                }
                            }
                        } catch (e) {
                            console.error(e, `Error processing booking ${booking._id}: ${e.message}`);
                        }
                    })
                }
            }
        } catch (e) {
            console.error(e, `CRON JOB FAILED TO START: ${e.message}`);
        }
    },
    { scheduled: true }
);
//terminate user account after 31 days if user canceled his account
const terminateAccountAfterThirtyOneDays = cron.schedule(
    time.runEveryDay03amSydney,
    async () => {
        try {
            const currentDate = moment().format('YYYY-MM-DD');
            console.log("Terminate Account After 31 Days cron")
            let accountsToTerminate = await userModal.find({ account_terminate: currentDate })
            if (accountsToTerminate.length > 0) {
                const aws = require('aws-sdk');
                let s3 = new aws.S3();
                for (const account of accountsToTerminate) {
                    // softdeleting user account
                    await userModal.findByIdAndUpdate({ _id: account._id }, {
                        token: "",
                        otp: -1,
                        passportVerified: false,
                        driverlicenseVerified: false,
                        passport_resubmission_requested: false,
                        driver_license_resubmission_requested: false,
                        status: "disable",
                        phone: account.phone + '.00',
                        email: account.email + '.removed',
                        email_verified: false,
                        phone_verified: false,
                        profile_pic: "",
                        otp_verified: false,
                        is_information_page_completed: false,
                        is_membership_payment_page_completed: false,
                        firebase_device_token: ""

                    }, { new: true });
                    //auto renew off membership
                    await userMembershipModal.updateMany(
                        { user_id: toObjectId(account._id) }, // Query to find documents
                        { $set: { is_activate: false, status: 'inactive' } } // Update operation
                    );
                    //removing profile pic from s3
                    if (account.profile_pic) {
                        const bucketName = process.env.USER_MEDIA_BUCKET;
                        const profilepic = account.profile_pic;
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
                    }
                }
            }

        } catch (e) {
            console.error(e, `CRON JOB FAILED TO START: ${e.message}`);
        }
    },
    { scheduled: true }
);
// // // Cron job to update guest_passes and reset_vouchers every day at 12 AM
// const updateResetVouchersJob = cron.schedule(time.runEveryDay12pm, updateResetVouchers);

module.exports = {
    petOnboardjob,
    membership,
    createDemoFlights,
    tempUserTruncate,
    inviteLinkExpire,
    terminateAccountAfterThirtyOneDays
    // updateResetVouchersJob
};