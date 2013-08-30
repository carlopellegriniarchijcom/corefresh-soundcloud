/**
 * @fileDescription jquery.restrain.js is a custom jQuery Plugin for restraining a block of 
 *                  text, or HTML within an element's horizontal, and vertical area
 */
(function($, undefined) {
  
  function wordWidth(word) {
    var div = $('<div/>').css({
      width: 'auto',
      height: this.height(),
      fontSize: this.css('font-size'),
      fontWeight: this.css('font-weight'),
      letterSpacing: this.css('letter-spacing'),
      wordSpacing: this.css('word-spacing'),
      fontFamily: this.css('font-family'),
      fontStyle: this.css('font-style'),
      visibility: 'hidden',
      whiteSpace: 'nowrap'
    });
    
    div.text(word);
    $('body').append(div);
    var width = div.width();
    div.remove();
    
    // #debug
    console.debug('word width: ', width);
    return width;
  }
  
  function measurement(prop_name) {
    return {
      measure: parseFloat(this.css(prop_name)),
      units: this.css(prop_name).replace(/-?\d+(?:\.\d+)*/, '')
    };
  }
  
  function convertEmsToPixels(measurement) {
    
    var PIXELS = 16;
    if (measurement.units === 'px') {
      return measurement;
    }
    measurement.measure *= PIXELS;
    return measurement;
  }
  
  $.fn.extend({
    
    restrain: function() {
     
      return this.each(function() {
        
        var $this = $(this);
        var txt = $this.text();
        var split_txt = txt.split(/\s+/);
        var parent_width = $this.parent().width();
        var parent_offset = $this.parent().offset();
        var offset = $this.offset();
        var left = offset.left - parent_offset.left;
        var max_width = parent_width - left;
        var word_width = 0;
        var line_width = 0;
        var html = '';
        var line_height = $this.height(); //measurement.call(this, 'line-height');
        var font_size = measurement.call($this, 'font-size');
        
        
        // #debug
        console.debug(txt);
        console.debug(split_txt);
        console.debug('parent_width: ', parent_width);
        console.debug('parent_offset: ', parent_offset);
        console.debug('offset: ', offset);
        console.debug('left: ', left);
        console.debug('max_width: ', max_width);
        
        
        if (font_size.units === 'em') {
          convertEmsToPixels(font_size);
        }
        for (var i = 0, l = split_txt.length; i < l; ++i) {
          
          // Calculate the width in pixels of the current word.
          word_width = wordWidth.call($this, split_txt[i]);
          
          // Add the width of the word to the width of the line.
          line_width += word_width;
          
          // If the width of the line is equal to, or exceeds the maximum width
          // then insert a line break between the previous word, and the
          // current word.
          if (line_width >= max_width) {
            html += '<br>' + split_txt[i];
            
            // Decrease the line height in half, or to the font size.
            // Whichever is greater.
            if (line_height > font_size.measure) {
              line_height = Math.max(font_size.measure, (line_height / 2));
            }
          }
          
          // Append the word to the current line separated by a space.
          else {
            html += ' ' + split_txt[i];
          }
        }
        
        // #debug
        console.debug(html);
        
        $this.text('');
        $this.html(html).css({
          lineHeight: line_height + 'px',
          width: max_width + 'px'
        });
      });
      
    }
  });
  
})(jQuery);