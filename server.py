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

game_mode = 0
map_size = 0
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
    global game_mode, map_size, location_num
    #reads gamemode and chooses map size for score calculation
    game_mode = data["gameMode"]
    if game_mode == 1:
        map_size = 15
    elif game_mode == 2:
        map_size = 14500

    get_locations(game_mode)
    emit("startingGame", {"lat": locations[0][0], "lng": locations[0][1]})
    pass

@socketio.on("guess_made")
def on_guess_made(data):
    global location_num, map_size

    guess_lat = data["position"]["lat"]
    guess_lng = data["position"]["lng"]
    real_lat = locations[location_num][0]
    real_lng = locations[location_num][1]
    print(location_num)
    print((guess_lat,guess_lng),(locations[location_num]),locations[0])

    #Haversince distance
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
    print(distance)

    #score calculation
    if(distance<=25/1000):
        score = 5000
    else:
        score = int(5000*math.pow(math.e,-10*distance/map_size)) 
    #send score to front end
    print(score)

def get_locations(mode):
    global locations
    #changes file based on mode
    if mode == 1:
        file_name = "map.txt"
    elif mode == 2:
        file_name = "locations2.txt"
    
    #reads file and adds locations to list
    with open(file_name, mode="r") as f1:
        for line in f1.readlines():
            tokens = line.split("\t")
            c = (float(tokens[1]), float(tokens[2]),tokens[0])
            locations.append(c)
    #randomizes order
    shuffle(locations)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
