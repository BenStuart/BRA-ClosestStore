//importing required packages
var config = require('./package.json')
var __cwd = process.cwd()
var express = require('express')
var app = express()
var bodyParser = require('body-parser')
app.use(bodyParser.json())
var fs = require('fs')
var S = require('string')


// Used to limit the amount of events triggered
var Bottleneck = require("bottleneck")
var requests_per_second = 1000 // Maximum 100 requests per second
var limiter = new Bottleneck(0, 1000/(requests_per_second))

// CSV -> JSON Converter - https://www.npmjs.com/package/csvtojson
var csvtojson_converter = require("csvtojson").Converter
var csvtojson = new csvtojson_converter({})

// Setup google maps API NodeJS side
var GoogleMapsAPI = require('googlemaps')
var publicConfig = {
  key: 'AIzaSyAb4r3JNgzI8E4S6QrkrqiCZeVneTmgFmE',
  stagger_time:       1000, // for elevationPath
  encode_polylines:   false,
  secure:             true, // use https
}
var gmAPI = new GoogleMapsAPI(publicConfig)

var longlat;
var locations;

// Import cvs file from given location
csvtojson.fromFile(__cwd + "/data.csv",function(err,result){
	if (err) { throw err }
  if(result) {

    // Iterate through each row in excel doc
    result.forEach(function(listItem, index)
  	{


      var linenumber = index + 2

      // Create geocode object with given properties
      var geocodeParams = {
        "address": "",
        "components": "components=country:AU",
        "language":   "en",
        "region":     "au"
      }

      // Change street line 1 or street line 2's string if contains "S/C"
      if(S(listItem["Street Line 1"]).contains("S/C") || S(listItem["Street Line 2"]).contains("S/C")){
      	listItem["Street Line 1"] = listItem["Street Line 1"].replace('S/C','Shopping Center')
      	listItem["Street Line 2"] = listItem["Street Line 2"].replace('S/C','Shopping Center')
      };

      if(S(listItem["Street Line 1"]).contains("Ctr")){
        listItem["Street Line 1"] = listItem["Street Line 1"].replace('Ctr','Center')
      }

      // If row column specified is not empty add content of row to geocodeParams
      if(listItem['Street Line 1']) geocodeParams.address += listItem['Street Line 1'];
      if(listItem['Street Line 2'] && geocodeParams.address) geocodeParams.address += ', ';
      if(listItem['Street Line 2']) geocodeParams.address += listItem['Street Line 2'];

      if(listItem.Suburb && geocodeParams.address) geocodeParams.address += ', ';
      if(listItem.Suburb) geocodeParams.address += listItem.Suburb;
      if(listItem.Postcode && geocodeParams.address) geocodeParams.address += ', ';
      if(listItem.Postcode) geocodeParams.address += listItem.Postcode;

      if(listItem['Analysis Forest \ State'] && geocodeParams.address) geocodeParams.address += ', ';
      if(listItem['Analysis Forest \ State']) geocodeParams.address += listItem['Analysis Forest \ State'];

      //console.log(geocodeParams)

      // Limiter is used to time when the requests are sent to geocode so we don't get kicked out
      limiter.submit(function(callback){
        gmAPI.geocode(geocodeParams, callback)
      }, function(err, result){ 
        if(err) throw er

        if(!result.results.length) {
          //console.log('Can\'t find address for '+ geocodeParams.address)

          //output unkown addresses to a text doc
          fs.appendFile("output.txt", 'Can\'t find address for '+listItem['Account Name']+' @ ('+linenumber+') ' + geocodeParams.address + "\n", function(err){
          	if(err){
          		return console.log(err)
          	}
          	//console.log("The file was saved!");
          });

        }
        else {

          //console.log('Found Address')
          //console.log('Found('+linenumber+')')

          //long and lat of result
          //console.log(result.results[0].geometry.location)

          //full object "googleQuery"
          //console.log(result.results[0])

          listItem.location = result.results[0].geometry.location
          listItem.googleQuery = result.results[0]
          //console.log('Found Location')
        }

      })
    })
  }
  locations = result
})

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

app.post('/geocode', function(req, res) {
	//console.log("post activated");
  limiter.submit(function(callback){
    var geocodeParams = req.body
    gmAPI.geocode(geocodeParams, callback)
  }, function(err, googleQuery){
    if(!err) {
      if(googleQuery.status == 'OK') {
        googleQuery.results.forEach(function(result, index_gq) {
          if(index_gq < 1)
          {
            var nearest;
            var nearest_location = null;
            var request_location = result.geometry.location;

            //locations is the google query - request_location is the one the user put in.
            locations.forEach(function(location, index_l) {

              
              if(location.location)
              {
                //console.log("Location Address and Geocode " + location.address_components + " " + location.location.lat + " " + location.location.lng)

                //console.log(JSON.stringify(location) + "\n")

                var d = getDistanceFromLatLonInKm(request_location.lat, request_location.lng, location.location.lat, location.location.lng)
                if(d < nearest || !nearest)
                {
                  nearest = d;
                  nearest_location = location;
                  longlat = location.location
                  // **** Testing ****

                  //console.log(request_location)
                  //console.log(location.location);

                  //Id to be returned 
                  //console.log(location.googleQuery.place_id);
                  //console.log(location.googleQuery)
                  //console.log(location.googleQuery.geometry.location)
                }

              }
            })
            res.send({status: 'success', googleQuery: googleQuery.results[0], nearest: nearest_location})
          }

          // Calculate Distance
          googleQuery.nearest = 100 //100km test
        })
        //console.log(result)

      }
      else {
        res.send({status: 'error', googleQuery: result})

      }
    }
    else {
      res.send({status: 'error'})
    }

  })
})

app.use('/',express.static(__dirname + '/public'))

app.listen(3000, function () {
  console.log('App listening on port 3000')
})