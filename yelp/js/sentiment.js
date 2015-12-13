var parsedReviewTopics = [];

// setting up elastic search url's
//var url_sentiment_base = "http://54.183.182.71:9200/yelp/topic/_search?size=2000"
//var url_sentiment = '{"query":{"match":{"business_id":"4bEjOyTaDG24SY5TxsaUNQ"}}}'

// load json (eventually from elasticsearch)
d3.json('./json/sentiment.json', function(error, data){
    if (error) throw error;

    console.log(data);

    var stars;
    // extract required data
    data.hits.hits[0]._source.topics.forEach(function(d) {
      stars = +d.stars;

      d.word_freq.forEach(function(k) {
        if (k.sentiment != 'neutral') {
          parsedReviewTopics.push([k.text, +k.score, k.sentiment, stars]);
        }
      });

    });

    updateChart(3);
})
// post to elasticsearch
  //.header("Content-Type","application/json")
  //.send("POST", url_sentiment);

// event
function updateChart(rating) {
      // extract required data based on ratings
      var reviews = [];
      var all_reviews = [];
      parsedReviewTopics.forEach(function(d) {
          if ( d[3] == rating) {
            all_reviews.push([d[0], d[1]])
          }
      });

      all_reviews.sort(function(a, b) {
        return Math.abs(b[1]) - Math.abs(a[1]);
      });

      reviews = all_reviews.slice(0,19);

      // clear previous charts
      d3.select("#svg-chart-review-sentiment").remove();
      d3.select("#svg-chart-review-wordcloud").remove();

      // set height of chart based on data
      var margin = {top: 50, right: 20, bottom: 20, left: 20};
      var width = 400 - margin.left - margin.right;
      //var barHeight = 35 - reviews.length * 0.75 ;
      var barHeight = 40 - (0.75*reviews.length) ;
      height = 40 + (barHeight*reviews.length ) - (margin.top + margin.bottom) + (1.25*reviews.length);

      // set x and y axis
      var x = d3.scale.linear()
                .range([0, width]);
      var y = d3.scale.ordinal()
                .rangeRoundBands([0, height], .15);
      var xAxis = d3.svg.axis()
                .scale(x)
                .orient("top");

      x.domain([-1.0, 1.0])
      y.domain(reviews.map(function(d) { return d[0]; }));

      // svg for chart
      var svg = d3.select("#chart-review-sentiment");

      // draw bar chart
      var bar = svg.append("svg")
                  .attr("id", "svg-chart-review-sentiment")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // set bars
      bar.selectAll(".bar")
          .data(reviews)
          .enter()
          .append("rect")
          .attr("class", function(d) { return d[1] < 0 ? "bar negative" : "bar positive"; })
          .attr("x", function(d) { return x(Math.min(0, d[1])); })
          .attr("y", function(d) { return y(d[0]); })
          .attr("width", function(d) { return Math.abs(x(d[1]) - x(0));  })
          .attr("height", 20)

      bar.append("g")
          .attr("class", "x axis")
          .call(xAxis);

      bar.append("g")
          .attr("class", "y axis")
        .append("line")
          .attr("x1", x(0))
          .attr("x2", x(0))
          .attr("y2", height);

      bar.selectAll(".bartext")
          .data(reviews)
          .enter()
          .append("text")
          .attr("class", "bartext")
          .attr("text-anchor", function(d) { return d[1] < 0 ? "end" : "left"; })
          .attr("fill", "black")
          .attr("x", function(d, i) { text_x = d[1] < 0 ? x(Math.min(0, d[1])) - 3 : x(Math.min(0, d[1])) + Math.abs(x(d[1]) - x(0)) + 3; return text_x })
          .attr("y", function(d) { return y(d[0]) + 15; })
          .text(function(d) {return d[0];});

      bar.append("text")
          .attr("text-anchor", "middle")
          .attr("transform", "translate("+ (width/2) +", -40)")
          .text("(-ve) Sentiment Strength (+ve)");

      d3.layout.cloud().size([400, 250])
          .words(reviews)
          .rotate(0)
          .fontSize(function(d) { return Math.abs(d[1])*40; })
          .on("end", draw)
          .start();
  }

  function draw(words) {
      var color_pos = d3.scale.linear()
          .domain([0,1,2,3,5,10,15,25,30,40,45,50])
          .range(["#F0F8FF", "#A1CAF1", "#99BADD", "#71A6D2", "#6495ED", "#779ECB", "#5B92E5", "#0047AB", "#0F4D92", "#08457E", "#1560BD", "#002E63"]);

      var color_neg = d3.scale.linear()
          .domain([0,1,2,3,5,10,15,25,30,40,45,50])
          .range(["#FF1C00", "#FF0800", "#FF0000", "#CD5C5C", "#E34234", "#D73B3E", "#CE1620", "#CC0000", "#B22222", "#B31B1B", "#A40000", "#800000"]);

      var margin = {top: 50, right: 10, bottom: 10, left: 20};
      var width = 450 - margin.left - margin.right;
      var height = 300 - margin.top - margin.bottom;

      d3.select("#chart-review-wordcloud")
        .append("svg")
        .attr("id", "svg-chart-review-wordcloud")
        //.attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "wordcloud")
        .append("g")
        // without the transform, words words would get cutoff to the left and top, they would
        // appear outside of the SVG area
        .attr("transform", "translate(100,100)")
        .selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", function(d) { return Math.abs(d[1])*40 + "px"; })
        .style("fill", function(d, i) { return d[1] < 0 ? color_neg(i) : color_pos(i); })
        .attr("transform", function(d) {
            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
          })
        .text(function(d) { return d[0]; })
        .append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate("+ (width/2) +", 0)")
        .text("Top positive and negative words/phrases");

  }
