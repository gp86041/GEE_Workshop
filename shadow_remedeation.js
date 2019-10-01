//define study boundary and name it as geometry
var geometry = /* color: #98ff00 */ee.Geometry.Polygon(
        [[[-76.13971710205078, 43.039912527770866],
          [-76.13993167877197, 43.03141178011271],
          [-76.12838745117188, 43.03141178011271],
          [-76.12843036651611, 43.03978706404308]]]);

//Select the NAIP data and name the variable with NAIP
var NAIP = ee.ImageCollection('USDA/NAIP/DOQQ');


//Filter NAIP imagery
var point = ee.Geometry.Point(-76.136198, 43.036196); //set filter location at City of Syracuse
var naipImage = NAIP
  .filterBounds(point) //filter with defined filter location
  .filterDate('2010-01-01','2011-12-30') //select the 2010 NAIP image scene
  .mosaic(); //converts all selected images within the image collection into one composite image

Map.setCenter(-76.136198, 43.036196, 15);
Map.addLayer(naipImage,{},'original NAIP image');

//Select and import the previously selected NAIP image, then only extract RGB bands and also divide all bands by 10000. 1000 is the scale factor for NAIP image values.
var naipImage = naipImage
                .select(['R','G','B'])
                .divide(1000);

//Convert selected and processed NAIP image from previous step into Hue-Saturation-Value (HSV) space. The hue (H) of a color refers to which pure color it resembles. All tints, tones and shades of red have the same hue. Hues are described by a number that specifies the position of the corresponding pure color on the color wheel, as a fraction between 0 and 1. Value 0 refers to red; 1/6 is yellow; 1/3 is green; and so forth around the color wheel. The saturation (S) of a color describes how white the color is. A pure red is fully saturated, with a saturation of 1; tints of red have saturations less than 1; and white has a saturation of 0. The value (V) of a color, also called its lightness, describes how dark the color is. A value of 0 is black, with increasing lightness moving away from black. HSVis an alternative representation of the RGB color model, designed in the 1970s by computer graphics researchers to more closely align with the way human vision perceives color-making attributes.
var naipImagehsv = naipImage.rgbToHsv();

//Generate a NSVDI image based on the converted HSV image from step above
var NSVDI = naipImagehsv.expression(
    '(S-V)/(S+V)', {
      'S':naipImagehsv.select('saturation'),
      'V':naipImagehsv.select('value')
});


//Print a histogram of the NSVDI. Determine the threshold of shadow. According to Mostafa and Abdelhafiz (2017), the threshold should be zero, but the NAIP image here does not quite work with that. Thus, a threshold of 0.5 was identified through a iterative process by changing the threshold and comparing NSVDI shadow outputs.
//print(ui.Chart.image.histogram(NSVDI,geometry,1));

//Based on selected threshold above, mask out non-shadow pixels from the NSVDI image
var NSVDImask = NSVDI.select('saturation').gte(0.5); //select non-shadow pixels based on defined threshold and use them as a mask
var NSVDIshadow = NSVDI.updateMask(NSVDImask); //apply constructed mask to the NSVDI image to remove the non-shadow pixels

//display the shadow-only NSVDI image
//Map.addLayer(NSVDIshadow,{palette: 'FF0000'});

var NSVDImaskS = NSVDI.select('saturation').gte(0.5);
var naips = naipImage.updateMask(NSVDImaskS);
var NSVDImaskN = NSVDI.select('saturation').lt(0.5);
var naipn = naipImage.updateMask(NSVDImaskN);

Map.addLayer(NSVDIshadow,{palette: 'FF0000'},'Shdow');

// Use the combined reducer to get the mean and SD of the image.
var statsS = naips.reduceRegion(ee.Reducer.mean(),geometry,1);
print('shdow mean',statsS);

var statsN = naipn.reduceRegion(ee.Reducer.mean(),geometry,1);
print('non-shadow mean',statsN);

// Use the combined reducer to get the mean and SD of the image.
var statsS = naips.reduceRegion(ee.Reducer.stdDev(),geometry,1);
print('shdow std',statsS);

var statsN = naipn.reduceRegion(ee.Reducer.stdDev(),geometry,1);
print('non-shadow std',statsN);

//restore by bands
// Compute the EVI using an expression.
var restoreR = naips.expression(
    '((0.04807075471574293/0.00785689884349069)*(DN-0.057543779118563364))+0.13747371073097925', {
      'DN': naips.select('R')
});
var restoreG = naips.expression(
    '((0.043270095287372565/0.008449497593063104)*(DN-0.07297190993118964))+0.14883674110235107', {
      'DN': naips.select('G')
});
var restoreB = naips.expression(
    '((0.04100311572840787/0.009738682165944347)*(DN-0.0894848126656784))+0.14516834901488612', {
      'DN': naips.select('B')
});
var restore = ee.Image.cat([restoreR,restoreG,restoreB]);

////manually adjust maximum and minimum range to see display results
Map.addLayer(restore,{},'Restored');
