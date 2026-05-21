import type { StorybookConfig } from '@storybook/react-vite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { mergeConfig } from 'vite';


/**
 * Resolve the absolute path of a package (needed for Yarn PnP / monorepos).
 */
function getAbsolutePath(value: string) {

    return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));

}

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [],
    framework: getAbsolutePath('@storybook/react-vite'),
    async viteFinal(viteConfig) {

        const reactRoot = getAbsolutePath('react');
        const reactDomRoot = getAbsolutePath('react-dom');

        return mergeConfig(viteConfig, {
            resolve: {
                dedupe: ['react', 'react-dom'],
                alias: {
                    react: reactRoot,
                    'react-dom': reactDomRoot
                }
            },
            optimizeDeps: {
                include: ['react/jsx-runtime', 'react/jsx-dev-runtime']
            }
        });

    }
};
export default config;
