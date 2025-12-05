// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        turbo: {
            root: '.',
        },
    },
    async rewrites() {
        return [
            {
                source: '/api/nano-banana/:path*',
                destination: 'http://127.0.0.1:8000/api/nano-banana/:path*',
            },
            {
                source: '/api/generate/:path*',
                destination: 'http://127.0.0.1:8000/api/generate/:path*',
            },
            {
                source: '/api/jobs/:path*',
                destination: 'http://127.0.0.1:8000/api/jobs/:path*',
            },
        ]
    },
};
export default nextConfig;
