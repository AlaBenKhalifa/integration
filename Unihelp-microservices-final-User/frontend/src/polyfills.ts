/***************************************************************************************************
 * Load `$localize` - used if i18n tags appear in Angular templates.
 */
import 'zone.js';  // Included with Angular CLI.

// Fixes for StompJS and Node.js modules in Angular
(window as any).global = window;
(window as any).process = {
  env: { DEBUG: undefined },
};

(window as any).Buffer = (window as any).Buffer || require('buffer').Buffer;
