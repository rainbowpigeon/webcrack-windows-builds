import esbuild from 'esbuild';

const babelImportPlugin = {
  name: 'babel-import',
  setup: (build) => {
    build.onResolve({ filter: /^@babel\/(traverse|generator)$/ }, (args) => ({
      path: args.path,
      namespace: 'babel-import',
    }));

    build.onLoad({ filter: /.*/, namespace: 'babel-import' }, (args) => ({
      resolveDir: 'node_modules',
      contents: `import module from '${args.path}/lib/index.js';
        export default module.default ?? module;
        export * from '${args.path}/lib/index.js';`,
    }));
  },
};

const commonOptions = {
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['isolated-vm', '@babel/preset-typescript/package.json'],
  plugins: [babelImportPlugin],
  logLevel: 'info',
};

await esbuild.build({
  ...commonOptions,
  target: 'node22',
  outfile: 'dist/cli-package.cjs',
});

await esbuild.build({
  ...commonOptions,
  target: 'node14.15.3',
  banner: {
    js: `if (!Array.prototype.at) {
      Object.defineProperty(Array.prototype, 'at', {
        value: function at(index) {
          const n = Number(index);
          if (Number.isNaN(n)) return undefined;
          const i = Math.trunc(n);
          const k = i < 0 ? this.length + i : i;
          if (k < 0 || k >= this.length) return undefined;
          return this[k];
        },
        configurable: true,
        writable: true,
      });
    }
    if (!String.prototype.replaceAll) {
      Object.defineProperty(String.prototype, 'replaceAll', {
        value: function replaceAll(search, replacement) {
          if (search instanceof RegExp) {
            if (!search.global) {
              throw new TypeError('String.prototype.replaceAll called with a non-global RegExp argument');
            }
            return this.replace(search, replacement);
          }
          return this.split(String(search)).join(String(replacement));
        },
        configurable: true,
        writable: true,
      });
    }`,
  },
  outfile: 'dist/cli-package-nexe.cjs',
});
