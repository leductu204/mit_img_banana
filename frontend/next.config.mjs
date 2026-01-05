// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

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
            {
                source: '/api/payment/:path*',
                destination: 'http://127.0.0.1:8000/api/payment/:path*',
            },
            {
                source: '/auth/:path*',
                destination: 'http://127.0.0.1:8000/auth/:path*',
            },
            {
                source: '/api/settings/:path*',
                destination: 'http://127.0.0.1:8000/api/settings/:path*',
            },
             {
                source: '/api/costs',
                destination: 'http://127.0.0.1:8000/api/costs',
            },
             {
                source: '/api/users/:path*',
                destination: 'http://127.0.0.1:8000/api/users/:path*',
            },
        ]
    },
};
export default nextConfig;
