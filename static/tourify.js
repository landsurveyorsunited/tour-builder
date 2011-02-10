//Copyright 2010 Google Inc.
//
//Licensed under the Apache License, Version 2.0 (the "License");
//you may not use this file except in compliance with the License.
//You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//Unless required by applicable law or agreed to in writing, software
//distributed under the License is distributed on an "AS IS" BASIS,
//WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//See the License for the specific language governing permissions and
//limitations under the License.

google.load('earth','1');
google.load('maps', '2');

//initialize base TF object
var TF = TF || {};
PAUSE_DEFAULT = 0;
FLYTO_DEFAULT = 5;

TF.ge = null; //earth instance
TF.placemarks = [];
TF.currentId = 0;
TF.FLY_TO_SPEED = .5;
TF.inMotion = false;

TF.SEARCH_PLACEHOLDER = 'Find a location';
TF.SIMPLE_SEARCH_PLACEHOLDER = 'or search for a location';
TF.TITLE_PLACEHOLDER = 'Add a Tour Title';
TF.EARTH_RADIUS = 6378137;
TF.geocoder;

TF.init = function() {
  google.earth.createInstance('map3d', TF.initCallback, TF.failureCallback);
};

TF.initCallback = function(pluginInstance) {
  TF.ge = pluginInstance;
  TF.ge.getWindow().setVisibility(true);
  TF.makeRoundedCorners();
  // add a navigation control
  TF.ge.getNavigationControl().setVisibility(TF.ge.VISIBILITY_AUTO);

  if (TF.tour){
    //we are loading an existing tours
    //embed basic tour info like title or whatnot
    //add the placemark fields for editing
    //play the tour
    TF.playback(TF.tour);
    //TF.displayTour(TF.tour);
  } else {

    TF.$sidebar = $('#sidebar');

    // set up placemark prompt button
    $('#placemark_prompt').find('#take_button').click(TF.addNewPlacemark).show();

    // save button
    $('#save_button').show();
    $('#save_button').click(TF.submitPlaces);

    // select a placemark in the sidebar
    TF.$sidebar.delegate('.placemark', 'click', function(event) {
      for (var i = 0; i < TF.placemarks.length; i++) {
        if (this === TF.placemarks[i].element) {
          TF.placemarks[i].startSelect();

          break;
        }
      }
    });

    // TODO: deselect on move? disable update buttons when in motion?
    //google.earth.addEventListener(TF.ge.getView(), 'viewchangebegin', TF.startMotion);
    //google.earth.addEventListener(TF.ge.getView(), 'viewchangeend', TF.endMotion);

    // check boxes for layers, sync checkbox state and layer visibility
    $('#check_roads').change(function() {
      TF.ge.getLayerRoot().enableLayerById(TF.ge.LAYER_ROADS, $(this).is(':checked'));
    }).change();
    $('#check_borders').change(function() {
      TF.ge.getLayerRoot().enableLayerById(TF.ge.LAYER_BORDERS, $(this).is(':checked'));
    }).change();
    $('#check_buildings').change(function() {
      TF.ge.getLayerRoot().enableLayerById(TF.ge.LAYER_BUILDINGS, $(this).is(':checked'));
    }).change();

    TF.initTextBoxes();
    
    // TODO: maps v3...
    TF.geocoder = new google.maps.ClientGeocoder();
  }
};

TF.simpleInit = function() {
  google.earth.createInstance('map3d', TF.simpleInitCallback, TF.failureCallback);
};

TF.simpleInitCallback = function(pluginInstance) {
  TF.ge = pluginInstance;
  TF.ge.getWindow().setVisibility(true);
  TF.makeRoundedCorners();

  // add a navigation control
  TF.ge.getNavigationControl().setVisibility(TF.ge.VISIBILITY_AUTO);

  // save button
  $('#simple_save').show();
  $('#simple_save').click(TF.simpleSubmitPlace);

  // check boxes for layers, sync checkbox state and layer visibility
  $('#check_roads').change(function() {
    TF.ge.getLayerRoot().enableLayerById(TF.ge.LAYER_ROADS, $(this).is(':checked'));
  }).change();
  $('#check_borders').change(function() {
    TF.ge.getLayerRoot().enableLayerById(TF.ge.LAYER_BORDERS, $(this).is(':checked'));
  }).change();
  $('#check_buildings').change(function() {
    TF.ge.getLayerRoot().enableLayerById(TF.ge.LAYER_BUILDINGS, $(this).is(':checked'));
  }).change();

  TF.initTextBoxes();
};

