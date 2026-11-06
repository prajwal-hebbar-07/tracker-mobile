// Bundles the CLI, @logbook/core, Ink and React into one file: the only thing a release ships.
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'

const { version } = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))

await build({
  entryPoints: ['src/main.tsx'],
  outfile: 'dist/logbook.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  jsx: 'automatic',
  minify: true,
  legalComments: 'none',
  define: { __VERSION__: JSON.stringify(version), 'process.env.NODE_ENV': '"production"' },
  // Ink can attach React DevTools while developing; the shipped CLI never does, so that module is left out.
  plugins: [
    {
      name: 'no-ink-devtools',
      setup(bundle) {
        bundle.onResolve({ filter: /^\.\/devtools\.js$/ }, ({ importer }) =>
          importer.includes('/ink/') ? { path: 'ink-devtools', namespace: 'stub' } : undefined,
        )
        bundle.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export {}' }))
      },
    },
  ],
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
})
console.log(`Built dist/logbook.mjs (${version})`)
