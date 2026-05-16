//conect to FlaskSocketIo
const socket = io("http://localhost:5000");

//Get geoJson
var geoJson;
var apiKey;
var svCache;
var coarseCache;

// SOCKET FUNCTIONS
socket.on("connect", () => {
    console.log("Connected to Flask server");
});
socket.on("key",(data)=>{
    //console.log(data.apiKey);
    apiKey = data.apiKey;
});

/*================================
MAP GENERATOR FUNCTIONS
================================*/

window.loadGeoJSON = async function() {
    const response = await fetch("worldBoundaries.geojson");
    const data = await response.json();
    //console.log("Loaded GeoJSON:", data);
    geoJson = data;
}

async function test(){
    // var geometry = geoJson.features[3].geometry;
    // console.log(getBoundingBoxes(getOuterRings(geometry)));
    const countries = ["Republic of Serbia","Croatia","Montenegro","Bosnia and Herzegovina","Slovenia","North Macedonia"]
    var coords = new Map();
    console.log("Starting generation");
    for(let i=0;i<geoJson.features.length;i++){
        var element = geoJson.features[i];
        // if(element.properties["ISO3166-1-Alpha-3"]==="-99"){
        //     //console.log(element.properties["name"]);
        // }
        if(countries.includes(element.properties["name"])){//countries to check
            //process features
            svCache = new Map();
            coarseCache = new Map();
            var points = await getPoints(element, 3);
            // console.log(points);
            // console.log(svCache);
            // console.log(coarseCache);
            coords.set(element.properties["name"], points);
        }
    }
    //console.log(coords);
    for (const [country, points] of coords.entries()) {
        socket.emit("location_chunk", {
            country: country,
            points: points
        });
        sleep(50);
    }
}


async function getPoints(feature, numPoints){
    const bbox = turf.bbox(feature);
    var points = []

    while(points.length != numPoints){
        const pt = turf.randomPoint(1, { bbox }).features[0];
        if (turf.booleanPointInPolygon(pt, feature)) {//point in country
            if(await hasStreetView(pt.geometry.coordinates)){//point has streetview
                console.log("found location");
                points.push(pt.geometry.coordinates);
            }
        }
        sleep(10);//rate limiting
    }
    return points;
}

async function hasStreetView(coords) {
    const lng = coords[0];
    const lat = coords[1];

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const coarseKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

    if (svCache.has(key)) {
        console.log("cached");
        return svCache.get(key);
    }

    if (coarseCache.has(coarseKey) && coarseCache.get(coarseKey) === false) {
        console.log("coarsed");
        return false;
    }
    //nearest street view loop

    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    //console.log(data, data.status==="OK");
    const resp = data.status === "OK";
    coarseCache.set(coarseKey,resp);
    svCache.set(key, resp);
    return resp;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// //using turf 
// function getOuterRings(geometry){
//     if (geometry.type === "Polygon") {
//         return [ geometry.coordinates[0] ]; // outer ring only
//     }

//     if (geometry.type === "MultiPolygon") {
//         return geometry.coordinates.map(poly => poly[0]); // outer ring of each island
//     }
// }

// function getBoundingBoxes(islands){
//     var boxes = [];
//     islands.forEach(island => {
//         var minLat = Infinity, minLng = Infinity;
//         var maxLat = -Infinity, maxLng = -Infinity;
//         island.forEach(coord => {
//             if(coord[0]>maxLng){
//                 maxLng = coord[0];
//             }
//             if(coord[0]<minLng){
//                 minLng = coord[0];
//             }

//             if(coord[1]>maxLat){
//                 maxLat = coord[1];
//             }
//             if(coord[1]<minLat){
//                 minLat = coord[1];
//             }
//         });
//         boxes.push([minLng,minLat,maxLng,maxLat]);
//     });
//     return boxes
// }