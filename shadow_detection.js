////////////////////Import images///////////////////////////////

//Define study boundary and name it as geometry. This is a necessary step to limit the study boundary to the image of interest.*/
var geometry = ee.Geometry.Polygon(
        [[[-76.1397, 43.0399],
          [-76.1399, 43.0314],
          [-76.1283, 43.0314],
          [-76.1284, 43.0397]]]);

//Create a variable called NAIP to point to the NAIP data collection
var NAIP = ee.ImageCollection('USDA/NAIP/DOQQ');

//Filter NAIP imagery
var point = ee.Geometry.Point(-76.136, 43.036); //Create a point at City of Syracuse
var naipImage = NAIP
  .filterBounds(point) //filter with defined filter location
  .filterDate('2011-01-01','2011-12-30') //Limit images to the ones collected in 2010
  .mosaic(); //Convert selected images into one composite image rather than an image collection.

Map.setCenter(-76.1362, 43.0362, 15);
Map.addLayer(naipImage,{},'original NAIP image');

////////////////////Detecting Shadows///////////////////////////
//////////////////approach 1///////////////////
/*Approach 1 below utilizes the C3* index, which is originally based
on the C1C2C3 color model. Besher and Abdelhafiz (2015) found that the
C3 component was sensitive to shadows but was not stable for certain color
values. Thus, the C3* index was introduced to include near-infrared (NIR)
information to increase the stability of the original C3 index.
A threshold value is then used to distinguish between shadow and
non-shadow pixels based on a histogram of C3* values.
If water features are present in the image, a water mask is also
applied since water and shadow pixels have similar radiometric responses. */

//Construct an image with green, red and near infrared bands of selected NAIP image
var imageGRN = naipImage.select(['G','R','N']);

/*Spatial reducers are functions in GEE that composite all the images in an
Image Collection to a single image representing, for example, the min, max,
mean or standard deviation of the images. It can also be used to composite
the maximum value per each pixel across all bands in one image. Here, it reduce
the GRN image to a one-band image with the maximum DN value for each pixel across
all bands in the GRN image.*/
var maxValue = imageGRN.reduce(ee.Reducer.max());

// Merge the one-band maximum value image and the original NAIP image to create anew image.
var imageMAX = naipImage.addBands(maxValue.select(['max']),["max"]); /*first max selects the band to add, second max provides the name of the band in the new image*/

// Calculate C3* index (from Besheer and Abdelhafiz, 2015)
var C3 = imageMAX.expression(
    'atan(B/max)', {
      'B':imageMAX.select('B'),
      'max':imageMAX.select('max')
    });

/* Print a histogram of the C3* index and determine the inflection point. Besheer and Abdelhafiz (2015) found experimentally that selecting the low frequency DN in the valley between the predominant features gave consistently accurate threshold levels for separating the shadow from non-shadow regions. See Figure 2 in Besheer and Abdelhafiz (2015) for more details. */
print(ui.Chart.image.histogram(C3,geometry,1));

//Based on selected threshold above, mask out non-shadow from the C3 image
var shadowmask = C3.select('B').gte(0.85); //create non-shadow mask based on C3 threshold
var C3shadow = C3.updateMask(shadowmask); //apply mask C3 image to get shadow-only image

// Apply a NDWI mask to the shadow image to mitigate confusion between water and shadows.
// Generate a NDWI image based on the selected NAIP image bands
var NDWI = imageMAX.expression(
    '(G-N)/(G+N)', {
      'G':imageMAX.select('G'),
      'N':imageMAX.select('N')
    });

// Print a histogram of the NDWI values and determine low point in the last valley.
print(ui.Chart.image.histogram(NDWI,geometry,1));

// Based on the threshold selected above, mask out water pixels from the shadow-only C3 image
var NDWImask = NDWI.select('G').lte(0.6);  //create a water mask based on selected threshold in step above
var C3shadow = C3shadow.updateMask(NDWImask); //apply defined mask from above to the shadow-only C3 index image

//Display final shadow pixels with water removed. This sets the stage for shadow compensation, which is the next key step in shadow detection and removal. Shadow compensation can be done by applying equation 17 in Mostafa and Abdelhafiz (2017).
Map.addLayer(C3shadow, {palette: 'FF0000'}, 'shadow_NDWI');

//////////////////approach 2///////////////////
/* Approach 2 utilizes the HSV color space and applies the normalized
saturation-value difference index (NSVDI). A threshold value is used
to distinguish between shadow and non-shadow based on a histogram of
NSDVI values. Mostafa and Abdelhafiz (2017) describe these two approaches
as the best approaches in shadow detection due to the use of direct formula,
and an automatic procedure that does not require human input. */

/* Extract RGB bands from the selected NAIP and divide all bands by 255 to convert original DN values (0-255) to a range of 0-1, which can be processed by the next rgbToHsv function in the next step. */
var naipImage = naipImage
                .select(['R','G','B'])
                .divide(255);

/*Convert NAIP image into Hue-Saturation-Value (HSV) space. HSV space is also referred to as IHS (intensity, hue, saturation) or HSB (hue, saturation, brightness). HSV system is an alternative to describing colors using RGB components. Value relates to the brightness of a color. Hue refers to the dominant wavelength of light contributing to the color. Saturation specifies the purity of color relative to gray. It is often utilized in operations for resolution-enhancement (Lillesand et al. 2015). */
var naipImagehsv = naipImage.rgbToHsv();

//Generate a NSVDI image based on the converted HSV image from step above
var NSVDI = naipImagehsv.expression(
    '(S-V)/(S+V)', {
      'S':naipImagehsv.select('saturation'),
      'V':naipImagehsv.select('value')
});

/*Print a histogram of the NSVDI in order to determine the shadow threshold. Mostafa and Abdelhafiz (2017) expect the threshold to be zero, but this did not provide a satisfactory result. An iterative process was needed to identify a threshold (-0.2). */
print(ui.Chart.image.histogram(NSVDI,geometry,1));

//Based on selected threshold above, mask out non-shadow pixels from the NSVDI image
var NSVDImask = NSVDI.select('saturation').gte(-0.2); //select non-shadow pixels based
var NSVDIshadow = NSVDI.updateMask(NSVDImask); //apply mask to remove non-shadow pixels.

// Display the shadow-only NSVDI image
Map.addLayer(NSVDIshadow,{palette: 'FF0000'},"shadow_NSVDI");
