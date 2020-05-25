export default {
  name: 'nextjs',
  web: {
    build: {
      babel: {
        include: ['packages/next-adapter'],
      },
    },
  },
};
