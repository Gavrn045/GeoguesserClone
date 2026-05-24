from flask import Flask, jsonify, make_response, send_from_directory
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import os
import logging
import math
from random import shuffle
logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('engineio').setLevel(logging.ERROR)
logging.getLogger('socketio').setLevel(logging.ERROR)

load_dotenv()

app = Flask(__name__, static_folder="public")
socketio = SocketIO(app, cors_allowed_origins="*")

map_size = 0
round_num = 0
locations = []
location_num = -1

@app.route("/")
def index():
    return send_from_directory("public", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("public", path)

@app.route("/config")
def config():
    response = make_response(jsonify({"google_key": os.getenv("MAPS_API_KEY")}))
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

@socketio.on("connect")
def on_connect():
    print("Client connected")

@socketio.on("request_location")
def on_request_location():
    global location_num
    #gets a location and increments the num
    location_num += 1
    coord = locations[location_num]
    emit("newLocation", {"lat": coord[0], "lng": coord[1], "country":coord[2]})

@socketio.on("start_game")
def on_start_game(data):
    global map_size, location_num
    #reads gamemode and chooses map size for score calculation
    maps = data["maps"]
    game_maps = []
    for m in maps:
        if m == "EU":
            game_maps.append("maps/map_europe.txt")
        if m == "AS":
            game_maps.append("maps/map_asia.txt")
        if m == "OC":
            game_maps.append("maps/map_oceania.txt")
        if m == "NA":
            game_maps.append("maps/map_na.txt")
        if m == "SA":
            game_maps.append("maps/map_sa.txt")
        if m == "AF":
            game_maps.append("maps/map_africa.txt")


    get_locations(game_maps)
    emit("startingGame", {"lat": locations[0][0], "lng": locations[0][1]})
    pass

@socketio.on("guess_made")
def on_guess_made(data):
    global location_num, map_size

    guess_lat = data["position"]["lat"]
    guess_lng = data["position"]["lng"]
    real_lat = locations[location_num][0]
    real_lng = locations[location_num][1]
    #print(location_num)
    distance = haversine(guess_lat,guess_lng,real_lat,real_lng)
    print(distance)

    #score calculation
    if(distance<=25/1000):
        score = 5000
    else:
        score = int(5000*math.pow(math.e,-10*distance/map_size)) 
    #send score to front end
    print(score)
    emit("scoreCalculated",{"score":score,"distance":distance})

def get_locations(game_maps):
    global locations,map_size
    #changes file based on mode
    min_lat = 91
    max_lat = -91
    min_lng = 181
    max_lng = -181
    #reads file and adds locations to list
    for game_map in game_maps:
        with open(game_map, mode="r") as f1:
            for line in f1.readlines():
                tokens = line.split("\t")
                c = (float(tokens[1]), float(tokens[2]),tokens[0])
                locations.append(c)
                if c[0]<min_lat:
                    min_lat = c[0]
                if c[0]>max_lat:
                    max_lat = c[0]
                if c[1]<min_lng:
                    min_lng = c[1]
                if c[1]>max_lng:
                    max_lng = c[1]
    #randomizes order
    shuffle(locations)
    width = haversine(min_lat,min_lng,min_lat,max_lng)
    height = haversine(min_lat,min_lng,max_lat,min_lng)
    map_size = math.sqrt(width**2+height**2)

#Haversince distance
def haversine(guess_lat,guess_lng,real_lat,real_lng):
    dLat = (guess_lat - real_lat) * math.pi / 180.0
    dLon = (guess_lng - real_lng) * math.pi / 180.0
    real_lat = (real_lat) * math.pi / 180.0
    guess_lat = (guess_lat) * math.pi / 180.0
    a = (pow(math.sin(dLat / 2), 2) + 
         pow(math.sin(dLon / 2), 2) * 
             math.cos(real_lat) * math.cos(guess_lat))
    rad = 6371
    c = 2 * math.asin(math.sqrt(a))
    distance = rad*c
    return distance
        


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
