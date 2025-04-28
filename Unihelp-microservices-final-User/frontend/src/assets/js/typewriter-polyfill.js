/**
 * Simple typewriter polyfill to handle missing references
 */
(function($) {
  $.fn.typewriter = function(options) {
    console.log('Typewriter plugin called but using polyfill');
    // Do nothing - this is just a stub to prevent errors
    return this; // Return jQuery object for chaining
  };
})(jQuery);
