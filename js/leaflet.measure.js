L.Control.Measure = L.Control.extend({
    options : {
        position : 'topleft',
        units : 'feet',
        prevUnits : 'feet'
    },

    onAdd : function(map) {
        var className = 'leaflet-control-zoom leaflet-bar leaflet-control', container = L.DomUtil.create('div', className);

        this._createButton('&#8674;', 'Measure', 'leaflet-control-measure leaflet-bar-part leaflet-bar-part-top-and-bottom', container, this._toggleMeasure, this);

        return container;
    },

    _createButton : function(html, title, className, container, fn, context) {
        var link = L.DomUtil.create('a', className, container);
        link.innerHTML = '';
        // link.innerHTML = html;
        link.href = '#';
        link.title = title;

        L.DomEvent.on(link, 'click', L.DomEvent.stopPropagation).on(link, 'click', L.DomEvent.preventDefault).on(link, 'click', fn, context).on(link, 'dblclick', L.DomEvent.stopPropagation);

        return link;
    },

    _toggleMeasure : function() {
        this._measuring = !this._measuring;

        if (this._measuring) {
            L.DomUtil.addClass(this._container, 'leaflet-control-measure-on');
            this._startMeasuring();
        } else {
            L.DomUtil.removeClass(this._container, 'leaflet-control-measure-on');
            this._stopMeasuring();
        }
    },

    _startMeasuring : function() {
        $('.leaflet-control-measure').html(' ');
        $('.leaflet-control-measure')[0].title = 'Stop Measuring';

        this._oldCursor = this._map._container.style.cursor;
        this._map._container.style.cursor = 'crosshair';

        this._doubleClickZoom = this._map.doubleClickZoom.enabled();
        this._map.doubleClickZoom.disable();

        L.DomEvent.on(this._map, 'mousemove', this._mouseMove, this).on(this._map, 'click', this._mouseClick, this).on(this._map, 'dblclick', this._finishPath, this).on(document, 'keydown', this._onKeyDown, this).on(this._map, 'contextmenu', this._showScaleOptions, this);

        if (!this._layerPaint) {
            this._layerPaint = L.layerGroup().addTo(this._map);
        }

        if (!this._points) {
            this._points = [];
        }

    },

    _stopMeasuring : function() {
        $('.leaflet-control-measure').html('');
        // $('.leaflet-control-measure').html('&#8674');
        $('.leaflet-control-measure')[0].title = 'Measure';
        this._map._container.style.cursor = this._oldCursor;

        L.DomEvent.off(document, 'keydown', this._onKeyDown, this).off(this._map, 'mousemove', this._mouseMove, this).off(this._map, 'click', this._mouseClick, this).off(this._map, 'dblclick', this._mouseClick, this).off(this._map, 'contextmenu', this._showScaleOptions, this);

        if (this._doubleClickZoom) {
            this._map.doubleClickZoom.enable();
        }

        if (this._layerPaint) {
            this._layerPaint.clearLayers();
        }

        this._restartPath();
    },

    _showScaleOptions : function(e) {
        $('.leaflet-popup-content').css('width', '91px');
        var m = this;
        var feet = $('<button>Feet</button>').click(function() {
            m.options.previUnits = m.options.units;
            m.options.units = 'feet';
            m._convertPreviousValues();
        });
        var miles = $('<button>Miles</button>').click(function() {
            m.options.previUnits = m.options.units;
            m.options.units = 'miles';
            m._convertPreviousValues();
        });
        // var meters = $('<button>Meters</button>').click(function(){
        // m.options.units = 'meters';
        // });

        popupContent = $('<div><h4>Change units</h4></div>').append(miles).append(feet);
        this._map.openPopup($(popupContent)[0], e.latlng);
        $('.leaflet-popup-tip-container').hide();
    },

    _convertPreviousValues : function() {
        if (this.options.prevUnits !== this.options.units) {
            var m = this;
            $.each(this._layerPaint._layers, function() {
                if (this._icon) {
                    var icon = this._icon;
                    var dist = icon._distance;
                    var diff = icon._difference;
                    if (m.options.units === 'miles' && m.options.prevUnits === 'feet') {
                        dist = (Math.round((dist * 0.000621371192) * 100) / 100).toFixed(2);
                        diff = (Math.round((diff * 0.000621371192) * 100) / 100).toFixed(2);
                    }
                    if (m.options.units === 'feet' && m.options.prevUnits === 'miles') {
                        dist = (Math.round((dist * 0.000621371192 * 5280) * 100) / 100).toFixed(2);
                        diff = (Math.round((diff * 0.000621371192 * 5280) * 100) / 100).toFixed(2);
                    }
                    $.each($(icon).children(), function(a) {
                        a === 0 ? $(this).html(dist + " " + m.options.units) : $(this).html("(+" + diff + " " + m.options.units + ")");
                    });
                }
            });
            this.options.prevUnits = this.options.units;
        }
    },

    _mouseMove : function(e) {
        if (!e.latlng || !this._lastPoint) {
            return;
        }

        if (!this._layerPaintPathTemp) {
            this._layerPaintPathTemp = L.polyline([this._lastPoint, e.latlng], {
                color : 'black',
                weight : 1.5,
                clickable : false,
                dashArray : '6,3'
            }).addTo(this._layerPaint);
        } else {
            this._layerPaintPathTemp.spliceLatLngs(0, 2, this._lastPoint, e.latlng);
        }

        if (this._tooltip) {
            if (!this._distance) {
                this._distance = 0;
            }

            this._updateTooltipPosition(e.latlng);

            var distance = e.latlng.distanceTo(this._lastPoint);
            this._updateTooltipDistance(this._distance + distance, distance);
        }
    },

    _mouseClick : function(e) {
        // Skip if no coordinates
        if (!e.latlng) {
            return;
        }

        // If we have a tooltip, update the distance and create a new tooltip, leaving the old one exactly where it is (i.e. where the user has clicked)
        if (this._lastPoint && this._tooltip) {
            if (!this._distance) {
                this._distance = 0;
            }

            this._updateTooltipPosition(e.latlng);

            var distance = e.latlng.distanceTo(this._lastPoint);
            this._updateTooltipDistance(this._distance + distance, distance);

            this._distance += distance;
        }
        this._createTooltip(e.latlng, distance);

        // If this is already the second click, add the location to the fix path (create one first if we don't have one)
        if (this._lastPoint && !this._layerPaintPath) {
            this._layerPaintPath = L.polyline([this._lastPoint], {
                color : 'black',
                weight : 2,
                clickable : false
            }).addTo(this._layerPaint);
        }

        if (this._layerPaintPath) {
            this._layerPaintPath.addLatLng(e.latlng);
        }

        // Upate the end marker to the current location
        if (this._lastCircle) {
            this._layerPaint.removeLayer(this._lastCircle);
        }

        this._lastCircle = new L.CircleMarker(e.latlng, {
            color : 'black',
            opacity : 1,
            weight : 1,
            fill : true,
            fillOpacity : 1,
            radius : 2,
            clickable : this._lastCircle ? true : false
        }).addTo(this._layerPaint);

        this._lastCircle.on('click', function() {
            this._finishPath();
        }, this);

        // Save current location as last location
        this._lastPoint = e.latlng;
    },

    _finishPath : function() {
        // Remove the last end marker as well as the last (moving tooltip)
        if (this._lastCircle) {
            this._layerPaint.removeLayer(this._lastCircle);
        }
        if (this._tooltip) {
            this._layerPaint.removeLayer(this._tooltip);
        }
        if (this._layerPaint && this._layerPaintPathTemp) {
            this._layerPaint.removeLayer(this._layerPaintPathTemp);
        }

        // Reset everything
        this._restartPath();
    },

    _restartPath : function() {
        this._distance = 0;
        this._tooltip = undefined;
        this._lastCircle = undefined;
        this._lastPoint = undefined;
        this._layerPaintPath = undefined;
        this._layerPaintPathTemp = undefined;
    },

    _createTooltip : function(position, difference) {
        var icon = L.divIcon({
            className : 'leaflet-measure-tooltip',
            iconAnchor : [-5, -5],
            _difference : difference
        });
        this._tooltip = L.marker(position, {
            icon : icon,
            clickable : false
        }).addTo(this._layerPaint);
    },

    _updateTooltipPosition : function(position) {
        this._tooltip.setLatLng(position);
    },

    _updateTooltipDistance : function(total, difference) {
        this._tooltip._icon._distance = total;
        this._tooltip._icon._difference = difference;

        var totalRound = this._round(total), differenceRound = this._round(difference);

        var text = '<div class="leaflet-measure-tooltip-total">' + totalRound + ' ' + this.options.units + '</div>';
        if (differenceRound > 0 && totalRound != differenceRound) {
            text += '<div class="leaflet-measure-tooltip-difference">(+' + differenceRound + ' ' + this.options.units + ')</div>';
        }

        this._tooltip._icon.innerHTML = text;
    },

    _round : function(val) {
        var calc;

        if (this.options.units === 'feet')
            calc = (Math.round((val * 0.000621371192 * 5280) * 100) / 100).toFixed(2);
        if (this.options.units === 'miles')
            calc = (Math.round((val * 0.000621371192) * 100) / 100).toFixed(2);
        // if(this.options.units==='meters')
        // calc = Math.round((val / 1852) * 10) / 10;

        // convert meters to miles
        // return (Math.round((val * 0.000621371192) * 100) / 100).toFixed(2);

        // convert meters to feet
        // return (Math.round((val * 0.000621371192 * 5280) * 100) / 100).toFixed(2);

        // this would return meters (nm?)
        // return Math.round((val / 1852) * 10) / 10;

        return calc;
    },

    _onKeyDown : function(e) {
        if (e.keyCode == 27) {
            // If not in path exit measuring mode, else just finish path
            if (!this._lastPoint) {
                this._toggleMeasure();
            } else {
                this._finishPath();
            }
        }
    }
});

L.Map.mergeOptions({
    measureControl : false
});

L.Map.addInitHook(function() {
    if (this.options.measureControl) {
        this.measureControl = new L.Control.Measure();
        this.addControl(this.measureControl);
    }
});

L.control.measure = function(options) {
    return new L.Control.Measure(options);
};
