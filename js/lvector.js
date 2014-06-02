(function(a) {
    a.lvector = {
        VERSION : "1.4.0",
        noConflict : function() {
            a.lvector = this._originallvector;
            return this
        },
        _originallvector : a.lvector
    }
})(this);
lvector.Layer = L.Class.extend({
    options : {
        fields : "",
        scaleRange : null,
        map : null,
        uniqueField : null,
        visibleAtScale : !0,
        dynamic : !1,
        autoUpdate : !1,
        autoUpdateInterval : null,
        popupTemplate : null,
        popupOptions : {},
        singlePopup : !1,
        symbology : null,
        showAll : !1,
        label : null
    },
    initialize : function(a) {
        L.Util.setOptions(this, a)
    },
    
    onAdd : function(t){
        this.options.map=t;
    },
    
    onRemove : function (t){
        this._clearFeatures();
        // this._container.parentNode.removeChild(this._container);
        // this._container=null;
        t.off({viewreset:this._reset,moveend:this._update},this);
        this.options.map=null;
    },
    
    setMap : function(a) {
        if (!a || !this.options.map)
            if (a) {
                this.options.map = a;
                if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2) {
                    var a = this.options.map.getZoom(), b = this.options.scaleRange;
                    this.options.visibleAtScale = a >= b[0] && a <= b[1]
                }
                this._show()
            } else if (this.options.map)
                this._hide(), this.options.map = a
                
            return this;
    },
    getMap : function() {
        return this.options.map
    },
    setOptions : function() {
    },
    _show : function() {
        this._addIdleListener();
        this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2 && this._addZoomChangeListener();
        if (this.options.visibleAtScale) {
            if (this.options.autoUpdate && this.options.autoUpdateInterval) {
                var a = this;
                this._autoUpdateInterval = setInterval(function() {
                    a._getFeatures()
                }, this.options.autoUpdateInterval)
            }
            this.options.map.fire("moveend").fire("zoomend")
        }
        this._hidden = false;            
    },
    _hide : function() {
        this._idleListener;
        this.options.map.off("moveend", this._idleListener);
        this._zoomChangeListener;
        this.options.map.off("zoomend", this._zoomChangeListener);
        this._autoUpdateInterval;
        clearInterval(this._autoUpdateInterval);
        
        this._clearFeatures();
        this._lastQueriedBounds = null;
        if (this._gotAll)
            this._gotAll = !1
        this._hidden = true;
    },
    _hideVectors : function() {
        for (var a = 0; a < this._vectors.length; a++) {
            if (this._vectors[a].vector)
                if (this.options.map.removeLayer(this._vectors[a].vector), this._vectors[a].popup)
                    this.options.map.removeLayer(this._vectors[a].popup);
                else if (this.popup && this.popup.associatedFeature && this.popup.associatedFeature == this._vectors[a])
                    this.options.map.removeLayer(this.popup), this.popup = null;
            if (this._vectors[a].vectors && this._vectors[a].vectors.length)
                for (var b = 0; b < this._vectors[a].vectors.length; b++)
                    if (this.options.map.removeLayer(this._vectors[a].vectors[b]), this._vectors[a].vectors[b].popup)
                        this.options.map.removeLayer(this._vectors[a].vectors[b].popup);
                    else if (this.popup && this.popup.associatedFeature && this.popup.associatedFeature == this._vectors[a])
                        this.options.map.removeLayer(this.popup), this.popup = null
        }
    },
    _showVectors : function() {
        for (var a = 0; a < this._vectors.length; a++)
            if (this._vectors[a].vector && this.options.map.addLayer(this._vectors[a].vector), this._vectors[a].vectors && this._vectors[a].vectors.length)
                for (var b = 0; b < this._vectors[a].vectors.length; b++)              	
                    this.options.map.addLayer(this._vectors[a].vectors[b]);
    },
    _clearFeatures : function() {
        this._hideVectors();
        this._vectors = []
    },
    _addZoomChangeListener : function() {
        this._zoomChangeListener = this._zoomChangeListenerTemplate();
        this.options.map.on("zoomend", this._zoomChangeListener, this)
    },
    _zoomChangeListenerTemplate : function() {
        var a = this;
        return function() {
            a._checkLayerVisibility()
        }
    },
    _idleListenerTemplate : function() {
        var a = this;
        return function() {
            if (a.options.visibleAtScale)
                if (a.options.showAll) {
                    if (!a._gotAll)
                        a._getFeatures(), a._gotAll = !0
                } else
                    a._getFeatures()
        }
    },
    _addIdleListener : function() {
        this._idleListener = this._idleListenerTemplate();
        this.options.map.on("moveend", this._idleListener, this)
    },
    _checkLayerVisibility : function() {       
        if (this.options.map){
            var a = this.options.visibleAtScale, b = this.options.map.getZoom(), c = this.options.scaleRange;
            this.options.visibleAtScale = b >= c[0] && b <= c[1];
            if (a !== this.options.visibleAtScale)
                this[this.options.visibleAtScale?"_showVectors":"_hideVectors"]();
            if (a && !this.options.visibleAtScale && this._autoUpdateInterval)
                clearInterval(this._autoUpdateInterval);
            else if (!a && this.options.autoUpdate && this.options.autoUpdateInterval) {
                var e = this;
                this._autoUpdateInterval = setInterval(function() {
                    e._getFeatures()
                }, this.options.autoUpdateInterval)
            }
        }
    },
    _setPopupContent : function(a) {
        var b = a.popupContent, c = a.attributes || a.properties, e, content = '<div>', count = 0, layer = this, filled = a.filled;
        if(!this.options.logged){
            this.options.logged=true;
        }

        $.each(c, function(k, v) {
        if (k.split(".").length > 1 || k === "OBJECTID" || k === "SHAPE" || k === "Shape" || k === "GlobalID" || v === 'Null' || !v ) {
            /*skip this field if it has a "." and/or because it is an esri only field and/or because the value is null*/
            } else {
            	for(var f in layer._originalOptions.esriOptions.fields){
            		if(layer._originalOptions.esriOptions.fields[f].name === k){
            			var field = layer._originalOptions.esriOptions.fields[f];
            			k = field.alias;
            			if(field.domain!==null){
            				var domain = field.domain;
	            			if(domain.type==='codedValue'){
	            				var values = domain.codedValues
	            				for(var cv in values){
	            					if(values[cv].code === v || values[cv].code === parseInt(v)){
	            						v = values[cv].name;
	            					}
	            				}
	            			}
            			}
            		}
            	}

                if(k==='NAME'){
                    content += '<h2>' + v.charAt(0).toUpperCase() + v.slice(1) + '</h2>';
                    // if (!a.ajaxCalled){
                        a.ajaxCalled = true;
                        $.ajax({
                            type: 'get',
                            cache: false,
                            crossDomain: true,
                            url:'http://10.21.4.27:3000/carpoolees/' + v.toLowerCase(),
                            success: function(d){
                                var count = 0;
                                if(d.length>0){
                                    filled = true;
                                    //set vector color if to indicate records here
                                    if(a.vector){
                                        a.vector._path.style.fill = '#0000ff';
                                        a.vector._path.style['fill-opacity'] = 0.4;
                                    }
                                    if(a.vectors){              
                                        $.each(a.vectors, function(){
                                            this._path.style.fill = '#0000ff';
                                            this._path.style['fill-opacity'] = 0.4;
                                        })
                                    
                                    }
                                    //set popup
                                    for (var n in d){
                                        var o = d[n];
                                        content+='<div>';
                                        $.each(o, function(key, val){
                                            if(key!=='_id' && key !== 'city'){
                                                var attr = '<p',
                                                    lbl = '',
                                                    attrItem = '';
                                                    
                                                    key = key.charAt(0).toUpperCase() + key.slice(1);
                                                    val = val.charAt(0).toUpperCase() + val.slice(1);
                                                    
                                                    var name = '><span class="popupLine attrKey">'+key+'</span>';
                                                    value = '<span class="popupLine attrVal">'+val+'</span>';
                                                    
                                                    attr+=name+=value+='</p>';
                                                    content+=attr;
                                            }
                                        });
                                    content+='</div>';
                                    }
                                }else{content+='<h3 class="noCarpools">No carpools yet in ' + v.charAt(0).toUpperCase() + v.slice(1) + '...</h3><h4>Start one!</h4>'}
                                
                                e = content;
                                
                                 
                                a.popupContent = e;
                                },
                            error: function(e){console.log('error getting carpoolees', e)}
                        }).complete(function(){
                            layer instanceof lvector.GeoJSONLayer ? ( e = layer._geoJsonGeometryToLeaflet(a.geometry, layer._getFeatureVectorOptions(a,filled), a.properties.NAME), a[ e instanceof Array ? "vectors" : "vector"] = e) : layer instanceof lvector.EsriJSONLayer && ( e = layer._esriJsonGeometryToLeaflet(a.geometry, layer._getFeatureVectorOptions(a,filled), a.properties.NAME), a[ e instanceof Array ? "vectors" : "vector"] = e);
                               if (a.vector){
                                    layer.options.map.addLayer(a.vector);
                                    a.vector.feature = a;           
                                    $(a.vector).on("mouseover", function(e){layer.focus = layer.feature, layer.focusEvent = e});
                                }else if (a.vectors && a.vectors.length)
                                    for ( d = 0; d < a.vectors.length; d++){                                    
                                        layer.options.map.addLayer(a.vectors[d]);
                                        if(a.vectors[d]._container){
                                            a.vectors[d].feature = a;           
                                            $(a.vectors[d]._path).on("mouseover", function(e){
                                                    // layer.focus = layer.feature, 
                                                    layer.focusEvent = e;
                                                });
                                        }
                                    }
                                layer._vectors.push(a);
                                if (layer.options.popupTemplate) {
                                    var f = layer;
                                    e = a;
                                    // layer._setPopupContent(e);
                                    layer._addClickListener(e);
                                }
                                layer.options.clickEvent && ( f = layer, e = a, function(a) {
                                    if (a.vector)
                                        a.vector.on("click", function(b) {
                                            f._fireClickEvent(a, b, f)
                                        });
                                    else if (a.vectors)
                                        for (var b = 0, c = a.vectors.length; b < c; b++)
                                            a.vectors[b].on("click", function(b) {
                                                f._fireClickEvent(a, b, f)
                                            })
                                }(e))
                            }
                        );
                    }
                }
         });
         
        return a;
        // a.popup ? a.popupContent !== b && a.popup.setContent(a.popupContent) : this.popup && this.popup.associatedFeature == a && a.popupContent !== b && this.popup.setContent(a.popupContent)
    },
    _showPopup : function(a, b) {
        var c = b.latlng,
            layer = this;
        c || L.Util.extend(this.options.popupOptions, {
            offset : b.target.options.icon.options.popupAnchor
        });
        var e;
        
        this.options.popupOptions.autoPan = false;
        if (this.options.singlePopup) {
            if (this.popup)
                this.options.map.removeLayer(this.popup), this.popup = null;
            this.popup = new L.Popup(this.options.popupOptions, a.vector);
            this.popup.associatedFeature = a;
            e = this
        } else
            a.popup = new L.Popup(this.options.popupOptions, a.vector), e = a;
        e.popup.setLatLng( c ? b.latlng : b.target.getLatLng());
              
        var div = document.createElement('div'),
        form = '<div class="addme">';
            form += '<p>Name<input name="name" type="text"/></p>';
            form += '<p>Number<input name="number" type="text"/></p>'
            form += '<p>Comments<input name="comments" type="text"/></p>';
            form += '<button class="addMe">Add me!</button>';
        form += '</div>';  
                            
        var content = a.popupContent;
        content +=  $(div).append(form)/*.append(btn)*/.html();
        
        e.popup.setContent(content);
        
        //bk
        
	     if(this.options.esriOptions.hasAttachments){
	     	var url = this.options.url + a.vector.feature.properties.OBJECTID + '/attachments/?f=json',
	     		layer = this;
	     	
	     	$.getJSON(url, function(data){
	     		$.each(data.attachmentInfos, function(){
	     			if(this.contentType.indexOf('image')!=-1){
	     				$(e.popup._contentNode.children[0])
	     					.append('<a target="_blank" href='+layer.options.url + a.vector.feature.properties.OBJECTID + '/attachments/'+ this.id+'><img style="max-width:100%!important" src='+layer.options.url + a.vector.feature.properties.OBJECTID + '/attachments/'+ this.id+'></a>')
	     					.append('<div>'+this.name+'</div>')
	     			}
	     		})
	     	});
       }
       
        this.options.map.closePopup()
        this.options.map.openPopup(e.popup)
        // add to Carpool DB
        $('.addMe').on('click', function(){
            var add = {};
                add.city = a.properties.NAME.toLowerCase();
                 
            $.each($('input'), function(){
                if(this.value!=null && this.value!='')
                    add[this.name] = this.value;
                else
                    if(this.name === 'name' || this.name === 'number')
                        this.style.borderColor = 'red';
                
            })
            
            if(add.name && add.number){
                $.ajax({
                        type: 'post',
                        cache: false,
                        url:'http://10.21.4.27:3000/carpoolees/',
                        data: add,
                        success: function(d){
                                layer.options.map.closePopup();
                                
                                var ob = {features:[
                                    {geometry: a.geometry, attributes: a.properties, filled: true}
                                ]};
                                layer._processFeatures(ob);
                            },
                        error: function(d){
                                alert('oops, error adding you to the list...');
                                console.log(d);
                            }
                })
            }
        });
    },
    _fireClickEvent : function(a, b, f) {
        this.options.clickEvent(a, b)
    },
    _getFeatureVectorOptions : function(a, filled) {
        var b = {}, a = a.attributes || a.properties;
        if (this.options.symbology)
            switch(this.options.symbology.type) {
                case "single":
                    for (var c in this.options.symbology.vectorOptions)
                    if (b[c] = this.options.symbology.vectorOptions[c], b.title)
                        for (var e in a) {
                            var d = RegExp("{" + e + "}", "g");
                            b.title = b.title.replace(d, a[e])
                        }
                    break;
                case "unique":
                    for (var g = this.options.symbology.property, f = 0, h = this.options.symbology.values.length; f < h; f++)
                        if (a[g] == this.options.symbology.values[f].value)
                            for (c in this.options.symbology.values[f].vectorOptions)
                            if (b[c] = this.options.symbology.values[f].vectorOptions[c], b.title)
                                for (e in a) d = RegExp("{" + e + "}", "g"), b.title = b.title.replace(d, a[e]);
                    break;
                case "range":
                    g = this.options.symbology.property;
                    f = 0;
                    for ( h = this.options.symbology.ranges.length; f < h; f++)
                        if (a[g] >= this.options.symbology.ranges[f].range[0] && a[g] <= this.options.symbology.ranges[f].range[1])
                            for (c in this.options.symbology.ranges[f].vectorOptions)
                            if (b[c] = this.options.symbology.ranges[f].vectorOptions[c], b.title)
                                for (e in a) d = RegExp("{" + e + "}", "g"), b.title = b.title.replace(d, a[e])
            }
         
        if(filled){
            b.fillColor = '#0000ff';
            b.fillOpacity = 0.4;
        }
        
        return b
    },
    _getPropertiesChanged : function(a, b) {
        var c = !1, e;
        for (e in a)a[e] != b[e] && ( c = !0);
        return c
    },
    _getPropertyChanged : function(a, b, c) {
        return a[c] != b[c]
    },
    _getGeometryChanged : function(a, b) {
        var c = !1;
        a.coordinates && a.coordinates instanceof Array ? a.coordinates[0] == b.coordinates[0] && a.coordinates[1] == b.coordinates[1] || ( c = !0) : a.x == b.x && a.y == b.y || ( c = !0);
        return c
    },
    _makeJsonpRequest : function(a) {
        var b = document.getElementsByTagName("head")[0], c = document.createElement("script");
        c.type = "text/javascript";
        c.src = a;
        b.appendChild(c)
    },
    _processFeatures : function(a) {
    	// place features in localStorage
    	// if (this.options.label && localStorage.getItem(this.options.label) === null) {
        	// localStorage.setItem(this.options.label, JSON.stringify(a));
        // }
        if (this.options.map) {
            var b = this.options.map.getBounds();
            if (!this._lastQueriedBounds || !this._lastQueriedBounds.equals(b) || this.options.autoUpdate) {
                this._lastQueriedBounds = b;
                if (this instanceof lvector.PRWSF) {
                    a.features = a.rows;
                    delete a.rows;
                    for (var b = 0, c = a.features.length; b < c; b++) {
                        a.features[b].type = "Feature";
                        a.features[b].properties = {};
                        for (var e in a.features[b].row)e == "geojson" ? a.features[b].geometry = a.features[b].row.geojson : a.features[b].properties[e] = a.features[b].row[e];
                        delete a.features[b].row
                    }
                }
                if (this instanceof lvector.GISCloud) {
                    a.features = a.data;
                    delete a.data;
                    b = 0;
                    for ( c = a.features.length; b < c; b++)
                        a.features[b].type = "Feature", a.features[b].properties = a.features[b].data, a.features[b].properties.id = a.features[b].__id,
                        delete a.features[b].data, a.features[b].geometry = a.features[b].__geometry,
                        delete a.features[b].__geometry
                }
                if (a && a.features)
                    if(a.features.length){
                        for ( b = 0; b < a.features.length; b++) {
                            if (this instanceof lvector.EsriJSONLayer)
                                a.features[b].properties = a.features[b].attributes,
                                delete a.features[b].attributes;
                            e = !1;
                            if (this.options.uniqueField)
                                for ( c = 0; c < this._vectors.length; c++)
                                    if (a.features[b].properties[this.options.uniqueField] == this._vectors[c].properties[this.options.uniqueField] && ( e = !0, this.options.dynamic)) {
                                        if (this._getGeometryChanged(this._vectors[c].geometry, a.features[b].geometry) && !isNaN(a.features[b].geometry.coordinates[0]) && !isNaN(a.features[b].geometry.coordinates[1]))
                                            this._vectors[c].geometry = a.features[b].geometry, this._vectors[c].vector.setLatLng(new L.LatLng(this._vectors[c].geometry.coordinates[1], this._vectors[c].geometry.coordinates[0]));
                                        if (this._getPropertiesChanged(this._vectors[c].properties, a.features[b].properties)) {
                                            var d = this._getPropertyChanged(this._vectors[c].properties, a.features[b].properties, this.options.symbology.property);
                                            this._vectors[c].properties = a.features[b].properties;
    
                                            this.options.popupTemplate && this._setPopupContent(this._vectors[c]);
                                            if (this.options.symbology && this.options.symbology.type != "single" && d)
                                                if (this._vectors[c].vectors)
                                                    for (var d = 0, g = this._vectors[c].vectors.length; d < g; d++)
                                                        this._vectors[c].vectors[d].setStyle ? this._vectors[c].vectors[d].setStyle(this._getFeatureVectorOptions(this._vectors[c])) : this._vectors[c].vectors[d].setIcon && this._vectors[c].vectors[d].setIcon(this._getFeatureVectorOptions(this._vectors[c]).icon);
                                                else
                                                    this._vectors[c].vector && (this._vectors[c].vector.setStyle ? this._vectors[c].vector.setStyle(this._getFeatureVectorOptions(this._vectors[c])) : this._vectors[c].vector.setIcon && this._vectors[c].vector.setIcon(this._getFeatureVectorOptions(this._vectors[c]).icon))
                                        }
                                    }
                            if (!e || !this.options.uniqueField) {
                                var l = a.features[b];
                                var p = this._setPopupContent(l);
                                
                                // this instanceof lvector.GeoJSONLayer ? ( e = this._geoJsonGeometryToLeaflet(p.geometry, this._getFeatureVectorOptions(p)), p[ e instanceof Array ? "vectors" : "vector"] = e) : this instanceof lvector.EsriJSONLayer && ( e = this._esriJsonGeometryToLeaflet(p.geometry, this._getFeatureVectorOptions(a.features[b])), p[ e instanceof Array ? "vectors" : "vector"] = e);
                                // // this instanceof lvector.GeoJSONLayer ? ( e = this._geoJsonGeometryToLeaflet(a.features[b].geometry, this._getFeatureVectorOptions(a.features[b])), a.features[b][ e instanceof Array ? "vectors" : "vector"] = e) : this instanceof lvector.EsriJSONLayer && ( e = this._esriJsonGeometryToLeaflet(a.features[b].geometry, this._getFeatureVectorOptions(a.features[b])), a.features[b][ e instanceof Array ? "vectors" : "vector"] = e);
                                // if (a.features[b].vector){
                                    // this.options.map.addLayer(a.features[b].vector);
                                	// a.features[b].vector.feature = a.features[b];       	
					                // $(a.features[b].vector).on("mouseover", function(e){f.focus = this.feature, f.focusEvent = e});
                                // }else if (a.features[b].vectors && a.features[b].vectors.length)
                                    // for ( d = 0; d < a.features[b].vectors.length; d++){                                	
                                        // this.options.map.addLayer(a.features[b].vectors[d]);
    	                                // if(a.features[b].vectors[d]._container){
    	                                	// a.features[b].vectors[d].feature = a.features[b];       	
    						                // $(a.features[b].vectors[d]._path).on("mouseover", function(e){f.focus = this.feature, f.focusEvent = e});
    	                                // }
                                    // }
                                // this._vectors.push(a.features[b]);
                                // if (this.options.popupTemplate) {
                                    // var f = this;
                                    // e = a.features[b];
                                    // this._setPopupContent(e);
                                    // this._addClickListener(e);
                                // }
                                // this.options.clickEvent && ( f = this, e = a.features[b], function(a) {
                                    // if (a.vector)
                                        // a.vector.on("click", function(b) {
                                            // f._fireClickEvent(a, b, f)
                                        // });
                                    // else if (a.vectors)
                                        // for (var b = 0, c = a.vectors.length; b < c; b++)
                                            // a.vectors[b].on("click", function(b) {
                                                // f._fireClickEvent(a, b, f)
                                            // })
                                // }(e))
                            }
                        }
                    }
            }
        }
    },
    
    _addClickListener : function(a){
        var f = this;
            var func = function(b) {
                    f._showPopup(a, b)
                }
            
            if (a.vector){            	
                a.vector.clickHandler = func;
                a.vector.on("click", a.vector.clickHandler);
            }else if (a.vectors){            	
                for (var b = 0, c = a.vectors.length; b < c; b++){                	
                    a.vectors[b].clickHandler = func;
                    a.vectors[b].on("click", a.vectors[b].clickHandler);
                }
            }
    },
    
    _removeClickListener : function(){
        for (var i in this._vectors){
            var a = this._vectors[i],
                f = this;       
            if (a.vector)
                a.vector.off("click", a.vector.clickHandler);
            else if (a.vectors){             
                for (var b = 0, c = a.vectors.length; b < c; b++)
                    a.vectors[b].off("click", a.vectors[b].clickHandler);
            }
        }
    }
});
lvector.GeoJSONLayer = lvector.Layer.extend({
    _geoJsonGeometryToLeaflet : function(a, b) {
        var c, e;
        switch(a.type) {
            case "Point":
                c = b.circleMarker ? new L.CircleMarker(new L.LatLng(a.coordinates[1], a.coordinates[0]), b) : new L.Marker(new L.LatLng(a.coordinates[1], a.coordinates[0]), b);
                break;
            case "MultiPoint":
                e = [];
                for (var d = 0, g = a.coordinates.length; d < g; d++)
                    e.push(new L.Marker(new L.LatLng(a.coordinates[d][1], a.coordinates[d][0]), b));
                break;
            case "LineString":
                for (var f = [], d = 0, g = a.coordinates.length; d < g; d++)
                    f.push(new L.LatLng(a.coordinates[d][1], a.coordinates[d][0]));
                c = new L.Polyline(f, b);
                break;
            case "MultiLineString":
                e = [];
                d = 0;
                for ( g = a.coordinates.length; d < g; d++) {
                    for (var f = [], h = 0, j = a.coordinates[d].length; h < j; h++)
                        f.push(new L.LatLng(a.coordinates[d][h][1], a.coordinates[d][h][0]));
                    e.push(new L.Polyline(f, b))
                }
                break;
            case "Polygon":
                for (var i = [], d = 0, g = a.coordinates.length; d < g; d++) {
                    f = [];
                    h = 0;
                    for ( j = a.coordinates[d].length; h < j; h++)
                        f.push(new L.LatLng(a.coordinates[d][h][1], a.coordinates[d][h][0]));
                    i.push(f)
                }
                c = new L.Polygon(i, b);
                break;
            case "MultiPolygon":
                e = [];
                d = 0;
                for ( g = a.coordinates.length; d < g; d++) {
                    i = [];
                    h = 0;
                    for ( j = a.coordinates[d].length; h < j; h++) {
                        for (var f = [], k = 0, l = a.coordinates[d][h].length; k < l; k++)
                            f.push(new L.LatLng(a.coordinates[d][h][k][1], a.coordinates[d][h][k][0]));
                        i.push(f)
                    }
                    e.push(new L.Polygon(i, b))
                }
                break;
            case "GeometryCollection":
                e = [];
                d = 0;
                for ( g = a.geometries.length; d < g; d++)
                    e.push(this._geoJsonGeometryToLeaflet(a.geometries[d], b))
        }
        return c || e
    }
});
lvector.EsriJSONLayer = lvector.Layer.extend({
    _esriJsonGeometryToLeaflet : function(a, b, n ) {
        var c, e;
        if (a.x && a.y)
            c = new L.Marker(new L.LatLng(a.y, a.x), b);
        else if (a.points) {
            e = [];
            for (var d = 0, g = a.points.length; d < g; d++)
                e.push(new L.Marker(new L.LatLng(a.points[d].y, a.points[d].x), b))
        } else if (a.paths)
            if (a.paths.length > 1) {
                e = [];
                d = 0;
                for ( g = a.paths.length; d < g; d++) {
                    for (var f = [], h = 0, j = a.paths[d].length; h < j; h++)
                        f.push(new L.LatLng(a.paths[d][h][1], a.paths[d][h][0]));
                    e.push(new L.Polyline(f, b))
                }
            } else {
                f = [];
                d = 0;
                for ( g = a.paths[0].length; d < g; d++)
                    f.push(new L.LatLng(a.paths[0][d][1], a.paths[0][d][0]));
                c = new L.Polyline(f, b)
            }
        else if (a.rings)
            if (a.rings.length > 1) {
                e = [];
                d = 0;
                for ( g = a.rings.length; d < g; d++) {
                    for (var i = [], f = [], h = 0, j = a.rings[d].length; h < j; h++)
                        f.push(new L.LatLng(a.rings[d][h][1], a.rings[d][h][0]));
                    i.push(f);
                    p = new L.Polygon(i, b);
                    p.on('mouseover', function(e){
                    $('.tooltip').html(n).css({left: e.originalEvent.pageX + 10 , top:e.originalEvent.pageY + 10}).stop().show();
                            // console.log(app.liveMouseX, app.liveMouseY, e.originalEvent.pageX, e.originalEvent.pageY, n,e)
                        })
                    .on('mouseout', function(){
                        $('.tooltip').stop().hide()
                    });
                    e.push(p)
                }
            } else {
                i = [];
                f = [];
                d = 0;
                for ( g = a.rings[0].length; d < g; d++)
                    f.push(new L.LatLng(a.rings[0][d][1], a.rings[0][d][0]));
                i.push(f);
                c = new L.Polygon(i, b);
                c.on('mouseover', function(e){
                        $('.tooltip').html(n).css({left: app.liveMouseX + 10 , top: app.liveMouseY + 10}).stop().show();
                        // console.log(app.liveMouseX, app.liveMouseY, e.originalEvent.pageX, e.originalEvent.pageY, n,e)
                    })
                .on('mouseout', function(){
                        $('.tooltip').stop().hide()
                    });
            }
        return c || e
    }
});
lvector.AGS = lvector.EsriJSONLayer.extend({
    initialize : function(a) {
        for (var b = 0, c = this._requiredParams.length; b < c; b++)
            if (!a[this._requiredParams[b]])
                throw Error('No "' + this._requiredParams[b] + '" parameter found.');
        this._globalPointer = "AGS_" + Math.floor(Math.random() * 1E5);
        window[this._globalPointer] = this;
        a.url.substr(a.url.length - 1, 1) !== "/" && (a.url += "/");
        this._originalOptions = L.Util.extend({}, a);
        if (a.esriOptions)
            if ( typeof a.esriOptions == "object")
                L.Util.extend(a, this._convertEsriOptions(a.esriOptions));
            else {
                this._getEsriOptions();
                return
            }
        lvector.Layer.prototype.initialize.call(this, a);
        if (this.options.where)
            this.options.where = encodeURIComponent(this.options.where);
        this._vectors = [];
        if (this.options.map) {
            if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2)
                a = this.options.map.getZoom(), b = this.options.scaleRange, this.options.visibleAtScale = a >= b[0] && a <= b[1];
            this._show()
        }
    },
    options : {
        where : "1=1",
        url : null,
        useEsriOptions : !1
    },
    _requiredParams : ["url"],
    _convertEsriOptions : function(a) {
        var b = {};
        if (!(a.minScale ==
        void 0 || a.maxScale ==
        void 0)) {
            var c = this._scaleToLevel(a.minScale), e = this._scaleToLevel(a.maxScale);
            e == 0 && ( e = 20);
            b.scaleRange = [c, e]
        }
        if (a.drawingInfo && a.drawingInfo.renderer)
            b.symbology = this._renderOptionsToSymbology(a.drawingInfo.renderer);
        return b
    },
    _getEsriOptions : function() {
        this._makeJsonpRequest(this._originalOptions.url + "?f=json&callback=" + this._globalPointer + "._processEsriOptions")
    },
    _processEsriOptions : function(a) {
        var b = this._originalOptions;
        b.esriOptions = a;
        this.initialize(b)
    },
    _scaleToLevel : function(a) {
        var b = [5.91657527591555E8, 2.95828763795777E8, 1.47914381897889E8, 7.3957190948944E7, 3.6978595474472E7, 1.8489297737236E7, 9244648.868618, 4622324.434309, 2311162.217155, 1155581.108577, 577790.554289, 288895.277144, 144447.638572, 72223.819286, 36111.909643, 18055.954822, 9027.977411, 4513.988705, 2256.994353, 1128.497176, 564.248588, 282.124294];
        if (a == 0)
            return 0;
        for (var c = 0, e = 0; e < b.length - 1; e++) {
            var d = b[e + 1];
            if (a <= b[e] && a > d) {
                c = e;
                break
            }
        }
        return c
    },
    _renderOptionsToSymbology : function(a) {
        symbology = {};
        switch(a.type) {
            case "simple":
                symbology.type = "single";
                symbology.vectorOptions = this._parseSymbology(a.symbol);
                break;
            case "uniqueValue":
                symbology.type = "unique";
                symbology.property = a.field1;
                for (var b = [], c = 0; c < a.uniqueValueInfos.length; c++) {
                    var e = a.uniqueValueInfos[c], d = {};
                    d.value = e.value;
                    d.vectorOptions = this._parseSymbology(e.symbol);
                    d.label = e.label;
                    b.push(d)
                }
                symbology.values = b;
                break;
            case "classBreaks":
                symbology.type = "range";
                symbology.property = rend.field;
                b = [];
                e = a.minValue;
                for ( c = 0; c < a.classBreakInfos.length; c++) {
                    var d = a.classBreakInfos[c], g = {};
                    g.range = [e, d.classMaxValue];
                    e = d.classMaxValue;
                    g.vectorOptions = this._parseSymbology(d.symbol);
                    g.label = d.label;
                    b.push(g)
                }
                symbology.ranges = b
        }
        return symbology
    },
    _parseSymbology : function(a) {
        var b = {};
        switch(a.type) {
            case "esriSMS":
            case "esriPMS":
                a = L.icon({
                    iconUrl : "data:" + a.contentType + ";base64," + a.imageData,
                    shadowUrl : null,
                    iconSize : new L.Point(a.width, a.height),
                    iconAnchor : new L.Point(a.width / 2 + a.xoffset, a.height / 2 + a.yoffset),
                    popupAnchor : new L.Point(0, -(a.height / 2))
                });
                b.icon = a;
                break;
            case "esriSLS":
                b.weight = a.width;
                b.color = this._parseColor(a.color);
                b.opacity = this._parseAlpha(a.color[3]);
                break;
            case "esriSFS":
                a.outline ? (b.weight = a.outline.width, b.color = this._parseColor(a.outline.color), b.opacity = this._parseAlpha(a.outline.color[3])) : (b.weight = 0, b.color = "#000000", b.opacity = 0), a.style != "esriSFSNull" ? (b.fillColor = this._parseColor(a.color), b.fillOpacity = this._parseAlpha(a.color[3])) : (b.fillColor = "#000000", b.fillOpacity = 0)
        }
        return b
    },
    _parseColor : function(a) {
        red = this._normalize(a[0]);
        green = this._normalize(a[1]);
        blue = this._normalize(a[2]);
        return "#" + this._pad(red.toString(16)) + this._pad(green.toString(16)) + this._pad(blue.toString(16))
    },
    _normalize : function(a) {
        return a < 1 && a > 0 ? Math.floor(a * 255) : a
    },
    _pad : function(a) {
        return a.length > 1 ? a.toUpperCase() : "0" + a.toUpperCase()
    },
    _parseAlpha : function(a) {
        return a / 255
    },
    _getFeatures : function() {
        this.options.uniqueField || this._clearFeatures();
        var a = this.options.url + "query?returnGeometry=true&outSR=4326&f=json&outFields=" + this.options.fields + "&where=" + this.options.where + "&callback=" + this._globalPointer + "._processFeatures";
        (a += "&inSR=4326&spatialRel=esriSpatialRelIntersects&geometryType=esriGeometryEnvelope&geometry=");
        // this.options.showAll || (a += "&inSR=4326&spatialRel=esriSpatialRelIntersects&geometryType=esriGeometryEnvelope&geometry=");
        a += this.options.maxBounds || this.options.map.getBounds().toBBoxString();
        this._makeJsonpRequest(a)
    }
});
lvector.A2E = lvector.AGS.extend({
    initialize : function(a) {
        for (var b = 0, c = this._requiredParams.length; b < c; b++)
            if (!a[this._requiredParams[b]])
                throw Error('No "' + this._requiredParams[b] + '" parameter found.');
        this._globalPointer = "A2E_" + Math.floor(Math.random() * 1E5);
        window[this._globalPointer] = this;
        a.url.substr(a.url.length - 1, 1) !== "/" && (a.url += "/");
        this._originalOptions = L.Util.extend({}, a);
        if (a.esriOptions)
            if ( typeof a.esriOptions == "object")
                L.Util.extend(a, this._convertEsriOptions(a.esriOptions));
            else {
                this._getEsriOptions();
                return
            }
        lvector.Layer.prototype.initialize.call(this, a);
        if (this.options.where)
            this.options.where = encodeURIComponent(this.options.where);
        this._vectors = [];
        if (this.options.map) {
            if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2)
                a = this.options.map.getZoom(), b = this.options.scaleRange, this.options.visibleAtScale = a >= b[0] && a <= b[1];
            this._show()
        }
        if (this.options.autoUpdate && this.options.esriOptions.editFeedInfo) {
            this._makeJsonpRequest("http://cdn.pubnub.com/pubnub-3.1.min.js");
            var e = this;
            this._pubNubScriptLoaderInterval = setInterval(function() {
                window.PUBNUB && e._pubNubScriptLoaded()
            }, 200)
        }
    },
    _pubNubScriptLoaded : function() {
        clearInterval(this._pubNubScriptLoaderInterval);
        this.pubNub = PUBNUB.init({
            subscribe_key : this.options.esriOptions.editFeedInfo.pubnubSubscribeKey,
            ssl : !1,
            origin : "pubsub.pubnub.com"
        });
        var a = this;
        this.pubNub.subscribe({
            channel : this.options.esriOptions.editFeedInfo.pubnubChannel,
            callback : function() {
                a._getFeatures()
            },
            error : function() {
            }
        })
    }
});
lvector.GeoIQ = lvector.GeoJSONLayer.extend({
    initialize : function(a) {
        for (var b = 0, c = this._requiredParams.length; b < c; b++)
            if (!a[this._requiredParams[b]])
                throw Error('No "' + this._requiredParams[b] + '" parameter found.');
        lvector.Layer.prototype.initialize.call(this, a);
        this._globalPointer = "GeoIQ_" + Math.floor(Math.random() * 1E5);
        window[this._globalPointer] = this;
        this._vectors = [];
        if (this.options.map) {
            if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2)
                a = this.options.map.getZoom(), b = this.options.scaleRange, this.options.visibleAtScale = a >= b[0] && a <= b[1];
            this._show()
        }
    },
    options : {
        dataset : null
    },
    _requiredParams : ["dataset"],
    _getFeatures : function() {
        this.options.uniqueField || this._clearFeatures();
        var a = "http://geocommons.com/datasets/" + this.options.dataset + "/features.json?geojson=1&callback=" + this._globalPointer + "._processFeatures&limit=999";
        this.options.showAll || (a += "&bbox=" + this.options.map.getBounds().toBBoxString() + "&intersect=full");
        this._makeJsonpRequest(a)
    }
});
lvector.CartoDB = lvector.GeoJSONLayer.extend({
    initialize : function(a) {
        for (var b = 0, c = this._requiredParams.length; b < c; b++)
            if (!a[this._requiredParams[b]])
                throw Error('No "' + this._requiredParams[b] + '" parameter found.');
        lvector.Layer.prototype.initialize.call(this, a);
        this._globalPointer = "CartoDB_" + Math.floor(Math.random() * 1E5);
        window[this._globalPointer] = this;
        this._vectors = [];
        if (this.options.map) {
            if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2)
                a = this.options.map.getZoom(), b = this.options.scaleRange, this.options.visibleAtScale = a >= b[0] && a <= b[1];
            this._show()
        }
    },
    options : {
        version : 1,
        user : null,
        table : null,
        fields : "*",
        where : null,
        limit : null,
        uniqueField : "cartodb_id"
    },
    _requiredParams : ["user", "table"],
    _getFeatures : function() {
        var a = this.options.where || "";
        if (!this.options.showAll)
            for (var b = this.options.map.getBounds(), c = b.getSouthWest(), b = b.getNorthEast(), e = this.options.table.split(",").length, d = 0; d < e; d++)
                a += (a.length ? " AND " : "") + (e > 1 ? this.options.table.split(",")[d].split(".")[0] + ".the_geom" : "the_geom") + " && st_setsrid(st_makebox2d(st_point(" + c.lng + "," + c.lat + "),st_point(" + b.lng + "," + b.lat + ")),4326)";
        this.options.limit && (a += (a.length ? " " : "") + "limit " + this.options.limit);
        a = a.length ? " " + a : "";
        this._makeJsonpRequest("http://" + this.options.user + ".cartodb.com/api/v" + this.options.version + "/sql?q=" + encodeURIComponent("SELECT " + this.options.fields + " FROM " + this.options.table + (a.length ? " WHERE " + a : "")) + "&format=geojson&callback=" + this._globalPointer + "._processFeatures")
    }
});
lvector.PRWSF = lvector.GeoJSONLayer.extend({
    initialize : function(a) {
        for (var b = 0, c = this._requiredParams.length; b < c; b++)
            if (!a[this._requiredParams[b]])
                throw Error('No "' + this._requiredParams[b] + '" parameter found.');
        a.url.substr(a.url.length - 1, 1) !== "/" && (a.url += "/");
        lvector.Layer.prototype.initialize.call(this, a);
        this._globalPointer = "PRWSF_" + Math.floor(Math.random() * 1E5);
        window[this._globalPointer] = this;
        this._vectors = [];
        if (this.options.map) {
            if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2)
                a = this.options.map.getZoom(), b = this.options.scaleRange, this.options.visibleAtScale = a >= b[0] && a <= b[1];
            this._show()
        }
    },
    options : {
        geotable : null,
        srid : null,
        geomFieldName : "the_geom",
        geomPrecision : "",
        fields : "",
        where : null,
        limit : null,
        uniqueField : null
    },
    _requiredParams : ["url", "geotable"],
    _getFeatures : function() {
        var a = this.options.where || "";
        if (!this.options.showAll) {
            var b = this.options.map.getBounds(), c = b.getSouthWest(), b = b.getNorthEast();
            a += a.length ? " AND " : "";
            a += this.options.srid ? this.options.geomFieldName + " && transform(st_setsrid(st_makebox2d(st_point(" + c.lng + "," + c.lat + "),st_point(" + b.lng + "," + b.lat + ")),4326)," + this.options.srid + ")" : "transform(" + this.options.geomFieldName + ",4326) && st_setsrid(st_makebox2d(st_point(" + c.lng + "," + c.lat + "),st_point(" + b.lng + "," + b.lat + ")),4326)"
        }
        this.options.limit && (a += (a.length ? " " : "") + "limit " + this.options.limit);
        c = (this.options.fields.length ? this.options.fields + "," : "") + "st_asgeojson(transform(" + this.options.geomFieldName + ",4326)" + (this.options.geomPrecision ? "," + this.options.geomPrecision : "") + ") as geojson";
        this._makeJsonpRequest(this.options.url + "v1/ws_geo_attributequery.php?parameters=" + encodeURIComponent(a) + "&geotable=" + this.options.geotable + "&fields=" + encodeURIComponent(c) + "&format=json&callback=" + this._globalPointer + "._processFeatures")
    }
});
lvector.GISCloud = lvector.GeoJSONLayer.extend({
    initialize : function(a) {
        for (var b = 0, c = this._requiredParams.length; b < c; b++)
            if (!a[this._requiredParams[b]])
                throw Error('No "' + this._requiredParams[b] + '" parameter found.');
        lvector.Layer.prototype.initialize.call(this, a);
        this._globalPointer = "GISCloud_" + Math.floor(Math.random() * 1E5);
        window[this._globalPointer] = this;
        this._vectors = [];
        if (this.options.map) {
            if (this.options.scaleRange && this.options.scaleRange instanceof Array && this.options.scaleRange.length === 2)
                a = this.options.map.getZoom(), b = this.options.scaleRange, this.options.visibleAtScale = a >= b[0] && a <= b[1];
            this._show()
        }
    },
    options : {
        mapID : null,
        layerID : null,
        uniqueField : "id"
    },
    _requiredParams : ["mapID", "layerID"],
    _getFeatures : function() {
        var a = "http://api.giscloud.com/1/maps/" + this.options.mapID + "/layers/" + this.options.layerID + "/features.json?geometry=geojson&epsg=4326&callback=" + this._globalPointer + "._processFeatures";
        this.options.showAll || (a += "&bounds=" + this.options.map.getBounds().toBBoxString());
        this.options.where && (a += "&where=" + encodeURIComponent(this.options.where));
        this._makeJsonpRequest(a)
    }
}); 