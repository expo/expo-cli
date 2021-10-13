import { updateDeploymentTargetPodfile } from '../withIosDeploymentTarget';

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
    expect(updateDeploymentTargetPodfile(contents)).toEqual(expectContents);
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
    expect(updateDeploymentTargetPodfile(contents)).toEqual(expectContents);
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

    expect(updateDeploymentTargetPodfile(contents)).toEqual(contents);
  });
});
