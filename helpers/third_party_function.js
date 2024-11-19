const dotenv = require('dotenv');
const axios = require('axios');
const formidable = require('formidable');
const fs = require('fs');
const crypto = require('crypto');
const secretManagerAws = require('../helpers/secretManagerAws');
const { default: mongoose } = require('mongoose');
const firebaseAdmin = require("firebase-admin");
const { toObjectId } = require('../helpers/v2/common');
const firebaseServiceAccount = require("../config/black-jet-25c58-firebase-adminsdk-uhzpm-d8de09d806.json");
const booking = require('../models/booking');
const path = require('path');
const moment = require('moment');
const momentTimezone = require('moment-timezone');

// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });
//firebase admin initialize
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(firebaseServiceAccount)
});

const VERIFF_API_KEY = process.env.VERIFF_API_KEY;
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET;

const requestBody = {

  "create_session_req_body":
  {
    "verification": {
      "callback": "https://veriff.me",
      "person": {
        "firstName": "",
        "dateOfBirth": ""
      },
      "document": {
        "type": ""
      },
      "vendorData": ""
    }
  },
  "uploadVeriffDocument": {
    "image": {
      "context": "",
      "content": ""
    }
  },
  "submitSession": {
    "verification": {
      "status": "submitted"
    }
  }
}
const headers = {
  "create_Session_headers": {
    'X-AUTH-CLIENT': `${VERIFF_API_KEY}`, // Replace with your token or authentication header
    'Content-Type': 'application/json', // Specify the content type if needed
  },
  "uploadVeriffDocument": {
    'X-AUTH-CLIENT': `${VERIFF_API_KEY}`,
    'X-HMAC-SIGNATURE': ''
  }
};
exports.createVeriffSession = async (data, type) => {
  let headers = {
    "create_Session_headers": {
      'X-AUTH-CLIENT': `${VERIFF_API_KEY}`, // Replace with your token or authentication header
      'Content-Type': 'application/json', // Specify the content type if needed
    },
    "uploadVeriffDocument": {
      'X-AUTH-CLIENT': `${VERIFF_API_KEY}`,
      'X-HMAC-SIGNATURE': ''
    }
  };

  requestBody.create_session_req_body.verification.person.firstName = data.query.first_name
  requestBody.create_session_req_body.verification.person.lastName = data.query.last_name
  requestBody.create_session_req_body.verification.person.dateOfBirth = data.query.DOB
  requestBody.create_session_req_body.verification.document.type = type
  requestBody.create_session_req_body.verification.vendorData = data.query.vendorData
  console.log('requestBody.create_session_req_body==', requestBody.create_session_req_body)
  let result;
  await axios.post('https://stationapi.veriff.com/v1/sessions/', requestBody.create_session_req_body, {
    headers: headers.create_Session_headers,
  })
    .then((response) => {
      result = response.data
    })
    .catch((error) => {
      console.log("error=", error)
    });

  return result
};
exports.convertToBase64 = async (req, filename) => {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        const imageFile = files[filename];
        if (imageFile) {
          const filePath = imageFile[0].filepath;
          const base64Data = fs.readFileSync(filePath, { encoding: 'base64' });
          const base64Image = `data:${imageFile[0].type};base64,${base64Data}`;

          resolve({ base64Image });
        } else {
          reject('No image file uploaded');
        }
      }
    });
  });
};
exports.convertToBase64version2 = async (req, filename) => {
  return new Promise((resolve, reject) => {
    let files = req.files;
    let imageFile; let base64Image; let result = []
    filename.forEach((data, i) => {
      imageFile = files[i];
      if (imageFile) {
        const bufferData = Buffer.from(imageFile.buffer); // 'data' is your buffer object
        const base64Data = bufferData.toString('base64');
        base64Image = `data:${imageFile.mimetype};base64,${base64Data}`;
        result.push(base64Image)
      }
    })

    if (result.length > 0) {
      resolve(result);
    } else {
      reject('No image file uploaded');
    }
  });
};
exports.uploadVeriffDocument = async (sessionID, base64image, context) => {

  let headers = {
    "create_Session_headers": {
      'X-AUTH-CLIENT': `${VERIFF_API_KEY}`, // Replace with your token or authentication header
      'Content-Type': 'application/json', // Specify the content type if needed
    },
    "uploadVeriffDocument": {
      'X-AUTH-CLIENT': `${VERIFF_API_KEY}`,
      'X-HMAC-SIGNATURE': ''
    }
  };
  requestBody.uploadVeriffDocument.image.content = base64image
  requestBody.uploadVeriffDocument.image.context = context
  let result;
  // Create an HMAC-SHA-256 hash
  const hmac = crypto.createHmac('sha256', VERIFF_API_SECRET);
  hmac.update(JSON.stringify(requestBody.uploadVeriffDocument));

  // Get the hexadecimal representation of the hash
  const hash = hmac.digest('hex');

  headers.uploadVeriffDocument['X-HMAC-SIGNATURE'] = hash
  await axios.post(`https://stationapi.veriff.com/v1/sessions/${sessionID}/media`, requestBody.uploadVeriffDocument, {
    headers: headers.uploadVeriffDocument,
  })
    .then((response) => {
      result = response.data
      console.log("result=", result)
    })
    .catch((error) => {
      console.log("error=", error)
    });
  return result
};
exports.submitVeriffSession = async (sessionID) => {

  let headers = {
    "create_Session_headers": {
      'X-AUTH-CLIENT': `${VERIFF_API_KEY}`, // Replace with your token or authentication header
      'Content-Type': 'application/json', // Specify the content type if needed
    },
    "uploadVeriffDocument": {
      'X-AUTH-CLIENT': `${VERIFF_API_KEY}`,
      'X-HMAC-SIGNATURE': ''
    }
  };
  let result;
  // Create an HMAC-SHA-256 hash
  const hmac = crypto.createHmac('sha256', VERIFF_API_SECRET);
  hmac.update(JSON.stringify(requestBody.submitSession));

  // Get the hexadecimal representation of the hash
  const hash = hmac.digest('hex');

  headers.uploadVeriffDocument['X-HMAC-SIGNATURE'] = hash
  await axios.patch(`https://stationapi.veriff.com/v1/sessions/${sessionID}`,
    requestBody.submitSession,
    {
      headers: headers.uploadVeriffDocument,
    })
    .then((response) => {
      // Handle the successful response here
      result = response.data

    })
    .catch((error) => {
      console.log("error=", error)
    });
  return result
};
exports.sendNotification = async (flight_id, user, booking_id) => {
  try {
    const booking_modal = require("../models/booking")
    const flight_seat_mapping = require("../models/flight_seats_mapping")
    const userModal = require("../models/users.model")
    const flight_modal = require("../models/flights")
    const notificationModal = require("../models/notification")
    let flight_data = await flight_modal.findOne({ _id: flight_id })
    let flight_name = flight_data.flight_name
    let other_member_booking_ids = []
    let flight_seat_data = await flight_seat_mapping.findOne({ flight_id })
    if (flight_seat_data) {
      let user_ids = []
      for (let i = 1; i <= 8; i++) {
        if (flight_seat_data[`seat${i}_details`] && flight_seat_data[`seat${i}_details`].user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
          user_ids.push(flight_seat_data[`seat${i}_details`].user_id)
          if (flight_seat_data[`seat${i}_details`].booking_id) other_member_booking_ids.push(flight_seat_data[`seat${i}_details`].booking_id)

        }
      }
      let currentDate = new Date()
      currentDate.setHours(currentDate.getHours() + 10); // Add 10 hours
      //currentDate.setMinutes(currentDate.getMinutes() + 30); // Add 30 minutes

      const currenthour = currentDate.getHours()
      if (currenthour >= 22) {
        let add_10_hours = currentDate.setHours(currentDate.getHours() + 10)
        await booking_modal.updateMany(
          {
            _id: {
              $in: other_member_booking_ids
            }
          }, {
          petOnBoardRequestStarts: new Date(add_10_hours),
          requested_id: user._id
        }, { new: true }
        )
      } else {
        await booking_modal.updateMany(
          {
            _id: {
              $in: other_member_booking_ids
            }
          }, {
          petOnBoardRequestStarts: new Date(currentDate),
          requested_id: user._id
        }, { new: true }
        )
      }

      let user_data = await userModal.find({
        _id: { $in: user_ids }, $and: [
          { firebase_device_token: { $ne: null } },
          { firebase_device_token: { $ne: '' } }
        ]
      });
      let user_obj = {}
      if (user_data.length > 0) {
        user_data.map((data) => {
          user_obj[`${data._id.valueOf()}`] = data
        })
        Object.values(user_obj).forEach(async (data) => {

          const message = {
            token: data.firebase_device_token,
            notification: {
              title: "Pet On board",
              body: `Hi ${data.fullName}, the flight ${flight_name} has pet on board. please accept or reject! flight_id:${flight_id},
               requester_id:${user._id.valueOf()},
               booking_id:${booking_id}`
            },
            data: {
              type: "Pet On Board Request",
              booking_id: booking_id.toString(),
              flight_id: flight_id.toString(),
              requester_id: user._id.valueOf().toString()
            },
            android: {
              priority: "high"
            },
            apns: {
              payload: {
                aps: {
                  badge: 1
                }
              }
            }

          };
          firebaseAdmin.messaging()
            .send(message)
            .then(async (response) => {
              // Response is a message ID string.
              console.log("Successfully sent message:", response);
              //inserting notification data
              await notificationModal.create({
                user_id: data._id,
                notification_title: message.notification.title,
                notification_body: message.notification.body,
                type: "Pet On Board Request",
                booking_id: booking_id,
              })
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });

        })

        return { status: 1, message: "Notification send successfully" }

      } else {
        return { status: 0, message: "No Data found!" }

      }

    } else {
      return { status: 0, message: "No Data found!" }

    }
  } catch (error) {
    //throw new Error(error.message);
    console.log('error=', error)
  }
}
exports.sendNotificationBeforeLeaveTime = async (deviceToken, user, flight_name, booking_id) => {
  try {
    const message = {
      token: deviceToken,
      notification: {
        title: 'Leave Time',
        body: `Hi ${user.fullName}, the flight ${flight_name} will takeoff in less than 2 hours.
            Hurry up! Reach the airport.`
      },
      data: {
        type: "Notify at leave time",
        booking_id: booking_id.toString()
      },
      android: {
        priority: "high"
      },
      apns: {
        payload: {
          aps: {
            badge: 1
          }
        }
      }

    };
    firebaseAdmin.messaging()
      .send(message)
      .then(async (response) => {
        // Response is a message ID string.
        console.log("Successfully sent message:", response);
        //inserting notification data
        await notificationModal.create({
          user_id: user._id,
          notification_title: message.notification.title,
          notification_body: message.notification.body,
          type: "Notify at leave time",
          booking_id: booking_id,
        })
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });
    return { status: 1, message: "Notification send successfully" }

  } catch (error) {
    //throw new Error(error.message);
    console.log('error=', error)
  }

}
exports.sendNotificationToRequester = async (user_id, response, booking_id) => {
  try {
    const userModal = require("../models/users.model")
    const notificationModal = require("../models/notification")
    let user = await userModal.findOne({
      _id: user_id, $and: [
        { firebase_device_token: { $ne: null } },
        { firebase_device_token: { $ne: '' } }
      ]
    })
    if (!user) {
      return { status: 0, message: "No Data found!" }
    }
    let message = {};
    if (response == "reject") {
      message = {
        token: user.firebase_device_token,
        notification: {
          title: 'Pet On board Request Rejected!',
          body: `Hi, Your pet on board request rejects and booking canceled!`
        },
        data: {
          type: "Pet On Board Response",
          booking_id: booking_id.toString()
        },
        android: {
          priority: "high"
        },
        apns: {
          payload: {
            aps: {
              badge: 1
            }
          }
        }

      };
    }
    if (response == "accept") {
      message = {
        token: user.firebase_device_token,
        notification: {
          title: 'Pet On board Request Accepted!',
          body: `Hi, Your pet on board request accepts and go to your booking to complete the booking process!`
        },
        data: {
          type: "Pet On Board Response",
          booking_id: booking_id.toString()
        },
        android: {
          priority: "high"
        },
        apns: {
          payload: {
            aps: {
              badge: 1
            }
          }
        }

      };
    }
    if (response == "confirm") {
      message = {
        token: user.firebase_device_token,
        notification: {
          title: 'Pet On board Request Accepted!',
          body: `Hi, Your pet on board request accepts and your booking is confirmed!`
        },
        data: {
          type: "Pet On Board Response",
          booking_id: booking_id.toString()
        },
        android: {
          priority: "high"
        },
        apns: {
          payload: {
            aps: {
              badge: 1
            }
          }
        }

      };
    }

    firebaseAdmin.messaging()
      .send(message)
      .then(async (response) => {
        // Response is a message ID string.
        console.log("Successfully sent message:", response);
        //inserting notification data
        await notificationModal.create({
          user_id: user_id,
          notification_title: message.notification.title,
          notification_body: message.notification.body,
          type: "Pet On Board Response",
          booking_id: booking_id,
        })
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });

    return { status: 1, message: "Notification send successfully" }
  } catch (error) {
    //throw new Error(error.message);
    console.log('error=', error)
  }
}

