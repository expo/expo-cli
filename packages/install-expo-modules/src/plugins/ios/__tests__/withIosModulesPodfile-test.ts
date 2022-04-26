import fs from 'fs';
import path from 'path';

import { getLatestSdkVersion } from '../../../utils/expoVersionMappings';
import { updatePodfile } from '../withIosModulesPodfile';

describe(updatePodfile, () => {
  it('should support classic rn podfile', () => {
    const contents = `\
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '10.0'

target 'HelloWorld' do
  config = use_native_modules!

  use_react_native!(:path => config["reactNativePath"])

  target 'HelloWorldTests' do
    inherit! :complete
    # Pods for testing
  end

  # Enables Flipper.
  #
  # Note that if you have use_frameworks! enabled, Flipper will not work and
  # you should disable these next few lines.
  use_flipper!
  post_install do |installer|
    flipper_post_install(installer)
  end
end

target 'HelloWorld-tvOS' do
  # Pods for HelloWorld-tvOS

  target 'HelloWorld-tvOSTests' do
    inherit! :search_paths
    # Pods for testing
  end
end
`;

    const expectContents = `\
require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '10.0'

target 'HelloWorld' do
  use_expo_modules!
  post_integrate do |installer|
    begin
      expo_patch_react_imports!(installer)
    rescue => e
      Pod::UI.warn e
    end
  end
  config = use_native_modules!

  use_react_native!(:path => config["reactNativePath"])

  target 'HelloWorldTests' do
    inherit! :complete
    # Pods for testing
  end

  # Enables Flipper.
  #
  # Note that if you have use_frameworks! enabled, Flipper will not work and
  # you should disable these next few lines.
  use_flipper!
  post_install do |installer|
    flipper_post_install(installer)
  end
end

target 'HelloWorld-tvOS' do
  # Pods for HelloWorld-tvOS

  target 'HelloWorld-tvOSTests' do
    inherit! :search_paths
    # Pods for testing
  end
end
`;

    const sdkVersion = getLatestSdkVersion().expoSdkVersion;
    expect(updatePodfile(contents, 'HelloWorld', sdkVersion)).toEqual(expectContents);
  });

  it('minimum support for existing post_integrate hook', () => {
    const contents = `\
target 'HelloWorld' do
  config = use_native_modules!

  use_react_native!(:path => config["reactNativePath"])

  post_integrate do |installer|
    puts "Existing post_integrate hook"
  end
end
`;

    const expectContents = `\
require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")
target 'HelloWorld' do
  use_expo_modules!
  config = use_native_modules!

  use_react_native!(:path => config["reactNativePath"])

  post_integrate do |installer|
    begin
      expo_patch_react_imports!(installer)
    rescue => e
      Pod::UI.warn e
    end
    puts "Existing post_integrate hook"
  end
end
`;

    const sdkVersion = getLatestSdkVersion().expoSdkVersion;
    expect(updatePodfile(contents, 'HelloWorld', sdkVersion)).toEqual(expectContents);
  });
});

describe('withIosModulesPodfile sdkVersion snapshots', () => {
  const podfileFixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'Podfile'), 'utf-8');

  ['43.0.0', '44.0.0'].forEach(sdkVersion => {
    it(`sdkVersion ${sdkVersion}`, () => {
      expect(updatePodfile(podfileFixture, 'HelloWorld', sdkVersion)).toMatchSnapshot();
    });
  });
});
