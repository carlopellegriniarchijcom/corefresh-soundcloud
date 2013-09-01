(function($, undefined) {
  
  var MIN_TIME = Math.ceil(1000 / 60 * 2);
  var DEFAULT_TIME = 2000;
  var DEFAULT_MIN_OPACITY = 0.5;
  var DEFAULT_MAX_OPACITY = 1;
  var PULSE_OUT = 'out';
  var PULSE_IN = 'in';
  
  function isSafeNumber(n, /* optional */ min_value, /* optional */ max_value) {
    if (arguments.length === 1) {
      return (n === n && isFinite(n));
    } else if (arguments.length === 2) {
      if (isSafeNumber(n)) {
        if (isSafeNumber(min_value)) {
          return (n >= min_value);
        }
        else {
          return true;
        }
      }
      else {
        return false;
      }
    } else if (arguments.length === 3) {
      if (isSafeNumber(n, min_value)) {
        if (isSafeNumber(max_value)) {
          return (n <= max_value);
        }
        else {
          return true;
        }
      }
      else {
        return false;
      }
    }
    return false;
  }
  
  /**
   * @class The Pulsar class manages the opacity pulse in/out on a DOM element within a jQuery collection.
   * @param {jQuery} el
   * @param {integer} time
   * @param {float} min_opacity
   * @param {float} max_opacity
   */
  function Pulsar(el, time, min_opacity, max_opacity) {
    if (el instanceof jQuery) {
      this.element = el;
    }
    if (isSafeNumber(time, MIN_TIME)) {
      this.time = Math.ceil(time);
    }
    else {
      this.time = DEFAULT_TIME;
    }
    if (isSafeNumber(min_opacity, 0, 1)) {
      this.minimum_opacity = min_opacity;
    }
    else {
      this.minimum_opacity = DEFAULT_MIN_OPACITY;
    }
    if (isSafeNumber(max_opacity, 0, 1)) {
      this.maximum_opacity = max_opacity;
    }
    else {
      this.maximum_opacity = DEFAULT_MAX_OPACITY;
    }
    if (this.minimum_opacity > this.maximum_opacity) {
      var tmp = this.minimum_opacity;
      this.minimum_opacity = this.maximum_opacity;
      this.maximum_opacity = tmp;
    }
    else if (this.minimum_opacity === this.maximum_opacity) {
      this.minimum_opacity = DEFAULT_MIN_OPACITY;
      this.maximum_opacity = DEFAULT_MAX_OPACITY;
    }
    this.delta = 0.01;
  }
  
  /**
   * Utility function for managing the timed pulsing in/out of a Pulsar.
   * @param {Pulsar} p
   */
  Pulsar.timerProc = function(p) {
    
    var pulse_dir = (parseFloat(p.element.css('opacity')) > p.minimum_opacity ? PULSE_OUT : PULSE_IN);
    
    /**
     * Timer callback function
     * @inner
     */
    function callback() {
      if (p.timer_id === 0) {
        return;
      }
      var opacity = parseFloat(p.element.css('opacity'));
      switch (pulse_dir) {
        case PULSE_OUT:
          opacity -= p.delta;
          opacity = Math.max(opacity, p.minimum_opacity);
          if (opacity === p.minimum_opacity) {
            pulse_dir = PULSE_IN;
          }
          break;
        case PULSE_IN:
          opacity += p.delta;
          opacity = Math.min(opacity, p.maximum_opacity);
          if (opacity === p.maximum_opacity) {
            pulse_dir = PULSE_OUT;
          }
      }
      p.element.css('opacity', opacity);
      p.element.children().css('opacity', opacity);
    }
    
    if (!(p instanceof Pulsar)) {
      return;
    }
    if (p.timer_id !== 0 && p.timer_id !== null) {
      return;
    }
    var timeout = Math.round(Math.sqrt(p.time / p.delta) / 10);
    p.timer_id = setInterval(callback, timeout);
    
  };
  
  /**
   * DOM element to pulse.
   * @type {jQuery}
   * @private
   */
  Pulsar.prototype.element = null;
  
  /**
   * The duration of a complete pulse in, and out.
   * @type {integer}
   * @private
   */
  Pulsar.prototype.time = null;
  
  /**
   * Minimum opacity value.
   * @type {float}
   * @private
   */
  Pulsar.prototype.minimum_opacity = null;
  
  /**
   * Maximum opacity value.
   * @type {float}
   * @private
   */
  Pulsar.prototype.maximum_opacity = null;
  
  /**
   * Calculated opacity delta for each timer callback.
   * @type {float}
   * @private
   */
  Pulsar.prototype.delta = null;
  
  /**
   * Timer ID.
   * @type {integer}
   * @private
   */
  Pulsar.prototype.timer_id = null;
  
  /**
   * Start the pulsing animation.
   */
  Pulsar.prototype.start = function() {
    if (this.element === null) {
      return;
    }
    Pulsar.timerProc(this);
  };
  
  /**
   * Stop the pulsing animation.
   */
  Pulsar.prototype.stop = function() {
    if (this.element === null || this.timer_id === 0) {
      return;
    }
    clearInterval(this.timer_id);
    this.timer_id = 0;
    
    // Restore full opacity to the element.
    this.element.css('opacity', 1);
  };
  
//
// jQuery Plugin Code
//
  $.fn.extend({
    
    /**
     * The pulse jQuery Plugin Function.
     * The initialization options are as follows:
     * <ul>
     *   <li>autoStart:Boolean = true</li>
     *   <li>pulseTime:integer = 2000</li>
     *   <li>opacityMin:float = 0.5</li>
     *   <li>opacityMax:float = 1</li>
     * </ul>
     * If no arguments are provided then the default options are used, and the pulse animation starts.
     * @param {string|Object} arg0 Either the operation to perform ('start' or 'stop'), or an initialization options Object.
     * @returns {jQuery}
     */
    pulse: function(/* [operation:string | options:Object] */ arg0) {

      var DATA_KEY = 'Pulsar';
      var operation = '';
      var defaults = {
        autoStart: true,
        pulseTime: 2000,
        opacityMin: 0.5,
        opacityMax: 1
      };
      
      if (arguments.length > 0) {
        if (typeof(arg0) === 'string') {
          operation = arg0;
        } else if (typeof(arg0) === 'object' && arg0 !== null) {
          defaults = $.extend(defaults, arg0);
        }
      }
      
      this.each(function() {
        
        var $this = $(this);
        var p = null;
        
        switch (operation) {
          case 'stop':
            
            if ($this.data(DATA_KEY) === undefined) {
              return;
            }
            p = $this.data(DATA_KEY);
            
            if (p instanceof Pulsar) {
              p.stop();
            }
            break;
            
          case 'start':
            
            if ($this.data(DATA_KEY) === undefined) {
              p = new Pulsar($this, defaults.pulseTime, defaults.opacityMin, defaults.opacityMax);
              $this.data(DATA_KEY, p);
              p.start();
            }
            else {
              p = $this.data(DATA_KEY);
              if (p instanceof Pulsar) {
                p.start();
              }
            }
            break;
            
          default:
            p = new Pulsar($this, defaults.pulseTime, defaults.opacityMin, defaults.opacityMax);
            $this.data(DATA_KEY, p);
            if (defaults.autoStart === true) {
              p.start();
            }
        }
      });
      
      return this;
    }
  });
})(jQuery);