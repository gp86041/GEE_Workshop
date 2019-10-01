// Construct a FeatureCollection for three different locations near Syracuse
var points = ee.FeatureCollection([
  ee.Feature(    // Syracuse
    ee.Geometry.Point(-76.1505,43.0498), {label: 'City of Syracuse downtown'}),
  ee.Feature(  // Clark Reservation
    ee.Geometry.Point(-76.0899,42.9983), {label: 'Forest in Clark Reservation'}),
  ee.Feature(  // Oneida Lake
    ee.Geometry.Point(-75.9045,43.2007), {label: 'Water in Oneida Lake'})
]);

// Import Landsat 8 brightness temperature data for 3 years.
var temps = ee.ImageCollection('LANDSAT/LC8_L1T_TOA')
    .filterBounds(points) // Filter image scenes based on the three defined locations above
    .filterDate('2013-01-01', '2016-12-31') // Filter image scenes from 2013 to 2016
    .select('B11') // Select band 11 for the thermal infrared response
    .filterMetadata('CLOUD_COVER', 'less_than', 40); //filter based on image cloud cover

/* Create a time series chart showing surface temperature change for the three defined locations based on three years of Landsat 8 images. */
var tempTimeSeries = ui.Chart.image.seriesByRegion(
    temps, points, ee.Reducer.mean(), 'B11', 100, 'system:time_start', 'label')
        .setChartType('ScatterChart') // Set the chart to be a scatter plot
        .setOptions({ //Set options of the plot
          title: 'Temperature over time for locations near City of Syracuse', //Set title
          vAxis: {title: 'Temperature (Kelvin)'}, //Set x axis label
          lineWidth: 1, // Set the width of the line
          pointSize: 4, // Set the point size for each data point
          series: {
            0: {color: 'FF0000'}, // color for City of Syracuse downtown
            1: {color: '00FF00'}, // color for Forest in Clark Reservation
            2: {color: '0000FF'}  // color for Water in Oneida Lake
}});

// Display time series chart.
print(tempTimeSeries);
