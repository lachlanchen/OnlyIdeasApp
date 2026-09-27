// Build from installed sources so our dependency fixes reach the shipped reader.
// The upstream es5/bundle.js embeds its own older parser and ignores overrides.
import { build } from 'esbuild'
await build({
  // A non-strict CommonJS entry preserves MathJax's isolated legacy AsciiMath
  // module. Hoisting the upstream entry's strict directive breaks that module.
  stdin: { contents: 'require("mathpix-markdown-it/lib/bundle.js")', resolveDir: process.cwd(), sourcefile: 'document-renderer.cjs' },
  bundle: true, platform: 'browser', format: 'iife',
  target: ['safari15', 'chrome95'], alias: { path: 'path-browserify' },
  define: { global: 'globalThis', 'process.env.NODE_ENV': '"production"' },
  outfile: '.generated/document-math.js', minify: true, legalComments: 'eof',
})
