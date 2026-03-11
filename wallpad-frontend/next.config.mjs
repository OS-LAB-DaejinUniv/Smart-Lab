const nextConfig = {
  reactStrictMode: false,
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.(wav)$/,
      use: {
        loader: "file-loader",
        options: {
          name: "[name].[ext]",
          publicPath: `/_next/static/sounds/`,
          outputPath: `${options.isServer ? "../" : ""}static/sounds/`
        }
      }
    });

    return config;
  },
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com'
      },
      {
        protocol: 'http',
        hostname: 'localhost'
      },
      {
        protocol: 'http',
        hostname: 'wallpad.oslab'
      }
    ],
    minimumCacheTTL: 3600,
    qualities: [25, 75],
  },
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: `/`,
      },
    ];
  },
};

export default nextConfig;
