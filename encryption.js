const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://test-user:6aRKUUymdfFBLH4B@cluster0.sb1nheu.mongodb.net/payment?retryWrites=true&w=majority&appName=Cluster0&tls=true";

async function run() {
    const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        tls: true,
        tlsAllowInvalidCertificates: false, // Ensure certificates are valid
    });

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        // Confirm connection
        console.log("Connected to MongoDB Atlas");

        // Perform actions on the collection object
        const database = client.db('payment');
        const collection = database.collection('paymentInfos');

        // Example operation: Insert a document
        const result = await collection.insertOne({
            cardholderName: 'John Doe',
            cardNumber: '4111111111111111',
            expiry: '12/25',
            cvv: '123',
            billingAddress: {
                street: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zip: '12345'
            }
        },);
        console.log('Document inserted with _id:', result.insertedId);

    } catch (error) {
        console.error("Error connecting to MongoDB Atlas:", error);
    } finally {
        // Close the connection
        await client.close();
    }
}

run().catch(console.dir);