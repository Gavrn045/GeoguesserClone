let panorama;
let guessMap;
let guessMarker;

//conect to FlaskSocketIo
const socket = io("http://localhost:5000");

// SOCKET FUNCTIONS
socket.on("connect", () => {
    console.log("Connected to Flask server");
});

socket.on("newLocation", (data) =>{
    console.log("updating panorama with new location "+data.lat+" "+data.lng);
    updatePanorama(data.lat, data.lng);
});

// MUST be global so Google can call it
function initStreetView() {
    console.log("Google Maps API loaded — initializing Street View");

    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("pano"),
        {
            position: { lat: 43.4060164, lng: -80.5158004 },
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: false,
            linksControl: true,
            panControl: false,
            zoomControl: false,
            fullscreenControl: false
        }
    );
}

function initMap() {
    guessMarker = null;
    guessMap = new google.maps.Map(
        document.getElementById("guessMap"),
        {
            zoom: 1,
            center: { lat: 20, lng: 0 },
            restriction: {
                latLngBounds: {north: 85,south: -85,west: -180,east: 180},
                strictBounds: true
            },
            disableDefaultUI: true,
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            styles: [
                {
                    featureType: "poi",
                    stylers: [{ visibility: "off" }]
                },
                {
                    featureType: "transit",
                    stylers: [{ visibility: "off" }]
                }
            ]
        }
    );

    guessMap.addListener('click', (e) => {
        placeMarker(e.latLng, guessMap);
    });
}

function placeMarker(latLng, map){
    if(guessMarker){
        guessMarker.setMap(null);
        guessMarker = null;
    }
    guessMarker = new google.maps.Marker({
        position: latLng,
        map: map,
    });
}

window.initAll = function(){
    initStreetView();
    initMap();
}

// Function to update the panorama later
function updatePanorama(lat, lng) {
    if (!panorama) {
        console.warn("Panorama not ready yet");
        return;
    }

    panorama.setPosition({ lat, lng });
    panorama.setPov({ heading: 0, pitch: 0 });
    panorama.setZoom(1);
}

//BUTTON FUNCTIONS

function showScreen(id) {
    document.getElementById("homeScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";

    document.getElementById(id).style.display = "block";
    if (id === "gameScreen" && guessMap) {
        google.maps.event.trigger(guessMap, "resize");
        guessMap.setCenter({ lat: 20, lng: 0 });
    }
}

function requestLocation(){
    socket.emit("request_location");
}

function makeGuess(){
    console.log("test 1");
    if(guessMarker == null){
        return;
    }
    socket.emit("guess_made", {
        position : guessMarker.position
    });
}

