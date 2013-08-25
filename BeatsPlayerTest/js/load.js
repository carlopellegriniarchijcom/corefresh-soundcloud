//
// Configure SoundManager2's Flash Fallback Settings
//
soundManager.setup({
  url: 'js/sm2/swf/',
  flashVersion: 9
});


//
// Ensure that required components are loaded before
// application initialization.
//
Modernizr.load(
  {
    test: window.JSON,
    nope: 'js/fills/json2.js'
  }/*,
  {
    test: Modernizr.audio,
    yep: 'js/aarons-player/player.js',
    nope: 'js/aarons-player/flash-player.js',
    complete: function() {
      
      var ap = window.AaronsPlayer;
      if (ap.state && ap.state.error instanceof Error) {
        if (typeof(window.console) === 'object' && $.isFunction(window.console.debug)) {
          window.console.debug(ap.state.error.toString());
        }
        window.alert(ap.state.error.message);
      }
    }
  }*/
);