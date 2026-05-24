import os

from flask import Flask, jsonify, make_response, send_from_directory
from flask_socketio import SocketIO, emit


app = Flask(__name__, static_folder="publicGenerator")
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route("/")
def index():
    return send_from_directory("publicGenerator", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("publicGenerator", path)

@socketio.on("connect")
def on_connect():
    countries=[]
    with open("generator/countries.txt",mode='r') as f:
        for line in f.readlines():
            if(line.strip()=="==="):
                break
            countries.append(line.strip())

    emit("key", {"apiKey" : os.getenv("MAPS_API_KEY"), "countries":countries})
    print("Client connected")
    print(countries)

@socketio.on("location_chunk")
def on_location_chunk(data):
    country = data["country"]
    points = data["points"]
    print(country, points)
    with open("map_sa.txt", "a") as f:
        for lat, lng in points:
            f.write(f"{country}\t{lng}\t{lat}\n")

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)