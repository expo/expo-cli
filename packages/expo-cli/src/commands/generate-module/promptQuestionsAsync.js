import chalk from 'chalk';
import prompt from '../../prompt';

/**
 * Generates CocoaPod name in format `Namepart1Namepart2Namepart3`.
 * For these with `expo` as `partname1` would generate `EXNamepart2...`.
 * @param {string} moduleName - provided module name, expects format: `namepart1-namepart2-namepart3`
 */
const generateCocoaPodDefaultName = moduleName => {
  const wordsToUpperCase = s =>
    s
      .toLowerCase()
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.substring(1))
      .join('');

  if (moduleName.toLowerCase().startsWith('expo')) {
    return `EX${wordsToUpperCase(moduleName.substring(4))}`;
  }
  return wordsToUpperCase(moduleName);
};

/**
 * Generates java package name in format `namepart1.namepart2.namepart3`.
 * @param {string} moduleName - provided module name, expects format: `namepart1-namepart2-namepart3`
 */
const generateJavaModuleDefaultName = moduleName => {
  const wordsToJavaModule = s =>
    s
      .toLowerCase()
      .split('-')
      .join('');

  if (moduleName.toLowerCase().startsWith('expo')) {
    return `expo.modules.${wordsToJavaModule(moduleName.substring(4))}`;
  }
  return wordsToJavaModule(moduleName);
};

/**
 * Generates JS/TS module name in format `Namepart1Namepart2Namepart3`.
 * @param {string} moduleName - provided module name, expects format: `namepart1-namepart2-namepart3`
 */
const generateInCodeModuleDefaultName = moduleName => {
  return moduleName
    .toLowerCase()
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join('');
};

/**
 * Generates questions
 * @param {string} [suggestedModuleName]
 */
const generateQuestions = suggestedModuleName => [
  {
    name: 'npmModuleName',
    message: 'How would you like to call your module in JS/npm? (eg. expo-camera)',
    default: suggestedModuleName,
    validate: answer => {
      return !answer.length
        ? 'Module name cannot be empty'
        : /[A-Z]/.test(answer)
        ? 'Module name connot contain any upper case characters'
        : /\s/.test(answer)
        ? 'Module name cannot contain any whitespaces'
        : true;
    },
  },
  {
    name: 'podName',
    message: 'How would you like to call your module in CocoaPods? (eg. EXCamera)',
    default: ({ npmModuleName }) => generateCocoaPodDefaultName(npmModuleName),
    validate: answer =>
      !answer.length
        ? 'CocoaPod name cannot be empty'
        : /\s/.test(answer)
        ? 'CocoaPod name cannot contain any whitespaces'
        : true,
  },
  {
    name: 'javaPackage',
    message: 'How would you like to call your module in Java? (eg. expo.modules.camera)',
    default: ({ npmModuleName }) => generateJavaModuleDefaultName(npmModuleName),
    validate: answer =>
      !answer.length
        ? 'Java Package name cannot be empty'
        : /\s/.test(answer)
        ? 'Java Package name cannot contain any whitespaces'
        : true,
  },
  {
    name: 'jsModuleName',
    message: 'How would you like to call your module in JS/TS codebase (eg. ExpoCamera)?',
    default: ({ npmModuleName }) => generateInCodeModuleDefaultName(npmModuleName),
    validate: answer =>
      !answer.length
        ? 'Module name cannot be empty'
        : /\s/.test(answer)
        ? 'Module name cannot contain any whitespaces'
        : true,
  },
];

/**
 * Prompt user about new module namings.
 * @param {string} [suggestedModuleName] - suggested module name that would be used to generate all sugestions for each question
 * @returns {Promise<{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }>} - user's answers
 */
export default async function promptQuestionsAsync(suggestedModuleName) {
  return await prompt(generateQuestions(suggestedModuleName));
}
