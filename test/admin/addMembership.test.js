const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const membershipModal = require('../../models/membership');
const adminModal = require('../../models/admin');
const schema = require('../../helpers/schemas');

jest.mock('../../models/membership');
jest.mock('../../models/admin');

describe('POST /addMembership with all middlewares', () => {
    let token;

    beforeEach(() => {
        // Mock JWT token
        token = jwt.sign({ _id: 'adminId123', type: 'admin' }, process.env.JWT_SECRET || 'testsecret');

        // Mock admin data
        adminModal.findOne = jest.fn().mockResolvedValue({
            _id: 'adminId123',
            type: 'admin',
            token,
            roles_array: [
                {
                    role_name: 'Membership Plans',
                    role_status: 'write',
                },
            ],
        });

        // Mock membership save
        membershipModal.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue(true),
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should add a new membership and pass all middlewares', async () => {
        const membershipData = {
            name: 'Gold Plan',
            bannerTag: 'Exclusive',
            content: 'This is a premium membership',
            text: 'Gold Plan Details',
            highlightsArray: [
                { highlight: 'Feature 1', strikeThroughHighlight: '', check: true },
            ],
        };

        const res = await request(app)
            .post('/addMembership')
            .set('Authorization', `Bearer ${token}`)
            .send(membershipData);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message', 'Membership added successfully');

        // Verify membershipModal save method is called with correct data
        expect(membershipModal).toHaveBeenCalledTimes(1);
        expect(membershipModal.mock.calls[0][0]).toEqual(expect.objectContaining({
            name: membershipData.name,
            content: membershipData.content,
            text: membershipData.text,
            highlightsArray: membershipData.highlightsArray,
        }));
    });

    it('should return 401 if no token is provided', async () => {
        const res = await request(app)
            .post('/addMembership')
            .send();

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'No authorization token was found');
    });

    it('should fail validation when highlight is missing in highlightsArray', async () => {
        const invalidData = {
            name: 'Gold Plan',
            text: 'Gold Plan Details',
            highlightsArray: [
                {
                    strikeThroughHighlight: 'Deprecated Feature',
                    check: true,
                },
            ],
        };

        const res = await request(app)
            .post('/addMembership')
            .set('Authorization', `Bearer ${token}`)
            .send(invalidData);

        expect(res.statusCode).toBe(400); // Joi validation failure
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toMatch(/"highlight" is required/);
    });

    it('should fail validation with empty name', async () => {
        const invalidData = {
            name: '', // Required field is empty
            text: 'Gold Plan Details',
        };

        const res = await request(app)
            .post('/addMembership')
            .set('Authorization', `Bearer ${token}`)
            .send(invalidData);

        expect(res.statusCode).toBe(400); // Joi validation failure
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toMatch(/"name" is not allowed to be empty/);
    });

    it('should return 403 if user lacks permissions', async () => {
        adminModal.findOne.mockResolvedValueOnce({
            _id: 'adminId123',
            type: 'subadmin',
            roles_array: [
                {
                    role_name: 'Membership Plans',
                    role_status: 'read', // Insufficient permission
                },
            ],
        });

        const validData = {
            name: 'Gold Plan',
            text: 'Gold Plan Details',
        };

        const res = await request(app)
            .post('/addMembership')
            .set('Authorization', `Bearer ${token}`)
            .send(validData);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toMatch(/You do not have permission to write in Membership Plans/);
    });

    it('should return 500 on server error', async () => {
        membershipModal.mockImplementation(() => ({
            save: jest.fn().mockRejectedValue(new Error('Database error')),
        }));

        const validData = {
            name: 'Gold Plan',
            text: 'Gold Plan Details',
        };

        const res = await request(app)
            .post('/addMembership')
            .set('Authorization', `Bearer ${token}`)
            .send(validData);

        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty('message', 'Internal Server Error.');
    });
});
