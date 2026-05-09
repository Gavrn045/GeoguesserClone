from flask import Flask, jsonify, make_response, send_from_directory
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import os
import logging
import math
logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('engineio').setLevel(logging.ERROR)
logging.getLogger('socketio').setLevel(logging.ERROR)

load_dotenv()

app = Flask(__name__, static_folder="public")
socketio = SocketIO(app, cors_allowed_origins="*")

temp_loc = [
(43.4060164,-80.5158004),
(43.48331344206338,-80.50691468),
(43.467851814237335,-80.52651907),
(43.40156938761984,-80.45964152),
(43.42260820925412,-80.48892037),
(43.50388868238575,-80.52458396),
(43.39518310228018,-80.50148273),
(43.454018887864336,-80.54908272)]
location_num = 0

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
    coord = temp_loc[location_num]
    location_num += 1
    emit("newLocation", {"lat": coord[0], "lng": coord[1]})

@socketio.on("guess_made")
def on_guess_made(data):
    global location_num

    guess_lat = data["position"]["lat"]
    guess_lng = data["position"]["lng"]
    real_lat = temp_loc[location_num][0]
    real_lng = temp_loc[location_num][1]

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
    size = 15 #size of map
    score = int(5000*math.pow(math.e,-10*distance/size)) 

    print(score)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
