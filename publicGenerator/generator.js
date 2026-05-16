//conect to FlaskSocketIo
const socket = io("http://localhost:5000");

//Get geoJson
var geoJson;

// SOCKET FUNCTIONS
socket.on("connect", () => {
    console.log("Connected to Flask server");
});

/*================================
MAP GENERATOR FUNCTIONS
================================*/

async function loadGeoJSON() {
    const response = await fetch("worldBoundaries.geojson");
    const data = await response.json();
    //console.log("Loaded GeoJSON:", data);
    return data;
}

async function test(){
    geoJson = await loadGeoJSON();
    console.log("got geojson");
    // var geometry = geoJson.features[3].geometry;
    // console.log(getBoundingBoxes(getOuterRings(geometry)));
    
    for(let i=0;i<geoJson.features.length;i++){
        var element = geoJson.features[i];
        if(element.properties["ISO3166-1-Alpha-3"]==="-99"){
            //console.log(element.properties["name"]);
        }else{
            //process features
            var points = getPoints(element, 3);
            console.log(points);
            break;
        }
    }
}


function getPoints(feature, numPoints){
    const bbox = turf.bbox(feature);
    var points = []

    while(points.length != numPoints){
        const pt = turf.randomPoint(1, { bbox }).features[0];
        if (turf.booleanPointInPolygon(pt, feature)) {
            points.push(pt.geometry.coordinates);
        }
    }
    return points;
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