from flask import Flask, jsonify

app = Flask(__name__)

gps_data = '{ "lat": 43.2965, "lon": 5.3698, "sat": None, "alt": None }'
lidar_data = '{ "speed": 5.72, "timestamp": 18342, "points": [(12.5, 1.23, 210), (13.0, 1.25, 198), (13.5, 1.22, 205), (14.0, 1.30, 180), (14.5, 1.28, 175)]}'

@app.route("/gps")
def gps_route():
    return jsonify(gps_data)

@app.route("/lidar")
def lidar_route():
    return jsonify(lidar_data)

@app.route("/command", methods=["POST"])
def command():
    return jsonify("received")

@app.route("/status")
def status():
    return jsonify({"state": "stop"})

app.run(host="0.0.0.0", port=5000)