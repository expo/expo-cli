import fs from 'fs';

import {
  shouldUpdateDeployTargetPodfileAsync,
  updateDeploymentTargetPodfile,
} from '../withIosDeploymentTarget';

jest.mock('fs', () => ({ promises: { readFile: jest.fn() } }));

describe(updateDeploymentTargetPodfile, () => {
  it('should update deployment target in Podfile', () => {
    const contents = `\
platform :ios, '10.0'

target 'HelloWorld' do
  use_react_native!(
    :path => config[:reactNativePath]
  )
end
`;

    const expectContents = `\
platform :ios, '12.0'

target 'HelloWorld' do
  use_react_native!(
    :path => config[:reactNativePath]
  )
end
`;
    expect(updateDeploymentTargetPodfile(contents, '12.0')).toEqual(expectContents);
  });

  it('should support multiple deployment targets in Podfile', () => {
    const contents = `\
target 'HelloWorld' do
  platform :ios, '10.0'
  use_react_native!(
    :path => config[:reactNativePath]
  )
end

target 'HelloWorld2' do
  platform :ios, '9.0'
  use_react_native!(
    :path => config[:reactNativePath]
  )
end
`;

    const expectContents = `\
target 'HelloWorld' do
  platform :ios, '12.0'
  use_react_native!(
    :path => config[:reactNativePath]
  )
end

target 'HelloWorld2' do
  platform :ios, '12.0'
  use_react_native!(
    :path => config[:reactNativePath]
  )
end
`;
    expect(updateDeploymentTargetPodfile(contents, '12.0')).toEqual(expectContents);
  });

  it('should leave unmodified if deployment target meets requirements', () => {
    const contents = `\
platform :ios, '12.0'

target 'HelloWorld' do
  use_react_native!(
    :path => config[:reactNativePath]
  )
end
`;

    expect(updateDeploymentTargetPodfile(contents, '12.0')).toEqual(contents);
  });
});

describe(shouldUpdateDeployTargetPodfileAsync, () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should returns true when target version is higher than current version', async () => {
    const podfileContent = `platform :ios, '11.0'`;
    (fs.promises.readFile as jest.Mock).mockResolvedValue(podfileContent);

    const result = await shouldUpdateDeployTargetPodfileAsync('/app', '13.0');
    expect(result).toBe(true);
  });

  it('should returns false when target version is equal to current version', async () => {
    const podfileContent = `platform :ios, '12.4'`;
    (fs.promises.readFile as jest.Mock).mockResolvedValue(podfileContent);

    const result = await shouldUpdateDeployTargetPodfileAsync('/app', '12.4');
    expect(result).toBe(false);
  });

  it('should show a warning when the Podfile content is not supported', async () => {
    const podfileContent = `platform :ios, something || '14.0'`;
    (fs.promises.readFile as jest.Mock).mockResolvedValue(podfileContent);
    const spy = jest.spyOn(console, 'warn');
    await shouldUpdateDeployTargetPodfileAsync('/app', '13.0');
    expect(spy).toBeCalled();
  });
});