TF.failureCallback = function(errorCode) {

};

TF.startMotion = function() {

};

TF.deselectPlacemark = function() {
  if (TF.currentId >= 0) {
    TF.placemarks[TF.currentId].finishSelect();
    TF.currentId = -1;
  }
};

TF.placemarkInnerHTML = '<span class="placemark_number"></span><input type="text" class="placemark_title" value="Unknown Location" /><div><span class="show_options">[+] show advanced options</span></div><div class="placemark_options">Flyto Style: <select class="side_place_item"><option value="smooth">smooth</option><option value="bounce">bounce</option><option value="spinny">spinny</option></select><div class="side_place_item">Time: <input class="placemark_flyto" size="15"></div><div class="side_place_item">Pause: <input class="placemark_pause" size="15"></div><div class="side_place_item">Description:<br><textarea class="placemark_description" rows="3" cols="40"></textarea></div></div><button class="update_button">Update Snapshot to Current View</button>';

TF.placemarkShortPrompt = 'Find another location.'

TF.addNewPlacemark = function() {
  var id = TF.placemarks.length;
  
  // update prompt
  var prompt = $('#placemark_prompt');
  prompt.find('.placemark_num').html(id + 2);
  prompt.find('.prompt').html(TF.placemarkShortPrompt);

  // create new placemark element
  var element = document.createElement('div'),
      $element = $(element);
  element.className = 'placemark';

  // set content and id number
  element.innerHTML = TF.placemarkInnerHTML;
  $element.find('.placemark_number').html((id+1) + '.');
  
  // hide options and set click handler to reveal
  var options = $element.find('.placemark_options').hide();
  $element.find('.show_options').click(function(e) { options.toggle(200); e.preventDefault(); return false; });
  
  // update snapshot button. return false to interact properly with sidebar event delegation
  $element.find('.update_button').click(function(e) { TF.placemarks[id].setLookAt(); TF.placemarks[id].startSelect(); e.preventDefault(); return false; });
  
  // add to dom
  prompt.before(element);

  var entry = {
    lookat: {},
    id: id,
    element: element,
    $element: $element,

    startSelect: function() {
      // deselect any currently selected placemarks
      TF.deselectPlacemark();
      TF.currentId = id;
      
      // fly to this point
      TF.flyToLookAt(this.lookat, TF.FLY_TO_SPEED);//TF.ge.SPEED_TELEPORT);

      $element.addClass('selected');
      //$element.find('input, select, textarea').removeAttr('disabled');
      
      // scroll
      TF.$sidebar.animate( { scrollTop: $element.position().top }, 400, 'swing' );
    },

    finishSelect: function() {
      $element.removeClass('selected');
      //$element.find('input, select, textarea').attr('disabled','disabled');
    },

    setLookAt: function() {
      var la = TF.ge.getView().copyAsLookAt(TF.ge.ALTITUDE_RELATIVE_TO_GROUND);
      
      // plugin lookat
      this.lookat.lat = la.getLatitude();
      this.lookat.lng = la.getLongitude();
      this.lookat.alt = la.getAltitude();
      this.lookat.rng = la.getRange();
      this.lookat.tilt = la.getTilt();
      this.lookat.heading = la.getHeading();
      this.lookat.mode = la.getAltitudeMode();

      // form elements
      // TODO: validate data from inputs
      // TODO: these should be cached or (at the least) queried directly from Sizzle
      this.lookat.flyto = TF.parseIntValue($element.find('.placemark_flyto').val());
      this.lookat.pause = TF.parseIntValue($element.find('.placemark_pause').val());
      this.lookat.title = $element.find('.placemark_title').val();
      this.lookat.description = $element.find('.placemark_description').val();

      //$element.find('.lookat_details').html(TF.getLookatSummary(la));
      
      // TODO: dont't change title once user has set it once
      TF.geocoder.getLocations(new GLatLng(this.lookat.lat, this.lookat.lng), this._geocoderLocCallback);
    },
    
    _geocoderLocCallback: function(response) {
      var titleEl = $element.find('.placemark_title');
      
      if (!response || response.Status.code != 200) {
        titleEl.val(response.name || 'Unknown');
      } else {
        //console.log(response.Placemark);
        var index = Math.max(0, response.Placemark.length - 2);
        titleEl.val(response.Placemark[index].address || 'Unknown');
      }
    }
  };

  TF.placemarks[id] = entry;
  entry.setLookAt();
  entry.startSelect();
};

