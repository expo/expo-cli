import { readFileSync } from 'fs';
import { resolve } from 'path';

import { getApplicationId, setApplicationIdInBuildGradle } from '../ApplicationId';

const fixturesPath = resolve(__dirname, 'fixtures');
const buildGradlePath = resolve(fixturesPath, 'build.gradle');
const buildGradleContent = readFileSync(buildGradlePath, 'utf-8');

describe('applicationId', () => {
  it(`returns null if no applicationId nor package is provided`, () => {
    expect(getApplicationId({})).toBe(null);
  });

  it(`returns the applicationId if provided`, () => {
    expect(getApplicationId({ android: { applicationId: 'com.example.xyz' } })).toBe(
      'com.example.xyz'
    );
  });

  it(`returns the applicationId if package is provided and applicationId is not provided`, () => {
    expect(getApplicationId({ android: { package: 'com.example.xyz' } })).toBe('com.example.xyz');
  });

  it(`sets the applicationId in build.gradle if applicationId is given`, () => {
    expect(
      setApplicationIdInBuildGradle(
        { android: { applicationId: 'my.new.app' } },
        buildGradleContent
      )
    ).toMatch("applicationId 'my.new.app'");
  });

  it(`sets the applicationId in build.gradle if there's no applicationId, but package is given`, () => {
    expect(
      setApplicationIdInBuildGradle({ android: { package: 'my.new.app' } }, buildGradleContent)
    ).toMatch("applicationId 'my.new.app'");
  });
});
