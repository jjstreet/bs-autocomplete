/* ========================================================================
 * Bootstrap: autocomplete.js v1.0.3
 * ========================================================================
 * A simple autocomplete widget based heavily on jQuery autocomplete
 *
 * Copyright 2013-2014 Josh Street
 * ======================================================================== */

+function ($) {
    'use strict';
    
    // AUTOCOMPLETE CLASS DEFINITION
    // =============================
    
    var Autocomplete = function (element, options) {
        this.$element = $(element);
        this.options = options;
        this.$menu = $(this.options.menu);
        
        this.renderMenu = this.options.renderMenu || this.renderMenu;
        this.renderItem = this.options.renderItem || this.renderItem;
        
        this.cancelLookup = false;
        
        this.shown = false;
        this.mousedover = false;
        
        this.selectedItem = null;                   // Selected item
        this.previous = null;                       // Previous value of element
        this.lookupTimeout = null;                  // Callback for delayed delayLookup
        this.query = null;
        
        this.pending = 0;
        this.requestIndex = 0;
        
        this.suppressKeyPress = false;
        this.suppressKeyPressRepeat = false;
        this.suppressInput = false;
        
        this.init();
    };
    
    /*
     * Source: Accepts a number of types of arguments:
     *     Array: An array of strings [ "Choice 1", "Choice 2", ... ]
     *     Array: An array of objects with label and value properties
     *         [ {label: "Label 1", value: "value1"}, ... ]
     *     Function: A callback that provides json data. The callback is
     *         in the form callback(query, response) where
     *         "query": a single string representing the value in the
     *             text field
     *         "response": a callback that expects a single array of
     *             suggestions to user in one of the above two forms.
     *         Note, response must always be called even in the event of
     *         an error to maintain proper widget state.
     */
    
    Autocomplete.DEFAULTS = {
        source: [],
        menu: '<ul class="autocomplete"></ul>',
        item: '<li><a href="#"></a></li>',
        minLength: 2,
        delay: 300,
        autoFocus: true
    };
    
    Autocomplete.prototype.init = function () {
        this.$element.parent()
            .addClass('dropdown');
            
        this.$element
                .addClass('autocomplete-input')
                .attr('autocomplete', 'off');
                
        this.$element
                .on('keydown', $.proxy(this.keydown, this))
                .on('keypress', $.proxy(this.keypress, this))
                .on('input', $.proxy(this.input, this))
                .on('focus', $.proxy(this.focus, this))
                .on('blur', $.proxy(this.blur, this));
                
        this.$menu
                .on('click', $.proxy(this.click, this))
                .on('mouseenter', 'li', $.proxy(this.mouseenter, this))
                .on('mouseleave', 'li', $.proxy(this.mouseleave, this));
        
        this._initSource();
    }
    
    Autocomplete.prototype._initSource = function () {
        function escapeRegex(value) {
            return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
        }
        
        function filter(array, term) {
            var matcher = new RegExp(escapeRegex(term), "i");
            return $.grep(array, function (value) {
                return matcher.text(value.label || value.value || value);
            });
        }
    
        var array, url;
        var _this = this;
        if ($.isArray(this.options.source)) {
            array = this.options.source;
            this.source = function(query, response) {
                response(filter(array, query));
            };
        }
        else if (typeof this.options.source === 'string') {
            url = this.options.source;
            this.source = function (query, response) {
                if (_this.xhr)
                    _this.xhr.abort();
                _this.xhr = $.ajax({
                    url: url,
                    type: 'get',
                    dataType: 'json',
                    data: {query: query},
                    success: function (json) {
                        response(json);
                    },
                    error: function () {
                        response([]);
                    }
                });
            };
        }
        else {
            this.source = this.options.source;
        }
    };
    
    Autocomplete.prototype.keydown = function (event) {
        if (this.$element.prop('readOnly')) {
            this.suppressKeyPress = true;
            this.suppressInput = true;
            this.suppressKeyPressRepeat = true;
            return;
        }
        
        this.suppressKeyPress = false;
        this.suppressInput = false;
        this.suppressKeyPressRepeat = false;
        
        switch (event.keyCode) {
            case 38:            // up arrow
                this.suppressKeyPress = true;
                this._keyEvent('previous', event);
                break;
            case 40:            // down arrow
                this.suppressKeyPress = true;
                this._keyEvent('next', event);
                break;
            case 13:            // enter
            case 108:           // keypad enter
                if (this.shown) {
                    this.suppressKeyPress = true;
                    event.preventDefault();
                    this.select(event);
                    // try and select
                }
                break;
            case 9:             // tab
                if (this.shown) {
                    this.select(event);
                }
                break;
            case 27:            // escape
                if (this.shown) {
                    this.$element.val(this.query);
                    this.hide(event);
                    event.preventDefault();
                }
                break;
            default:
                this.suppressKeyPressRepeat = true;
                this.delayLookup(event);
                break;
        }
    };
    
    Autocomplete.prototype.keypress = function (event) {
        if (this.suppressKeyPress) {
            this.suppressKeyPress = false;
            if (this.shown)
                event.preventDefault();
            return;
        }
        if (this.suppressKeyPressRepeat)
            return;
        switch (event.keyCode) {
            case 38:            // up
                this._keyEvent('previous', event);
                break;
            case 40:            // down
                this._keyEvent('next', event);
                break;
        }
    };
    
    Autocomplete.prototype.input = function (event) {
        if (this.suppressInput) {
            this.suppressInput = false;
            event.preventDefault();
            return;
        }
        this.delayLookup(event);
    };
    
    Autocomplete.prototype.focus = function (event) {
        this.selectedItem = null;
        this.previous = this.$element.val();
    };
    
    Autocomplete.prototype.blur = function (event) {
        if (!this.mousedover) {
            clearTimeout(this.lookupTimeout);
            this.change(event);
            this.hide(event);
        }
    };
    
    Autocomplete.prototype.click = function (event) {
        this.select(event);
        this.$element.focus();
        event.stopPropagation();
        event.preventDefault();
    };
    
    Autocomplete.prototype.mouseenter = function (event) {
        this.mousedover = true;
        this.$menu.find('.active').removeClass('active');
        $(event.currentTarget).addClass('active');
    };
    
    Autocomplete.prototype.mouseleave = function (event) {
        this.mousedover = false;
    };
    
    
    Autocomplete.prototype._keyEvent = function(dir, event) {
        if (this.shown) {
            if (/^previous/.test(dir))
                this._prev();
            else if (/^next/.test(dir))
                this._next();
            event.preventDefault();
        }
    }
    
    Autocomplete.prototype._prev = function () {
        var $active = this.$menu.find('.active').removeClass('active');
        var $prev = $active.prev();
        if (!$prev.length)
            $prev = this.$menu.find('li').last();
        $prev.addClass('active');
    };
    
    Autocomplete.prototype._next = function () {
        var $active = this.$menu.find('.active').removeClass('active');
        var $next = $active.next();
        if (!$next.length)
            $next = this.$menu.find('li').first();
        $next.addClass('active');
    };
    
    Autocomplete.prototype.destroy = function () {
        this.$element.data('bs.autocomplete', null)
        this.$element
                .off('keydown')
                .off('keypress')
                .off('input')
                .off('focus')
                .off('blur')
        this.$menu.remove();
    };
    
    Autocomplete.prototype.delayLookup = function (event) {
        var _this = this;
        clearTimeout(this.lookupTimeout);
        function handleLookup() {
            // only lookup if we've changed what we will be querying for
            if (_this.query !== _this.$element.val()) {
                this.selectedItem = null;
                _this.lookup(null, event);
            }
        }
        this.lookupTimeout = setTimeout(handleLookup, this.options.delay || 0);
    };
    
    Autocomplete.prototype.lookup = function (query, event) {
        query = query != null ? query : this.$element.val();
        // Save actual value, not the one passed in
        this.query = this.$element.val();
            
        if (query.length < this.options.minLength)
            return this.hide(event);
            
        if (this._trigger('lookup', event) === false)
            return;
        return this._lookup(query);
    };
    
    Autocomplete.prototype._lookup = function (query) {
        this.pending++;
        this.$element.addClass('autocomplete-loading');
        this.cancelLookup = false;
        this.source(query, this._response());
    };
    
    Autocomplete.prototype._response = function () {
        var index = ++this.requestIndex;
        
        return $.proxy(function (items) {
            if (index === this.requestIndex)
                this.__response(items);
            this.pending--;
            if (!this.pending)
                this.$element.removeClass('autocomplete-loading');
        }, this);
    };
    
    Autocomplete.prototype.__response = function (items) {
        // Normalize the items
        if (items)
            items = this._normalize(items);
        // Let listeners known we have items
        this._trigger('response', null, {items: items});
        if (items && items.length && !this.cancelLookup) {
            this.renderMenu(items).show();
        }
        else {
            // dont cancel future searches
            this._hide();
        }
    };
    
    Autocomplete.prototype._normalize = function (items) {
        // Normalizes items so that we are guaranteed to have
        // a label and value to work with. Also, assume that
        // all items are good if the first one was.
        if (items.length && items[0].label && items[0].value)
            return items;
        return $.map(items, function (item) {
            if (typeof item === 'string') {
                return {
                        label: item,
                        value: item
                };
            }
            return $.extend({
                    label: item.label || item.value,
                    value: item.value || item.label
            }, item);
        });
    };
    
    Autocomplete.prototype.renderMenu = function (items) {
        var _this = this;
        items = $(items).map(function (i, item) {
            return $(_this.renderItem(item))
                    .data('bs.autocomplete-item', item);
        });
        this.$menu.html(items.get());
        return this;
    };
    
    Autocomplete.prototype.renderItem = function (item) {
        var $elem = $(this.options.item);
        $elem.find('a').html(item.label);
        return $elem;
    };
    
    Autocomplete.prototype.show = function () {
        var pos = $.extend({}, this.$element.position(), {
                height: this.$element[0].offsetHeight
        });
        
        this.$menu
                .insertAfter(this.$element)
                .css({
                        top: pos.top + pos.height,
                        left: pos.left
                })
                .show();
                
        // If we autoFocus, then get activate first option
        if (this.options.autoFocus)
            this._next();
        this._trigger('shown');
        this.shown = true;
        return this;
    };
    
    Autocomplete.prototype.hide = function (event) {
        this.cancelLookup = true;
        return this._hide(event);
    };
    
    Autocomplete.prototype._hide = function (event) {
        if (this.shown) {
            this.$menu.hide();
            this.shown = false;
            this._trigger('hidden', event);
        }
        return this;
    };
    
    Autocomplete.prototype.change = function (event) {
        if (this.previous !== this.$element.val()) {
            this._trigger("changed", event, {item: this.selectedItem});
        }
    };
    
    Autocomplete.prototype.select = function (event) {
        var item = this.$menu.find('.active').data('bs.autocomplete-item');
        this.previous = this.$element.val();
        this.$element.val(item.value);
        this.query = this.$element.val();
        this._trigger('selected', event, {item: item});
        this.hide();
        this.selectedItem = item;
        return this;
    };
    
    Autocomplete.prototype._trigger = function (type, event, data) {
        var prop, orig;
        
        data = data || {};
        event = $.Event(event);
        event.type = type + '.bs.autocomplete';
        event.target = this.$element[0];
        orig = event.originalEvent;
        if (orig) {
            for (prop in orig) {
                if (!(prop in event)) {
                    event[prop] = orig[prop];
                }
            }
        }
        
        this.$element.trigger(event, data);
        return !event.isDefaultPrevented();
    }
    
    // AUTOCOMPLETE PLUGIN DEFINITION
    // ==============================
    
    var old = $.fn.autocomplete;
    
    $.fn.autocomplete = function(option) {
        var arg = arguments;
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('bs.autocomplete')
            var options = $.extend({}, Autocomplete.DEFAULTS, $this.data(), typeof option == 'object' && option);
            if (!data)
                $this.data('bs.autocomplete', (data = new Autocomplete(this, options)));
            if (typeof option == 'string')
                if (arg.length > 1) 
                    data[option].apply(data, Array.prototype.slice.call(arg, 1));
                else
                    data[option]();
        });
    };
    
    $.fn.autocomplete.Constructor = Autocomplete;
    
    // AUTOCOMPLETE NO CONFLICT
    // ========================
    
    $.fn.autocomplete.noConflict = function () {
        $.fn.autocomplete = old;
        return this;
    };
    
    $(document).on('focus.bs.autocomplete.data-api', '[data-provide="autocomplete"]', function () {
        var $this = $(this);
        if ($this.data('bs.autocomplete'))
            return;
        $this.autocomplete($this.data());
    });
}(jQuery);