TF.parseIntValue = function(n) {
  n = parseInt(n, 10);
  return !isNaN(n) ? n : 0;
};

/**
* Create simple summary line for a lookat
* @param {obj} the lookat
*/
TF.getLookatSummary = function(la){
  //create summary info
  var range = parseInt(la.getRange()),
      dist = (range > 5000) ? ~~(range/1000)+' km' : range+' m';

  return 'Loc: ' +
          (la.getLatitude() + '').substring(0,8) + ', ' +
          (la.getLongitude() + '').substring(0,8) + ' from ' +
          dist;
};


/**
* post all places back to the server for a new Tour
**/
TF.submitPlaces = function(){
  var lst = [];
  for (var i = 0; i < TF.placemarks.length; i++) {
    lst.push(TF.placemarks[i].lookat);
  }

  // tour level variable
  var roads = $('#check_roads').is(':checked'),
      borders = $('#check_borders').is(':checked'),
      buildings = $('#check_buildings').is(':checked'),
      title = $('#tour_title').val();

      window.jsonstr = JSON.stringify({'lookats' : lst, advanced: true,
            'roads': roads,
            'borders': borders,
            'buildings': buildings,
            'title': title
            });

  $.post('/tours/create/', {tour : window.jsonstr},
    function(rsp){
      //console.log('success',rsp);
      window.location = '/tours/' + rsp.tour + '/';
    },
    'json');
};

/**
* post single place back to the server for a new Tour
**/
TF.simpleSubmitPlace = function(){
  var lookat = {},
      la = TF.ge.getView().copyAsLookAt(TF.ge.ALTITUDE_RELATIVE_TO_GROUND);

  lookat.lat = la.getLatitude();
  lookat.lng = la.getLongitude();
  lookat.alt = la.getAltitude();
  lookat.rng = la.getRange();
  lookat.tilt = la.getTilt();
  lookat.heading = la.getHeading();
  lookat.mode = la.getAltitudeMode();

  // form elements
  // TODO: figure out value -> earth value conversion
  // TODO: add description
  //this.lookat.flyto = TF.parseIntValue(flyto_time.value);
  //this.lookat.pause = TF.parseIntValue(pause.value);
  //lookat.title = title.value;
  //lookat.description = descr.value;
  //lookat.spin = $('#check_spin').is(':checked');

  var roads = $('#check_roads').is(':checked'),
      borders = $('#check_borders').is(':checked'),
      buildings = $('#check_buildings').is(':checked'),
      spin = $('#check_spin').is(':checked'),
      title = $('#tour_title').val();

  $.post('/tours/create/', {tour: JSON.stringify({'lookats':[lookat],
                                                    advanced: false,
                                                    'roads': roads,
                                                    'borders': borders,
                                                    'spin': spin,
                                                    'buildings': buildings,
                                                    'title': title
                                                    })},
    function(rsp){
      //console.log('success',rsp);
      window.location = '/tours/' + rsp.tour + '/';
    },
    'json');
};

/* Play back a tour
* @param {tour} javascript of the tour with associated lookats
*/
TF.playback = function(tour){
  //set up base tour layers
  var baseLayers = {
   'buildings' : 'LAYER_BUILDINGS',
   'borders' : 'LAYER_BORDERS',
   'roads' : 'LAYER_ROADS'
  }
  $.each(baseLayers, function(tourLayer, geLayer){
    if (tour[tourLayer]){
      TF.ge.getLayerRoot().enableLayerById(TF.ge[geLayer], true);
    }
  });

  var pause = 0;
  $.each(tour.lookats, function(i,lookat){
    lookat.flyto = lookat.flyto || FLYTO_DEFAULT;
    lookat.pause = lookat.pause || PAUSE_DEFAULT;
    setTimeout ("TF.playLookAt(" + i + ")", pause + lookat.pause * 1000);
    pause += (lookat.pause + lookat.flyto) * 1000;
  });

  //do final spinny if needed
  if (tour.spin){
    //TODO figure out arrival time if no pause
    setTimeout("TF.startSpin()", pause || 5 * 1000)
  }

};

