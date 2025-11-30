import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    config.resolve.alias['~'] = path.join(__dirname, 'src');
    return config;
  },
  images: {
    // 画像の読み込みで、課金が増大しているので、一旦画像は表示しないようにする
    // domains: ['places.googleapis.com'],
  },
};

export default nextConfig;
