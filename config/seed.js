require('dotenv').config();
// // const rolesModel = require('../models/roles.model');
// const usersModel = require('../models/users.model');
// // const permissionsModel = require('../models/permissions');

// exports.createRoles = async () => {
//     const roles = [{
//         name: 'super admin',
//         type: 'super_admin'
//     }, {
//         name: 'admin',
//         type: 'admin'
//     }, {
//         name: 'user',
//         type: 'user'
//     }, {
//         name: 'Sub-Admin',
//         type: 'sub_admin'
//     }, {
//         name: 'Therapist',
//         type: 'therapist'
//     }];

//     const rolesTypes = roles.map(a => a.type)
//     const checkRoles = await rolesModel.find({ type: rolesTypes });
//     if (!checkRoles.length) {
//         console.log('Roles create');
//         await rolesModel.create(roles);
//     }
// }

// exports.createAdminForLogin = async () => {

//     const role = await rolesModel.findOne({ type: 'super_admin' });
//     const permissions = await permissionsModel.find();

//     const admin = {
//         first_name: 'admin',
//         email: 'admin@gmail.com',
//         password: 'admin@1234',
//         role: role.id,
//         permissions
//     };

//     const checkAdmin = await usersModel.findOne({ email: admin.email });
//     if (!checkAdmin) {
//         console.log('admin create')
//         await usersModel.create(admin);
//     }
// }

/**
 * config.ts
 * Airwallex Payments Demo. Created by Shirly.Chen
 * 
 * This file saves all configs of the demo
 */


let AIRWALLEX_CLIENT_ID;
let AIRWALLEX_API_KEY;


const seed = {
    airwallex: {
        apiKey: AIRWALLEX_API_KEY,
        clientId: AIRWALLEX_CLIENT_ID,
        // Use airwallex test host for development and production host in your production.
        clientApiHost: process.env.AIRWALLEX_API,
        clientPciApiHost: process.env.AIRWALLEX_PCI_API
    },
    powerBoard: {
        gatewayId: process.env.POWERBOARD_GATEWAY_ID,
        secretKey: process.env.POWERBOARD_SECET_KEY,
        clientApiHost: process.env.POWERBOARD_API,
    },
    hellozai: {
        clientId: process.env.HELLOZAI_CLIENT_ID,
        clientSecretKey: process.env.HELLOZAI_CLIENT_SECRET_KEY,
        clientGrantCred: process.env.HELLOZAI_CLIENT_GRANT_CRED,
        scope: process.env.HELLOZAI_SCOPE,
        clientApiHost: process.env.HELLOZAI_API,
        clientTokenApi: process.env.HELLOZAI_TOKEN_API,
    }
};

module.exports = {
    seed
};
