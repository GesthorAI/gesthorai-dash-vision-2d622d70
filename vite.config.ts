import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',

    // Optimize chunk size
    chunkSizeWarningLimit: 1000,

    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.debug'] : [],
      },
    },

    // Source maps for production debugging (can disable to reduce size further)
    sourcemap: mode !== 'production',

    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks - split by major libraries
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }

            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }

            // TanStack Query
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }

            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }

            // Charts
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }

            // Form libraries
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
              return 'vendor-forms';
            }

            // Icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            // Other node_modules
            return 'vendor-other';
          }

          // Split by feature/page
          if (id.includes('/pages/Dashboard/')) {
            const match = id.match(/\/pages\/Dashboard\/(\w+)/);
            if (match) {
              return `page-${match[1].toLowerCase()}`;
            }
          }

          if (id.includes('/pages/Settings/')) {
            return 'pages-settings';
          }

          // Components chunks
          if (id.includes('/components/')) {
            // Group related components
            if (id.includes('/components/ui/')) {
              return 'components-ui';
            }
            if (id.includes('/components/Charts/')) {
              return 'components-charts';
            }
            if (id.includes('/components/AI/')) {
              return 'components-ai';
            }
            if (id.includes('/components/Security/')) {
              return 'components-security';
            }
            if (id.includes('/components/Leads/')) {
              return 'components-leads';
            }
          }

          // Hooks
          if (id.includes('/hooks/')) {
            return 'hooks';
          }

          // Utils
          if (id.includes('/utils/') || id.includes('/lib/')) {
            return 'utils';
          }
        },

        // Asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }

          if (/woff2?|ttf|eot/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }

          return `assets/[name]-[hash][extname]`;
        },

        // Chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
    ],
  },
}));
