// Base Elastic Search URL
url_base_search = "http://54.183.182.71:9200/yelp/review/_search?size=5000"
url_base_search_count = "http://54.183.182.71:9200/yelp/review/_search?search_type=count&size=5000"

//Width and height
var w = 1400;
var h = 200;
var barPadding = 0.2;
var margin = {top:100,bottom:100,right:100,left:100};	



/**************************** Checkin Data ****************************************************/

function print_filter(filter){
	var f=eval(filter);
	if (typeof(f.length) != "undefined") {}else{}
	if (typeof(f.top) != "undefined") {f=f.top(Infinity);}else{}
	if (typeof(f.dimension) != "undefined") {f=f.dimension(function(d) { return "";}).top(Infinity);}else{}
	console.log(filter+"("+f.length+") = "+JSON.stringify(f).replace("[","[\n\t").replace(/}\,/g,"},\n\t").replace("]","\n]"));
} 

function day_of_week(day) {
	switch (day) {
	    case 0:
	        day = "Sun";
	        break;
	    case 1:
	        day = "Mon";
	        break;
	    case 2:
	        day = "Tue";
	        break;
	    case 3:
	        day = "Wed";
	        break;
	    case 4:
	        day = "Thu";
	        break;
	    case 5:
	        day = "Fri";
	        break;
	    case 6:
	        day = "Sat";
	        break;
	}
	return day;
}

	url_base_checkin = "http://54.183.182.71:9200/yelp/checkin/_search?size=5000"
	url_4 = '{"query":{"match":{"business_id":"4bEjOyTaDG24SY5TxsaUNQ"}}}'
	d3.json(url_base_checkin, function(error, d){
	if (error) {  //If error is not null, something went wrong.
      console.log(error);  //Log the error.
    } else {      //If no error, the file loaded correctly. Yay!
      console.log(d);
  	}

  	//Save the Data
    data =  d.hits.hits[0]._source.checkin_info
    console.log(data)
  	//var ndx = crossfilter(data);
  	//console.log(ndx.dimension)

  	checkin = []
  	for(var k in data) {

  		//console.log(k.split("-")[0])
  		var time_day = k.split("-")
  		var time = Number(time_day[0])
  		var day = Number(time_day[1])
  		var checkin_count = Number(data[k])

  		checkin.push({'day': day, 'time': time, 'checkins': checkin_count});
  	}
  	 
  	//console.log(checkin)
  	var ndx = crossfilter(checkin);
  	console.log(ndx);

  	var dayDim = ndx.dimension(function(d) { return d.day; }); 
  	print_filter(dayDim.filter('0'));

  	var timeDim = ndx.dimension(function(d) { return d.time; }); 
  	print_filter(timeDim);

  	var checkins_per_day_of_week = dayDim.group().reduceSum(function(d) {return d.checkins;});
  	print_filter(checkins_per_day_of_week);

  	var checkins_per_time_of_day = timeDim.group().reduceSum(function(d) {return d.checkins;});
  	print_filter(checkins_per_time_of_day);

  	//var minC = dayDim.bottom(1)[0].checkins;
	//var maxC = dayDim.top(1)[0].checkins;

	chart = dc.pieChart("#viz1");
	chart
		.width(300).height(225)
	    .dimension(dayDim)
	    .group(checkins_per_day_of_week)
	    .innerRadius(50)
	    .label(function(d) { return day_of_week(d.key); });
	chart.render();
	
  	
  	/*
  	chart
	    .width(300)
	    .height(300)
	    .x(d3.scale.ordinal())
	    .xUnits(dc.units.ordinal)
	    .elasticX(true)
		.elasticY(true)
	    .brushOn(true)
	    .xAxisLabel("Day of Week")
	    .yAxisLabel("Checkins")
	    .dimension(dayDim)
	    .group(checkins_per_day_of_week)
	chart.render();		
	*/		

	chart = dc.rowChart("#viz2");
  	chart
	    .width(300)
	    .height(300)
	    .elasticX(true)
	    .dimension(dayDim)
	    .group(checkins_per_day_of_week)
	    .label(function(d) { return day_of_week(d.key); });

	chart.xAxis().ticks(4);
	chart.render();

	chart = dc.barChart("#viz3");
  	chart
	    .width(600)
	    .height(300)
	    .x(d3.scale.ordinal())
	    .xUnits(dc.units.ordinal)
	    .elasticX(true)
		.elasticY(true)
	    .brushOn(true)
	    .xAxisLabel("Time of Day")
	    .yAxisLabel("Checkins")
	    //.xAxis().tickFormat(function(d) {return day_of_week(d.day)})
	    .dimension(timeDim)
	    .group(checkins_per_time_of_day)
	chart.render();



})
.header("Content-Type","application/json")
	.send("POST", url_4)