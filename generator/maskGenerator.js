// generateMask.js
const fs = require("fs");
const turf = require("@turf/turf");
require("dotenv").config();

// 1 km in degrees (lat)
const apiKey = process.env.MAPS_API_KEY;
const KM_LAT = 1 / 110.574; // ~0.009043 degrees

function lngStep(lat) {
    return 1 / (111.320 * Math.cos(lat * Math.PI / 180));
}

async function mesherizeCountry(feature) {
    const bbox = turf.bbox(feature); // [minLng, minLat, maxLng, maxLat]

    const minLng = bbox[0];
    const minLat = bbox[1];
    const maxLng = bbox[2];
    const maxLat = bbox[3];

    const rows = [];
    let rowCount = 0;

    for (let lat = minLat; lat <= maxLat; lat += KM_LAT) {
        const stepLng = lngStep(lat);
        const row = [];

        for (let lng = minLng; lng <= maxLng; lng += stepLng) {
            const point = turf.point([lng, lat]);
            const inside = turf.booleanPointInPolygon(point, feature);
            if(!inside){
                row.push(false);
                continue;
            }
            const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`;
            const res = await fetch(url);
            const data = await res.json();

            const hasSV = data.status === "OK";
            row.push(hasSV);

            // 3. Throttle to avoid 429
            await new Promise(r => setTimeout(r, 120));
        }

        rows.push(row);
        rowCount++;
        console.log(`Row ${rowCount} done`);
    }

    return rows;
}

function writeBitPackedMask(mask, outputFile) {
    // Count total bits
    let totalBits = 0;
    for (const row of mask) totalBits += row.length;

    const totalBytes = Math.ceil(totalBits / 8);
    const buffer = Buffer.alloc(totalBytes);

    let bitIndex = 0;

    for (const row of mask) {
        for (const cell of row) {
            if (cell) {
                const byteIndex = Math.floor(bitIndex / 8);
                const bitOffset = bitIndex % 8;
                buffer[byteIndex] |= (1 << bitOffset);
            }
            bitIndex++;
        }
    }

    fs.writeFileSync(outputFile, buffer);
    console.log(`Bit-packed mask written to ${outputFile}`);
    console.log(`Size: ${buffer.length} bytes`);
}

// ----------------------------
// MAIN
// ----------------------------
async function main(){
    countries = ["Kazakhstan","Mongolia","Kyrgyzstan"]
    const geoJson = JSON.parse(fs.readFileSync("publicGenerator/worldBoundaries.geoJson", "utf8"));
    for(let i=0;i<geoJson.features.length;i++){
        var element = geoJson.features[i];
        if(countries.includes(element.properties["name"])){
            console.log("mesherizing country...");
            const mask = await mesherizeCountry(element);

            console.log("Writing bit-packed mask...");
            const fName = element.properties["name"].replace(/ /g, "_") + "_mask.bin";
            writeBitPackedMask(mask, fName);
            console.log("Done "+element.properties["name"]);
        }
    }
}
main();