TF.startSpin = function(){
  google.earth.addEventListener(TF.ge, 'frameend', TF.spin);
  TF.spin();
}


/* spin around where yer at
**/
TF.spin = function(){
  TF.ge.getOptions().setFlyToSpeed(4.9)//TF.ge.SPEED_TELEPORT);
  var lookAt = TF.ge.getView().copyAsLookAt(TF.ge.ALTITUDE_RELATIVE_TO_GROUND);
  var heading = lookAt.getHeading();
  heading = heading < 360 ? heading + .5 : heading - 360;
  lookAt.setHeading(heading);
  TF.ge.getView().setAbstractView(lookAt);
}

/* Play back a specific lookat
*  @param {obj} the lookat
**/
TF.playLookAt = function(id){
  var tla = TF.tour.lookats[id],
      la = TF.ge.createLookAt('');

  la.setLatitude(tla.lat);
  la.setLongitude(tla.lng);
  la.setTilt(tla.tilt);
  la.setHeading(tla.heading);
  la.setRange(tla.rng);
  TF.ge.getOptions().setFlyToSpeed(.5);//TODO: make dynamic

  TF.ge.getView().setAbstractView(la);
};

TF.flyToLookAt = function(la, speed) {
  var look = TF.ge.createLookAt('');

  look.setLatitude(la.lat);
  look.setLongitude(la.lng);
  look.setTilt(la.tilt);
  look.setHeading(la.heading);
  look.setRange(la.rng);
  TF.ge.getOptions().setFlyToSpeed(speed);

  TF.ge.getView().setAbstractView(look);
};

TF.initTextBoxes = function() {
  var searchBox = $('#search-box');
  searchBox.attr('placeholder', TF.SEARCH_PLACEHOLDER);

  if (searchBox.val() == '' || searchBox.val() == TF.SEARCH_PLACEHOLDER) {
    searchBox.val(TF.SEARCH_PLACEHOLDER);
    searchBox.addClass('placeholder');
  }

  function inputFocus(event) {
    var box = $(this);

    if (box.val() == '' || box.val() == event.data.placeholder) {
      box.val('');
      box.removeClass('placeholder');
    }
  }

  function inputBlur(event) {
    var box = $(this);

    if (box.val() == '' || box.val() == event.data.placeholder) {
      box.val(event.data.placeholder);
      box.addClass('placeholder');
    }
  }

  searchBox.bind('focus', {placeholder: TF.SEARCH_PLACEHOLDER}, inputFocus);
  searchBox.bind('blur', {placeholder: TF.SEARCH_PLACEHOLDER}, inputBlur);

  searchBox.change(function() {
    $('#search-error').hide();
  });

  searchBox.keypress(function() {
    $('#search-error').hide();
  });

  // search on submit
  $('#search-form').submit(function(event) {
    TF.performSearch();

    return false;
  });

  // title box
  var titlebox = $('#tour_title');
  titlebox.attr('placeholder', TF.TITLE_PLACEHOLDER);
  titlebox.bind('focus', {placeholder: TF.TITLE_PLACEHOLDER}, inputFocus);
  titlebox.bind('blur', {placeholder: TF.TITLE_PLACEHOLDER}, inputBlur);
};

