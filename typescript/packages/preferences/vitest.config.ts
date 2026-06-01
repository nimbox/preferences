import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            // Report on every source file, not just the ones a test
            // happens to import, so untested modules show as 0%.
            all: true,
            include: ['src/**'],
            exclude: [
                'src/generated/**',   // auto-generated from JSON schemas
                'src/index.ts',       // re-exports only
                'src/types.ts',       // type-only, no runtime code
                '**/*.test.ts'
            ],
            reporter: ['text', 'html']
        }
    }
});