exports.sendNotificationPetRequest = async (flight_id, user, booking_id) => {
  try {
    const booking_modal = require("../models/booking")
    const flight_seat_mapping = require("../models/flight_seats_mapping")
    const userModal = require("../models/users.model")
    const flight_modal = require("../models/flights")
    const notificationModal = require("../models/notification")
    let petrequestnotificationfrom = process.env.PETREQUESTNOTIFICATIONFROM?parseInt(process.env.PETREQUESTNOTIFICATIONFROM):9;
    let petrequestnotificationto = process.env.PETREQUESTNOTIFICATIONTO?parseInt(process.env.PETREQUESTNOTIFICATIONTO):21;
    let flight_data = await flight_modal.findOne({ _id: flight_id })
    let flight_name = flight_data.flight_name
    let other_member_booking_ids = []
    let flight_seat_data = await flight_seat_mapping.findOne({ flight_id })
    if (flight_seat_data) {
      let user_ids = []
      for (let i = 1; i <= 8; i++) {
        if (flight_seat_data[`seat${i}_details`] && flight_seat_data[`seat${i}_details`].user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
          user_ids.push(flight_seat_data[`seat${i}_details`].user_id)
          if (flight_seat_data[`seat${i}_details`].booking_id) other_member_booking_ids.push(flight_seat_data[`seat${i}_details`].booking_id)

        }
      }
      let userAndBookingId = { user_id: user._id.valueOf(), booking_id: booking_id }
      let objectLastTime = '';
      // Get current time in Sydney
      const sydneyTime = momentTimezone.tz('Australia/Sydney');
      let newCurrentDate = sydneyTime.format('YYYY-MM-DD HH:MM');
      const currenthour = sydneyTime.hour();
      // Convert Sydney time to UTC
      let petOnBoardRequestStarts = sydneyTime.clone().utc();
      let currentDate = sydneyTime.clone().utc();
      
      //let currentDate = new Date()
      //currentDate.setHours(currentDate.getHours() + 10); // Add 10 hours
      //currentDate.setMinutes(currentDate.getMinutes() + 30); // Add 30 minutes

      //const currenthour = currentDate.getHours();
      let requestEndDateTime = moment(currentDate).add(1, 'hours');
      // let requestEndDateTime = new Date(currentDate);
      // requestEndDateTime.setHours(requestEndDateTime.getHours() + 1);
      objectLastTime = requestEndDateTime;
      //objectLastTime = `${requestEndDateTime.getHours()}:${requestEndDateTime.getMinutes()}`;
      if (currenthour >= petrequestnotificationto) {
        // Find the next day (tomorrow) at 9 AM in Sydney time
        const nextDayAt9AMSydney = sydneyNow.add(1, 'days').set({ hour: petrequestnotificationfrom, minute: 0, second: 0, millisecond: 0 });
        // Convert that time to UTC
        const nextDayAt9AMUTC = nextDayAt9AMSydney.clone().utc();
        petOnBoardRequestStarts = nextDayAt9AMUTC;
        let requestEndDateTime = moment(petOnBoardRequestStarts).add(1, 'hours');
        // let add_10_hours = currentDate.setHours(currentDate.getHours() + petrequestnotificationnextday)
        // let requestEndDateTime = new Date(add_10_hours);
        // requestEndDateTime.setHours(requestEndDateTime.getHours() + 1);
        objectLastTime = requestEndDateTime;
        //objectLastTime = `${requestEndDateTime.getHours()}:${requestEndDateTime.getMinutes()}`;
        await booking_modal.updateMany(
          {
            _id: {
              $in: other_member_booking_ids
            }
          }, {
          petOnBoardRequestStarts: nextDayAt9AMUTC,
          requested_id: user._id,
          requested_booking_details: userAndBookingId
        }, { new: true }
        )
      } else {
        await booking_modal.updateMany(
          {
            _id: {
              $in: other_member_booking_ids
            }
          }, {
          petOnBoardRequestStarts: petOnBoardRequestStarts,
          requested_id: user._id,
          requested_booking_details: userAndBookingId
        }, { new: true }
        )
      }

      let user_data = await userModal.find({
        _id: { $in: user_ids }, $and: [
          { firebase_device_token: { $ne: null } },
          { firebase_device_token: { $ne: '' } }
        ]
      });
      let user_obj = {}
      if (user_data.length > 0) {
        user_data.map((data) => {
          user_obj[`${data._id.valueOf()}`] = data
        })
        //time format
        // const [hours, minutes] = objectLastTime.split(':');
        // const formattedHours = parseInt(hours, 10) % 12 || 12;  // Convert to 12-hour format
        // const period = parseInt(hours, 10) < 12 ? 'AM' : 'PM';  // Determine AM/PM
        // objectLastTime = `${formattedHours}:${minutes} ${period}`;
        Object.values(user_obj).forEach(async (data) => {
          if (data.timezone) {
            const date = objectLastTime;
            const fromtimeZone = data.timezone;  // Specify your timezone
            // Convert to user timezone
            const fromUtcDate = momentTimezone.tz(date, fromtimeZone).utc();
            const hours = fromUtcDate.hour();
            const minutes = fromUtcDate.minute();
            objectLastTime = `${hours}:${minutes}`;
          }
          //time format
          const [hours, minutes] = objectLastTime.split(':');
          const formattedHours = parseInt(hours, 10) % 12 || 12;  // Convert to 12-hour format
          const period = parseInt(hours, 10) < 12 ? 'AM' : 'PM';  // Determine AM/PM
          objectLastTime = `${formattedHours}:${minutes} ${period}`;
          console.log('firebase_device_token==', data.firebase_device_token)
          const message = {
            token: data.firebase_device_token,
            notification: {
              title: 'A member on this flight would like to bring their pets onboard',
              body: `Should you find this disagreeable, please object by ${objectLastTime} and we'll redirect the member to another flight. Otherwise, no action is needed`
            },
            data: {
              type: "Pet On Board Request",
              booking_id: booking_id.toString(),
              flight_id: flight_id.toString(),
              requester_id: user._id.valueOf().toString()
            },
            android: {
              priority: "high"
            },
            apns: {
              payload: {
                aps: {
                  badge: 1
                }
              }
            }

          };
          firebaseAdmin.messaging()
            .send(message)
            .then(async (response) => {
              // Response is a message ID string.
              console.log("Successfully sent message:", response);
              //inserting notification data
              await notificationModal.create({
                user_id: data._id,
                notification_title: message.notification.title,
                notification_body: message.notification.body,
                type: "Pet On Board Request",
                booking_id: booking_id,
              })
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });
        })
        return { status: 1, message: "Notification send successfully" }

      } else {
        return { status: 0, message: "No Data found!" }

      }

    } else {
      return { status: 0, message: "No Data found!" }

    }
  } catch (error) {
    //throw new Error(error.message);
    console.log('error=', error)
  }
}

