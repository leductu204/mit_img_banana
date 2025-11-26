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
        ]
    },
};
export default nextConfig;
