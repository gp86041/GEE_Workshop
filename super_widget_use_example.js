var imap1 = require('users/jeffjeff20072/hackthon_modual:insetmap_bts');
var imap2 = require('users/jeffjeff20072/hackthon_modual:insetmap_stb');

////////////////////////import image
// Compute the trend of nighttime lights from DMSP.

// Add a band containing image date as years since 1991.
function createTimeBand(img) {
  var year = ee.Date(img.get('system:time_start')).get('year').subtract(1991);
  return ee.Image(year).byte().addBands(img);
}

// Fit a linear trend to the nighttime lights collection.
var collection = ee.ImageCollection('NOAA/DMSP-OLS/NIGHTTIME_LIGHTS')
    .select('stable_lights')
    .map(createTimeBand);
var fit = collection.reduce(ee.Reducer.linearFit());

// Display trend in red/blue, brightness in green.
var visParams = {min: 0, max: [0.18, 20, -0.18], bands: ['scale', 'offset', 'scale']};


/////////////////////////////////////function usage
//big map to small map
// imap1.imap_bts_func(fit,visParams,"image",true,0.5,visParams,'image',true,1,
// 'bottom-right','300px','300px');


// //small map to big map
imap2.imap_stb_func(fit,visParams,"image",true,0.5,visParams,'image',false,1,
'bottom-right','300px','300px');



/////////////////////////////archive
// var image = fit;
// var visParams = visParams;
// var bmap_image_prop = "";
// var bmap_image_name = "image";
// var bmap_image_shown = true;
// var bmap_image_opacity = 0.5;
// var smap_image_prop = "";
// var smap_image_name = bmap_image_name;
// var smap_image_shown = true;
// var smap_image_opacity = 1;
// var imap_position = 'bottom-right';
// var imap_height = '300px';
// var imap_width = '300px';

//fit,visParams,"","image",true,0.5,"",'image',true,1,'bottom-right','300px','300px'