exports.sendNotificationAssistancePet = async (flight_id, user, booking_id) => {
  try {
    const booking_modal = require("../models/booking")
    const flight_seat_mapping = require("../models/flight_seats_mapping")
    const userModal = require("../models/users.model")
    const flight_modal = require("../models/flights")
    const notificationModal = require("../models/notification")
    let flight_data = await flight_modal.findOne({ _id: flight_id })
    let flight_name = flight_data.flight_name
    let other_member_booking_ids = []
    let flight_seat_data = await flight_seat_mapping.findOne({ flight_id })
    if (flight_seat_data) {
      let user_ids = []
      for (let i = 1; i <= 8; i++) {
        if (flight_seat_data[`seat${i}_details`] && flight_seat_data[`seat${i}_details`].user_id && flight_seat_data[`seat${i}_details`].user_id != user._id.valueOf()) {
          user_ids.push(flight_seat_data[`seat${i}_details`].user_id)
          if (flight_seat_data[`seat${i}_details`].booking_id) other_member_booking_ids.push(flight_seat_data[`seat${i}_details`].booking_id)

        }
      }

      let currentDate = new Date()
      //currentDate.setHours(currentDate.getHours() + 10); // Add 10 hours
      //currentDate.setMinutes(currentDate.getMinutes() + 30); // Add 30 minutes
      await booking_modal.updateMany(
        {
          _id: {
            $in: other_member_booking_ids
          }
        }, {
        petOnBoardRequestStarts: new Date(currentDate),
        requested_id: user._id
      }, { new: true }
      )


      let user_data = await userModal.find({
        _id: { $in: user_ids }, $and: [
          { firebase_device_token: { $ne: null } },
          { firebase_device_token: { $ne: '' } }
        ]
      });
      let user_obj = {}
      if (user_data.length > 0) {
        user_data.map((data) => {
          user_obj[`${data._id.valueOf()}`] = data
        })
        Object.values(user_obj).forEach(async (data) => {
          console.log('firebase_device_token==', data.firebase_device_token)
          const message = {
            token: data.firebase_device_token,
            notification: {
              title: 'A member on this flight will be bringing an Assistance Animal',
              body: `As a courtesy, we are letting you know that a member on this flight will be accompanied by thier Assistance Animal, whose seating is indicated below`,
            },
            data: {
              type: "Assistance Animal On Board",
              booking_id: booking_id.toString(),
              flight_id: flight_id.toString(),
              requester_id: user._id.valueOf().toString()
            },
            android: {
              priority: "high"
            },
            apns: {
              payload: {
                aps: {
                  badge: 1
                }
              }
            }

          };
          firebaseAdmin.messaging()
            .send(message)
            .then(async (response) => {
              // Response is a message ID string.
              console.log("Successfully sent message:", response);
              //inserting notification data
              await notificationModal.create({
                user_id: data._id,
                notification_title: message.notification.title,
                notification_body: message.notification.body,
                type: "Assistance Animal On Board",
                booking_id: booking_id,
              })
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });
        })
        return { status: 1, message: "Notification send successfully" }

      } else {
        return { status: 0, message: "No Data found!" }

      }

    } else {
      return { status: 0, message: "No Data found!" }

    }
  } catch (error) {
    //throw new Error(error.message);
    console.log('error=', error)
  }
}

