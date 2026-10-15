import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const config: NextConfig = {
  transpilePackages: ['@housefamily/shared'],
  poweredByHeader: false,
  async rewrites() {
    return [{source: '/api/:path*', destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:4000'}/api/:path*`}];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
