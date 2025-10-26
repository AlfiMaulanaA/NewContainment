#!/usr/bin/env python3
"""
Containment Status Publisher for IoT Containment System
Publishes containment status data to MQTT topic "IOT/Containment/Status"
"""

import json
import time
from datetime import datetime

def publish_containment_status():
    """
    Publish containment status with all status fields set to False
    """
    # Create payload with all status fields set to false
    payload = {
        "Lighting status": False,
        "Emergency status": False,
        "Smoke Detector status": False,
        "FSS status": False,
        "Emergency Button State": False,
        "selenoid status": False,
        "limit switch front door status": False,
        "limit switch back door status": False,
        "open front door status": False,
        "open back door status": False,
        "Emergency temp": False,
        "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    # Convert to JSON
    json_payload = json.dumps(payload, indent=2)

    print("📤 Publishing Containment Status to MQTT...")
    print(f"Topic: IOT/Containment/Status")
    print(f"Payload: {json_payload}")

    # Use mosquitto_pub command to publish
    import subprocess

    try:
        # Execute mosquitto_pub command
        result = subprocess.run([
            "mosquitto_pub",
            "-h", "localhost",
            "-p", "1883",
            "-t", "IOT/Containment/Status",
            "-m", json.dumps(payload),  # Compact JSON for payload
            "-r"  # Retain message
        ], capture_output=True, text=True, timeout=10)

        if result.returncode == 0:
            print("✅ Successfully published containment status to MQTT")

            # Also pretty print the payload for confirmation
            print("\n📋 Published Status Summary:")
            print(f"   Lighting Status: {payload['Lighting status']}")
            print(f"   Emergency Status: {payload['Emergency status']}")
            print(f"   Smoke Detector Status: {payload['Smoke Detector status']}")
            print(f"   FSS Status: {payload['FSS status']}")
            print(f"   Emergency Button State: {payload['Emergency Button State']}")
            print(f"   Selenoid Status: {payload['selenoid status']}")
            print(f"   Front Door Limit Switch: {payload['limit switch front door status']}")
            print(f"   Back Door Limit Switch: {payload['limit switch back door status']}")
            print(f"   Front Door Open Status: {payload['open front door status']}")
            print(f"   Back Door Open Status: {payload['open back door status']}")
            print(f"   Emergency Temp: {payload['Emergency temp']}")
            print(f"   Timestamp: {payload['Timestamp']}")

        else:
            print(f"❌ Failed to publish: {result.stderr}")

    except subprocess.TimeoutExpired:
        print("❌ Timeout: MQTT publish operation timed out")
    except FileNotFoundError:
        print("❌ mosquitto_pub not found. Please install mosquitto-clients")
    except Exception as e:
        print(f"❌ Error publishing to MQTT: {str(e)}")

def publish_containment_status_simple():
    """
    Simple containment status publisher using exact pattern from dummy_sensor.py
    """
    try:
        import paho.mqtt.client as mqtt

        # MQTT broker configuration (exact same as dummy_sensor.py)
        MQTT_BROKER = "localhost"
        MQTT_PORT = 1883

        def on_connect(client, userdata, flags, rc):
            """Callback function when the client connects to the broker."""
            if rc == 0:
                print("✅ Connected to MQTT Broker! Ready to publish containment status 👍")
            else:
                print(f"❌ Failed to connect, return code: {rc}")

        # Create payload with all status fields set to False
        payload = {
            "Lighting status": False,
            "Emergency status": False,
            "Smoke Detector status": False,
            "FSS status": False,
            "Emergency Button State": False,
            "selenoid status": False,
            "limit switch front door status": False,
            "limit switch back door status": False,
            "open front door status": False,
            "open back door status": False,
            "Emergency temp": False,
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        print("📤 Publishing Containment Status to MQTT...")
        print(f"Topic: IOT/Containment/Status")
        print(f"Payload: {json.dumps(payload, indent=2)}")

        client = mqtt.Client()
        client.on_connect = on_connect

        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return

        client.loop_start()

        try:
            # Publish immediately (like dummy_sensor.py does)
            payload_str = json.dumps(payload)
            print(f"Publishing: {payload_str} to topic 'IOT/Containment/Status'")
            client.publish("IOT/Containment/Status", payload_str, qos=1, retain=True)

            # Brief pause to let publish complete
            time.sleep(0.5)

            print("✅ Successfully published containment status to MQTT")

            # Display status summary
            print("\n📋 Published Status Summary:")
            print(f"   Lighting Status: {payload['Lighting status']}")
            print(f"   Emergency Status: {payload['Emergency status']}")
            print(f"   Smoke Detector Status: {payload['Smoke Detector status']}")
            print(f"   FSS Status: {payload['FSS status']}")
            print(f"   Emergency Button State: {payload['Emergency Button State']}")
            print(f"   Selenoid Status: {payload['selenoid status']}")
            print(f"   Front Door Limit Switch: {payload['limit switch front door status']}")
            print(f"   Back Door Limit Switch: {payload['limit switch back door status']}")
            print(f"   Front Door Open Status: {payload['open front door status']}")
            print(f"   Back Door Open Status: {payload['open back door status']}")
            print(f"   Emergency Temp: {payload['Emergency temp']}")
            print(f"   Timestamp: {payload['Timestamp']}")

        except KeyboardInterrupt:
            print("❌ Publishing stopped by user")
        finally:
            client.loop_stop()
            client.disconnect()

    except ImportError:
        print("❌ paho-mqtt library not found")
        # Fallback to mosquitto_pub
        publish_containment_status()

if __name__ == "__main__":
    print("🏭 IoT Containment System - Status Publisher")
    print("=" * 50)

    # Use simple paho-mqtt method like dummy_sensor.py
    publish_containment_status_simple()

    print("\nNote: All containment status fields have been set to False as requested.")
