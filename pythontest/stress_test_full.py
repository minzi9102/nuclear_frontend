import requests
import random
import os
import time
import concurrent.futures
from datetime import datetime

# ================= 核心配置区 =================
# Strapi 地址
API_URL = "http://localhost:1337"
# 登录账号 (必须是 Authenticated 角色)
USERNAME = "lisi"
PASSWORD = "QWEasd123"

# --- 压力强度配置 ---
NUM_PATIENTS = 20           # 1. 创建多少个病人
RECORDS_PER_PATIENT = 3    # 2. 每个病人创建几条治疗记录
LESIONS_PER_RECORD = 2     # 3. 每条记录包含几个病灶
PHOTOS_PER_LESION = 2      # 4. 每个病灶上传几张图片
IMAGE_SIZE_MB = 3          # 5. 单张图片大小 (MB)

# 并发控制 (建议不要设置太高，以免本地网络阻塞)
MAX_WORKERS = 4
# ============================================

def get_jwt():
    """获取登录凭证"""
    try:
        resp = requests.post(f"{API_URL}/api/auth/local", json={
            "identifier": USERNAME,
            "password": PASSWORD
        })
        resp.raise_for_status()
        print("✅ 登录成功")
        return resp.json()['jwt']
    except Exception as e:
        print(f"❌ 登录失败: {e}")
        exit(1)

def generate_dummy_image_data(size_mb):
    """生成随机图片数据"""
    return os.urandom(int(size_mb * 1024 * 1024))

def create_patient(jwt, index):
    """创建一个随机病人"""
    headers = {"Authorization": f"Bearer {jwt}"}
    
    # 随机生成病人数据
    gender = random.choice(['male', 'female'])
    name = f"StressUser_{int(time.time())}_{index}"
    
    payload = {
        "data": {
            "Name": name,
            "Gender": gender,
            "Birthday": "1990-01-01",
            "past_treatments": [] # 传空数组最稳妥
        }
    }
    
    try:
        resp = requests.post(f"{API_URL}/api/patients", headers=headers, json=payload)
        resp.raise_for_status()
        # Strapi v5 返回 { data: { documentId: "...", ... } }
        data = resp.json()['data']
        print(f"👤 病人创建成功: {data['Name']} ({data['documentId']})")
        return data['documentId']
    except Exception as e:
        print(f"⚠️ 病人创建失败: {e}")
        return None

def upload_images(jwt, count, dummy_data):
    """批量上传图片，返回 ID 列表"""
    headers = {"Authorization": f"Bearer {jwt}"}
    uploaded_ids = []
    
    for _ in range(count):
        filename = f'full_stress_{random.randint(10000,99999)}.jpg'
        files = {
            'files': (filename, dummy_data, 'image/jpeg')
        }
        try:
            # 这里的 timeout 设置短一点，因为我们不关心它是 ECONNRESET 还是成功，只要发出去就行
            # 但为了拿 ID，还是得等 response
            resp = requests.post(f"{API_URL}/api/upload", headers=headers, files=files)
            if resp.status_code in [200, 201]:
                uploaded_ids.append(resp.json()[0]['id'])
        except Exception:
            # 忽略网络层的报错，压力测试中只要服务器没挂就行
            pass
            
    return uploaded_ids

def create_treatment_record(jwt, patient_doc_id, dummy_img_data):
    """为指定病人创建一条多病灶记录"""
    headers = {
        "Authorization": f"Bearer {jwt}",
        "Content-Type": "application/json"
    }
    
    # 1. 准备多病灶数据 (Details Component)
    details_payload = []
    
    # 模拟枚举值，请确保这些值在您的 TREATMENT_TARGET_MAP 中存在，否则 Strapi 会报错
    # 如果不确定，就固定写 'Maxillofacial'
    parts = ['Maxillofacial', 'Chest', 'Abdomen & Buttocks', 'Shoulder & Back'] 
    
    for _ in range(LESIONS_PER_RECORD):
        # A. 上传图片
        img_ids = upload_images(jwt, PHOTOS_PER_LESION, dummy_img_data)
        
        if not img_ids:
            print("   ⚠️ 图片上传全部失败，跳过该病灶")
            continue

        # B. 构建病灶对象
        details_payload.append({
            "part": random.choice(parts),
            "notes": "Full Stress Test Auto-gen",
            "duration": 30, # 子时长
            "photos": img_ids
        })
    
    if not details_payload:
        return False

    # 2. 组装最终 Payload
    payload = {
        "data": {
            "patient": patient_doc_id, # 关联病人
            "sequence_number": random.randint(1, 100),
            "duration": 60, # 总时长 (注意：这是您之前修正的字段名 duration)
            "details": details_payload # 多病灶组件
        }
    }
    
    try:
        resp = requests.post(f"{API_URL}/api/treatments", headers=headers, json=payload)
        if resp.status_code in [200, 201]:
            return True
        else:
            print(f"   ❌ 治疗记录提交失败: {resp.text}")
            return False
    except Exception as e:
        print(f"   ❌ 网络错误: {e}")
        return False

def patient_workflow(jwt, index, dummy_img_data):
    """单个病人的完整生命周期任务"""
    # 1. 建人
    patient_id = create_patient(jwt, index)
    if not patient_id:
        return
    
    # 2. 建记录 (循环)
    success_count = 0
    for i in range(RECORDS_PER_PATIENT):
        if create_treatment_record(jwt, patient_id, dummy_img_data):
            success_count += 1
            print(f"   [病人 {index}] 记录 {i+1}/{RECORDS_PER_PATIENT} ✅ (含 {LESIONS_PER_RECORD} 病灶, {LESIONS_PER_RECORD*PHOTOS_PER_LESION} 图)")
        else:
            print(f"   [病人 {index}] 记录 {i+1} ❌")
            
    return success_count

def main():
    total_imgs = NUM_PATIENTS * RECORDS_PER_PATIENT * LESIONS_PER_RECORD * PHOTOS_PER_LESION
    total_data_size = total_imgs * IMAGE_SIZE_MB
    
    print(f"🚀 全链路压力测试启动")
    print(f"📊 预计生成: {NUM_PATIENTS} 病人, {NUM_PATIENTS*RECORDS_PER_PATIENT} 记录")
    print(f"📸 预计上传: {total_imgs} 张图片 (约 {total_data_size} MB)")
    
    jwt = get_jwt()
    dummy_data = generate_dummy_image_data(IMAGE_SIZE_MB)
    
    start_time = time.time()
    
    # 使用线程池并发处理“病人”级别的任务
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(patient_workflow, jwt, i, dummy_data) for i in range(NUM_PATIENTS)]
        
        concurrent.futures.wait(futures)

    duration = time.time() - start_time
    print(f"\n🏁 测试完成! 总耗时: {duration:.2f}秒")

if __name__ == "__main__":
    main()