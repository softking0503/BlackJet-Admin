//require('dotenv').config();
const fs = require('fs');
const path = require('path');
const secretManagerAws = require('../helpers/secretManagerAws');
//require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Fetch the configuration
// async function fetchConfig() {
//     try {
//         let USERNAME;
//         let PASSWORD;
//         let DBIP;
//         let DATABASE;
//         let PMONGOUSERNAME;
//         let PMONGOPASSWORD;
//         let PMONGOIP;
//         let INTERNALDNS;
//         let PMONGODATABASE;
//         if (process.env.NODE_ENV == 'production') {
//             const secret = await secretManagerAws.getSecretKeys('PROD_MONGODB');
//             USERNAME = secret.username;
//             PASSWORD = `'${secret.password}'`;
//             DBIP = secret.ip;
//             DATABASE = secret.database;

//             const secret1 = await secretManagerAws.getSecretKeys('Prod_PMongoDB_DB');
//             PMONGOUSERNAME = secret1.username;
//             PMONGOPASSWORD = `'${secret1.password}'`;
//             PMONGOIP = secret1.public_ip;
//             INTERNALDNS = secret1.internal_dns;
//             PMONGODATABASE = secret1.db_name;
//             console.log("<<<<<<< Mongodb connection successfully established >>>>>>>>>>>")
//         } else {
//             console.log('hereeeeee')
//             const secret = await secretManagerAws.getSecretKeys('TEST_MONGODB');
//             USERNAME = secret.username;
//             PASSWORD = `'${secret.password}'`;
//             DBIP = secret.ip;
//             DATABASE = secret.database;

//             const secret1 = await secretManagerAws.getSecretKeys('Test_PMongoDB_DB');
//             PMONGOUSERNAME = secret1.username;
//             PMONGOPASSWORD = `'${secret1.password}'`;
//             PMONGOIP = secret1.public_ip;
//             INTERNALDNS = secret1.internal_dns;
//             PMONGODATABASE = secret1.db_name;
//             console.log("<<<<<<< Mongodb connection successfully established >>>>>>>>>>>")
//         }
//         const response = { 'USERNAMES': USERNAME, 'PASSWORD': PASSWORD, 'DBIP': DBIP, 'DATABASE': DATABASE, 'PMONGOUSERNAME': PMONGOUSERNAME, 'PMONGOPASSWORD': PMONGOPASSWORD, 'PMONGOIP': PMONGOIP, 'PMONGODATABASE': PMONGODATABASE, 'INTERNALDNS': INTERNALDNS };
//         const config = response;

//         // Optionally, write the config to a .env file or directly set environment variables
//         const envPath = path.resolve(__dirname, '..', '.envconfig');
//         const envContent = Object.entries(config)
//             .map(([key, value]) => `${key}=${value}`)
//             .join('\n');

//         fs.writeFileSync(envPath, envContent);
//         console.log('Configuration fetched and set.');
//     } catch (error) {
//         console.error('Error fetching configuration:', error);

//     }
//     process.exit(1);
// }

// fetchConfig();
