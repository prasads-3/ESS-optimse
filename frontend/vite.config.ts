import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },



    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    allowedHosts: ["ess.miraki.in"]
  },
  plugins: [
    react(),
    visualizer({ open: false, gzipSize: true }),
    visualizer({ open: false, gzipSize: true, template: 'raw-data', filename: 'stats.json' }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Dev-only: pre-bundle leaflet (a CommonJS dep) so the dev server doesn't
  // re-optimize mid-session. Has no effect on the production `vite build`.
  optimizeDeps: {
    include: ['leaflet'],
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    minify: 'esbuild',
    sourcemap: false,

    // Allow Rollup to transform packages that mix require()/import in one file
    // (jspdf, xlsx, dompurify, leaflet, …). Safe interop hardening.
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // By default Vite emits <link rel="modulepreload"> in index.html for every
    // chunk reachable from the entry — including async ones — which forces
    // every page to download e.g. the 492 KB exports chunk just because some
    // route uses it. Restrict HTML preloads to first-paint-critical chunks;
    // async chunks load on demand via their dynamic import as usual.
    modulePreload: {
      resolveDependencies: (_filename, deps, { hostType }) => {
        if (hostType !== 'html') return deps;
        const heavyAsync = ['exports', 'charts', 'maps', 'vendor-motion', 'vendor-tus'];
        return deps.filter(d => !heavyAsync.some(name => d.includes(`/${name}-`) || d.includes(`/${name}.`)));
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite/Rollup runtime + CommonJS-interop helpers must ride with
          // vendor-react (the root chunk every page already loads). If they land
          // in a heavy lib chunk instead, the catch-all `vendor` imports them back
          // and forms a vendor<->charts<->exports import CYCLE. Under a cycle a
          // `class X extends Base` can execute before `Base` is initialised in the
          // other chunk -> "Class extends value undefined is not a constructor or
          // null" (white screen). Pinning shared helpers to the root keeps the
          // cross-chunk graph a strict DAG, which makes that crash impossible.
          if (
            id.includes('vite/preload-helper') ||
            id.includes('vite/dynamic-import-helper') ||
            id.includes('commonjsHelpers') ||
            id.includes('commonjs-dynamic-modules')
          ) return 'vendor-react';
          if (!id.includes('node_modules')) return;
          const n = id.split('\\').join('/');
          // pako/fflate (de/compression) are imported by BOTH an eagerly-loaded
          // module in `vendor` (a PNG decoder) and the lazy `exports` chunk (xlsx).
          // If they live in `exports`, `vendor` imports `exports` back -> cycle.
          // Pin them to the root vendor-react so both consumers depend downward
          // only. (They were already pulled in eagerly via that back edge, so this
          // costs no extra first-paint bytes — it just removes the cycle.)
          if (n.match(/node_modules\/(pako|fflate)\//)) return 'vendor-react';
          // Order matters: most specific first. Radix/lucide/tanstack all contain
          // the substring "react", so they must be matched before the react check.

          // PDF/Excel + their transitive deps (html2canvas, canvg, pako pull in 160 KB gzip).
          // IMPORTANT: canvg's SVG cluster (svg-pathdata, rgbcolor, stackblur-canvas, raf) and
          // jspdf-autotable MUST stay in this chunk too. canvg defines
          // `class PathParser extends SVGPathData`; if svg-pathdata leaks into the catch-all
          // `vendor` chunk, the exports<->vendor import cycle leaves the base class undefined at
          // eval time -> "Class extends value undefined is not a constructor or null".
          if (n.match(/node_modules\/(jspdf-autotable|jspdf|xlsx|html2canvas|canvg|svg-pathdata|rgbcolor|stackblur-canvas|raf|cfb|crc-32|adler-32|codepage|frac|ssf|wmf|stardazed|raw-loader)\//)) return 'exports';
          // Recharts + its d3/lodash/decimal deps
          if (n.match(/node_modules\/(recharts|recharts-scale|d3-[\w-]+|victory-vendor|react-smooth|decimal\.js-light|fast-equals|eventemitter3)\//)) return 'charts';
          if (n.includes('/lodash/') || n.includes('/lodash-es/')) return 'charts'; // lodash is dragged in by recharts
          if (n.includes('/leaflet/') || n.includes('/react-leaflet/') || n.includes('/@react-leaflet/')) return 'maps';

          // Animation libs: hefty (~120 KB gzip) and only used by landing/login/super-admin surfaces.
          if (n.includes('/framer-motion/') || n.includes('/motion-dom/') || n.includes('/motion-utils/')) return 'vendor-motion';

          // Tus client: only loaded when an upload dialog is opened. Keep out of the catch-all
          // so the entry's modulepreload graph doesn't drag it in.
          if (n.includes('/tus-js-client/') || n.includes('/js-base64/')) return 'vendor-tus';

          // Socket.io client (+ engine.io): only used by the field-task realtime hooks.
          // Isolate it so it doesn't bloat the shared `vendor` chunk on every route.
          if (n.match(/node_modules\/(socket\.io-client|engine\.io-client|socket\.io-parser|engine\.io-parser)\//)) return 'vendor-socket';

          if (n.includes('/@radix-ui/') || n.includes('/lucide-react/')) return 'vendor-ui';
          if (n.includes('/@tanstack/')) return 'vendor-query';
          if (n.match(/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@remix-run\/router|@floating-ui)\//)) return 'vendor-react';
          return 'vendor';
        }
      },
    },
  },
}));
