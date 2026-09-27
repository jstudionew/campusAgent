import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  base: (process.env.VITE_BASE_URL || '/'),
  plugins: [
    react({
      jsxRuntime: 'automatic',
      include: [/\.[jt]sx?(\?.*)?$/]
    }),
    svgr(),
    {
      name: 'transform-js-as-jsx',
      async transform(code, id) {
        if (/src[\\/].*\.js(\?.*)?$/.test(id)) {
          return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
        }
        return null;
      },
    },
    {
      name: 'sync-dist-dirs',
      closeBundle() {
        try {
          const rootDist = path.resolve(__dirname, '../dist');
          const frontDist = path.resolve(__dirname, 'dist');
          if (fs.existsSync(rootDist)) {
            fs.cpSync(rootDist, frontDist, { recursive: true, force: true });
          }
        } catch (e) {
          // Non-blocking notice
        }
      },
    }
  ],
  resolve: {
    alias: {
      // Set up src as base for all imports
      '~': path.resolve(__dirname, 'src'),
      // Add all the directories as aliases
      'src': path.resolve(__dirname, 'src'),
      'assets': path.resolve(__dirname, 'src/assets'),
      'components': path.resolve(__dirname, 'src/components'),
      'contexts': path.resolve(__dirname, 'src/contexts'),
      'layouts': path.resolve(__dirname, 'src/layouts'),
      'theme': path.resolve(__dirname, 'src/theme'),
      'variables': path.resolve(__dirname, 'src/variables'),
      'views': path.resolve(__dirname, 'src/views'),
      // Add specific files that might be imported directly
      'routes': path.resolve(__dirname, 'src/routes.jsx'),
      'routes.js': path.resolve(__dirname, 'src/routes.jsx'),
      'brand': path.resolve(__dirname, 'src/brand.js'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  esbuild: {
    jsx: 'automatic'
  },
  
  build: {
    outDir: process.env.VITE_OUT_DIR
      ? path.resolve(__dirname, process.env.VITE_OUT_DIR)
      : path.resolve(__dirname, '../dist'), // Output directory for build
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react-apexcharts') || id.includes('apexcharts')) {
            return 'charts';
          }

          if (id.includes('@chakra-ui')) {
            return 'chakra';
          }

          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/')) {
            return 'react-vendor';
          }

          if (id.includes('html2canvas')) {
            return 'html2canvas';
          }

          if (id.includes('lodash') || id.includes('date-fns') || id.includes('uuid') || id.includes('nanoid')) {
            return 'utils';
          }

          if (id.includes('jspdf') || id.includes('pdf-lib') || id.includes('pdfjs')) {
            return 'pdf';
          }

          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:59201',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Handle SPA routing for production and network access
  preview: {
    port: 5173,
    host: '0.0.0.0',
  }
});
