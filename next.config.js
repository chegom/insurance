/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 큰 파일 업로드를 위한 설정
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    } else {
      // 서버 사이드에서 pdf-parse를 위한 설정
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      }
    }
    return config
  },
  transpilePackages: ['@supabase/supabase-js'],
}

module.exports = nextConfig

