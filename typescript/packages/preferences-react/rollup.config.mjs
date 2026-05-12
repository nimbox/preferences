import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'node:fs';
import filesize from 'rollup-plugin-filesize';


const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const externalIds = [
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.dependencies ?? {})
];

const external = (id) =>
    externalIds.some((dep) => id === dep || id.startsWith(`${dep}/`));


export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.js',
        format: 'es',
        sourcemap: true
    },
    external,
    plugins: [
        nodeResolve({
            exportConditions: ['import', 'module', 'default'],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
        }),
        commonjs(),
        typescript({ tsconfig: './tsconfig.build.json' }),
        filesize()
    ]
};
