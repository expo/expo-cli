import { constructBuildLogsUrl } from '../url';

describe(constructBuildLogsUrl, () => {
  it('returns URL with project path', () => {
    const result = constructBuildLogsUrl({
      username: 'test-username',
      projectSlug: 'test-project-slug',
      buildId: 'test-build-id',
    });

    expect(result).toBe(
      'https://expo.io/accounts/test-username/projects/test-project-slug/builds/test-build-id'
    );
  });

  it('returns URL with account', () => {
    const result = constructBuildLogsUrl({
      username: 'test-username',
      projectSlug: undefined,
      buildId: 'test-build-id',
    });

    expect(result).toBe('https://expo.io/accounts/test-username/builds/test-build-id');
  });
  it('returns URL without account or project slug', () => {
    const result = constructBuildLogsUrl({
      username: undefined,
      projectSlug: undefined,
      buildId: 'test-build-id',
    });

    expect(result).toBe('https://expo.io/builds/test-build-id');
  });
});
