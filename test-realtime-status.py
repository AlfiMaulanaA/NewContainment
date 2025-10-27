#!/usr/bin/env python3
"""
Test script for Containment Status Real-time Tabs component
Publishes test data to topic "IOT/Containment/Status" to demonstrate the real-time feature
"""

import json
import time
import random
from datetime import datetime

def simulate_containment_status_changes():
    """
    Simulate different containment status scenarios
    """
    scenarios = [
        # Scenario 1: Normal operation
        {
            "name": "Normal Operation",
            "data": {
                "Lighting status": False,
                "Emergency status": True,
                "Smoke Detector status": True,
                "FSS status": False,
                "Emergency Button State": False,
                "selenoid status": False,
                "limit switch front door status": True,
                "limit switch back door status": True,
                "open front door status": True,
                "open back door status": True,
                "Emergency temp": False,
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        },
        # Scenario 2: Lighting active
        {
            "name": "Lighting Active",
            "data": {
                "Lighting status": True,
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
        },
        # Scenario 3: Emergency - Smoke detected
        {
            "name": "Emergency: Smoke Detected",
            "data": {
                "Lighting status": True,
                "Emergency status": True,
                "Smoke Detector status": True,
                "FSS status": True,
                "Emergency Button State": False,
                "selenoid status": True,
                "limit switch front door status": False,
                "limit switch back door status": False,
                "open front door status": False,
                "open back door status": False,
                "Emergency temp": False,
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        },
        # Scenario 4: EMERGENCY BUTTON PRESSED
        {
            "name": "EMERGENCY: Button Pressed",
            "data": {
                "Lighting status": True,
                "Emergency status": True,
                "Smoke Detector status": False,
                "FSS status": True,
                "Emergency Button State": True,
                "selenoid status": True,
                "limit switch front door status": False,
                "limit switch back door status": False,
                "open front door status": False,
                "open back door status": False,
                "Emergency temp": False,
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        },
        # Scenario 5: Temperature emergency
        {
            "name": "Emergency: Over Temperature",
            "data": {
                "Lighting status": True,
                "Emergency status": True,
                "Smoke Detector status": False,
                "FSS status": True,
                "Emergency Button State": False,
                "selenoid status": True,
                "limit switch front door status": False,
                "limit switch back door status": False,
                "open front door status": False,
                "open back door status": False,
                "Emergency temp": True,
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        },
        # Scenario 6: Door security issue
        {
            "name": "Security Alert: Front Door Open",
            "data": {
                "Lighting status": True,
                "Emergency status": False,
                "Smoke Detector status": False,
                "FSS status": False,
                "Emergency Button State": False,
                "selenoid status": False,
                "limit switch front door status": True,
                "limit switch back door status": False,
                "open front door status": True,
                "open back door status": False,
                "Emergency temp": False,
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    ]

    print("🧪 Containment Status Real-time Test")
    print("=" * 50)
    print("This script will cycle through different containment status scenarios")
    print("to test the real-time ContainmentStatusRealtimeTabs component.")
    print("\n📱 Open the real-time status component in your browser to see live updates!")
    print("Topic: IOT/Containment/Status")
    print()

    try:
        import paho.mqtt.client as mqtt

        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                print("✅ Connected to MQTT Broker")
            else:
                print(f"❌ Failed to connect: {rc}")
                return

        client = mqtt.Client()
        client.on_connect = on_connect

        try:
            client.connect("localhost", 1883, 60)
            client.loop_start()

            print("Starting containment status simulation...\n")

            for i, scenario in enumerate(scenarios):
                print("03d")

                payload = json.dumps(scenario["data"], indent=2)
                print(f"Payload:\n{payload}")

                client.publish("IOT/Containment/Status", json.dumps(scenario["data"]), qos=1, retain=False)

                print("✅ Published to MQTT")
                print()

                # Wait before next scenario (except last one)
                if i < len(scenarios) - 1:
                    print("⏳ Waiting 8 seconds before next scenario...")
                    time.sleep(8)
                    print()

            print("🎉 Test completed! All scenarios published successfully.")
            print("Check your ContainmentStatusRealtimeTabs component for real-time updates.")

        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            client.loop_stop()
            client.disconnect()

    except ImportError:
        print("❌ paho-mqtt not available. Using mosquitto_pub fallback...")

        for i, scenario in enumerate(scenarios):
            print("03d")
            print(f"Payload:\n{json.dumps(scenario["data"], indent=2)}")
            print("Using mosquitto_pub...")
            print()

            import subprocess
            try:
                subprocess.run([
                    "mosquitto_pub",
                    "-h", "localhost",
                    "-p", "1883",
                    "-t", "IOT/Containment/Status",
                    "-m", json.dumps(scenario["data"])
                ], check=True)
                print("✅ Published successfully")
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to publish: {e}")

            if i < len(scenarios) - 1:
                time.sleep(8)

if __name__ == "__main__":
    simulate_containment_status_changes()
