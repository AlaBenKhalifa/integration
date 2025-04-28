module.exports = {
  resolve: {
    fallback: {
      net: false,
      tls: false,
      fs: false,
      url: false,
      util: false,
      path: false,
    }
  }
};
