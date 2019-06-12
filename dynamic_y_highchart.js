looker.plugins.visualizations.add({
  options: {
    chart_type: {
      order: 1,
      type: "string",
      label: "Chart Type",
      values: [
        { "Area": "area" },
        { "Bar": "bar" },
        { "Column": "column" },
        { "Line": "line" } // can add more types here
      ],
      display: "select",
      default: "line"
    },
    color_range: {
      order: 2,
      type: "array",
      label: "Color Range",
      display: "colors",
      default: ["#9E0041", "#C32F4B", "#E1514B", "#F47245", "#FB9F59", "#FEC574", "#FAE38C", "#EAF195", "#C7E89E", "#9CD6A4", "#6CC4A4", "#4D9DB4", "#4776B4", "#5E4EA1"]
    }
  },

  // Set up the initial state of the visualization
  create: function(element, config) {

    // if needed, can set css here
    // var css = `
    //   <style> 
    // body {
    //   font: 10px sans-serif;
    // }
    //   </style> `;
    // element.innerHTML = css;
    // var container = element.appendChild(document.createElement("div")); // Create a container element to let us center the text.
    // this.container = container
    // container.className = "highchart-vis";
    // this._textElement = container.appendChild(document.createElement("div")); // Create an element to contain the text.
  },


  // Render in response to the data or settings changing
  updateAsync: function(data, element, config, queryResponse, details, done) {
    this.clearErrors(); // clear any errors from previous updates

    // ensure data fit
    if (!handleErrors(this, queryResponse, { 
      min_pivots: 0, max_pivots: 0, 
      min_dimensions: 1, max_dimensions: 1, 
      min_measures: 1, max_measures: 10})) {
      return;
    }

    var dimension = queryResponse.fields.dimension_like[0].name, measure_count = queryResponse.fields.measure_like.length,
      series = [], x = [], all_series = [];

    for (let i = 0; i < measure_count; i++) {
      series[i] = {}
      series[i]['name'] = queryResponse.fields.measure_like[i].name;
      series[i]['data'] = []
    }

    for (let i = 0; i < data.length; i++) {
      x.push(data[i][dimension].value); 
      for (let j = 0; j < measure_count; j++) {
        series[j]['data'].push(data[i][series[j]['name']].value);
        all_series.push(data[i][series[j]['name']].value);
      }
    } 

    var minX = Math.min( ...all_series)*.9, maxX = Math.max( ...all_series)*1.1

    Highcharts.chart('vis', {
        colors: config.color_range,
        chart: { type: config.chart_type },
        title: { text: null },
        xAxis: { 
          categories: x
          // dateTimeLabelFormats: {} // TODO - format dates
        },
        yAxis: {
            endOnTick: false,
            maxPadding: 0.2,
            ceiling: maxX,
            floor: minX,
            title: { text: null }
        },
        series: series,
        credits: { enabled: false }
    });

    function handleErrors(vis, res, options) {
      var check = function (group, noun, count, min, max) {
          if (!vis.addError || !vis.clearErrors) {
              return false;
          }
          if (count < min) {
              vis.addError({
                  title: "Not Enough " + noun + "s",
                  message: "This visualization requires " + (min === max ? 'exactly' : 'at least') + " " + min + " " + noun.toLowerCase() + (min === 1 ? '' : 's') + ".",
                  group: group
              });
              return false;
          }
          if (count > max) {
              vis.addError({
                  title: "Too Many " + noun + "s",
                  message: "This visualization requires " + (min === max ? 'exactly' : 'no more than') + " " + max + " " + noun.toLowerCase() + (min === 1 ? '' : 's') + ".",
                  group: group
              });
              return false;
          }
          vis.clearErrors(group);
          return true;
      };
      var _a = res.fields, pivots = _a.pivots, dimensions = _a.dimension_like, measures = _a.measure_like;
      return (check('pivot-req', 'Pivot', pivots.length, options.min_pivots, options.max_pivots)
          && check('dim-req', 'Dimension', dimensions.length, options.min_dimensions, options.max_dimensions)
          && check('mes-req', 'Measure', measures.length, options.min_measures, options.max_measures));
    }

    done()
  }
});