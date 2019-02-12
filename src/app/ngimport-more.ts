import { module, ILocationProvider } from 'angular';
import { $q } from 'ngimport';

/**
 * More ngimports (following the ngimport pattern from https://github.com/bcherny/ngimport).
 *
 * This allows us to break out of the old-style Angular DI and make normal JS modules. As usual,
 * these references will be invalid until Angular bootstraps.
 */

// ngToaster
export let toaster: any;
export let $locationProvider: ILocationProvider;

// prevent double-loading, which has the potential
// to prevent sharing state between services
export default module('dim/ngimport', [])
  .run([
    '$injector',
    ($i: angular.auto.IInjectorService) => {
      toaster = $i.get('toaster');

      // This hack makes sure that the toaster always gets run in a digest so it'll show up, but
      // callers don't need to call $apply.
      const originalPop = toaster.pop;
      toaster.pop = (...args) => {
        $q.resolve().then(() => {
          originalPop.call(toaster, ...args);
        });
      };
    }
  ])
  .config([
    '$locationProvider',
    ($lp) => {
      $locationProvider = $lp;
    }
  ]).name;
