export interface CityEntry {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const US_CITIES: CityEntry[] = [
  // Alabama
  { city: 'Birmingham', state: 'AL', lat: 33.5207, lng: -86.8025 },
  { city: 'Huntsville', state: 'AL', lat: 34.7304, lng: -86.5861 },
  { city: 'Montgomery', state: 'AL', lat: 32.3668, lng: -86.3000 },
  { city: 'Mobile', state: 'AL', lat: 30.6954, lng: -88.0399 },
  { city: 'Tuscaloosa', state: 'AL', lat: 33.2098, lng: -87.5692 },

  // Alaska
  { city: 'Anchorage', state: 'AK', lat: 61.2181, lng: -149.9003 },
  { city: 'Fairbanks', state: 'AK', lat: 64.8378, lng: -147.7164 },
  { city: 'Juneau', state: 'AK', lat: 58.3005, lng: -134.4197 },

  // Arizona
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Tucson', state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { city: 'Mesa', state: 'AZ', lat: 33.4152, lng: -111.8315 },
  { city: 'Scottsdale', state: 'AZ', lat: 33.4942, lng: -111.9261 },
  { city: 'Tempe', state: 'AZ', lat: 33.4255, lng: -111.9400 },
  { city: 'Chandler', state: 'AZ', lat: 33.3062, lng: -111.8413 },
  { city: 'Flagstaff', state: 'AZ', lat: 35.1983, lng: -111.6513 },

  // Arkansas
  { city: 'Little Rock', state: 'AR', lat: 34.7465, lng: -92.2896 },
  { city: 'Fayetteville', state: 'AR', lat: 36.0822, lng: -94.1719 },
  { city: 'Fort Smith', state: 'AR', lat: 35.3859, lng: -94.3985 },

  // California
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 },
  { city: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944 },
  { city: 'Oakland', state: 'CA', lat: 37.8044, lng: -122.2712 },
  { city: 'Long Beach', state: 'CA', lat: 33.7701, lng: -118.1937 },
  { city: 'Fresno', state: 'CA', lat: 36.7378, lng: -119.7871 },
  { city: 'Bakersfield', state: 'CA', lat: 35.3733, lng: -119.0187 },
  { city: 'Anaheim', state: 'CA', lat: 33.8366, lng: -117.9143 },
  { city: 'Santa Ana', state: 'CA', lat: 33.7455, lng: -117.8677 },
  { city: 'Riverside', state: 'CA', lat: 33.9533, lng: -117.3962 },
  { city: 'Stockton', state: 'CA', lat: 37.9577, lng: -121.2908 },
  { city: 'Irvine', state: 'CA', lat: 33.6846, lng: -117.8265 },
  { city: 'Santa Barbara', state: 'CA', lat: 34.4208, lng: -119.6982 },
  { city: 'Santa Cruz', state: 'CA', lat: 36.9741, lng: -122.0308 },
  { city: 'Berkeley', state: 'CA', lat: 37.8716, lng: -122.2727 },
  { city: 'Pasadena', state: 'CA', lat: 34.1478, lng: -118.1445 },
  { city: 'Ventura', state: 'CA', lat: 34.2746, lng: -119.2290 },
  { city: 'Palm Springs', state: 'CA', lat: 33.8303, lng: -116.5453 },

  // Colorado
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Colorado Springs', state: 'CO', lat: 38.8339, lng: -104.8214 },
  { city: 'Aurora', state: 'CO', lat: 39.7294, lng: -104.8319 },
  { city: 'Fort Collins', state: 'CO', lat: 40.5853, lng: -105.0844 },
  { city: 'Boulder', state: 'CO', lat: 40.0150, lng: -105.2705 },
  { city: 'Pueblo', state: 'CO', lat: 38.2544, lng: -104.6091 },

  // Connecticut
  { city: 'Hartford', state: 'CT', lat: 41.7658, lng: -72.6734 },
  { city: 'New Haven', state: 'CT', lat: 41.3083, lng: -72.9279 },
  { city: 'Bridgeport', state: 'CT', lat: 41.1865, lng: -73.1952 },
  { city: 'Stamford', state: 'CT', lat: 41.0534, lng: -73.5387 },

