import pigpio

ESC1 = 18
ESC2 = 19

pi = pigpio.pi()

if not pi.connected:
    raise RuntimeError("pigpio not connected")

current_state = "stop"

def right():
    global current_state
    pi.set_servo_pulsewidth(ESC1, 2000)
    pi.set_servo_pulsewidth(ESC2, 1300)
    current_state = "right"

def left():
    global current_state
    pi.set_servo_pulsewidth(ESC1, 1300)
    pi.set_servo_pulsewidth(ESC2, 2000)
    current_state = "left"

def forward():
    global current_state
    pi.set_servo_pulsewidth(ESC1, 2000)
    pi.set_servo_pulsewidth(ESC2, 1000)
    current_state = "forward"

def backward():
    global current_state
    pi.set_servo_pulsewidth(ESC1, 1000)
    pi.set_servo_pulsewidth(ESC2, 2000)
    current_state = "backward"

def stop():
    global current_state
    pi.set_servo_pulsewidth(ESC1, 1500)
    pi.set_servo_pulsewidth(ESC2, 1500)
    current_state = "stop"

def execute_command(cmd):
    if cmd == "left":
        left()
    elif cmd == "right":
        right()
    elif cmd == "stop":
        stop()
    elif cmd == "forward":
        forward()
    elif cmd == "backward":
        backward()
    else:
        return {"status": "error", "message": "unknown command"}

    return {"status": "ok", "state": current_state}

def cleanup():
    stop()
    pi.stop()
