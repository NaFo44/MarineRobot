from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import gps, lidar, motor

app = Flask(__name__)

gps.start_gps()
lidar.start_lidar()

@app.route("/")
def index():
    return send_from_directory("P:/SIN/MarineRobot/controller/", "index.html")

@app.route("/gps")
def gps_route():
    return jsonify(gps.get_gps_data())

@app.route("/lidar")
def lidar_route():
    return jsonify(lidar.get_lidar_data())

@app.route("/command", methods=["POST"])
def command():
    data = request.json
    cmd = data.get("cmd")

    result = motor.execute_command(cmd)
    return jsonify(result)

@app.route("/status")
def status():
    return jsonify({"state": motor.current_state})

app.run(host="0.0.0.0", port=5000)