  // Delaware
  { city: 'Wilmington', state: 'DE', lat: 39.7391, lng: -75.5398 },
  { city: 'Dover', state: 'DE', lat: 39.1582, lng: -75.5244 },

  // Florida
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792 },
  { city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { city: 'St. Petersburg', state: 'FL', lat: 27.7676, lng: -82.6403 },
  { city: 'Fort Lauderdale', state: 'FL', lat: 26.1224, lng: -80.1373 },
  { city: 'Tallahassee', state: 'FL', lat: 30.4383, lng: -84.2807 },
  { city: 'Gainesville', state: 'FL', lat: 29.6516, lng: -82.3248 },
  { city: 'Sarasota', state: 'FL', lat: 27.3364, lng: -82.5307 },
  { city: 'Fort Myers', state: 'FL', lat: 26.6406, lng: -81.8723 },
  { city: 'West Palm Beach', state: 'FL', lat: 26.7153, lng: -80.0534 },
  { city: 'Pensacola', state: 'FL', lat: 30.4213, lng: -87.2169 },

  // Georgia
  { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
  { city: 'Savannah', state: 'GA', lat: 32.0809, lng: -81.0912 },
  { city: 'Augusta', state: 'GA', lat: 33.4735, lng: -82.0105 },
  { city: 'Athens', state: 'GA', lat: 33.9519, lng: -83.3576 },
  { city: 'Macon', state: 'GA', lat: 32.8407, lng: -83.6324 },
  { city: 'Columbus', state: 'GA', lat: 32.4610, lng: -84.9877 },

  // Hawaii
  { city: 'Honolulu', state: 'HI', lat: 21.3069, lng: -157.8583 },
  { city: 'Hilo', state: 'HI', lat: 19.7074, lng: -155.0847 },

  // Idaho
  { city: 'Boise', state: 'ID', lat: 43.6150, lng: -116.2023 },
  { city: 'Idaho Falls', state: 'ID', lat: 43.4917, lng: -112.0339 },
  { city: 'Coeur d\'Alene', state: 'ID', lat: 47.6777, lng: -116.7805 },

  // Illinois
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Springfield', state: 'IL', lat: 39.7817, lng: -89.6501 },
  { city: 'Peoria', state: 'IL', lat: 40.6936, lng: -89.5890 },
  { city: 'Rockford', state: 'IL', lat: 42.2711, lng: -89.0940 },
  { city: 'Champaign', state: 'IL', lat: 40.1164, lng: -88.2434 },
  { city: 'Naperville', state: 'IL', lat: 41.7508, lng: -88.1535 },
  { city: 'Evanston', state: 'IL', lat: 42.0451, lng: -87.6877 },

  // Indiana
  { city: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
  { city: 'Fort Wayne', state: 'IN', lat: 41.0793, lng: -85.1394 },
  { city: 'Evansville', state: 'IN', lat: 37.9716, lng: -87.5711 },
  { city: 'South Bend', state: 'IN', lat: 41.6764, lng: -86.2520 },
  { city: 'Bloomington', state: 'IN', lat: 39.1653, lng: -86.5264 },

  // Iowa
  { city: 'Des Moines', state: 'IA', lat: 41.5868, lng: -93.6250 },
  { city: 'Cedar Rapids', state: 'IA', lat: 41.9779, lng: -91.6656 },
  { city: 'Iowa City', state: 'IA', lat: 41.6611, lng: -91.5302 },
  { city: 'Davenport', state: 'IA', lat: 41.5236, lng: -90.5776 },

  // Kansas
  { city: 'Wichita', state: 'KS', lat: 37.6872, lng: -97.3301 },
  { city: 'Kansas City', state: 'KS', lat: 39.1141, lng: -94.6275 },
  { city: 'Topeka', state: 'KS', lat: 39.0473, lng: -95.6752 },
  { city: 'Lawrence', state: 'KS', lat: 38.9717, lng: -95.2353 },
  { city: 'Overland Park', state: 'KS', lat: 38.9822, lng: -94.6708 },

  // Kentucky
  { city: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585 },
  { city: 'Lexington', state: 'KY', lat: 38.0406, lng: -84.5037 },
  { city: 'Bowling Green', state: 'KY', lat: 36.9685, lng: -86.4808 },

  // Louisiana
  { city: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 },
  { city: 'Baton Rouge', state: 'LA', lat: 30.4515, lng: -91.1871 },
  { city: 'Shreveport', state: 'LA', lat: 32.5252, lng: -93.7502 },
  { city: 'Lafayette', state: 'LA', lat: 30.2241, lng: -92.0198 },

  // Maine
  { city: 'Portland', state: 'ME', lat: 43.6591, lng: -70.2568 },
  { city: 'Bangor', state: 'ME', lat: 44.8012, lng: -68.7778 },

  // Maryland
  { city: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122 },
  { city: 'Annapolis', state: 'MD', lat: 38.9784, lng: -76.4922 },
  { city: 'Frederick', state: 'MD', lat: 39.4143, lng: -77.4105 },
  { city: 'Rockville', state: 'MD', lat: 39.0840, lng: -77.1528 },
  { city: 'Silver Spring', state: 'MD', lat: 38.9907, lng: -77.0261 },

  // Massachusetts
  { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { city: 'Cambridge', state: 'MA', lat: 42.3736, lng: -71.1097 },
  { city: 'Worcester', state: 'MA', lat: 42.2626, lng: -71.8023 },
  { city: 'Springfield', state: 'MA', lat: 42.1015, lng: -72.5898 },
  { city: 'Somerville', state: 'MA', lat: 42.3876, lng: -71.0995 },
  { city: 'Northampton', state: 'MA', lat: 42.3251, lng: -72.6412 },

  // Michigan
  { city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { city: 'Grand Rapids', state: 'MI', lat: 42.9634, lng: -85.6681 },
  { city: 'Ann Arbor', state: 'MI', lat: 42.2808, lng: -83.7430 },
  { city: 'Lansing', state: 'MI', lat: 42.7325, lng: -84.5555 },
  { city: 'Kalamazoo', state: 'MI', lat: 42.2917, lng: -85.5872 },
  { city: 'Flint', state: 'MI', lat: 43.0125, lng: -83.6875 },

  // Minnesota
  { city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.2650 },
  { city: 'St. Paul', state: 'MN', lat: 44.9537, lng: -93.0900 },
  { city: 'Rochester', state: 'MN', lat: 44.0121, lng: -92.4802 },
  { city: 'Duluth', state: 'MN', lat: 46.7867, lng: -92.1005 },

  // Mississippi
  { city: 'Jackson', state: 'MS', lat: 32.2988, lng: -90.1848 },
  { city: 'Biloxi', state: 'MS', lat: 30.3960, lng: -88.8853 },
  { city: 'Hattiesburg', state: 'MS', lat: 31.3271, lng: -89.2903 },

  // Missouri
  { city: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
  { city: 'St. Louis', state: 'MO', lat: 38.6270, lng: -90.1994 },
  { city: 'Springfield', state: 'MO', lat: 37.2090, lng: -93.2923 },
  { city: 'Columbia', state: 'MO', lat: 38.9517, lng: -92.3341 },

  // Montana
  { city: 'Billings', state: 'MT', lat: 45.7833, lng: -108.5007 },
  { city: 'Missoula', state: 'MT', lat: 46.8721, lng: -113.9940 },
  { city: 'Great Falls', state: 'MT', lat: 47.5002, lng: -111.3008 },
  { city: 'Bozeman', state: 'MT', lat: 45.6770, lng: -111.0429 },

  // Nebraska
  { city: 'Omaha', state: 'NE', lat: 41.2565, lng: -95.9345 },
  { city: 'Lincoln', state: 'NE', lat: 40.8136, lng: -96.7026 },

  // Nevada
  { city: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { city: 'Reno', state: 'NV', lat: 39.5296, lng: -119.8138 },
  { city: 'Henderson', state: 'NV', lat: 36.0395, lng: -114.9817 },

  // New Hampshire
  { city: 'Manchester', state: 'NH', lat: 42.9956, lng: -71.4548 },
  { city: 'Concord', state: 'NH', lat: 43.2081, lng: -71.5376 },
  { city: 'Nashua', state: 'NH', lat: 42.7654, lng: -71.4676 },

  // New Jersey
  { city: 'Newark', state: 'NJ', lat: 40.7357, lng: -74.1724 },
  { city: 'Jersey City', state: 'NJ', lat: 40.7178, lng: -74.0431 },
  { city: 'Atlantic City', state: 'NJ', lat: 39.3643, lng: -74.4229 },
  { city: 'Hoboken', state: 'NJ', lat: 40.7440, lng: -74.0324 },
  { city: 'Trenton', state: 'NJ', lat: 40.2171, lng: -74.7429 },
  { city: 'Asbury Park', state: 'NJ', lat: 40.2204, lng: -74.0121 },
  { city: 'New Brunswick', state: 'NJ', lat: 40.4862, lng: -74.4518 },

  // New Mexico
  { city: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
  { city: 'Santa Fe', state: 'NM', lat: 35.6870, lng: -105.9378 },
  { city: 'Las Cruces', state: 'NM', lat: 32.3199, lng: -106.7637 },

  // New York
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { city: 'Buffalo', state: 'NY', lat: 42.8864, lng: -78.8784 },
  { city: 'Rochester', state: 'NY', lat: 43.1566, lng: -77.6088 },
  { city: 'Syracuse', state: 'NY', lat: 43.0481, lng: -76.1474 },
  { city: 'Albany', state: 'NY', lat: 42.6526, lng: -73.7562 },
  { city: 'Ithaca', state: 'NY', lat: 42.4440, lng: -76.5019 },
  { city: 'White Plains', state: 'NY', lat: 41.0340, lng: -73.7629 },

  // North Carolina
  { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { city: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 },
  { city: 'Durham', state: 'NC', lat: 35.9940, lng: -78.8986 },
  { city: 'Greensboro', state: 'NC', lat: 36.0726, lng: -79.7920 },
  { city: 'Asheville', state: 'NC', lat: 35.5951, lng: -82.5515 },
  { city: 'Winston-Salem', state: 'NC', lat: 36.0999, lng: -80.2442 },
  { city: 'Wilmington', state: 'NC', lat: 34.2257, lng: -77.9447 },
  { city: 'Chapel Hill', state: 'NC', lat: 35.9132, lng: -79.0558 },

  // North Dakota
  { city: 'Fargo', state: 'ND', lat: 46.8772, lng: -96.7898 },
  { city: 'Bismarck', state: 'ND', lat: 46.8083, lng: -100.7837 },

  // Ohio
  { city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { city: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944 },
  { city: 'Cincinnati', state: 'OH', lat: 39.1031, lng: -84.5120 },
  { city: 'Toledo', state: 'OH', lat: 41.6528, lng: -83.5379 },
  { city: 'Akron', state: 'OH', lat: 41.0814, lng: -81.5190 },
  { city: 'Dayton', state: 'OH', lat: 39.7589, lng: -84.1916 },
  { city: 'Canton', state: 'OH', lat: 40.7990, lng: -81.3784 },

  // Oklahoma
  { city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164 },
  { city: 'Tulsa', state: 'OK', lat: 36.1540, lng: -95.9928 },
  { city: 'Norman', state: 'OK', lat: 35.2226, lng: -97.4395 },

  // Oregon
  { city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { city: 'Eugene', state: 'OR', lat: 44.0521, lng: -123.0868 },
  { city: 'Salem', state: 'OR', lat: 44.9429, lng: -123.0351 },
  { city: 'Bend', state: 'OR', lat: 44.0582, lng: -121.3153 },
  { city: 'Corvallis', state: 'OR', lat: 44.5646, lng: -123.2620 },

  // Pennsylvania
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { city: 'Pittsburgh', state: 'PA', lat: 40.4406, lng: -79.9959 },
  { city: 'Harrisburg', state: 'PA', lat: 40.2732, lng: -76.8867 },
  { city: 'Allentown', state: 'PA', lat: 40.6084, lng: -75.4902 },
  { city: 'Erie', state: 'PA', lat: 42.1292, lng: -80.0851 },
  { city: 'State College', state: 'PA', lat: 40.7934, lng: -77.8600 },
  { city: 'Lancaster', state: 'PA', lat: 40.0379, lng: -76.3055 },
  { city: 'Reading', state: 'PA', lat: 40.3357, lng: -75.9269 },

  // Rhode Island
  { city: 'Providence', state: 'RI', lat: 41.8240, lng: -71.4128 },
  { city: 'Newport', state: 'RI', lat: 41.4901, lng: -71.3128 },

  // South Carolina
  { city: 'Charleston', state: 'SC', lat: 32.7765, lng: -79.9311 },
  { city: 'Columbia', state: 'SC', lat: 34.0007, lng: -81.0348 },
  { city: 'Greenville', state: 'SC', lat: 34.8526, lng: -82.3940 },
  { city: 'Myrtle Beach', state: 'SC', lat: 33.6891, lng: -78.8867 },

  // South Dakota
  { city: 'Sioux Falls', state: 'SD', lat: 43.5446, lng: -96.7311 },
  { city: 'Rapid City', state: 'SD', lat: 44.0805, lng: -103.2310 },

  // Tennessee
  { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { city: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.0490 },
  { city: 'Knoxville', state: 'TN', lat: 35.9606, lng: -83.9207 },
  { city: 'Chattanooga', state: 'TN', lat: 35.0456, lng: -85.3097 },
  { city: 'Murfreesboro', state: 'TN', lat: 35.8456, lng: -86.3903 },

  // Texas
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { city: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
  { city: 'El Paso', state: 'TX', lat: 31.7619, lng: -106.4850 },
  { city: 'Arlington', state: 'TX', lat: 32.7357, lng: -97.1081 },
  { city: 'Corpus Christi', state: 'TX', lat: 27.8006, lng: -97.3964 },
  { city: 'Lubbock', state: 'TX', lat: 33.5779, lng: -101.8552 },
  { city: 'Amarillo', state: 'TX', lat: 35.2220, lng: -101.8313 },
  { city: 'Waco', state: 'TX', lat: 31.5493, lng: -97.1467 },
  { city: 'Denton', state: 'TX', lat: 33.2148, lng: -97.1331 },
  { city: 'McAllen', state: 'TX', lat: 26.2034, lng: -98.2300 },

  // Utah
  { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910 },
  { city: 'Provo', state: 'UT', lat: 40.2338, lng: -111.6585 },
  { city: 'Ogden', state: 'UT', lat: 41.2230, lng: -111.9738 },
  { city: 'St. George', state: 'UT', lat: 37.0965, lng: -113.5684 },
  { city: 'Park City', state: 'UT', lat: 40.6461, lng: -111.4980 },

  // Vermont
  { city: 'Burlington', state: 'VT', lat: 44.4759, lng: -73.2121 },
  { city: 'Montpelier', state: 'VT', lat: 44.2601, lng: -72.5754 },

  // Virginia
  { city: 'Richmond', state: 'VA', lat: 37.5407, lng: -77.4360 },
  { city: 'Virginia Beach', state: 'VA', lat: 36.8529, lng: -75.9780 },
  { city: 'Norfolk', state: 'VA', lat: 36.8508, lng: -76.2859 },
  { city: 'Arlington', state: 'VA', lat: 38.8799, lng: -77.1068 },
  { city: 'Alexandria', state: 'VA', lat: 38.8048, lng: -77.0469 },
  { city: 'Charlottesville', state: 'VA', lat: 38.0293, lng: -78.4767 },
  { city: 'Roanoke', state: 'VA', lat: 37.2710, lng: -79.9414 },

  // Washington
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Tacoma', state: 'WA', lat: 47.2529, lng: -122.4443 },
  { city: 'Spokane', state: 'WA', lat: 47.6588, lng: -117.4260 },
  { city: 'Bellevue', state: 'WA', lat: 47.6101, lng: -122.2015 },
  { city: 'Olympia', state: 'WA', lat: 47.0379, lng: -122.9007 },
  { city: 'Bellingham', state: 'WA', lat: 48.7519, lng: -122.4787 },

  // Washington D.C.
  { city: 'Washington', state: 'DC', lat: 38.9072, lng: -77.0369 },

  // West Virginia
  { city: 'Charleston', state: 'WV', lat: 38.3498, lng: -81.6326 },
  { city: 'Morgantown', state: 'WV', lat: 39.6295, lng: -79.9559 },
  { city: 'Huntington', state: 'WV', lat: 38.4192, lng: -82.4452 },

  // Wisconsin
  { city: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065 },
  { city: 'Madison', state: 'WI', lat: 43.0731, lng: -89.4012 },
  { city: 'Green Bay', state: 'WI', lat: 44.5133, lng: -88.0133 },
  { city: 'Eau Claire', state: 'WI', lat: 44.8113, lng: -91.4985 },

  // Wyoming
  { city: 'Cheyenne', state: 'WY', lat: 41.1400, lng: -104.8202 },
  { city: 'Casper', state: 'WY', lat: 42.8666, lng: -106.3131 },
  { city: 'Jackson', state: 'WY', lat: 43.4799, lng: -110.7624 },

  // Additional notable music / cultural cities
  { city: 'Sedona', state: 'AZ', lat: 34.8697, lng: -111.7610 },
  { city: 'Napa', state: 'CA', lat: 38.2975, lng: -122.2869 },
  { city: 'San Luis Obispo', state: 'CA', lat: 35.2828, lng: -120.6596 },
  { city: 'Indio', state: 'CA', lat: 33.7206, lng: -116.2156 },
  { city: 'Aspen', state: 'CO', lat: 39.1911, lng: -106.8175 },
  { city: 'Telluride', state: 'CO', lat: 37.9375, lng: -107.8123 },
  { city: 'Key West', state: 'FL', lat: 24.5551, lng: -81.7800 },
  { city: 'Bloomington', state: 'IL', lat: 40.4842, lng: -88.9937 },
  { city: 'Cape Cod', state: 'MA', lat: 41.6688, lng: -70.2962 },
  { city: 'Traverse City', state: 'MI', lat: 44.7631, lng: -85.6206 },
  { city: 'Oxford', state: 'MS', lat: 34.3665, lng: -89.5193 },
  { city: 'Branson', state: 'MO', lat: 36.6437, lng: -93.2185 },
  { city: 'Red Bank', state: 'NJ', lat: 40.3471, lng: -74.0643 },
  { city: 'Taos', state: 'NM', lat: 36.4072, lng: -105.5731 },
  { city: 'Woodstock', state: 'NY', lat: 42.0409, lng: -74.1182 },
  { city: 'Beacon', state: 'NY', lat: 41.5048, lng: -73.9696 },
  { city: 'Carrboro', state: 'NC', lat: 35.9101, lng: -79.0753 },
  { city: 'Athens', state: 'OH', lat: 39.3292, lng: -82.1013 },
  { city: 'Bethlehem', state: 'PA', lat: 40.6259, lng: -75.3705 },
  { city: 'Hilton Head Island', state: 'SC', lat: 32.2163, lng: -80.7526 },
  { city: 'Johnson City', state: 'TN', lat: 36.3134, lng: -82.3535 },
  { city: 'Fredericksburg', state: 'TX', lat: 30.2752, lng: -98.8720 },
  { city: 'Moab', state: 'UT', lat: 38.5733, lng: -109.5498 },
  { city: 'Stowe', state: 'VT', lat: 44.4654, lng: -72.6874 },
  { city: 'Williamsburg', state: 'VA', lat: 37.2707, lng: -76.7075 },
  { city: 'Walla Walla', state: 'WA', lat: 46.0646, lng: -118.3430 },
  { city: 'George', state: 'WA', lat: 47.0790, lng: -119.8527 },

  // Additional mid-size metros
  { city: 'Glendale', state: 'AZ', lat: 33.5387, lng: -112.1860 },
  { city: 'Gilbert', state: 'AZ', lat: 33.3528, lng: -111.7890 },
  { city: 'Modesto', state: 'CA', lat: 37.6391, lng: -120.9969 },
  { city: 'Santa Rosa', state: 'CA', lat: 38.4405, lng: -122.7141 },
  { city: 'Oceanside', state: 'CA', lat: 33.1959, lng: -117.3795 },
  { city: 'Chico', state: 'CA', lat: 39.7285, lng: -121.8375 },
  { city: 'Redding', state: 'CA', lat: 40.5865, lng: -122.3917 },
  { city: 'Lakewood', state: 'CO', lat: 39.7047, lng: -105.0814 },
  { city: 'Thornton', state: 'CO', lat: 39.8680, lng: -104.9719 },
  { city: 'Danbury', state: 'CT', lat: 41.3948, lng: -73.4540 },
  { city: 'Cape Coral', state: 'FL', lat: 26.5629, lng: -81.9495 },
  { city: 'Clearwater', state: 'FL', lat: 27.9659, lng: -82.8001 },
  { city: 'Daytona Beach', state: 'FL', lat: 29.2108, lng: -81.0228 },
  { city: 'Ocala', state: 'FL', lat: 29.1872, lng: -82.1401 },
  { city: 'Alpharetta', state: 'GA', lat: 34.0754, lng: -84.2941 },
  { city: 'Marietta', state: 'GA', lat: 33.9526, lng: -84.5499 },
  { city: 'Decatur', state: 'IL', lat: 39.8403, lng: -88.9548 },
  { city: 'Carmel', state: 'IN', lat: 39.9784, lng: -86.1180 },
  { city: 'Covington', state: 'KY', lat: 39.0837, lng: -84.5086 },
  { city: 'Kenner', state: 'LA', lat: 29.9941, lng: -90.2417 },
  { city: 'College Park', state: 'MD', lat: 38.9807, lng: -76.9369 },
  { city: 'Lowell', state: 'MA', lat: 42.6334, lng: -71.3162 },
  { city: 'Salem', state: 'MA', lat: 42.5195, lng: -70.8967 },
  { city: 'Royal Oak', state: 'MI', lat: 42.4895, lng: -83.1446 },
  { city: 'Pontiac', state: 'MI', lat: 42.6389, lng: -83.2910 },
  { city: 'Mankato', state: 'MN', lat: 44.1636, lng: -93.9994 },
  { city: 'Gulfport', state: 'MS', lat: 30.3674, lng: -89.0928 },
  { city: 'Independence', state: 'MO', lat: 39.0911, lng: -94.4155 },
  { city: 'Helena', state: 'MT', lat: 46.5958, lng: -112.0270 },
  { city: 'North Las Vegas', state: 'NV', lat: 36.1989, lng: -115.1175 },
  { city: 'Morristown', state: 'NJ', lat: 40.7968, lng: -74.4815 },
  { city: 'Poughkeepsie', state: 'NY', lat: 41.7004, lng: -73.9210 },
  { city: 'Saratoga Springs', state: 'NY', lat: 43.0831, lng: -73.7846 },
  { city: 'New Rochelle', state: 'NY', lat: 40.9115, lng: -73.7824 },
  { city: 'Fayetteville', state: 'NC', lat: 35.0527, lng: -78.8784 },
  { city: 'Youngstown', state: 'OH', lat: 41.0998, lng: -80.6496 },
  { city: 'Medford', state: 'OR', lat: 42.3265, lng: -122.8756 },
  { city: 'Scranton', state: 'PA', lat: 41.4090, lng: -75.6624 },
  { city: 'York', state: 'PA', lat: 39.9626, lng: -76.7277 },
  { city: 'Warwick', state: 'RI', lat: 41.7001, lng: -71.4162 },
  { city: 'Spartanburg', state: 'SC', lat: 34.9496, lng: -81.9321 },
  { city: 'Clarksville', state: 'TN', lat: 36.5298, lng: -87.3595 },
  { city: 'Plano', state: 'TX', lat: 33.0198, lng: -96.6989 },
  { city: 'Irving', state: 'TX', lat: 32.8140, lng: -96.9489 },
  { city: 'Laredo', state: 'TX', lat: 27.5036, lng: -99.5076 },
  { city: 'Midland', state: 'TX', lat: 31.9973, lng: -102.0779 },
  { city: 'Tyler', state: 'TX', lat: 32.3513, lng: -95.3011 },
  { city: 'Orem', state: 'UT', lat: 40.2969, lng: -111.6946 },
  { city: 'Lynchburg', state: 'VA', lat: 37.4138, lng: -79.1422 },
  { city: 'Hampton', state: 'VA', lat: 37.0299, lng: -76.3452 },
  { city: 'Everett', state: 'WA', lat: 47.9790, lng: -122.2021 },
  { city: 'Kennewick', state: 'WA', lat: 46.2112, lng: -119.1372 },
  { city: 'Appleton', state: 'WI', lat: 44.2619, lng: -88.4154 },
  { city: 'Oshkosh', state: 'WI', lat: 44.0247, lng: -88.5426 },
  { city: 'Kenosha', state: 'WI', lat: 42.5847, lng: -87.8212 },
  { city: 'Laramie', state: 'WY', lat: 41.3114, lng: -105.5911 },

  // Fill to ~370 unique entries
  { city: 'Visalia', state: 'CA', lat: 36.3302, lng: -119.2921 },
  { city: 'Eureka', state: 'CA', lat: 40.8021, lng: -124.1637 },
  { city: 'Monterey', state: 'CA', lat: 36.6002, lng: -121.8947 },
  { city: 'Durango', state: 'CO', lat: 37.2753, lng: -107.8801 },
  { city: 'Grand Junction', state: 'CO', lat: 39.0639, lng: -108.5506 },
  { city: 'New London', state: 'CT', lat: 41.3557, lng: -72.0995 },
  { city: 'Naples', state: 'FL', lat: 26.1420, lng: -81.7948 },
  { city: 'Valdosta', state: 'GA', lat: 30.8327, lng: -83.2785 },
  { city: 'Nampa', state: 'ID', lat: 43.5407, lng: -116.5635 },
  { city: 'Lafayette', state: 'IN', lat: 40.4167, lng: -86.8753 },
  { city: 'Terre Haute', state: 'IN', lat: 39.4667, lng: -87.4139 },
  { city: 'Ames', state: 'IA', lat: 42.0308, lng: -93.6319 },
  { city: 'Paducah', state: 'KY', lat: 37.0834, lng: -88.6001 },
  { city: 'Lake Charles', state: 'LA', lat: 30.2266, lng: -93.2174 },
  { city: 'Lewiston', state: 'ME', lat: 44.1004, lng: -70.2148 },
  { city: 'Hagerstown', state: 'MD', lat: 39.6418, lng: -77.7200 },
  { city: 'Saginaw', state: 'MI', lat: 43.4195, lng: -83.9508 },
  { city: 'St. Cloud', state: 'MN', lat: 45.5579, lng: -94.1632 },
  { city: 'Grand Island', state: 'NE', lat: 40.9264, lng: -98.3420 },
  { city: 'Concord', state: 'CA', lat: 37.9780, lng: -122.0311 },
  { city: 'Brownsville', state: 'TX', lat: 25.9017, lng: -97.4975 },
  { city: 'Duluth', state: 'GA', lat: 34.0029, lng: -84.1446 },
];
