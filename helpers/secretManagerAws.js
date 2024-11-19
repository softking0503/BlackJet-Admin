const { SecretsManagerClient, GetSecretValueCommand, ListSecretVersionIdsCommand } = require("@aws-sdk/client-secrets-manager");

const REGION = 'ap-southeast-2';
const client = new SecretsManagerClient({ region: REGION });

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

let getSecretKeys = async (secretName) => {
    try {
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const response = await client.send(command);

        const secret = response.SecretString;
        const secretObject = JSON.parse(secret);

        return secretObject;
    } catch (err) {
        console.error('Error retrieving secret:', err);
        throw err;
    }
}

let getAllSecretKeys = async (secretName) => {
    try {
        let arrData = [];
        const command = new ListSecretVersionIdsCommand({ SecretId: secretName });
        const response = await client.send(command);
        for (let ij = 0; ij < response.Versions.length; ij++) {
            const command1 = new GetSecretValueCommand({ SecretId: secretName, VersionId: response.Versions[ij].VersionId });
            const data = await client.send(command1);
            const secret = data.SecretString;
            const secretObject = JSON.parse(secret);
            const merged = { ...secretObject, ...response.Versions[ij] };
            arrData.push(merged)
        }
        return arrData;

    } catch (err) {
        console.error('Error retrieving secret:', err);
        throw err;
    }
}

let fetchDbConfig = async () => {
    try {
        const secret = await getSecretKeys(process.env.MONGO_SECRET_KEY);
        const MONGO_USERNAME = secret.username;
        const MONGO_PASSWORD = secret.password;
        const MONGO_IP = secret.ip;
        const MONGO_DATABASE = secret.database;

        const secret1 = await getSecretKeys(process.env.PMONGO_SECRET_KEY);
        const PMONGO_USERNAME = secret1.username;
        const PMONGO_PASSWORD = secret1.password;
        const PMONGO_IP = secret1.public_ip;
        const PMONGO_DATABASE = secret1.db_name;
        const INTERNALDNS = secret1.internal_dns;
        
        const response = { 
            mongo: {
                username: MONGO_USERNAME, password: MONGO_PASSWORD, ip: MONGO_IP, database: MONGO_DATABASE
            },
            pmongo: {
                username: PMONGO_USERNAME, password: PMONGO_PASSWORD, ip: PMONGO_IP, database: PMONGO_DATABASE, INTERNALDNS
            }
        };
        console.log({response})
        return response;
    } catch (error) {
        console.error('Error fetching configuration:', error);
        throw error;
    }
}

module.exports = {
    getSecretKeys,
    getAllSecretKeys,
    fetchDbConfig
}
