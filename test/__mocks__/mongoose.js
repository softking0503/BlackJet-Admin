// __mocks__/mongoose.js

const mongoose = jest.genMockFromModule('mongoose');
jest.mock('mongoose');

// Mock the createConnection method
mongoose.createConnection = jest.fn().mockReturnValue({
  on: jest.fn(),
  once: jest.fn(),
  close: jest.fn(),
  model: jest.fn().mockReturnThis(),
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  prototype: {},
  findOneAndUpdate: jest.fn()
});

// Mock Schema constructor
mongoose.Schema = jest.fn().mockReturnValue({
  index: jest.fn(),
  pre: jest.fn(),
  path: jest.fn(() => {
    return {
      validate: jest.fn()
    }
  }),
  methods: jest.fn(() => {
    return {
      verifyPassword: jest.fn()
    }
  }),
});

// Mock Schema Types
mongoose.Schema.Types = {
  ObjectId: jest.fn(),
};

mongoose.Schema.index = jest.fn();

// Mock the model method
mongoose.model = jest.fn();

// Mock connection export
const conn = {
  model: mongoose.model,
};

module.exports = mongoose;
module.exports.conn = conn;
module.exports.masterConn = conn;
module.exports.mongoose = mongoose;