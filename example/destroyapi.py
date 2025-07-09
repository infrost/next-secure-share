import requests

def destroy_secure_link(link_id: str):
    """通过 API 销毁一个安全链接。"""
    API_URL = "http://localhost:3000/api/destroy"
    ADMIN_PASSWORD = "your-super-secret-admin-password"
    
    payload = {
        "adminPassword": ADMIN_PASSWORD,
        "id": link_id
    }
    try:
        response = requests.post(API_URL, json=payload, timeout=10)
        response.raise_for_status()
        print(f"✅ ID 为 '{link_id}' 的链接已成功销毁。")
        return True
    except requests.exceptions.HTTPError as e:
        print(f"❌ 销毁链接 '{link_id}' 失败: {e.response.text}")
        return False

# --- 工作流演示 ---
if __name__ == "__main__":
    # 1. 创建一个链接
    # creation_result = create_secure_link(message="此链接仅供立即使用和销毁。")
    # 为方便演示，我们假设已成功创建链接并获得了其ID
    creation_result = {'url': 'http://localhost:3000/?v=yourID'}
    
    if creation_result:
        link_url = creation_result.get('url')
        link_id = link_url.split('v=')[-1]
        
        print(f"链接已创建，ID: {link_id}")
        
        # 2. 模拟使用这个机密信息 (例如，在CI/CD任务中)
        print("...模拟使用机密信息中...")
        
        # 3. 销毁链接
        destroy_secure_link(link_id)