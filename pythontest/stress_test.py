import requests
import random
import os
import concurrent.futures
import time

# ================= 配置区 =================
# 您的 Strapi 地址 (如果是本地测试用 localhost，如果是 NAS 用 NAS IP)
API_URL = "http://localhost:1337"  
# 登录账号 (必须是 Authenticated 角色)
USERNAME = "lisi"  # 请替换为您的真实用户名
PASSWORD = "QWEasd123"             # 请替换为密码

# 测试强度配置
TOTAL_RECORDS = 5       # 总共创建多少条治疗记录
IMAGES_PER_RECORD = 2    # 每条记录包含几张图片
IMAGE_SIZE_MB = 3        # 模拟单张图片的大小 (MB)
CONCURRENCY = 5          # 并发线程数 (模拟几个医生同时上传)

# 目标患者 ID (请先在后台看一眼，填一个真实存在的患者 DocumentId)
TARGET_PATIENT_DOC_ID = "ao5wnx3snjfcu58xzykwsg9j" 

# 🟢 修正 1：如果你想测试“真图片”能否打开，请把这里改成 True
USE_REAL_IMAGE = True 
REAL_IMAGE_PATH = "./test.jpg"  # 请在脚本同级目录下放一张真实的 test.jpg
# ==========================================

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

def generate_dummy_image(size_mb):
    """在内存中生成数据"""
    if USE_REAL_IMAGE and os.path.exists(REAL_IMAGE_PATH):
        # 读取真实文件（注意：这会受限于真实文件大小，忽略 size_mb 参数）
        with open(REAL_IMAGE_PATH, "rb") as f:
            return f.read()
    else:
        # 生成随机噪点（文件打不开是正常的，只测 I/O）
        return os.urandom(int(size_mb * 1024 * 1024))

def upload_single_image(jwt, dummy_data):
    """上传单张图片"""
    headers = {"Authorization": f"Bearer {jwt}"}
    # 随机生成文件名，防止覆盖
    filename = f'stress_test_{random.randint(10000,99999)}.jpg'
    
    files = {
        'files': (filename, dummy_data, 'image/jpeg')
    }
    
    # 记录上传耗时
    start = time.time()
    resp = requests.post(f"{API_URL}/api/upload", headers=headers, files=files)
    duration = time.time() - start
    
    # 🟢 修正 2：放宽状态码判断，接受 200 和 201
    if resp.status_code in [200, 201]:
        # Strapi 上传接口返回的是数组，取第一个元素
        return resp.json()[0]['id'], duration
    else:
        # 只有真正失败时才打印
        print(f"⚠️ 图片上传失败 (Code: {resp.status_code}): {resp.text[:100]}...") 
        return None, duration

def create_treatment_record(jwt, image_ids):
    """创建包含多病灶的治疗记录"""
    headers = {
        "Authorization": f"Bearer {jwt}",
        "Content-Type": "application/json"
    }
    
    # 构建 Strapi v5 的 Payload
    # 注意：这里模拟的是您最新的 'details' Component 结构
    payload = {
        "data": {
            "patient": TARGET_PATIENT_DOC_ID,
            # "sequence_number": random.randint(100, 999),
            "duration": 48,
            "details": [
                {
                    "part": "Maxillofacial", # 确保这是您枚举里有的值
                    "notes": "压力测试自动生成",
                    "duration": 66,
                    "photos": image_ids # 关联上传的图片ID
                }
            ]
        }
    }
    
    resp = requests.post(f"{API_URL}/api/treatments", headers=headers, json=payload)
    if resp.status_code == 200 or resp.status_code == 201:
        return True
    else:
        print(f"⚠️ 记录创建失败: {resp.text}")
        return False

def worker_task(jwt, dummy_img_data):
    """单个线程的工作流程"""
    # 1. 上传 N 张图
    img_ids = []
    upload_times = []
    
    for _ in range(IMAGES_PER_RECORD):
        img_id, duration = upload_single_image(jwt, dummy_img_data)
        if img_id:
            img_ids.append(img_id)
            upload_times.append(duration)
    
    # 2. 创建记录
    if img_ids:
        success = create_treatment_record(jwt, img_ids)
        avg_time = sum(upload_times) / len(upload_times)
        return success, avg_time
    return False, 0

def main():
    print(f"🚀 开始压力测试: 目标 {TOTAL_RECORDS} 条记录, 每条 {IMAGES_PER_RECORD} 张 {IMAGE_SIZE_MB}MB 图片")
    jwt = get_jwt()
    dummy_data = generate_dummy_image(IMAGE_SIZE_MB)
    
    success_count = 0
    total_upload_time = 0
    
    # 使用线程池并发执行
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        # 提交任务
        futures = [executor.submit(worker_task, jwt, dummy_data) for _ in range(TOTAL_RECORDS)]
        
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            is_ok, avg_speed = future.result()
            if is_ok:
                success_count += 1
                total_upload_time += avg_speed
                print(f"[{i+1}/{TOTAL_RECORDS}] 完成 (平均上传耗时: {avg_speed:.2f}s)")
            else:
                print(f"[{i+1}/{TOTAL_RECORDS}] 失败")

    print(f"\n✅ 测试结束! 成功写入: {success_count}/{TOTAL_RECORDS}")
    if success_count > 0:
        print(f"📊 平均单张图片({IMAGE_SIZE_MB}MB) 上传耗时: {total_upload_time/success_count:.2f}秒")

if __name__ == "__main__":
    main()