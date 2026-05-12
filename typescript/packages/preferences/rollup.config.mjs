import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'node:fs';
import filesize from 'rollup-plugin-filesize';


const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default {
    input: 'src/index.ts',
    output: {
        file: pkg.main.replace('./', ''),
        format: 'es',
        sourcemap: true
    },
    plugins: [
        nodeResolve({
            exportConditions: ['import', 'module', 'default']
        }),
        commonjs(),
        typescript({ tsconfig: './tsconfig.rollup.json' }),
        filesize()
    ]
};
