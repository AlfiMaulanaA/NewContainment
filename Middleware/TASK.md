TASK :

1. Saya ingin membuat sebuah fitur untuk register fingerprint melalui MQTT dan bisa langsung syncron ke devicenya.
2. Start register dengan cara kirim payload ke topic accessControl/user/command', 'accessControl/user/response', dengan payload {command: registerFinger, data:{uid:1, fid:1}}
   dan langsung sycronize ke semua device yang ada
3. Buat agar responsenya sama seperti response yang lain

{
"command": "registerFinger",
"data":{
"uid":1,
"fid":1
}
}

{"status": "error", "message": "Fingerprint registration for Adit Maul: 0/2 devices successful", "data": {"uid": 1, "fid": 1, "user_name": "Adit Maul", "successful_enrollments": 0, "failed_enrollments": 2, "total_devices": 2, "enrollment_results": [{"device_id": "device_1", "device_name": "Front Door", "success": false, "message": "Failed to enroll fingerprint on Front Door: Operation failed: 'ZK' object has no attribute 'enroll_finger'"}, {"device_id": "device_2", "device_name": "Back Door", "success": false, "message": "Failed to enroll fingerprint on Back Door: Operation failed: 'ZK' object has no attribute 'enroll_finger'"}], "sound_feedback": {"successful_operations": 0, "total_devices": 0, "operation_results": [], "error": "Error executing sound playback: ZKDeviceManager.play_sound_on_devices.<locals>.sound_operation() got an unexpected keyword argument 'sound_index'"}}}
