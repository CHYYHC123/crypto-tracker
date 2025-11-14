// postcss.config.js
module.exports = {
  plugins: {
    // tailwindcss: {},
    'postcss-rem-to-pixel': {
      rootValue: 16,
      propList: ['*'],
      exclude: /node_modules/
    }
  }
};
