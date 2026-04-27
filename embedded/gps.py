from smbus2 import SMBus
import pynmea2
import time
import threading

I2C_BUS = 1
GPS_ADDR = 0x10

gps_data = {
    "lat": None,
    "lon": None,
    "sat": None,
    "alt": None
}

def read_line(bus):
    data = []

    while True:
        try:
            block = bus.read_i2c_block_data(GPS_ADDR, 0x00, 32)

            for b in block:
                if b in (0xFF, 0x00):
                    continue

                if b == 0x0A:
                    return ''.join(data).strip()

                data.append(chr(b))

        except Exception:
            time.sleep(0.1)

def gps_loop():
    global gps_data

    with SMBus(I2C_BUS) as bus:
        while True:
            line = read_line(bus)

            if not line.startswith('$'):
                continue

            try:
                msg = pynmea2.parse(line)

                if hasattr(msg, 'latitude') and hasattr(msg, 'longitude'):
                    gps_data = {
                        "lat": msg.latitude,
                        "lon": msg.longitude,
                        "sat": getattr(msg, 'num_sats', None),
                        "alt": getattr(msg, 'altitude', None)
                    }

            except pynmea2.ParseError:
                pass

def start_gps():
    thread = threading.Thread(target=gps_loop, daemon=True)
    thread.start()

def get_gps_data():
    return gps_data