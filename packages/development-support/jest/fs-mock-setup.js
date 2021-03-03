// TODO(perry) obviate this file when mock-fs 4.0 is stable and usable for us
// mock-fs hooks the native fs on first require, so unfortunately just using
// the __mocks__ file isn't enough; jest will mock fs itself and stuff gets
// complicated. I'm actually not completely sure _what_ happens, but the end
// result is that you need to require mock fs before anything else or it
// doesn't work.

jest.mock('fs');
jest.mock('resolve-from');
