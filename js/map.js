var app = app || {};
app.legends = {};
app.identify = {};

$(document).ready(function() {
    var geometryserver = 'http://192.168.200.19:6080/arcgis/rest/services/Utilities/Geometry/GeometryServer/';
    var esriAttribution = 'Tiles: &copy; Esri';
    var restServiceURL = 'http://10.21.4.27:6080/arcgis/rest/services/General';

    $.support.cors = true;

    //disable selecting loading display
    var _preventDefault = function(evt) {
        evt.preventDefault();
    };
    $("#loading").bind("dragstart", _preventDefault).bind("selectstart", _preventDefault);

    // //get mouse position for 
    // $(window).on('click',function(e){
    // app.mouseX = e.pageX;
    // app.mouseY = e.pageY;
    // });
    // get mouse position for tooltip
    $('#map').mousemove( function(e) {
        app.liveMouseX = e.pageX;
        app.liveMouseY = e.pageY;
    });

    // set up projection definitions
    // Proj4js.defs["EPSG:2227"] = "+proj=lcc +lat_1=38.43333333333333 +lat_2=37.06666666666667 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs ";
    
    //web mercator auxilliary sphere
    Proj4js.defs["EPSG:7483"] = "+proj=longlat +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs";
    //web mercator 
    Proj4js.defs["EPSG:4326"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
    var fromEPSG = new Proj4js.Proj('EPSG:4326');
    var toEPSG = new Proj4js.Proj('EPSG:7483');

    // function toggleTOC() {
        // $('.leaflet-left').animate({
            // left : parseInt($('.leaflet-left').css('left'), 0) == 0 ? 225 : 0
        // }, 0);
        // $('#controls').stop().toggle('slide');
        // $('.toggleTOC').html() === "Hide" ? $('.toggleTOC').html("Show") : $('.toggleTOC').html("Hide");
    // }

    // function for sorting identify and search results
    function predicatBy(prop) {
        return function(a, b) {
            var aStr, bstr;
            try {
                aStr = parseFloat(a[prop].split(" ")[0]);
                bStr = parseFloat(b[prop].split(" ")[0]);
            } catch(err) {/*do nothing*/
            }
            if (isNaN(aStr) || isNaN(bStr)) {
                if (a[prop] > b[prop]) {
                    return 1;
                } else if (a[prop] < b[prop]) {
                    return -1;
                }
            } else {
                if (aStr > bStr) {
                    return 1;
                } else if (aStr < bStr) {
                    return -1;
                }
            }
            return 0;
        }
    }
    
    //////  MAP LAYERS
    app.cities = new lvector.AGS({
                    url: restServiceURL + '/cities' + "/MapServer/" + 0,
                    fields: "*",
                    esriOptions: true,
                    popupTemplate: true,
                    showAll: true,
                    editForm: $('#cities'),
                    label: 'Cities',
                    poupupOptions: {autoPan: false},
                    autoUpdate : true,
                    maxBounds : '-124.52178955078125,36.87962060502676,-119.24835205078125,38.85040342169187'
                });
    app.cities.label = 'Cities';
    
    //      BASEMAPS
    app.imagery = new L.TileLayer("http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution : esriAttribution,
        zIndex : 2
    });
    app.streets = new L.TileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution : esriAttribution,
        zIndex : 1,
        maxZoom : 19
    });
    
    app.initlayers = [app.cities, app.streets];

    //      INITIATE MAP
    app.map = new L.map('map', {
        center : new L.LatLng(37.70012, -122.33688),
        zoom : 10,
        measureControl : true,
        // editControl : {
                // title: "Join the carpool", 
                // position: 'topleft',
                // url: 'http://10.21.4.27:6080/arcgis/rest/services/General/cities/FeatureServer/1'
            // },
        maxZoom : 19,
        layers : app.initlayers
    });

    // setup editLayer for editControl
    app.map.editLayer = app.cities;
    
    // show the active basemap
    $('#streetsThumb').toggleClass('colorshifthover');

    // if(app.shellName==='Desktop'){
        //set the leaflet controls position
        // $('.leaflet-left').css({
            // left : '225px'
        // });
    // }else{
        $('#controls').hide();
        // $('.toggleTOC').html("Show");
    // }

    app.baseMaps = {
        "Streets" : app.streets,
        "Imagery" : app.imagery
    };

    var layerOrder = ['cities'];
    app.overlayMaps = {
        "cities" : app.cities
    };

    //      CHANGE BASEMAPS
    $('#streetsThumb').bind('click', function() {
        changeBasemap(this, 'Streets')
    });
    $('#terrainThumb').bind('click', function() {
        changeBasemap(this, 'Imagery')
    });

    function changeBasemap(el, lyr) {
        if ($(el).hasClass('colorshifthover')) {
            // do nothing
        } else {
            for (var item in app.baseMaps) {
                var obj = app.baseMaps[item];
                if (app.map.hasLayer(obj)) {
                    app.map.removeLayer(obj);
                }
            }
            // add or remove colorshift for all basemap thumbs
            $('.base_thumb').toggleClass('colorshifthover');
            // add the new basemap
            app.map.addLayer(app.baseMaps[lyr]);
        }
    }

    // create full extent button
    var fullExtent = $('<div class="leaflet-control-zoom leaflet-bar leaflet-control"><a class="full-extent leaflet-bar-part leaflet-bar-part-top-and-bottom" href="#" title="Full Extent"></a></div>').on('click', L.DomEvent.stopPropagation).on('click', L.DomEvent.preventDefault).on('click', function() {
        app.map.setView(app.map.options.center, app.map.options.zoom);
    }).on('dblclick', L.DomEvent.stopPropagation);

    // create open in google maps button
    var googlemap = $('<div class="leaflet-control-zoom leaflet-bar leaflet-control"><a class="googlemap leaflet-bar-part leaflet-bar-part-top-and-bottom" href="#" title="Open in google maps"></a></div>').on('click', L.DomEvent.stopPropagation).on('click', L.DomEvent.preventDefault).on('click', openGoogleMap).on('dblclick', L.DomEvent.stopPropagation);

    // create toggleTOC button
    // var toggleTOC = $('<div class="rotate270 toggle leaflet-control-zoom leaflet-bar leaflet-control"><a class="toggleTOC leaflet-bar-part leaflet-bar-part-top-and-bottom" href="#" title="Toggle Table of Contents">Hide</a></div>').on('click', L.DomEvent.stopPropagation).on('click', L.DomEvent.preventDefault).on('click', toggleTOC).on('dblclick', L.DomEvent.stopPropagation);

    // append full-extent, google maps, and toggleTOC buttons below leaflet-control-zoom
    $('.leaflet-top.leaflet-left').append(fullExtent).append(googlemap);//.prepend(toggleTOC);
    
    $.ajax({
            url : restServiceURL + '/cities' + '/MapServer/' + '/legend?f=pjson',
            success : function(j) {
                j = $.parseJSON(j);
                var l = document.createElement('div');
                l.className = 'layerlegend';
                
                $.each(j.layers, function() {
                    var layer = app.overlayMaps[layerOrder[this.layerId]];
                    var displayLabel = layer.label;
                    layer.legendjson = this.legend;
                    
                    var h = $('<div class="legendGroup"><span class="resultsLayerName">' + displayLabel + '</span></div>');
                    var c = $('<img class="nocheck check"/>');
                    $(h).prepend(c);
                    h = $(h)[0];
                    var ul = '<ul></ul>';
                    ul = $(ul)[0]
                    var lgi, thing;
                    $.each(this.legend, function() {
                        lgi = '<li class="legendItem"><span><img class="legendImage" src="data:image/png;base64,' + this.imageData + '"/></span><span>' + this.label + '</span></li>';
                        thing = document.createElement('img');
                        thing.className = 'legendImage';
                        thing.src = 'data:image/png;base64,' + this.imageData;
                        lgi = $(lgi)[0];
                        $(ul).append(lgi);
                    });
                    $(h).append(ul);
                    $(h).click(function() {
                        $(ul).stop().fadeToggle();
                        $(c).toggleClass('check');
                        !layer.options.map ? layer.setMap(app.map) : layer.setMap(null);
                    });
                    $(l).append(h);
                    
                    var li = document.createElement('li');
                    li.className = "tocItem";
                });
                
                $('#TOC').append(l);
            }
        });
        
 

    function isOdd(x){ return x & 1; };
    
    function getCenterCoords(geom){
        var x, y,
            xs = [],
            ys = [];
        $.each(geom, function(n){
            xs.push(this.x);
            ys.push(this.y);    
        });
        var Xsum = xs.reduce(function(a, b) { return a + b });
        var x = Xsum / xs.length;
        var Ysum = ys.reduce(function(a, b) { return a + b });
        var y = Ysum / ys.length;
        
        return [y,x];
    }

    // attach handler to get map click position
    app.map.on('click', function(e) {
            // don't sent the identify request if measuring mode or boxZoom are happening
            if (!app.map.measureControl._measuring && !e.originalEvent.shiftKey) {
                //clear results box and add title;
                if ($('#lightboxcontent').css('display') === 'none') {
                    $('#lightboxTitle').html('');
                    $('#resultsContainer').empty();
                    $('.search').hide();
                    $('#searchBTN').hide();
                }
            }
        })
        // .on('popupopen', function(){popupOpen = true; setPopupTitle();})
        .on('popupclose', function(){popupOpen = false; popupTitle = $('<span></span>');});
       
    var popupTitle = $('<span></span>');     
    function setPopupTitle(){
        !popupTitle ? null : $('.leaflet-popup-content-wrapper').prepend($('<h4 class="popupTitle"></h4>').html(popupTitle));
    }
    
    function openGoogleMap() {
        var latlng = app.map.getCenter();
        var url = 'http://maps.google.com/?q=' + latlng.lat + ',' + latlng.lng + '&z=' + app.map.getZoom();
        //20';
        window.open(url, '_blank');
    }

    // $(window).resize(function() {
        // $('#controls').height($(window).height() - $('#topbar').height());
        // $('#resultsContainer').height($('#lightboxcontent').height() - 95);
    // });
    // end document.ready function
}); 