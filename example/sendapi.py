import requests
import json


API_URL = "http://localhost:3000/api/generate"
ADMIN_PASSWORD = "your-super-secret-admin-password"


payload = {
    "adminPassword": ADMIN_PASSWORD,
    "customPassword": "SuperSecretPassword_2025!",
    "message": "凤凰项目 - 生产数据库凭证。",
    "enable2FA": True,
    "email": "you@email.mail",
    "expiry": "1"
}

try:
    response = requests.post(API_URL, json=payload, timeout=10)
    response.raise_for_status()  
    
    result = response.json()
    
    print("✅ Create Success！")
    print(f"   URL: {result.get('url')}")

    
except requests.exceptions.HTTPError as e:
    print(f"❌ HTTP ERROR: {e.response.status_code}")
    print(f"   Content: {e.response.text}")
except requests.exceptions.RequestException as e:
    print(f"❌ Failed: {e}")