/** @babel */

import { createRunner } from 'atom-jasmine2-test-runner'

// optional options to customize the runner
const options = {
    specHelper: {
        // atom: true,
        // attachToDom: true,
        // ci: true,
        // customMatchers: true,
        // jasmineFocused: true,
        jasmineJson: true,
        // jasminePass: true,
        // jasmineTagged: true,
        // mockClock: true,
        // mockLocalStorage: true,
        // profile: true,
        // set: true,
        // unspy: true
    }
};

const configure = function () {
  // If provided, atom-jasmine2-test-runner will call this function before jasmine is started
  // so you can do whatever you'd like with the global variables.
  // (i.e. add custom matchers, require plugins, etc.)
  // require("jasmine-json");

  // beforeEach(function () {
  //   jasmine.addMatchers({
  //     toBeTheAnswerToTheUltimateQuestionOfLifeTheUniverseAndEverything: function (util, customEqualityTesters) {
  //       return {
  //         compare: function (actual) {
  //           let result = {};
  //           result.pass = util.equals(actual, 42, customEqualityTesters);
  //           const toBeOrNotToBe = (result.pass ? "not to be" : "to be"); // that is the question.
  //           result.message = `Expected ${actual} ${toBeOrNotToBe} the answer to the ultimate question of life, the universe, and everything.`;
  //           return result;
  //         }
  //       };
  //     }
  //   });
  // });
}

export default createRunner(options, configure);
