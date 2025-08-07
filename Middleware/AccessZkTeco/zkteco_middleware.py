import json
import logging
import time
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

import paho.mqtt.client as mqtt
from zk import ZK, const


@dataclass
class DeviceConfig:
    id: str
    name: str
    ip: str
    port: int
    timeout: int
    password: str
    enabled: bool
    location: str
    description: str


@dataclass
class MqttResponse:
    success: bool
    message: str
    data: Any = None
    timestamp: str = None
    device_id: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


class ZKTecoMiddleware:
    def __init__(self, config_path: str = "Middleware/AccessZkTeco/JSON/Config"):
        self.config_path = config_path
        self.devices: Dict[str, DeviceConfig] = {}
        self.connections: Dict[str, Any] = {}
        self.mqtt_client = None
        self.mqtt_config = {}
        self.access_config = {}
        
        self._setup_logging()
        self._load_configurations()
        self._setup_mqtt()
        
    def _setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('Middleware/AccessZkTeco/logs/access_control.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def _load_configurations(self):
        try:
            with open(f"{self.config_path}/access_control_config.json", 'r') as f:
                self.access_config = json.load(f)
                
            with open(f"{self.config_path}/mqtt_config.json", 'r') as f:
                self.mqtt_config = json.load(f)
                
            for device_data in self.access_config.get('devices', []):
                device = DeviceConfig(**device_data)
                self.devices[device.id] = device
                
            self.logger.info(f"Loaded {len(self.devices)} device configurations")
            
        except Exception as e:
            self.logger.error(f"Error loading configurations: {e}")
            raise
            
    def _setup_mqtt(self):
        try:
            broker_config = self.mqtt_config.get('broker', {})
            
            self.mqtt_client = mqtt.Client(
                client_id=broker_config.get('client_id', 'zkteco_middleware'),
                clean_session=broker_config.get('clean_session', True)
            )
            
            if broker_config.get('username'):
                self.mqtt_client.username_pw_set(
                    broker_config['username'], 
                    broker_config.get('password', '')
                )
                
            self.mqtt_client.on_connect = self._on_mqtt_connect
            self.mqtt_client.on_message = self._on_mqtt_message
            self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
            
            self.mqtt_client.connect(
                broker_config.get('host', 'localhost'),
                broker_config.get('port', 1883),
                broker_config.get('keepalive', 60)
            )
            
            self.mqtt_client.loop_start()
            self.logger.info("MQTT client initialized and connected")
            
        except Exception as e:
            self.logger.error(f"Error setting up MQTT: {e}")
            raise
            
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.logger.info("Connected to MQTT broker")
            self._subscribe_to_topics()
        else:
            self.logger.error(f"Failed to connect to MQTT broker: {rc}")
            
    def _on_mqtt_disconnect(self, client, userdata, rc):
        self.logger.warning(f"Disconnected from MQTT broker: {rc}")
        
    def _on_mqtt_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            self.logger.info(f"Received message on topic: {topic}")
            
            self._handle_mqtt_message(topic, payload)
            
        except Exception as e:
            self.logger.error(f"Error processing MQTT message: {e}")
            
    def _subscribe_to_topics(self):
        topics = self.mqtt_config.get('topics', {})
        qos = self.mqtt_config.get('qos', {}).get('default', 1)
        
        subscribe_topics = [
            topics.get('users', {}).get('get_all'),
            topics.get('users', {}).get('create'),
            topics.get('users', {}).get('update', '').replace('{user_id}', '+'),
            topics.get('users', {}).get('delete', '').replace('{user_id}', '+'),
            topics.get('fingerprints', {}).get('register'),
            topics.get('cards', {}).get('register'),
            topics.get('device', {}).get('connect', '').replace('{device_id}', '+'),
            topics.get('device', {}).get('disconnect', '').replace('{device_id}', '+'),
        ]
        
        for topic in subscribe_topics:
            if topic:
                self.mqtt_client.subscribe(topic, qos)
                self.logger.info(f"Subscribed to topic: {topic}")
                
    def _handle_mqtt_message(self, topic: str, payload: Dict):
        topics_config = self.mqtt_config.get('topics', {})
        
        if 'users/get_all' in topic:
            self._handle_get_all_users(payload)
        elif 'users/create' in topic:
            self._handle_create_user(payload)
        elif 'users/update' in topic:
            user_id = self._extract_id_from_topic(topic, 'users/update')
            self._handle_update_user(user_id, payload)
        elif 'users/delete' in topic:
            user_id = self._extract_id_from_topic(topic, 'users/delete')
            self._handle_delete_user(user_id, payload)
        elif 'fingerprints/register' in topic:
            self._handle_register_fingerprint(payload)
        elif 'cards/register' in topic:
            self._handle_register_card(payload)
        elif 'device/connect' in topic:
            device_id = self._extract_id_from_topic(topic, 'device/connect')
            self._handle_connect_device(device_id, payload)
        elif 'device/disconnect' in topic:
            device_id = self._extract_id_from_topic(topic, 'device/disconnect')
            self._handle_disconnect_device(device_id, payload)
            
    def _extract_id_from_topic(self, topic: str, base_topic: str) -> str:
        parts = topic.split('/')
        base_parts = base_topic.split('/')
        if len(parts) > len(base_parts):
            return parts[len(base_parts)]
        return ""
        
    def connect_to_device(self, device_id: str) -> bool:
        try:
            if device_id not in self.devices:
                self.logger.error(f"Device {device_id} not found in configuration")
                return False
                
            device = self.devices[device_id]
            if not device.enabled:
                self.logger.warning(f"Device {device_id} is disabled")
                return False
                
            if device_id in self.connections:
                self.logger.info(f"Device {device_id} already connected")
                return True
                
            zk = ZK(device.ip, port=device.port, timeout=device.timeout, password=device.password)
            conn = zk.connect()
            
            if conn:
                self.connections[device_id] = conn
                self.logger.info(f"Successfully connected to device {device_id} at {device.ip}:{device.port}")
                return True
            else:
                self.logger.error(f"Failed to connect to device {device_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error connecting to device {device_id}: {e}")
            return False
            
    def disconnect_from_device(self, device_id: str) -> bool:
        try:
            if device_id in self.connections:
                self.connections[device_id].disconnect()
                del self.connections[device_id]
                self.logger.info(f"Disconnected from device {device_id}")
                return True
            else:
                self.logger.warning(f"Device {device_id} not connected")
                return False
                
        except Exception as e:
            self.logger.error(f"Error disconnecting from device {device_id}: {e}")
            return False
            
    def _publish_response(self, topic: str, response: MqttResponse, retain: bool = False):
        try:
            qos = self.mqtt_config.get('qos', {}).get('response', 1)
            message = json.dumps(asdict(response), indent=2)
            
            self.mqtt_client.publish(topic, message, qos=qos, retain=retain)
            self.logger.info(f"Published response to topic: {topic}")
            
        except Exception as e:
            self.logger.error(f"Error publishing response: {e}")
            
    def _handle_get_all_users(self, payload: Dict):
        device_id = payload.get('device_id')
        if not device_id:
            response = MqttResponse(False, "Device ID is required")
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            return
            
        if not self.connect_to_device(device_id):
            response = MqttResponse(False, f"Failed to connect to device {device_id}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            return
            
        try:
            conn = self.connections[device_id]
            users = conn.get_users()
            
            users_data = []
            for user in users:
                users_data.append({
                    'uid': user.uid,
                    'name': user.name,
                    'privilege': user.privilege,
                    'password': user.password,
                    'group_id': user.group_id,
                    'user_id': user.user_id,
                    'card': user.card
                })
                
            response = MqttResponse(True, f"Retrieved {len(users_data)} users", users_data, device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            
        except Exception as e:
            response = MqttResponse(False, f"Error retrieving users: {e}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            
    def _handle_create_user(self, payload: Dict):
        device_id = payload.get('device_id')
        user_data = payload.get('user_data', {})
        
        if not device_id or not user_data:
            response = MqttResponse(False, "Device ID and user_data are required")
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            return
            
        if not self.connect_to_device(device_id):
            response = MqttResponse(False, f"Failed to connect to device {device_id}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            return
            
        try:
            conn = self.connections[device_id]
            
            uid = user_data.get('uid')
            name = user_data.get('name', '')
            privilege = user_data.get('privilege', const.USER_DEFAULT)
            password = user_data.get('password', '')
            group_id = user_data.get('group_id', '')
            user_id = user_data.get('user_id', '')
            card = user_data.get('card', 0)
            
            conn.set_user(uid=uid, name=name, privilege=privilege, password=password, 
                         group_id=group_id, user_id=user_id, card=card)
            
            response = MqttResponse(True, f"User {name} created successfully", user_data, device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            
        except Exception as e:
            response = MqttResponse(False, f"Error creating user: {e}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            
    def _handle_update_user(self, user_id: str, payload: Dict):
        device_id = payload.get('device_id')
        user_data = payload.get('user_data', {})
        
        if not device_id or not user_data:
            response = MqttResponse(False, "Device ID and user_data are required")
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            return
            
        if not self.connect_to_device(device_id):
            response = MqttResponse(False, f"Failed to connect to device {device_id}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            return
            
        try:
            conn = self.connections[device_id]
            
            uid = user_data.get('uid', int(user_id))
            name = user_data.get('name', '')
            privilege = user_data.get('privilege', const.USER_DEFAULT)
            password = user_data.get('password', '')
            group_id = user_data.get('group_id', '')
            card = user_data.get('card', 0)
            
            conn.set_user(uid=uid, name=name, privilege=privilege, password=password, 
                         group_id=group_id, user_id=user_id, card=card)
            
            response = MqttResponse(True, f"User {user_id} updated successfully", user_data, device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            
        except Exception as e:
            response = MqttResponse(False, f"Error updating user: {e}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            
    def _handle_delete_user(self, user_id: str, payload: Dict):
        device_id = payload.get('device_id')
        
        if not device_id:
            response = MqttResponse(False, "Device ID is required")
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            return
            
        if not self.connect_to_device(device_id):
            response = MqttResponse(False, f"Failed to connect to device {device_id}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            return
            
        try:
            conn = self.connections[device_id]
            
            use_uid = payload.get('use_uid', True)
            if use_uid:
                conn.delete_user(uid=int(user_id))
            else:
                conn.delete_user(user_id=user_id)
                
            response = MqttResponse(True, f"User {user_id} deleted successfully", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            
        except Exception as e:
            response = MqttResponse(False, f"Error deleting user: {e}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['users']['response'], response)
            
    def _handle_register_fingerprint(self, payload: Dict):
        device_id = payload.get('device_id')
        user_id = payload.get('user_id')
        finger_id = payload.get('finger_id', 0)
        template_data = payload.get('template_data')
        
        if not all([device_id, user_id]):
            response = MqttResponse(False, "Device ID and user_id are required")
            self._publish_response(self.mqtt_config['topics']['fingerprints']['response'], response)
            return
            
        if not self.connect_to_device(device_id):
            response = MqttResponse(False, f"Failed to connect to device {device_id}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['fingerprints']['response'], response)
            return
            
        try:
            conn = self.connections[device_id]
            
            if template_data:
                conn.save_user_template(user_id, finger_id, template_data)
                message = f"Fingerprint template saved for user {user_id}"
            else:
                message = f"Fingerprint enrollment initiated for user {user_id}. Please use device interface to complete."
                
            response = MqttResponse(True, message, {'user_id': user_id, 'finger_id': finger_id}, device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['fingerprints']['response'], response)
            
        except Exception as e:
            response = MqttResponse(False, f"Error registering fingerprint: {e}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['fingerprints']['response'], response)
            
    def _handle_register_card(self, payload: Dict):
        device_id = payload.get('device_id')
        user_id = payload.get('user_id')
        card_number = payload.get('card_number')
        
        if not all([device_id, user_id, card_number]):
            response = MqttResponse(False, "Device ID, user_id, and card_number are required")
            self._publish_response(self.mqtt_config['topics']['cards']['response'], response)
            return
            
        if not self.connect_to_device(device_id):
            response = MqttResponse(False, f"Failed to connect to device {device_id}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['cards']['response'], response)
            return
            
        try:
            conn = self.connections[device_id]
            users = conn.get_users()
            
            user = next((u for u in users if str(u.uid) == str(user_id)), None)
            if not user:
                response = MqttResponse(False, f"User {user_id} not found", device_id=device_id)
                self._publish_response(self.mqtt_config['topics']['cards']['response'], response)
                return
                
            conn.set_user(uid=user.uid, name=user.name, privilege=user.privilege, 
                         password=user.password, group_id=user.group_id, 
                         user_id=user.user_id, card=int(card_number))
            
            response = MqttResponse(True, f"Card {card_number} registered for user {user_id}", 
                                  {'user_id': user_id, 'card_number': card_number}, device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['cards']['response'], response)
            
        except Exception as e:
            response = MqttResponse(False, f"Error registering card: {e}", device_id=device_id)
            self._publish_response(self.mqtt_config['topics']['cards']['response'], response)
            
    def _handle_connect_device(self, device_id: str, payload: Dict):
        success = self.connect_to_device(device_id)
        message = f"Device {device_id} connected successfully" if success else f"Failed to connect to device {device_id}"
        
        response = MqttResponse(success, message, device_id=device_id)
        self._publish_response(self.mqtt_config['topics']['device']['response'], response)
        
    def _handle_disconnect_device(self, device_id: str, payload: Dict):
        success = self.disconnect_from_device(device_id)
        message = f"Device {device_id} disconnected successfully" if success else f"Failed to disconnect from device {device_id}"
        
        response = MqttResponse(success, message, device_id=device_id)
        self._publish_response(self.mqtt_config['topics']['device']['response'], response)
        
    def start_live_capture(self, device_id: str):
        if not self.connect_to_device(device_id):
            return False
            
        def capture_thread():
            try:
                conn = self.connections[device_id]
                for attendance in conn.live_capture():
                    attendance_data = {
                        'user_id': attendance.user_id,
                        'timestamp': attendance.timestamp.isoformat() if attendance.timestamp else None,
                        'status': attendance.status,
                        'punch': attendance.punch
                    }
                    
                    response = MqttResponse(True, "Live attendance captured", attendance_data, device_id=device_id)
                    self._publish_response(self.mqtt_config['topics']['attendance']['response'], response, retain=False)
                    
            except Exception as e:
                self.logger.error(f"Error in live capture: {e}")
                
        thread = threading.Thread(target=capture_thread, daemon=True)
        thread.start()
        return True
        
    def run(self):
        self.logger.info("ZKTeco Middleware started")
        
        try:
            while True:
                time.sleep(1)
                
        except KeyboardInterrupt:
            self.logger.info("Shutting down...")
            self._cleanup()
            
    def _cleanup(self):
        for device_id in list(self.connections.keys()):
            self.disconnect_from_device(device_id)
            
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
            
        self.logger.info("Cleanup completed")


if __name__ == "__main__":
    middleware = ZKTecoMiddleware()
    middleware.run()