const dotenv = require('dotenv');
const cron = require('node-cron');
const secretManagerAws = require('./helpers/secretManagerAws');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
// Load variables from .envconfig
//dotenv.config({ path: path.resolve(__dirname, '.envconfig') });

// Load variables from .env
//dotenv.config({ path: path.resolve(__dirname, '.env') });

// '*/0.5 * * * *' - Run every
// let time = {
//     runAt00_30_am: `0 30 0 * * *`,//every day 12:30 am
//     runEveryMinuteAt30sec: '0 */1 * * * *',//every 1 mins
//     runOnDemand: `0 */1 * * * *`,
//     runEverySundayAt10am: '0 0 10 * * 0', // every Sunday at 10 AM
//     runEveryDay12pm: '* * * * *', // every day at 12 AM
//     runEveryDay03amSydney: '0 0 3 * * *', // every day at 3 AM
// }

//GETTING OLD SECRET KEYS
//MONGO
// let NODE_ENV = process.env.NODE_ENV;
// let USERNAME = process.env.USERNAMES;
// let PASSWORD = process.env.PASSWORD;
// let DBIP = process.env.DBIP;
// let DATABASE = process.env.DATABASE;
// let PMONGOUSERNAME = process.env.PMONGOUSERNAME;
// let PMONGOPASSWORD = process.env.PMONGOPASSWORD;
// let PMONGOIP = process.env.PMONGOIP;
// let PMONGODATABASE = process.env.PMONGODATABASE;
// let INTERNALDNS = process.env.INTERNALDNS;

// const awsSecretManagerCronjob = cron.schedule(
//     time.runEveryDay03amSydney,
//     async () => {
//         try {
//             console.log("cron aws")
//             //MONGO
//             let USERNAME1;
//             let PASSWORD1;
//             let DBIP1;
//             let DATABASE1;
//             let PMONGOUSERNAME1;
//             let PMONGOPASSWORD1;
//             let PMONGOIP1;
//             let PMONGODATABASE1;
//             let INTERNALDNS1;
//             if (NODE_ENV == 'production') {
//                 const secret = await secretManagerAws.getSecretKeys('PROD_MONGODB');
//                 USERNAME1 = secret.username;
//                 PASSWORD1 = secret.password;
//                 DBIP1 = secret.ip;
//                 DATABASE1 = secret.database;

//                 const secret1 = await secretManagerAws.getSecretKeys('Prod_PMongoDB');
//                 PMONGOUSERNAME1 = secret1.username;
//                 PMONGOPASSWORD1 = secret1.password;
//                 PMONGOIP1 = secret1.public_ip;
//                 INTERNALDNS1 = secret1.internal_vps_dns;
//                 PMONGODATABASE1 = secret1.db_name;

//             } else {
//                 console.log('hereeeeee')
//                 const secret = await secretManagerAws.getSecretKeys('TEST_MONGODB');
//                 USERNAME1 = secret.username;
//                 PASSWORD1 = secret.password;
//                 DBIP1 = secret.ip;
//                 DATABASE1 = secret.database;

//                 const secret1 = await secretManagerAws.getSecretKeys('Test_PMongoDB');
//                 PMONGOUSERNAME1 = secret1.username;
//                 PMONGOPASSWORD1 = secret1.password;
//                 PMONGOIP1 = secret1.public_ip;
//                 INTERNALDNS1 = secret1.internal_vps_dns;
//                 PMONGODATABASE1 = secret1.db_name;
//             }

//             //if any changes in mongo secret restart pm2 server
//             if (USERNAME1 != USERNAME || PASSWORD1 != PASSWORD || DBIP1 != DBIP || DATABASE1 != DATABASE || PMONGOUSERNAME1 != PMONGOUSERNAME || PMONGOPASSWORD1 != PMONGOPASSWORD || PMONGOIP1 != PMONGOIP || PMONGODATABASE1 != PMONGODATABASE || INTERNALDNS1 != INTERNALDNS) {
//                 console.log('aws secret not matched===')
//                 const response = { 'USERNAMES': USERNAME1, 'PASSWORD': PASSWORD1, 'DBIP': DBIP1, 'DATABASE': DATABASE1, 'PMONGOUSERNAME': PMONGOUSERNAME1, 'PMONGOPASSWORD': PMONGOPASSWORD1, 'PMONGOIP': PMONGOIP1, 'PMONGODATABASE': PMONGODATABASE1, 'INTERNALDNS': INTERNALDNS1  };
//                 const config = response;

//                 // Optionally, write the config to a .env file or directly set environment variables
//                 const envPath = path.resolve(__dirname, '.envconfig');
//                 const envContent = Object.entries(config)
//                     .map(([key, value]) => `${key}=${value}`)
//                     .join('\n');

//                 fs.writeFileSync(envPath, envContent);
//                 console.log('Configuration fetched and set.');

//                 exec('pm2 restart all', (error, stdout, stderr) => {
//                     console.log('server restarted===')
//                     if (error) {
//                         console.error(`Error restarting server: ${error}`);
//                         return;
//                     }
//                     console.log(`Server restarted: ${stdout}`);
//                     if (stderr) {
//                         console.error(`stderr: ${stderr}`);
//                     }
//                 });
//             }

//         } catch (e) {
//             console.error(e, `CRON JOB FAILED TO START: ${e.message}`);
//         }
//     },
//     { scheduled: true, timezone: "Australia/Sydney" }
// );


module.exports = {
    //awsSecretManagerCronjob
};