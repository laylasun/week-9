/* =====================
Lab 2: Geocoding and route calculation with Mapzen

So far, we've avoided doing complex operations on our GIS data. With
only front end tools at our disposal and a wide range of competencies
to develop, this is largely unavoidable in a single semester class. Luckily
enough, there now exist *free* online resources which can greatly reduce
the complexity of implementing some of these harder and more computationally
intensive tasks.

In this lab, we'll be using a few new features to actually plot out a route
from (roughly) where you are to a location you specify by typing in an address.

There are a few steps involved here. First, we'll go over (at a very high level)
these steps which the application must complete to be usable as a routing tool.
After that, a sequence of tasks will guide you through the process of building
this logic.

*Overview*

1. We need to know where we are currently (in the form of a lat/lng pair) so
    that we can plot this location and later use it as the origin for our route.
    Note: this has been provided for you. The application should automatically
    determine your location when you open it.
2. We'll need to find some way of converting the text from an input box into
    (at least one) lat/lng pair
3. With both an origin and a destination, we should be able to get directions
4. Directions should come back in a form which can be processed into a line which
    we can then plot on our map


*Tasks*

Task 0 (optional): Prepare your tools so that you can efficiently explore this problem

This could very well be the first complex set of API interactions you've had to
reason about. As is the case with most programming challenges, the faster you can
repeat the steps hypothesis creation ("I think this piece does X when I push Y")
and hypothesis testing ("It looks like X only *sometimes* happens when I push Y"),
the easier your life will be and the faster you'll be able to solve problems. To
this end, there are some nifty tools directly integrated into many modern browsers
which allow us to rapidly prototype API requests.

I suggest Postman, which is available for free in the chrome app store. It provides
a cleaner, easier way to test ajax calls than simply using the console.


Task 1: Use Mapzen's 'Search' API to 'geocode' information from your input

First, check out the documentation here: https://mapzen.com/documentation/search/
You might note that this task is slightly underspecified: there are multiple different
ways to transform text into an address. For the lab, the simplest (unstructured)
text-based 'search' is entirely appropriate. The win for structured search is that it
is far less likely to return bogus results.

To reiterate: you should experiment with this API and come to an understanding of how
it works BEFORE writing code you expect to use it. This can be done in the console or
in a REST client like Postman mentioned above.

Questions you should ask yourself:
  - What are the inputs?
  - How does the output look?
  - What can I do with the output?
  - Can I get a lat/lng from the output?


Task 2: Use Mapzen's 'Mobility' API to generate a route based on your origin and destination

The docs: https://mapzen.com/documentation/mobility/
Again, the task is somewhat underspecified. Let's start with the simplest routing
option available: 'Optimized Route' (https://mapzen.com/documentation/mobility/optimized/api-reference/).
Once you're getting a valid (as best you can tell) response from the server, move
to the next task.


Task 3: Decode Mapzen's route response

Intrepid readers may have already discovered that Mapzen route responses are NOT
in the familiar GeoJson format. Rather, they use a special encoding standardized
by google to try and cut down on response sizes and response times. The relevant
docs may be found here: https://mapzen.com/documentation/mobility/decoding/

Luckily for you, we've provided the logic to properly decode such shapes (copied
from the documentation to decode.js). The string you'll have to decode will look
something like this:

`ee~jkApakppCmPjB}TfCuaBbQa|@lJsd@dF|Dl~@pBfb@t@bQ?tEOtEe@vCs@xBuEfNkGdPMl@oNl^eFxMyLrZoDlJ{JhW}JxWuEjL]z@mJlUeAhC}Tzi@kAv`...

Note that the file `decode.js` is included, which introduces a function `decode`.
If you pass the shape string to the `decode` function, it will return an array of
points in [lat, lng] format.

To plot these on the map, write a function to convert them to GeoJSON. Remember:
GeoJSON is just an agreed upon format to storing shapes in JSON. Take a look
at what GeoJSON for a line looks like (you may want to create a line on geojson.io
as an example). How can you convert the array of points into the GeoJSON format?
Hint: GeoJSON defines points as [lng, lat] instead of [lat, lng], so you may need
to flip your coordinates.


Task 4: Plot your route to the map

If you've completed step 3 with valid GeoJson (test it at geojson.io), plotting it
to the map should be a breeze.


Task 5: (stretch) Try and display directions

Included in the response from Mapzen is information about the steps a driver or
or pedestrian (this depends on the 'cost' selected in your request) would have to
take to get from your origin to your destination.


Task 6: (stretch) See if you can refocus the map to roughly the bounding box of your route


===================== */

