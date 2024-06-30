const nextConfig = {
  reactStrictMode: true,
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
