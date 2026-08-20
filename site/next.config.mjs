/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  // No basePath: this is the Pages root, unlike otto-workbench's project page.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['@otto-nation/brand'],
};
