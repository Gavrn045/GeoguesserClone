from flask import Flask, jsonify, make_response, send_from_directory
from flask_socketio import SocketIO


app = Flask(__name__, static_folder="public")
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route("/")
def index():
    return send_from_directory("publicGenerator", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("publicGenerator", path)


@socketio.on("connect")
def on_connect():
    print("Client connected")

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)