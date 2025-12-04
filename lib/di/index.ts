// ================================
// Dependency Injection Exports
// ================================
// Barrel export for DI container
// SERVER-ONLY: DI container and providers are server-only

import 'server-only';

export { container } from './container';
export { setupDI, getService } from './providers';

