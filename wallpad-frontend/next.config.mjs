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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com'
      },
      {
        protocol: 'http',
        hostname: 'localhost'
      }
    ],
    minimumCacheTTL: 10,
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
