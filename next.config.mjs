/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output was removed: Next copies `.env` into .next/standalone/,
  // so the build artifact shipped the MongoDB credentials with it, and nothing
  // consumed that folder (the app deploys on Vercel; `npm start` works without
  // it). If you ever self-host, inject the environment at runtime instead.
  // (review item #26)
};

export default nextConfig;
