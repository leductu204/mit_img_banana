// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        turbo: {
            root: '.',
        },
    },
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
    // Suppress hydration warnings caused by browser extensions
    onError: (err) => {
        if (err.message?.includes('Hydration')) {
            return;
        }
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://127.0.0.1:8000/api/:path*',
            },
        ]
    },
};
export default nextConfig;
