import { PackageJsonCheck } from '../PackageJsonCheck';

// required by runAsync
const additionalProjectProps = {
  exp: {
    name: 'name',
    slug: 'slug',
  },
  projectRoot: '/path/to/project',
};

describe(PackageJsonCheck, () => {
  describe('runAsync', () => {
    it('returns result with isSuccessful = true if empty dependencies, devDependencies, scripts', async () => {
      const check = new PackageJsonCheck();
      const result = await check.runAsync({
        pkg: { name: 'name', version: '1.0.0' },
        ...additionalProjectProps,
      });
      expect(result.isSuccessful).toBeTruthy();
    });

    // expo script sub-check

    it('returns result with isSuccessful = true if scripts does not contain expo', async () => {
      const check = new PackageJsonCheck();
      const result = await check.runAsync({
        pkg: { name: 'name', version: '1.0.0', scripts: { start: 'start' } },
        ...additionalProjectProps,
      });
      expect(result.isSuccessful).toBeTruthy();
    });

    it('returns result with isSuccessful = false if scripts contain expo', async () => {
      const check = new PackageJsonCheck();
      const result = await check.runAsync({
        pkg: { name: 'name', version: '1.0.0', scripts: { expo: 'start' } },
        ...additionalProjectProps,
      });
      expect(result.isSuccessful).toBeFalsy();
    });

    // transitive-only dependencies sub-check

    const dependencyLocations = ['dependencies', 'devDependencies'];

    const transitiveOnlyDependencies = ['expo-modules-core', 'expo-modules-autolinking'];

    dependencyLocations.forEach(dependencyLocation => {
      it(`returns result with isSuccessful = true if ${dependencyLocation} does not contain expo-modules-core/ expo-modules-autolinking`, async () => {
        const check = new PackageJsonCheck();
        const result = await check.runAsync({
          pkg: { name: 'name', version: '1.0.0', [dependencyLocation]: { somethingjs: '17.0.1' } },
          ...additionalProjectProps,
        });
        expect(result.isSuccessful).toBeTruthy();
      });

      transitiveOnlyDependencies.forEach(transitiveOnlyDependency => {
        it(`returns result with isSuccessful = false if ${dependencyLocation} contains ${transitiveOnlyDependency}`, async () => {
          const check = new PackageJsonCheck();
          const result = await check.runAsync({
            pkg: {
              name: 'name',
              version: '1.0.0',
              [dependencyLocation]: { [transitiveOnlyDependency]: '1.0.0' },
            },
            ...additionalProjectProps,
          });
          expect(result.isSuccessful).toBeFalsy();
        });
      });
    });

    // package name conflicts with installed packages sub-check
    it('returns result with isSuccessful = true if package name does not match dependency', async () => {
      const check = new PackageJsonCheck();
      const result = await check.runAsync({
        pkg: {
          name: 'package-name',
          version: '1.0.0',
          dependencies: { 'something-js': '17.0.1' },
          devDependencies: { 'something-else-js': '17.0.1' },
        },
        ...additionalProjectProps,
      });
      expect(result.isSuccessful).toBeTruthy();
    });

    it('returns result with isSuccessful = false if package name matches dependency', async () => {
      const check = new PackageJsonCheck();
      const result = await check.runAsync({
        pkg: {
          name: 'something-js',
          version: '1.0.0',
          dependencies: { 'something-js': '17.0.1' },
          devDependencies: { 'something-else-js': '17.0.1' },
        },
        ...additionalProjectProps,
      });
      expect(result.isSuccessful).toBeFalsy();
    });

    it('returns result with isSuccessful = false if package name matches dev dependency', async () => {
      const check = new PackageJsonCheck();
      const result = await check.runAsync({
        pkg: {
          name: 'something-else-js',
          version: '1.0.0',
          dependencies: { 'something-js': '17.0.1' },
          devDependencies: { 'something-else-js': '17.0.1' },
        },
        ...additionalProjectProps,
      });
      expect(result.isSuccessful).toBeFalsy();
    });
  });
});
