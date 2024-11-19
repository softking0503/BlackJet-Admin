const mockMessages = {
  create: jest.fn().mockResolvedValue({ sid: '12345' }),
};

const mockTwilio = jest.fn().mockImplementation(() => {
  return {
    messages: mockMessages,
  };
});

module.exports = mockTwilio;