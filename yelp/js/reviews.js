/**
 * Created by hetal on 11/28/15.
 */
function print_filter(filter){
    var f=eval(filter);
    if (typeof(f.length) != "undefined") {}else{}
    if (typeof(f.top) != "undefined") {f=f.top(Infinity);}else{}
    if (typeof(f.dimension) != "undefined") {f=f.dimension(function(d) { return "";}).top(Infinity);}else{}
    console.log(filter+"("+f.length+") = "+JSON.stringify(f).replace("[","[\n\t").replace(/}\,/g,"},\n\t").replace("]","\n]"));
}

// setting up elastic search url's
var url_base_search_count = "http://ec2-54-183-182-71.us-west-1.compute.amazonaws.com:9200/yelp/review/_search?&size=5000"
//var review_url = '{"query":{"match":{"business_id":"4bEjOyTaDG24SY5TxsaUNQ"}},"aggs":{"histo":{"date_histogram":{"field":"date","interval":"month"},"aggs":{"stars_stats":{"extended_stats":{"field":"stars"}}}}}}'

var review_url = '{"query":{"match":{"business_id":"4bEjOyTaDG24SY5TxsaUNQ"}},"fields":["date","stars"]}'


//    var url_base_search_count = "http://ec2-54-183-182-71.us-west-1.compute.amazonaws.com:9200/yelp/review/_search?search_type=count&size=5000"
//    var review_url = '{"query":{"match":{"business_id":"4bEjOyTaDG24SY5TxsaUNQ"}},"aggs":{"histo":{"date_histogram":{"field":"date","interval":"month"},"aggs":{"stars":{"terms":{"field":"stars"}}}}}}'

var parseDate = d3.time.format("%Y-%m-%d").parse;


d3.json(url_base_search_count, function(error, data) {
    if (error) throw error;

    var yelp_data = data.hits.hits;

    yelp_data.forEach(function(d){
        d.date = parseDate(d.fields.date[0]);
        d.Year= d.date.getFullYear();
        d.Month = d.date.getMonth()+1;
        d.star = d.fields.stars[0];

    });

    //console.log(yelp_data);
    //create crossfilter indexes
    var ndx = crossfilter(yelp_data);
    var ndx1 = crossfilter(yelp_data);


    // we will start with yearly count of review bar chart
    var all_yearBarChart  = dc.barChart("#chart-all_year_review");
    var yearDim = ndx.dimension(function(d){ return d.Year;});
    var year_count = yearDim.group().reduceCount();
    print_filter(year_count);
    //Can be used to find the range for x axis
    var minYear = yearDim.bottom(1)[0].review_year;
    var maxYear = yearDim.top(1)[0].review_year;
    all_yearBarChart
        .width(500).height(200)
        .transitionDuration(1500)
        .dimension(yearDim)
        .group(year_count)
        .gap(13)
        .brushOn(false)
        .yAxisLabel("Number of reviews")
        .xAxisLabel("Year of review")
        .title(function(d){return d.value;})
        .x(d3.scale.ordinal().domain(d3.range(minYear,maxYear+1)))
        .xUnits(dc.units.ordinal)
        .xAxis().tickFormat(function(v) {return v;});



    var detail_BarChart = dc.barChart("#chart-detail_review");
    var monthDim = ndx.dimension(function(d){return d.Month;});

    var monthCount = monthDim.group().reduceCount();
    print_filter(monthCount);
    detail_BarChart
        .width(500).height(200)
        .transitionDuration(1500)
        .dimension(monthDim)
        .group(monthCount)
        .gap(13)
        .elasticY(true)
        .brushOn(false)
        .yAxisLabel("Number of reviews")
        .xAxisLabel("Months")
        .title(function(d){return d.value;})
        .x(d3.scale.ordinal().domain(d3.range(1,13)))
        .xUnits(dc.units.ordinal)
        .xAxis().tickFormat(function(v) {return v;});
    //.xAxis().tickFormat(d3.time.format('%B'));

    //make stars row chart

    var stars_Chart  = dc.rowChart("#chart-stars");
    var reviewDim = ndx.dimension(function(d){
        var stars = d.star;
        switch (stars) {
            case 1:
                return "5.1";
            case 2:
                return "4.2";
            case 3:
                return "3.3";
            case 4:
                return "2.4";
            case 5:
                return "1.5";
        } });

    var review_count = reviewDim.group();
    print_filter(review_count);

    stars_Chart
        .width(500).height(200)
        .transitionDuration(1500)
        .dimension(reviewDim)
        .group(review_count)
        .elasticX(true)
        .colors(d3.scale.category10())
        .label(function (d){
            return d.key.split(".")[1];
        })
        .title(function(d){return d.value;})
        .xAxis().ticks(4);


    // Chart for Average Review of Restaurant over years
    var yearDim_rating = ndx1.dimension(function(d){ return d.Year;});
    var all_avgBarChart  = dc.barChart("#chart-avg_all_review");
    var year_avg = yearDim_rating.group().reduce(
        //add
        function(p,v){
            ++p.count;
            p.star_sum += v.star;
            p.star_avg = p.star_sum / p.count;
            return p;
        },
        //remove
        function(p,v){
            --p.count;
            p.star_sum -= v.star;
            p.star_avg = p.star_sum / p.count;
            return p;
        },
        //init
        function(p,v){
            return {count:0,  star_sum: 0, star_avg: 0};
        }
    );
    print_filter(year_avg);
    //Can be used to find the range for x axis
    var minYear = yearDim.bottom(1)[0].Year;
    var maxYear = yearDim.top(1)[0].Year;
    all_avgBarChart
        .width(500).height(200)
        .transitionDuration(1500)
        .dimension(yearDim_rating)
        .group(year_avg)
        //.centerBar(true)
        .gap(13)
        //.elasticY(true)
        .brushOn(false)
        .yAxisLabel("Average Rating")
        .xAxisLabel("Year of review")
        .valueAccessor(function (p) {
            return p.value.star_avg;
        })
        .title(function(d){return d3.round(d.value.star_avg,2);})
        .x(d3.scale.ordinal().domain(d3.range(minYear,maxYear+1)))
        .xUnits(dc.units.ordinal)
        .xAxis().tickFormat(function(v) {return v;});


    //chart for avergae rating in detail for a selected year
    var detailRating_BarChart = dc.barChart("#chart-avg_detail_review");
    var month_ratingDim = ndx1.dimension(function(d){return d.Month;});

    var monthAvg = month_ratingDim.group().reduce(
        //add
        function(p,v){
            ++p.count;
            p.star_sum += v.star;
            p.star_avg = p.star_sum / p.count;
            return p;
        },
        //remove
        function(p,v){
            --p.count;
            p.star_sum -= v.star;
            p.star_avg = p.star_sum / p.count;
            return p;
        },
        //init
        function(p,v){
            return {count:0,  star_sum: 0, star_avg: 0};
        }
    );
    print_filter(monthAvg);
    detailRating_BarChart
        .width(500).height(200)
        .transitionDuration(1500)
        .dimension(month_ratingDim)
        .group(monthAvg)
        .gap(13)
        .brushOn(false)
        .yAxisLabel("Average Rating")
        .valueAccessor(function (p) {
            return p.value.star_avg;
        })
        .title(function(d){return d3.round(d.value.star_avg,2);})
        .x(d3.scale.ordinal().domain(d3.range(1,13)))
        .xUnits(dc.units.ordinal)
        .yAxis().ticks(5);

    //Render the graphs
    dc.renderAll();

}).header("Content-Type","application/json")
    .send("POST", review_url);