exports.sendPendingVerificationAlert = async (user_id) => {
  try {
    console.log(user_id)
    const userModal = require("../models/users.model")
    const notificationModal = require("../models/notification")


    let user_data = await userModal.find({
      _id: toObjectId(user_id), $and: [
        { firebase_device_token: { $ne: null } },
        { firebase_device_token: { $ne: '' } }
      ]
    });
    if (user_data) {

      const message = {
        token: user_data[0].firebase_device_token,
        notification: {
          title: 'Please verify your identity',
          body: `To ensure the safety of all passengers, we ask everyone to verify their identity before booking a flight`
        },
        data: {
          type: "Verification Pending",
          test: "hello"
        },
        android: {
          priority: "high"
        },
        apns: {
          payload: {
            aps: {
              badge: 1
            }
          }
        }

      };
      firebaseAdmin.messaging()
        .send(message)
        .then(async (response) => {
          // Response is a message ID string.
          console.log("Successfully sent message:", response);
          //inserting notification data
          await notificationModal.create({
            user_id: user_data._id,
            notification_title: message.notification.title,
            notification_body: message.notification.body,
            type: "Verification Pending"
          })
        })
        .catch((error) => {
          console.log("Error sending message:", error);
        });

      return { status: 1, message: "Notification send successfully" }

    } else {
      return { status: 0, message: "No Data found!" }

    }
  } catch (error) {
    //throw new Error(error.message);
    console.log('error=', error)
  }
}