TF.performSearch = function() {
  var searchBox = $('#search-box');
  var searchQuery = searchBox.val().replace(/(^\s+)|(\s+$)/g, '');

  if (searchQuery == '' ||
      searchQuery == TF.SEARCH_PLACEHOLDER)
    return;

  // TODO: loading indicator
  //document.getElementById('search-loading').style.display = 'block';

  var geocoder = new google.maps.ClientGeocoder();
  geocoder.getLocations(searchQuery, function(response) {
    //document.getElementById('search-loading').style.display = 'none';
    if (response.Status.code != 200 || !response.Placemark) {
      // TODO: search error
      //document.getElementById('search-error').innerHTML = 'No results found.';
      //document.getElementById('search-error').style.display = 'block';
      //console.log('No results found');
    } else {
      searchBox.val(response.Placemark[0].address);

      var earthNode = $('#map3d');
      var aspectRatio = earthNode.width() / earthNode.height();

      var lookAt = TF.computeBBoxView(TF.ge, {
        north: response.Placemark[0].ExtendedData.LatLonBox.north,
        south: response.Placemark[0].ExtendedData.LatLonBox.south,
        east: response.Placemark[0].ExtendedData.LatLonBox.east,
        west: response.Placemark[0].ExtendedData.LatLonBox.west
      }, aspectRatio);

      TF.ge.getView().setAbstractView(lookAt);
    }
  });
};

TF.earthDistance = function(p1, p2) {
  var a = Math.sin(p1.lat * Math.PI / 180) * Math.sin(p2.lat * Math.PI / 180);
  var b = Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.cos((p2.lon - p2.lon) * Math.PI / 180);
  return TF.EARTH_RADIUS * Math.acos(a + b);
};

TF.computeBBoxView = function(pluginInstance, bbox, aspectRatio) {
  var DEGREES = Math.PI / 180;

  var coords = [
      [bbox.north, bbox.east],
      [bbox.north, bbox.west],
      [bbox.south, bbox.west],
      [bbox.south, bbox.east]];

  // find center
  var center = {
    lat: (bbox.north + bbox.south) / 2,
    lon: (bbox.east + bbox.west) / 2
  };

  var lngSpan = TF.earthDistance({ lat: center.lat, lon: bbox.east },
                              { lat: center.lat, lon: bbox.west });
  var latSpan = TF.earthDistance({ lat: bbox.north, lon: center.lon },
                              { lat: bbox.south, lon: center.lon });

  if (!aspectRatio)
    aspectRatio = 1.0;

  var PAD_FACTOR = 1.5; // add 50% to the computed range for padding
  var beta;

  var aspectUse = Math.max(aspectRatio, Math.min(1.0, lngSpan / latSpan));
  var alpha = (45.0 / (aspectUse + 0.4) - 2.0) * DEGREES; // computed experimentally;

  // create LookAt using distance formula
  if (lngSpan > latSpan) {
    // polygon is wide
    beta = Math.min(90 * DEGREES, alpha + lngSpan / 2 / TF.EARTH_RADIUS);
  } else {
    // polygon is taller
    beta = Math.min(90 * DEGREES, alpha + latSpan / 2 / TF.EARTH_RADIUS);
  }

  range = PAD_FACTOR * TF.EARTH_RADIUS * (Math.sin(beta) *
    Math.sqrt(1 / Math.pow(Math.tan(alpha),2) + 1) - 1);

  var la = pluginInstance.createLookAt('');
  la.set(center.lat, center.lon, 0,
         pluginInstance.ALTITUDE_RELATIVE_TO_GROUND, 0, 0, range);
  return la;
};

TF.earthBatch = function(fn) {
  google.earth.fetchKml(TF.ge, '', fn);
}


TF.makeRoundedCorners = function() {
  TF.earthBatch(function() {
    var makeCorner_ = function(x, y, rot) {
      var screenOverlay = TF.ge.createScreenOverlay('');
      var ge = TF.ge;
      var icon = ge.createIcon('');
      icon.setHref(document.location.origin + '/static/earth-corner.png');
      screenOverlay.setIcon(icon);

      screenOverlay.getOverlayXY().set(
          x, ge.UNITS_FRACTION, y, ge.UNITS_FRACTION);
      screenOverlay.getScreenXY().set(
          x, ge.UNITS_FRACTION, y, ge.UNITS_FRACTION);
      screenOverlay.getSize().set(15, ge.UNITS_PIXELS, 15, ge.UNITS_PIXELS);
      screenOverlay.setRotation(rot);

      ge.getFeatures().appendChild(screenOverlay);
    };

    makeCorner_(0, 1, 0); // TL
    makeCorner_(0, 0, 90); // BL
    makeCorner_(1, 0, 180); // BR
    makeCorner_(1, 1, 270); // TR
  });
}

