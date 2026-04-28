import pigpio
import time

ESC1 = 18
ESC2 = 19

pi = pigpio.pi()

if not pi.connected:
    raise RuntimeError("pigpio not connected")
    
NEUTRAL = 1500
MAX_DELTA = 400

current_pwm_esc1 = NEUTRAL
current_pwm_esc2 = NEUTRAL

def clamp(value, min_val, max_val):
    return max(min(value, max_val), min_val)

def speed_to_pwm(speed):
    """
    speed ∈ [-1.0, 1.0]
    """
    speed = clamp(speed, -1.0, 1.0)
    return int(NEUTRAL + speed * MAX_DELTA)

def smooth_set_pwm(target1, target2, step=5, delay=0.01):
    global current_pwm_esc1, current_pwm_esc2

    while current_pwm_esc1 != target1 or current_pwm_esc2 != target2:

        if current_pwm_esc1 < target1:
            current_pwm_esc1 = min(current_pwm_esc1 + step, target1)
        elif current_pwm_esc1 > target1:
            current_pwm_esc1 = max(current_pwm_esc1 - step, target1)

        if current_pwm_esc2 < target2:
            current_pwm_esc2 = min(current_pwm_esc2 + step, target2)
        elif current_pwm_esc2 > target2:
            current_pwm_esc2 = max(current_pwm_esc2 - step, target2)

        pi.set_servo_pulsewidth(ESC1, current_pwm_esc1)
        pi.set_servo_pulsewidth(ESC2, current_pwm_esc2)

        time.sleep(delay)

def set_motor_speeds(speed1, speed2):
    """
    speed1, speed2 ∈ [-1.0, 1.0]
    """
    pwm1 = speed_to_pwm(speed1)
    pwm2 = speed_to_pwm(speed2)
    smooth_set_pwm(pwm1, pwm2)

def stop():
    set_motor_speeds(0, 0)

def forward(speed=0.5):
    set_motor_speeds(speed, speed)

def backward(speed=0.5):
    set_motor_speeds(-speed, -speed)

def rotate_right(speed=0.5):
    set_motor_speeds(speed, -speed)

def rotate_left(speed=0.5):
    set_motor_speeds(-speed, speed)

def turn_right(speed=0.5, curve=0.3):
    set_motor_speeds(speed, speed * (1 - curve))

def turn_left(speed=0.5, curve=0.3):
    set_motor_speeds(speed * (1 - curve), speed)

def execute_command(cmd, value=0.5):
    if cmd == "forward":
        forward(value)
    elif cmd == "backward":
        backward(value)
    elif cmd == "rotate_left":
        rotate_left(value)
    elif cmd == "rotate_right":
        rotate_right(value)
    elif cmd == "turn_left":
        turn_left(value)
    elif cmd == "turn_right":
        turn_right(value)
    elif cmd == "stop":
        stop()
    else:
        return {"status": "error", "message": "unknown command"}

    return {"status": "ok", "cmd": cmd, "value": value}

def cleanup():
    stop()
    pi.stop()
