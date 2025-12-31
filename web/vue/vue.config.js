const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  lintOnSave: false,

  // Enable code splitting and optimization
  configureWebpack: {
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          d3: {
            test: /[\\/]node_modules[\\/]d3.*[\\/]/,
            name: 'd3',
            chunks: 'all',
            priority: 20
          }
        }
      }
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: '../baseUIconfig.js',
            to: '../public/UIconfig.js'
          },
          {
            from: '../baseUIconfig.js',
            to: 'UIconfig.js'
          },
        ]
      })
    ]
  },

  // Performance optimizations
  chainWebpack: config => {
    // Enable gzip compression
    config.plugin('compression').use(require('compression-webpack-plugin'), [{
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8
    }]);

    // Optimize images
    config.module
      .rule('images')
      .use('image-webpack-loader')
      .loader('image-webpack-loader')
      .options({
        mozjpeg: { progressive: true, quality: 65 },
        optipng: { enabled: false },
        pngquant: { quality: [0.65, 0.90], speed: 4 },
        gifsicle: { interlaced: false },
        webp: { quality: 75 }
      });

    // Analyze bundle size in development
    if (process.env.NODE_ENV === 'development') {
      config
        .plugin('webpack-bundle-analyzer')
        .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, [{
          analyzerMode: 'static',
          openAnalyzer: false
        }]);
    }
  },

  publicPath: '',

  // PWA configuration
  pwa: {
    name: 'Gekko Pro',
    themeColor: '#00d4aa',
    msTileColor: '#00d4aa',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'default',
    workboxPluginMode: 'GenerateSW',
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true
    }
  }
}