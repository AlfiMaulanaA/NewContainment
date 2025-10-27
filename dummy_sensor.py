import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

# MQTT broker configuration
MQTT_BROKER = "localhost" # <--- BROKER TELAH DIUBAH
MQTT_PORT = 1883

# Dictionary of MQTT topics separated by sensor type
# Modified to remove "_Rack" and leading zeros from topic numbers
MQTT_TOPICS = {
    "Temperature": [f"Containment/Sensor/Temperature_{i}" for i in range(1, 5)],
    "AirFlow": [f"Containment/Sensor/Air Flow_{i}" for i in range(1, 5)],
    "Dust": [f"Containment/Sensor/Dust Sensor_{i}" for i in range(1, 5)],
    "Vibration": [f"Containment/Sensor/Vibration_{i}" for i in range(1, 5)],
    "PDU_Power": [f"Containment/PDU/Power_{i}" for i in range(1, 5)],
    "Device_Power_Meter": [f"Containment/Power_Meter/Device_{i}" for i in range(1, 5)]
}

def on_connect(client, userdata, flags, rc):
    """Callback function when the client connects to the broker."""
    if rc == 0:
        print("Connected to MQTT Broker!")
    else:
        print(f"Failed to connect, return code: {rc}")

def get_sensor_data(sensor_type):
    """Generates random data based on the sensor type."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if sensor_type == "Temperature":
        temp_value = round(random.uniform(18.0, 27.0), 1)
        hum_value = round(random.uniform(50.0, 100.0), 1)
        return {"temp": temp_value, "hum": hum_value, "timestamp": timestamp}

    elif sensor_type == "AirFlow":
        air_flow_value = round(random.uniform(5.0, 20.0), 1)
        air_pressure_value = round(random.uniform(1000.0, 1020.0), 1)
        return {"air_flow_lpm": air_flow_value, "air_pressure_hpa": air_pressure_value, "timestamp": timestamp}

    elif sensor_type == "Dust":
        dust_level = round(random.uniform(0.5, 50.0), 2)
        return {"dust_level_ug_m3": dust_level, "timestamp": timestamp}

    elif sensor_type == "Vibration":
        vibration_x = round(random.uniform(0.01, 1.5), 3)
        vibration_y = round(random.uniform(0.01, 1.5), 3)
        vibration_z = round(random.uniform(0.01, 1.5), 3)
        return {"vibration_x": vibration_x, "vibration_y": vibration_y, "vibration_z": vibration_z, "timestamp": timestamp}

    elif sensor_type == "PDU_Power":
        power_cons = round(random.uniform(2.5, 5.0), 2) # in kW
        total_power = round(random.uniform(150.0, 250.0), 2) # in kWh
        total_ampere = round(random.uniform(10.0, 20.0), 2) # in A
        return {
            "power_consumption_kw": power_cons,
            "total_power_kwh": total_power,
            "total_ampere": total_ampere,
            "timestamp": timestamp
        }

    elif sensor_type == "Device_Power_Meter":
        L1_volt = round(random.uniform(220.0, 240.0), 2) # Line 1 voltage
        L2_volt = round(random.uniform(220.0, 240.0), 2) # Line 2 voltage
        L3_volt = round(random.uniform(220.0, 240.0), 2) # Line 3 voltage
        N_volt = round(random.uniform(0.1, 1.5), 2) # Neutral voltage
        L1_L2_volt = round(random.uniform(380.0, 415.0), 2) # Line 1 to Line 2 voltage
        L2_L3_volt = round(random.uniform(380.0, 415.0), 2) # Line 2 to Line 3 voltage
        L3_N_volt = round(random.uniform(380.0, 415.0), 2) # Line 3 to Neutral voltage
        return {
            "L1_V": L1_volt,
            "L2_V": L2_volt,
            "L3_V": L3_volt,
            "N_V": N_volt,
            "L1_L2_V": L1_L2_volt,
            "L2_L3_V": L2_L3_volt,
            "L3_N_V": L3_N_volt,
            "timestamp": timestamp
        }

    return None

def publish_random_data():
    """Publishes random sensor data to each topic."""
    client = mqtt.Client()
    client.on_connect = on_connect

    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        print(f"Connection error: {e}")
        return

    client.loop_start()

    try:
        while True:
            for sensor_type, topics in MQTT_TOPICS.items():
                for topic in topics:
                    sensor_data = get_sensor_data(sensor_type)

                    if sensor_data:
                        payload = json.dumps(sensor_data)
                        print(f"Publishing: {payload} to topic '{topic}'")
                        client.publish(topic, payload, qos=1)

                    time.sleep(0.5)
    except KeyboardInterrupt:
        print("Publishing stopped by user. 👋")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    publish_random_data()