exports.sendVerificationResponseNotification = async (user_id, response, resdata) => {
  try {
    const userModal = require("../models/users.model")
    const notificationModal = require("../models/notification")
    let user = await userModal.findOne({
      _id: user_id, $and: [
        { firebase_device_token: { $ne: null } },
        { firebase_device_token: { $ne: '' } }
      ]
    })

    if (!user) {
      return { status: 0, message: "No Data found!" }
    }
    let message = {
      token: user.firebase_device_token,
      notification: {
        title: 'Verification Response!',
        body: response
      },
      data: {
        type: "Veriff Verification Response",
        resType: resdata.type,
        resCode: resdata.code.toString(),
      },
      android: {
        priority: "high"
      },
      apns: {
        payload: {
          aps: {
            badge: 1
          }
        }
      }

    };
    firebaseAdmin.messaging()
      .send(message)
      .then(async (response) => {
        // Response is a message ID string.
        console.log("Successfully sent message:", response);
        //inserting notification data
        await notificationModal.create({
          user_id: user_id,
          notification_title: message.notification.title,
          notification_body: message.notification.body,
          type: "Veriff Verification Response",
          extra_data: resdata
        })
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });

    return { status: 1, message: "Notification send successfully" }

  } catch (error) {
    //throw new Error(error.message);
    console.log('error=', error)
  }
}