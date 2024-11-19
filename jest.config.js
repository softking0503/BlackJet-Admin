module.exports = {

  // The root directory that Jest should scan for tests and modules within

  rootDir: '.',

  // The directories that Jest should ignore when searching for files

  testPathIgnorePatterns: [

    '/node_modules/', // Ignore node_modules directory

  ],

  // A list of paths to directories that Jest should use to search for files in

  roots: [

    '<rootDir>/test/', // Specify the root directory for your tests

  ],

  // An array of file extensions your modules use

  moduleFileExtensions: [

    'js', // Include JavaScript files

    'json', // Include JSON files

    'node', // Include Node.js files

  ],

  // A map from regular expressions to paths to transformers

  transform: {

    '^.+\\.js$': 'babel-jest', // Transform JavaScript files using Babel

  },

  // A list of reporter names that Jest uses when writing coverage reports

  coverageReporters: [

    'text', // Output coverage reports in text format to the terminal

    'lcov', // Output coverage reports in LCOV format

  ],

  "moduleNameMapper": {
    "mongoose": "<rootDir>/test/__mocks__/mongoose.js"
  },

  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Test Report',
      outputPath: 'test-report.html'
    }]
  ],

};
 