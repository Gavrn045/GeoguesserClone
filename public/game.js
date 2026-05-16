let panorama;
let guessMap;
let guessMarker;
let correctMarker;
let correctLine;
let gameMode = 0;

//conect to FlaskSocketIo
const socket = io("http://localhost:5000");
const blueIcon = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";

// SOCKET FUNCTIONS
socket.on("connect", () => {
    console.log("Connected to Flask server");
});

socket.on("newLocation", (data) =>{
    console.log("updating panorama with new location "+data.lat+" "+data.lng +" "+data.name);

    //zooms map to city if the gamemode is for city
    if(gameMode == 1){
        guessMap.setCenter({lat:43.455324,lng:18});
        guessMap.setZoom(10);
    }
    guessMarker = null;

    updatePanorama(data.lat, data.lng);

    //creates a marker for the correct location
    correctMarker = new google.maps.Marker({
        position: new google.maps.LatLng(data.lat, data.lng),
        map: guessMap,
        visible: false,
        icon: blueIcon
    });
});

socket.on("startingGame",(data)=>{
    socket.emit("request_location")
    showScreen('gameScreen');
})

// MUST be global so Google can call it
function initStreetView() {
    console.log("Google Maps API loaded — initializing Street View");

    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("pano"),
        {
            position: { lat: 0, lng: 0 },
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: false,
            linksControl: true,
            //panControl: false,
            //zoomControl: false,
            fullscreenControl: false,
            showRoadLabels: false //no street names on road
        }
    );
}

function initMap() {
    guessMarker = null;
    //creates a world map for the game
    guessMap = new google.maps.Map(
        document.getElementById("guessMap"),
        {
            zoom: 1,
            center: { lat: 20, lng: 0 },
            restriction: {
                latLngBounds: {north: 85,south: -85,west: -180,east: 180},
                strictBounds: true
            },
            disableDefaultUI: true,//no ui
            //zoomControl: false,
            streetViewControl: false,//cant use street view
            mapTypeControl: false,//cant change map type
            fullscreenControl: false,//cant fullscreen
            clickableIcons: false,//doesnt show icons
            styles: [
                {
                    featureType: "poi",//doesnt show POI like hospitals
                    stylers: [{ visibility: "off" }]
                },
                {
                    featureType: "transit",//doesnt show icons for train stations
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
    //no new guess if already submited
    if(correctLine){
        return;
    }

    //if a guess marker exists it gets deleted
    if(guessMarker){
        guessMarker.setMap(null);
        guessMarker = null;
    }
    //creates new marker at click
    guessMarker = new google.maps.Marker({
        position: latLng,
        map: map,
    });
}

//initializes the map and panorama
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
    //sets panorama attributes
    panorama.setPosition({ lat, lng });
    panorama.setPov({ heading: 0, pitch: 0 });
    panorama.setZoom(1);
}

//BUTTON FUNCTIONS

//function for starting game
function startGame(){
    let val;
    //gets the gamemode choice from user
    const radios = document.getElementsByName("modeChoice");
    radios.forEach(radio => {
        console.log(radio.value,radio.checked);
        if(radio.checked){
            val = radio.value;
        }
    });

    //sets gamemode
    switch(val){
        case "City":
            gameMode = 1;
            break;
        case "World":
            gameMode = 2;
            break;
    }
    console.log(val,gameMode);
    //starts game
    if(gameMode != 0){
        socket.emit("start_game", {
            gameMode:gameMode
        });
    }
}

//function for switching between screens
function showScreen(id) {
    //hides all screens
    document.getElementById("homeScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";

    //shows screen based on id, shows map if needed
    document.getElementById(id).style.display = "block";
    if (id === "gameScreen" && guessMap) {
        google.maps.event.trigger(guessMap, "resize");
        guessMap.setCenter({ lat: 20, lng: 0 });
    }
}

//button for next round
function requestLocation(){
    //resets the markers for guess and correct
    if(correctMarker){
        correctMarker.setMap(null);
        correctMarker = null;
    }
    if(guessMarker){
        guessMarker.setMap(null);
        guessMarker = null;
    }
    if(correctLine){
        correctLine.setMap(null);
        correctLine = null;
    }

    //asks for location
    socket.emit("request_location");
}

//function for guess button
function makeGuess(){
    //stops if no guess made
    if(guessMarker == null || correctLine){
        return;
    }
    //shows correct option and sends to python
    correctMarker.setVisible(true);

    correctLine = new google.maps.Polyline({
        path: [guessMarker.getPosition(),correctMarker.getPosition()],
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 3,
    });
    correctLine.setMap(guessMap);

    socket.emit("guess_made", {
        position : guessMarker.position
    });
    
}

