# Marine Robot

This project include a test API to test the controller:
- `localhost:5000/gps` using `GET` method
- `localhost:5000/lidar` using `GET` method
- `localhost:5000/command` using `POST` method
Your request have to include a "cmd" field containing the command you want to execute: left/right/stop (always return "received" for the test API)
- `localhost:5000/status` using `GET` method (always return "stop" for the test API)

## Usage
Example with /gps (it's basicaly the same thing for /lidar and /status):
```javascript
fetch("http://localhost:5000/gps")
  .then(res => res.json())
  .then(data => {
    console.log("GPS:", data);
  })
  .catch(err => console.error(err));
```

Example with /command using `POST` method!

```javascript
fetch("http://localhost:5000/command", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    cmd: "stop" // forward, backward, rotate_left, rotate_right, turn_left, turn_right, stop
  })
})
  .then(res => res.json())
  .then(data => {
    console.log("Command result:", data);
  })
  .catch(err => console.error(err));
```
