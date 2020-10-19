export default {
  // Should be serialized
  expo: {
    name() {
      return 'my-app';
    },
  },
  // Shouldn't be serialized
  other: {
    name() {
      return 'my-app';
    },
  },
};
