import { defineWorkspace } from 'vitest/config';

/**
 * Monorepo test workspace. Each package owns its environment:
 *  - shared / functions → node
 *  - web                → jsdom + Testing Library
 */
export default defineWorkspace(['packages/shared', 'apps/functions', 'apps/web']);