var state = {
  position: {
    marker: null,
    updated: null
  }
};

var currentLat, currentLng,
  currentlocation={};
var searchResults=[];
var showResults;
/* We'll use underscore's `once` function to make sure this only happens
 *  one time even if weupdate the position later
 */
var goToOrigin = _.once(function(lat, lng) {
  map.flyTo([lat, lng], 14);
});


/* Given a lat and a long, we should create a marker, store it
 *  somewhere, and add it to the map
 */
var updatePosition = function(lat, lng, updated) {
  if (state.position.marker) { map.removeLayer(state.position.marker); }
  state.position.marker = L.circleMarker([lat, lng], {color: "blue"});
  state.position.updated = updated;
  state.position.marker.addTo(map);
  goToOrigin(lat, lng);
};

$(document).ready(function() {
  /* This 'if' check allows us to safely ask for the user's current position */
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
      updatePosition(position.coords.latitude, position.coords.longitude, position.timestamp);
      currentLat=position.coords.latitude;
      currentLng=position.coords.longitude;
      currentlocation={"lat": currentLat, "lng": currentLng};
      console.log(currentLat, currentlocation);
      return currentLng, currentLat, currentlocation;
    });
  } else {
    alert("Unable to access geolocation API!");
  }

  /* Every time a key is lifted while typing in the #dest input, disable
   * the #calculate button if no text is in the input
   */
  $('#dest').keyup(function(e) {
    if ($('#dest').val().length === 0) {
      $('#calculate').attr('disabled', true);
    } else {
      $('#calculate').attr('disabled', false);
    }
  });

  // click handler for the "calculate" button (probably you want to do something with this)
  $("#calculate").click(function(e) {
    $('.results').remove();
    var dest = $('#dest').val();
    var search = "https://search.mapzen.com/v1/search?text=" + dest + "&api_key=mapzen-24TRuHw";
    //by default, 10 top results will be displayed
    $.ajax(search).done(function(s_outcome){
        var pointsArray= s_outcome.features;
        console.log(pointsArray);
        var selectedArray =_.filter(pointsArray, function(obj){
          return obj.properties.confidence > 0.9;
        });
        var confidenceAsIndex = _.map(selectedArray,function(obj2){
          var objNew = {
            'confidence': obj2.properties.confidence,
            'others': obj2
          };
          return objNew;
        });
        var sorted = _.sortBy(confidenceAsIndex, 'confidence');
        console.log(sorted);
        var lat, lng, county, region, accuracy, accuracy1, checkboxid;
        for(var i=0; i<sorted.length; i++){
            checkboxid='#cbox-input'+i;
            showResults='<div class="results"><input type="checkbox" id="cbox-input'+i+'"><br><div>Accuracy: <span id="accu"></span> </div><div>Latitude: <span id="lat"></span> </div><div>Longtitude: <span id="lng"></span></div><div>County: <span id="county"></span></div><div>Region: <span id="region"></span> </div></div>';
            $('#calculate').after(showResults);
              lat=sorted[i].others.geometry.coordinates[1];
              lng=sorted[i].others.geometry.coordinates[0];
              county=sorted[i].others.properties.county;
              region=sorted[i].others.properties.label;
              accuracy=parseFloat(sorted[i].confidence)*100;
              accuracy1=accuracy.toPrecision(3)+'%';
            $('#accu').text(accuracy1);
            $('#lat').text(lat);
            $('#lng').text(lng);
            $('#county').text(county);
            $('#region').text(region);
            console.log(checkboxid);

        }

    });

  });

  var mystry='https://matrix.mapzen.com/optimized_route?json={"locations":[{"lat":40.042072,"lon":-76.306572},{"lat":39.992115,"lon":-76.781559},{"lat":39.984519,"lon":-76.6956},{"lat":39.996586,"lon":-76.769028},{"lat":39.984322,"lon":-76.706672}],"costing":"auto","directions_options":{"units":"miles"}}&api_key=mapzen-24TRuHw';
 $.ajax(mystry).done(function(datum){
   //console.log(datum.trip.legs[0].shape); -->object already
   var shape1=datum.trip.legs[0].shape;
   var decode_shape1= decode(shape1);
   console.log(datum.trip.legs);
   var linestring1 = turf.lineString(decode_shape1);// the geojson storing the line segments
   console.log(linestring1);
    });
  });

var banana={color:"red",taste:"banana"};
var en = "www.doyoulikebanana.com?"+ JSON.stringify(banana);
console.log(en);
