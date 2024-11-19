// Mock module for FCM push notifications
const sendNotification = async (message) => {
  // Simulate sending notification
  console.log(`Mock: Sending FCM notification: ${message}`);
  return { success: true }; // Mock response
};

module.exports = jest.fn(() => {
  return {
    sendNotification
  }
});