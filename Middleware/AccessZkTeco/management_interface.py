import json
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from datetime import datetime
import threading
import paho.mqtt.client as mqtt
from typing import Dict, Any


class ZKTecoManagementInterface:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("ZKTeco Access Control Management Interface")
        self.root.geometry("1200x800")
        
        self.mqtt_client = None
        self.mqtt_config = {}
        self.access_config = {}
        self.response_data = {}
        
        self._load_configurations()
        self._setup_mqtt()
        self._create_interface()
        
    def _load_configurations(self):
        try:
            with open("MIDDLEWARE/ACCESS_ZKTECO/JSON/Config/access_control_config.json", 'r') as f:
                self.access_config = json.load(f)
                
            with open("MIDDLEWARE/ACCESS_ZKTECO/JSON/Config/mqtt_config.json", 'r') as f:
                self.mqtt_config = json.load(f)
                
        except Exception as e:
            messagebox.showerror("Configuration Error", f"Error loading configurations: {e}")
            
    def _setup_mqtt(self):
        try:
            broker_config = self.mqtt_config.get('broker', {})
            
            self.mqtt_client = mqtt.Client(
                client_id=f"{broker_config.get('client_id', 'zkteco_management')}_gui"
            )
            
            if broker_config.get('username'):
                self.mqtt_client.username_pw_set(
                    broker_config['username'], 
                    broker_config.get('password', '')
                )
                
            self.mqtt_client.on_connect = self._on_mqtt_connect
            self.mqtt_client.on_message = self._on_mqtt_message
            
            self.mqtt_client.connect(
                broker_config.get('host', 'localhost'),
                broker_config.get('port', 1883),
                broker_config.get('keepalive', 60)
            )
            
            self.mqtt_client.loop_start()
            
        except Exception as e:
            messagebox.showerror("MQTT Error", f"Error setting up MQTT: {e}")
            
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self._subscribe_to_response_topics()
            self._log_message("Connected to MQTT broker")
        else:
            self._log_message(f"Failed to connect to MQTT broker: {rc}")
            
    def _subscribe_to_response_topics(self):
        topics = self.mqtt_config.get('topics', {})
        qos = self.mqtt_config.get('qos', {}).get('response', 1)
        
        response_topics = [
            topics.get('users', {}).get('response'),
            topics.get('fingerprints', {}).get('response'),
            topics.get('cards', {}).get('response'),
            topics.get('device', {}).get('response'),
            topics.get('attendance', {}).get('response')
        ]
        
        for topic in response_topics:
            if topic:
                self.mqtt_client.subscribe(topic, qos)
                
    def _on_mqtt_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            self.response_data[msg.topic] = payload
            
            self.root.after(0, lambda: self._update_response_display(msg.topic, payload))
            
        except Exception as e:
            self._log_message(f"Error processing MQTT message: {e}")
            
    def _create_interface(self):
        # Create notebook for tabs
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Device Connection Tab
        self._create_device_tab(notebook)
        
        # User Management Tab
        self._create_user_tab(notebook)
        
        # Fingerprint Management Tab
        self._create_fingerprint_tab(notebook)
        
        # Card Management Tab
        self._create_card_tab(notebook)
        
        # Live Monitoring Tab
        self._create_monitoring_tab(notebook)
        
        # Response Log Tab
        self._create_log_tab(notebook)
        
    def _create_device_tab(self, parent):
        device_frame = ttk.Frame(parent)
        parent.add(device_frame, text="Device Connection")
        
        # Device selection
        ttk.Label(device_frame, text="Select Device:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        
        self.device_var = tk.StringVar()
        device_combo = ttk.Combobox(device_frame, textvariable=self.device_var, width=30)
        device_combo['values'] = [f"{d['id']} ({d['name']})" for d in self.access_config.get('devices', [])]
        device_combo.grid(row=0, column=1, padx=5, pady=5)
        
        # Connection buttons
        ttk.Button(device_frame, text="Connect", command=self._connect_device).grid(row=0, column=2, padx=5, pady=5)
        ttk.Button(device_frame, text="Disconnect", command=self._disconnect_device).grid(row=0, column=3, padx=5, pady=5)
        
        # Device info display
        ttk.Label(device_frame, text="Device Information:").grid(row=1, column=0, sticky=tk.NW, padx=5, pady=5)
        
        self.device_info_text = scrolledtext.ScrolledText(device_frame, width=80, height=15)
        self.device_info_text.grid(row=2, column=0, columnspan=4, padx=5, pady=5, sticky=tk.NSEW)
        
        device_frame.grid_rowconfigure(2, weight=1)
        device_frame.grid_columnconfigure(1, weight=1)
        
    def _create_user_tab(self, parent):
        user_frame = ttk.Frame(parent)
        parent.add(user_frame, text="User Management")
        
        # Device selection for user operations
        ttk.Label(user_frame, text="Device:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        
        self.user_device_var = tk.StringVar()
        user_device_combo = ttk.Combobox(user_frame, textvariable=self.user_device_var, width=25)
        user_device_combo['values'] = [d['id'] for d in self.access_config.get('devices', [])]
        user_device_combo.grid(row=0, column=1, padx=5, pady=5)
        
        # User operation buttons
        ttk.Button(user_frame, text="Get All Users", command=self._get_all_users).grid(row=0, column=2, padx=5, pady=5)
        
        # User form
        user_form_frame = ttk.LabelFrame(user_frame, text="User Details")
        user_form_frame.grid(row=1, column=0, columnspan=4, padx=5, pady=5, sticky=tk.EW)
        
        # User form fields
        ttk.Label(user_form_frame, text="UID:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        self.uid_var = tk.StringVar()
        ttk.Entry(user_form_frame, textvariable=self.uid_var, width=20).grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Label(user_form_frame, text="Name:").grid(row=0, column=2, sticky=tk.W, padx=5, pady=5)
        self.name_var = tk.StringVar()
        ttk.Entry(user_form_frame, textvariable=self.name_var, width=30).grid(row=0, column=3, padx=5, pady=5)
        
        ttk.Label(user_form_frame, text="Privilege:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.privilege_var = tk.StringVar(value="0")
        privilege_combo = ttk.Combobox(user_form_frame, textvariable=self.privilege_var, width=17)
        privilege_combo['values'] = ["0 (User)", "14 (Admin)"]
        privilege_combo.grid(row=1, column=1, padx=5, pady=5)
        
        ttk.Label(user_form_frame, text="Password:").grid(row=1, column=2, sticky=tk.W, padx=5, pady=5)
        self.password_var = tk.StringVar()
        ttk.Entry(user_form_frame, textvariable=self.password_var, width=30, show="*").grid(row=1, column=3, padx=5, pady=5)
        
        ttk.Label(user_form_frame, text="Card Number:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=5)
        self.card_var = tk.StringVar()
        ttk.Entry(user_form_frame, textvariable=self.card_var, width=20).grid(row=2, column=1, padx=5, pady=5)
        
        # User operation buttons
        button_frame = ttk.Frame(user_form_frame)
        button_frame.grid(row=3, column=0, columnspan=4, pady=10)
        
        ttk.Button(button_frame, text="Create User", command=self._create_user).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Update User", command=self._update_user).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Delete User", command=self._delete_user).pack(side=tk.LEFT, padx=5)
        
        # Users display
        self.users_text = scrolledtext.ScrolledText(user_frame, width=80, height=20)
        self.users_text.grid(row=2, column=0, columnspan=4, padx=5, pady=5, sticky=tk.NSEW)
        
        user_frame.grid_rowconfigure(2, weight=1)
        user_frame.grid_columnconfigure(3, weight=1)
        
    def _create_fingerprint_tab(self, parent):
        fp_frame = ttk.Frame(parent)
        parent.add(fp_frame, text="Fingerprint Management")
        
        # Device selection
        ttk.Label(fp_frame, text="Device:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        
        self.fp_device_var = tk.StringVar()
        fp_device_combo = ttk.Combobox(fp_frame, textvariable=self.fp_device_var, width=25)
        fp_device_combo['values'] = [d['id'] for d in self.access_config.get('devices', [])]
        fp_device_combo.grid(row=0, column=1, padx=5, pady=5)
        
        # Fingerprint form
        fp_form_frame = ttk.LabelFrame(fp_frame, text="Fingerprint Registration")
        fp_form_frame.grid(row=1, column=0, columnspan=4, padx=5, pady=5, sticky=tk.EW)
        
        ttk.Label(fp_form_frame, text="User ID:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        self.fp_user_id_var = tk.StringVar()
        ttk.Entry(fp_form_frame, textvariable=self.fp_user_id_var, width=20).grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Label(fp_form_frame, text="Finger ID:").grid(row=0, column=2, sticky=tk.W, padx=5, pady=5)
        self.finger_id_var = tk.StringVar(value="0")
        finger_combo = ttk.Combobox(fp_form_frame, textvariable=self.finger_id_var, width=17)
        finger_combo['values'] = [str(i) for i in range(10)]
        finger_combo.grid(row=0, column=3, padx=5, pady=5)
        
        ttk.Button(fp_form_frame, text="Register Fingerprint", command=self._register_fingerprint).grid(row=1, column=0, columnspan=4, pady=10)
        
        # Fingerprint display
        self.fp_text = scrolledtext.ScrolledText(fp_frame, width=80, height=25)
        self.fp_text.grid(row=2, column=0, columnspan=4, padx=5, pady=5, sticky=tk.NSEW)
        
        fp_frame.grid_rowconfigure(2, weight=1)
        fp_frame.grid_columnconfigure(3, weight=1)
        
    def _create_card_tab(self, parent):
        card_frame = ttk.Frame(parent)
        parent.add(card_frame, text="Card Management")
        
        # Device selection
        ttk.Label(card_frame, text="Device:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        
        self.card_device_var = tk.StringVar()
        card_device_combo = ttk.Combobox(card_frame, textvariable=self.card_device_var, width=25)
        card_device_combo['values'] = [d['id'] for d in self.access_config.get('devices', [])]
        card_device_combo.grid(row=0, column=1, padx=5, pady=5)
        
        # Card form
        card_form_frame = ttk.LabelFrame(card_frame, text="Card Registration")
        card_form_frame.grid(row=1, column=0, columnspan=4, padx=5, pady=5, sticky=tk.EW)
        
        ttk.Label(card_form_frame, text="User ID:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        self.card_user_id_var = tk.StringVar()
        ttk.Entry(card_form_frame, textvariable=self.card_user_id_var, width=20).grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Label(card_form_frame, text="Card Number:").grid(row=0, column=2, sticky=tk.W, padx=5, pady=5)
        self.card_number_var = tk.StringVar()
        ttk.Entry(card_form_frame, textvariable=self.card_number_var, width=30).grid(row=0, column=3, padx=5, pady=5)
        
        ttk.Button(card_form_frame, text="Register Card", command=self._register_card).grid(row=1, column=0, columnspan=4, pady=10)
        
        # Card display
        self.card_text = scrolledtext.ScrolledText(card_frame, width=80, height=25)
        self.card_text.grid(row=2, column=0, columnspan=4, padx=5, pady=5, sticky=tk.NSEW)
        
        card_frame.grid_rowconfigure(2, weight=1)
        card_frame.grid_columnconfigure(3, weight=1)
        
    def _create_monitoring_tab(self, parent):
        monitor_frame = ttk.Frame(parent)
        parent.add(monitor_frame, text="Live Monitoring")
        
        # Device selection
        ttk.Label(monitor_frame, text="Device:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        
        self.monitor_device_var = tk.StringVar()
        monitor_device_combo = ttk.Combobox(monitor_frame, textvariable=self.monitor_device_var, width=25)
        monitor_device_combo['values'] = [d['id'] for d in self.access_config.get('devices', [])]
        monitor_device_combo.grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Button(monitor_frame, text="Start Monitoring", command=self._start_monitoring).grid(row=0, column=2, padx=5, pady=5)
        ttk.Button(monitor_frame, text="Stop Monitoring", command=self._stop_monitoring).grid(row=0, column=3, padx=5, pady=5)
        
        # Monitoring display
        self.monitor_text = scrolledtext.ScrolledText(monitor_frame, width=80, height=30)
        self.monitor_text.grid(row=1, column=0, columnspan=4, padx=5, pady=5, sticky=tk.NSEW)
        
        monitor_frame.grid_rowconfigure(1, weight=1)
        monitor_frame.grid_columnconfigure(3, weight=1)
        
    def _create_log_tab(self, parent):
        log_frame = ttk.Frame(parent)
        parent.add(log_frame, text="Response Logs")
        
        self.log_text = scrolledtext.ScrolledText(log_frame, width=100, height=35)
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
    def _publish_mqtt_message(self, topic: str, payload: Dict[str, Any]):
        try:
            qos = self.mqtt_config.get('qos', {}).get('default', 1)
            message = json.dumps(payload)
            self.mqtt_client.publish(topic, message, qos=qos)
            self._log_message(f"Published to {topic}: {payload}")
            
        except Exception as e:
            messagebox.showerror("MQTT Error", f"Error publishing message: {e}")
            
    def _get_selected_device_id(self, var: tk.StringVar) -> str:
        selection = var.get()
        if selection:
            return selection.split(' ')[0] if '(' in selection else selection
        return ""
        
    def _connect_device(self):
        device_id = self._get_selected_device_id(self.device_var)
        if not device_id:
            messagebox.showwarning("Warning", "Please select a device")
            return
            
        topic = self.mqtt_config['topics']['device']['connect'].replace('{device_id}', device_id)
        payload = {"device_id": device_id}
        self._publish_mqtt_message(topic, payload)
        
    def _disconnect_device(self):
        device_id = self._get_selected_device_id(self.device_var)
        if not device_id:
            messagebox.showwarning("Warning", "Please select a device")
            return
            
        topic = self.mqtt_config['topics']['device']['disconnect'].replace('{device_id}', device_id)
        payload = {"device_id": device_id}
        self._publish_mqtt_message(topic, payload)
        
    def _get_all_users(self):
        device_id = self.user_device_var.get()
        if not device_id:
            messagebox.showwarning("Warning", "Please select a device")
            return
            
        topic = self.mqtt_config['topics']['users']['get_all']
        payload = {"device_id": device_id}
        self._publish_mqtt_message(topic, payload)
        
    def _create_user(self):
        device_id = self.user_device_var.get()
        if not device_id or not self.uid_var.get():
            messagebox.showwarning("Warning", "Please select a device and enter UID")
            return
            
        user_data = {
            "uid": int(self.uid_var.get()),
            "name": self.name_var.get(),
            "privilege": int(self.privilege_var.get().split()[0]),
            "password": self.password_var.get(),
            "card": int(self.card_var.get() or 0)
        }
        
        topic = self.mqtt_config['topics']['users']['create']
        payload = {"device_id": device_id, "user_data": user_data}
        self._publish_mqtt_message(topic, payload)
        
    def _update_user(self):
        device_id = self.user_device_var.get()
        uid = self.uid_var.get()
        if not device_id or not uid:
            messagebox.showwarning("Warning", "Please select a device and enter UID")
            return
            
        user_data = {
            "uid": int(uid),
            "name": self.name_var.get(),
            "privilege": int(self.privilege_var.get().split()[0]),
            "password": self.password_var.get(),
            "card": int(self.card_var.get() or 0)
        }
        
        topic = self.mqtt_config['topics']['users']['update'].replace('{user_id}', uid)
        payload = {"device_id": device_id, "user_data": user_data}
        self._publish_mqtt_message(topic, payload)
        
    def _delete_user(self):
        device_id = self.user_device_var.get()
        uid = self.uid_var.get()
        if not device_id or not uid:
            messagebox.showwarning("Warning", "Please select a device and enter UID")
            return
            
        if messagebox.askyesno("Confirm", f"Delete user {uid}?"):
            topic = self.mqtt_config['topics']['users']['delete'].replace('{user_id}', uid)
            payload = {"device_id": device_id, "use_uid": True}
            self._publish_mqtt_message(topic, payload)
            
    def _register_fingerprint(self):
        device_id = self.fp_device_var.get()
        user_id = self.fp_user_id_var.get()
        if not device_id or not user_id:
            messagebox.showwarning("Warning", "Please select a device and enter User ID")
            return
            
        topic = self.mqtt_config['topics']['fingerprints']['register']
        payload = {
            "device_id": device_id,
            "user_id": user_id,
            "finger_id": int(self.finger_id_var.get())
        }
        self._publish_mqtt_message(topic, payload)
        
    def _register_card(self):
        device_id = self.card_device_var.get()
        user_id = self.card_user_id_var.get()
        card_number = self.card_number_var.get()
        if not all([device_id, user_id, card_number]):
            messagebox.showwarning("Warning", "Please fill all required fields")
            return
            
        topic = self.mqtt_config['topics']['cards']['register']
        payload = {
            "device_id": device_id,
            "user_id": user_id,
            "card_number": card_number
        }
        self._publish_mqtt_message(topic, payload)
        
    def _start_monitoring(self):
        device_id = self.monitor_device_var.get()
        if not device_id:
            messagebox.showwarning("Warning", "Please select a device")
            return
            
        self._log_message(f"Live monitoring started for device {device_id}")
        
    def _stop_monitoring(self):
        self._log_message("Live monitoring stopped")
        
    def _update_response_display(self, topic: str, payload: Dict):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = f"[{timestamp}] Topic: {topic}\nResponse: {json.dumps(payload, indent=2)}\n\n"
        
        if 'users/response' in topic:
            self.users_text.insert(tk.END, message)
            self.users_text.see(tk.END)
        elif 'fingerprints/response' in topic:
            self.fp_text.insert(tk.END, message)
            self.fp_text.see(tk.END)
        elif 'cards/response' in topic:
            self.card_text.insert(tk.END, message)
            self.card_text.see(tk.END)
        elif 'attendance/response' in topic:
            self.monitor_text.insert(tk.END, message)
            self.monitor_text.see(tk.END)
        elif 'device/response' in topic:
            self.device_info_text.insert(tk.END, message)
            self.device_info_text.see(tk.END)
            
        self.log_text.insert(tk.END, message)
        self.log_text.see(tk.END)
        
    def _log_message(self, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        
    def run(self):
        self.root.mainloop()
        
    def __del__(self):
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()


if __name__ == "__main__":
    try:
        app = ZKTecoManagementInterface()
        app.run()
    except Exception as e:
        print(f"Error starting management interface: {e}")
        messagebox.showerror("Startup Error", f"Error starting application: {e}")