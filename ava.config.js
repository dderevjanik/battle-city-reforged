module.exports = {
  extensions: {
    ts: 'commonjs',
  },
  nodeArguments: ['--require=./test/helpers/setupBrowserEnv.js'],
  require: ['ts-node/register'],
};
