// Base Elastic Search URL
url_business_base = "http://54.183.182.71:9200/yelp/business/_search?size=2000"

//Width and height
var w = 1400;
var h = 200;
var barPadding = 0.2;
var margin = {top:100,bottom:100,right:100,left:100};	

var icon = L.icon({
    iconUrl: './js/images/fork55.png',
    //shadowUrl: 'leaf-shadow.png',

    iconSize:     [38, 95], // size of the icon
    shadowSize:   [50, 64], // size of the shadow
    iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});


function drawMarkerArea(data, center) {
      var xf = crossfilter(data);
      var groupname = "marker-area";
      var business = xf.dimension(function(d) { return d.location; });
      var businessGroup = business.group().reduceCount();

      var marker = dc_leaflet.markerChart("#viz_neighborhood .map", groupname)
          .dimension(business)
          .group(businessGroup)
          .width(600)
          .height(400)
          .center(center)
          .zoom(12)
          .renderPopup(true)
          //.popup(function(d) { console.log(d); })
          .filterByArea(true)
          //.icon(icon);

      /*
      var types = xf.dimension(function(d) { return d.type; });
      var typesGroup = types.group().reduceCount();

      var pie = dc.pieChart("#demo2 .pie",groupname)
          .dimension(types)
          .group(typesGroup)
          .width(200)
          .height(200)
          .renderLabel(true)
          .renderTitle(true)
          .ordering(function (p) {
              return -p.value;
          });

      dc.renderAll(groupname);
      return {marker: marker, pie: pie};
     */
     dc.renderAll(groupname);
     return {marker: marker};

  }


/* Get the lat/lon */
url_1 = '{"query":{"match":{"business_id":"4bEjOyTaDG24SY5TxsaUNQ"}},"fields":["longitude","latitude","categories"]}'


var lat = null;
var lon = null;
var url_2 = null;

d3.json(url_business_base, function(error, d){
	if (error) {  //If error is not null, something went wrong.
      console.log(error);  //Log the error.
    } else {      //If no error, the file loaded correctly. Yay!
      console.log(d);
  	}

  	lat = d.hits.hits[0].fields.latitude[0]
  	lon = d.hits.hits[0].fields.longitude[0]
  	console.log(lon + ',' + lat);

  	var categories = d.hits.hits[0].fields.categories.join(' ')
  	console.log(categories);


  	/* Get neighborhood businesses */
		
		/*
		url_2 = '{"query":{"filtered":{"filter":{"geo_distance":{"distance":"1km","location":{"lat":' + lat + ',"lon":' + lon + '}}}}},"fields":["name","longitude","latitude","categories"]}'
		*/

		url_2 = '{"query":{"filtered":{"query":{"match":{"categories":{"query":"' + categories + '","minimum_should_match":1}}},"filter":{"geo_distance":{"distance":"1km","location":{"lat":' + lat + ',"lon":' + lon + '}}}}},"fields":["name","longitude","latitude","categories","stars"]}'
		console.log(url_2);

		d3.json(url_business_base, function(error, d){
		if (error) {  //If error is not null, something went wrong.
          console.log(error);  //Log the error.
        } else {      //If no error, the file loaded correctly. Yay!
          console.log('Total # Business in Neighborhood: ' + d.hits.total);
      	}

      	neighborhood = []

			for(n in d.hits.hits) {
				data = d.hits.hits[n].fields
				neighborhood.push({'location': [data.latitude[0], data.longitude[0]], 'name': data.name, 'stars': data.stars})
			}
			console.log(neighborhood[1])

			//Draw the Map
			drawMarkerArea(neighborhood, [lat,lon]);

      })
		    .header("Content-Type","application/json")
			.send("POST", url_2)

  })
	.header("Content-Type","application/json")
	.send("POST", url_1)

