L.Control.EditAGS = L.Control.extend({
    options : {
        position : 'topleft',
        icon : '&#x270e;'
        // title : null
    },

    onAdd : function(map) {
        var className = 'leaflet-control-zoom leaflet-bar leaflet-control', container = L.DomUtil.create('div', className);
        this._createButton(this.options.icon, this.options.title, 'leaflet-control-edit leaflet-bar-part leaflet-bar-part-top-and-bottom', container, this._toggleEditing, this);
        
        //replace MapServer with FeatureServer in url
        this.options.url = this.options.url.replace('MapServer', 'FeatureServer');

        return container;
    },

    _createButton : function(html, title, className, container, fn, context) {
        var link = this._link = L.DomUtil.create('a', className, container);
        // link.innerHTML = '';
        link.innerHTML = html;
        link.href = '#';
        link.title = title;
        link.style.fontSize = '25px';

        L.DomEvent.on(link, 'click', L.DomEvent.stopPropagation).on(link, 'click', L.DomEvent.preventDefault).on(link, 'click', fn, context).on(link, 'dblclick', L.DomEvent.stopPropagation);

        return link;
    },

    _toggleEditing : function() {
        this._editing = !this._editing;

        if (this._editing) {
            L.DomUtil.addClass(this._container, 'leaflet-control-measure-on');
            this._startEditing();
        } else {
            L.DomUtil.removeClass(this._container, 'leaflet-control-measure-on');
            this._stopEditing();
        }
    },

    _startEditing : function() {
        $(this._link)[0].title = 'Stop Editing';

        this._doubleClickZoom = this._map.doubleClickZoom.enabled();
        this._map.doubleClickZoom.disable();
        
        // prevent popup
        for(var l in this._map._layers){
            if( typeof this._map._layers[l]._removeClickListener == 'function'){
                this._map._layers[l]._removeClickListener();
            }
        }
        
        // setup the feature for editing
        this.feature = {},
        this.feature.geometry = {};
        this.feature.attributes = {};
        
        L.DomEvent.on(this._map, 'click', this._mouseClick, this).on(document, 'keydown', this._onKeyDown, this).on(this._map, 'contextmenu', this._changeEditLayer, this);
        
        if(this._map.editLayer.options.editForm){
            var control = this;
            this._map.editLayer.options.editForm.off('click', '.submitBtn', '**')
                .on('click', '.submitBtn', function(){control._addFeature(control)});
            this._map.editLayer.options.editForm.off('click', '.cancel', '**')
                .on('click', '.cancel', function(){control._toggleEditing()});
            // this._map.editLayer.options.editForm.on('change', 'input[type=file]', function(){control.attachments = this.files, console.log(this.files)});
        }

    },

    _stopEditing : function() {
        $(this._link)[0].title = this.options.title;
        
        if(this.newMarker){        
            this._map.removeLayer(this.newMarker);
            delete this.newMarker;
        }

        L.DomEvent.off(document, 'keydown', this._onKeyDown, this).off(this._map, 'click', this._mouseClick, this).off(this._map, 'contextmenu', this._mouseClick, this);
        
        // hide form
        if(this._map.editLayer.options.editForm){
            this._map.editLayer.options.editForm.fadeOut(500);
        }
        
        // re-bind popup
        for(var l in this._map._layers){
            if(this._map._layers[l]._vectors){            	
                var layer = this._map._layers[l]
                layer._vectors.forEach(function(vector){
                	layer._addClickListener(vector)
            	});
            }
                	
        }
        
        if (this._doubleClickZoom) {
            this._map.doubleClickZoom.enable();
        }
    },

    _mouseClick : function(e) {
        L.DomEvent.stopPropagation(e);
        // Skip if no coordinates
        
        if (!e.latlng) {
            return;
        }
        
        if(this.newMarker){
            this.newMarker.setLatLng(e.latlng)
        }else{
            this.newMarker = new L.Marker(e.latlng/*,{draggable: true}*/).addTo(this._map);
        }
        
        if(this._map.editLayer.options.editForm){
            this._map.editLayer.options.editForm.fadeIn(500);
        }
        
		// relationship selection
		if(this.prevPath){
			this.prevPath.setAttribute('fill', this.prevFill);
		}
        if(this.focusEvent){
        	if(this.focusEvent.currentTarget._path == e.originalEvent.target){
        		var feature = this.focus,
        		 	rel = feature.properties.NAme,
        		 	path = feature.vector._path;
        		this.relationship = rel;
        		this.prevFill = path.getAttribute('fill');
        		this.prevPath = path;
        		path.setAttribute('fill', '#ffff00');
        	}else{
        		delete this.relationship;
        	}	
        }
    },
    
    _addFeature: function(control){
        // need to convert the point first
        var latlng = control.newMarker.getLatLng(),
        	point = L.CRS.EPSG3857.project(latlng),
        	feature = control.feature, addFeatures = [feature],
        	attachment;
        
        feature.latlng = {};
        feature.latlng.x = latlng.lng;
        feature.latlng.y = latlng.lat;
        
        
        feature.geometry.y = point.y.toString();
        feature.geometry.x = point.x.toString();
        
        var scrolled = false, d, dn, required=false;
        $.each($(this._map.editLayer.options.editForm).find('input'), function(i, input){
            switch (input.type){
                case 'radio':
                	if(input.checked==true){                		
                		// console.log(input.name, input.value)
                		feature.attributes[input.name] = input.value
                	}
                		break;
                case 'checkbox':
                	if(input.checked==true){                		
                		// console.log(input.name, input.value, 'true')
                		feature.attributes[input.name] = 1
                	}
                		break;		
                case 'text':
                	if(input.value!='' && input.value!= null && input.name != null){
                		// console.log(input.name, input.value)
                		feature.attributes[input.name] = input.value
                	}
                		break;
                case 'date':
                	if(!input.value)
                		console.log('need a date')
                	else{
						d = input.value.split('-');
						dn = input.name;         		
                	}
            		break;
            	case 'file':
            		if(input.value){
            			feature.attachment = input.files[0];
            		}
            		
            }
            // check if the imput element is required and if it has no value
            var req = $(this).attr('required');
			if (typeof req !== 'undefined' && req !== false && (!input.value || input.value=='' )) {
			    // console.log(input.name, 'required');
			    required=true;
			    $(input).addClass('required');
			    if(!scrolled)
			    	control._map.editLayer.options.editForm.find('form').animate({scrollTop: $(input).offset().top})
			    	scrolled = true;
			}else{
			    $(input).removeClass('required');
			}  
        });
        
        $.each($(this._map.editLayer.options.editForm).find('select'), function(i, select){
        	if(!$(select).hasClass('time')){        		
	        	// console.log(select.name, select.value);
	        	feature.attributes[select.name] = select.value;
        	}else if(d){
        		switch (select.name.toLowerCase()){
        			case 'hour': 
    					d[3] = select.value
    					break;
        			case 'minute':
        				d[4] = select.value
    					break;
        			case 'ampm':
        				if(select.value.toLowerCase()==='pm')
        					d[3]=parseInt(d[3])+12
    					break;
        		}
        	}
        });
        
        if(d){
        	var date = new Date(d[0],d[1]-1,d[2],d[3],d[4]);
        	feature.attributes[dn] = date.valueOf();
        }else{
        	required === true;
        }

		//get relationship from clicked feature
        if(this.relationship){
        	feature.attributes.NAME = this.relationship;
        }
        
        // check to see if there are any features stored in localStorage and add them to the POST
        if (localStorage.getItem('features') !== null) {
        	var features = [localStorage.getItem('features')];
        	for(var sf in features){
        		addFeatures.push(features[sf]);
        	}
        }
        
        if(!required){
        	$.ajax({
	            type: 'POST',
	            url: this.options.url + '/addFeatures',
	            data: {
	                    features: JSON.stringify(addFeatures), 
	                    f: 'json'
	                },
	            success: function(e){control._successfulAdd(e, addFeatures)},
	            error: function(e){control._addFailed(e, feature)}
	        })
        }
    },
    
    _successfulAdd : function(e, features, attachment){
        e = $.parseJSON(e);
        console.log(e);
        
        // show the added features without a call to the server
        var a = {};
        a.features = [];
        for(var i in features){      
        	var feature = typeof features[i] == 'string' ? $.parseJSON('['+features[i]+']') : features[i];
	    	function addNF(feature){
	    		var nf = {}
	    		nf.geometry = {};
		    	nf.geometry.x = feature.latlng.x;
		    	nf.geometry.y = feature.latlng.y;
		        nf.attributes = feature.attributes;
		        a.features.push(nf);
	       }
        	if(feature.length){
        		for(var j in feature){
        			f = feature[j];
        			addNF(f)
        		}
        	}else{
        		addNF(feature);
        	}
        }
        this._map.editLayer._processFeatures(a);
        
        // add attachement if it exists
        function reqListener(e){
        	console.log(e, this.resposeText);
        }
        if(features[0].attachment){
        	console.log(features[0].attachment);
        	// format for url for addAttachment POST
        	var uri = this.options.url + '/' + e.addResults[0].objectId + '/addAttachment',
            	xhr = new XMLHttpRequest(),
            	fd = new FormData();
			fd.append('attachment', features[0].attachment);
			xhr.open("POST", uri, true);
			xhr.onload = reqListener;
			xhr.send(fd)
        }
        
        
        // TODO find something better
        // hacky way to show the the new feature...
        // this._map.editLayer._hide();
        // this._map.editLayer._show();
		
		// disable the editControl
        this._toggleEditing();

        // clear any features stored in localStorage on successful add
        localStorage.clear();
    },
    
    _addFailed : function(e, feature){
    	console.log(e)
    	
		if (localStorage.getItem('features') === null) {
			  localStorage.setItem('features', JSON.stringify(feature));
			}else{
				var features = [localStorage.getItem('features')];
				features.push(JSON.stringify(feature));
				localStorage.setItem('features', features);
			}
    },
    
    _changeEditLayer : function(){
        
    },
    
    _onKeyDown : function(e) {
        if (e.keyCode == 27) {
            this._toggleEditing();
        }
    }
});

L.Map.mergeOptions({
    editControl : false
});

L.Map.addInitHook(function() {
    if (this.options.editControl) {
        this.editControl = new L.Control.EditAGS(this.options.editControl);
        this.addControl(this.editControl);
    }
});

L.control.editControl = function(options) {
    return new L.Control.EditAGS(options);
};