
//Listener to trigger initialize function on window load
google.maps.event.addDomListener(window, "load", initialize);

var markers = [];
var map;
var marker;

function removeMarkers(){
  for(i=0; i<markers.length;i++){
    markers[i].setMap(null);
  }
}

//Zoom map out to show all possible markers
var bounds = new google.maps.LatLngBounds();

function zoomMap(){
  for (var i = 0; i < markers.length; i++){
    bounds.extend(markers[i].getPosition());
  }
  map.fitBounds(bounds);
}

// Initialize map configurations
function initialize() {
    console.log("initialized");
    var MapOptions = {
        center: new google.maps.LatLng(-27.3752881, 133.775136),
		zoom: 4,
		mapTypeid: google.maps.MapTypeId.ROADMAP,
	};
	map = new google.maps.Map(document.getElementById("map-canvas"), MapOptions);
}

//Get the long&lat of address, creates marker, centers on marker, zooms in
function searchAddress() {

  //remove existing markers
  //removeMarkers();

  var addressInput = document.getElementById('address-input').value;  
  //console.log("Address is:" + addressInput);
  
  var geocoder = new google.maps.Geocoder();

      geocoder.geocode({address: addressInput, componentRestrictions: {country: 'AU'}}, function(results, status) {
    
        if (status == google.maps.GeocoderStatus.OK) {

          //var myResult = results[0].geometry.location; // reference LatLng value
          
          //var latToBePassed = results[0].geometry.location.lat();
          //var longToBePassed = results[0].geometry.location.lng();
          //console.log(myResult); //display long and lat
          //console.log(results[0].geometry.location.lat()); //display lat
          
          //createMarkerlatlng(myResult); //call the function that adds the marker
          //map.setCenter(myResult);
          
          map.setZoom(17);

          //Post long and Lat data to NodeJS server - get response back with closest store
          var geocodeParams ={
        "address": "",
        "components": "components=country:AU",
        "language":   "en",
        "region":     "au"
         };

         geocodeParams.address = addressInput


      $.ajax({
        url: "/geocode",
        type: "POST",
        data: JSON.stringify(geocodeParams),
        contentType: "application/json",
        dataType: "json",
        success: function(data) {
          //
           removeMarkers();
           createMarker(data);
           createMarker(data.nearest);
           console.log(data)
           zoomMap();

        },
        error: function(err) {
           console.log('An error occured')
           console.log(err)
        }
      })

          }
          else (console.log("Something Broke" + google.maps.GeocoderStatus))
    });
  }

//for local marker
//function createMarkerlatlng(latlng){
///  marker = new google.maps.Marker({
 //   map: map,
 //   position: latlng
 // });
//}

//Function called that created the marker object and defines perameters
function createMarker(data) {
  console.log(data)
  var latlng = data.googleQuery.geometry.location;

console.log(latlng)
   marker = new google.maps.Marker({
      map: map,
      place: {
        placeId: data.googleQuery.place_id,
        location: new google.maps.LatLng(parseFloat(latlng.lat), parseFloat(latlng.lng))
      },
      position: new google.maps.LatLng(parseFloat(latlng.lat), parseFloat(latlng.lng))
   });
   markers.push(marker)
}