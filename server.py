from flask import Flask, jsonify, render_template, make_response, send_from_directory
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import os
import logging
logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('engineio').setLevel(logging.ERROR)
logging.getLogger('socketio').setLevel(logging.ERROR)

load_dotenv()

app = Flask(__name__, static_folder="public")
socketio = SocketIO(app, cors_allowed_origins="*")

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

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
