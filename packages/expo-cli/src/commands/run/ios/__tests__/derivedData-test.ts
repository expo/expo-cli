import { createDerivedDataHash, getFolderWithHash } from '../derivedData';

describe(createDerivedDataHash, () => {
  it(`creates hash`, () => {
    expect(
      createDerivedDataHash('/Users/evanbacon/Documents/GitHub/lab/yolo36/ios/yolo36.xcworkspace')
    ).toBe('ekifdrglxxnyjbfjibzwifkgrzhj');
    expect(createDerivedDataHash('foobar')).toBe('bqogdgryohrfozctwtuhrczqlrfb');
    expect(createDerivedDataHash('123456789')).toBe('bcroqoltycbftodxdxmbemcbzuox');
    expect(
      createDerivedDataHash(
        '/Users/evanbacon/Documents/GitHub/lab/yolo36/ios/yolo_36-hello world_的.xcworkspace'
      )
    ).toBe('bkbmdwrrwvqhhweoqsoiwznyrlwl');
  });
});

describe(getFolderWithHash, () => {
  it('gets path', () => {
    const derivedDataPath = getFolderWithHash(
      '/Users/evanbacon/Documents/GitHub/lab/yolo36/ios/yolo36.xcworkspace'
    );

    //     '/Users/evanbacon/Library/Developer/Xcode/DerivedData',
    expect(derivedDataPath).toBe('yolo36-ekifdrglxxnyjbfjibzwifkgrzhj');
  });
});
