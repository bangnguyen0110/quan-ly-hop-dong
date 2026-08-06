import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Vẫn có thể giữ để bỏ qua kiểm tra TypeScript khi build
    ignoreBuildErrors: true,
  },
  /* Đã xóa khối 'eslint' bị lỗi ở Next.js 15 */
};

export default nextConfig;