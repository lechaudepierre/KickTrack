import { defineConfig } from 'vitest/config';

export default defineConfig({
    // Résout les alias `@/…` du tsconfig nativement (plus besoin de plugin).
    resolve: {
        tsconfigPaths: true,
        alias: {
            // Voir test/server-only-stub.ts pour le pourquoi.
            'server-only': new URL('./test/server-only-stub.ts', import.meta.url).pathname,
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
