"""
Higgsfield AI API Module
Module chứa các hàm request API để tương tác với Higgsfield AI service
Có thể import và sử dụng trong các project khác
"""

import requests
import json
import random
import time
from io import BytesIO
from PIL import Image


def get_jwt_token(sses: str, cookie: str) -> str:
    """
    Lấy JWT token từ Clerk API
    
    Args:
        sses: Session ID
        cookie: Cookie string từ browser
    
    Returns:
        JWT token dạng "Bearer {token}"
    
    Raises:
        Exception: Nếu không thể parse response hoặc lỗi request
    """
    url = f"https://clerk.higgsfield.ai/v1/client/sessions/{sses}/tokens?__clerk_api_version=2025-11-10&_clerk_js_version=5.109.0"

    payload = 'organization_id='
    headers = {
        'accept': '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Cookie': cookie
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    try:
        jwt_token = "Bearer " + response.json().get("jwt")
        return jwt_token
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse JWT response: {e}, Response: {response.text[:200]}")


def get_jwt_token_with_retry(sses: str, cookie: str, max_retries: int = 3) -> str:
    """
    Lấy JWT token với retry mechanism
    
    Args:
        sses: Session ID
        cookie: Cookie string từ browser
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        JWT token dạng "Bearer {token}"
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            return get_jwt_token(sses, cookie)
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise


def get_image_size_from_url(image_url: str) -> tuple:
    """
    Lấy kích thước ảnh từ URL public
    
    Args:
        image_url: URL của ảnh (public URL)
    
    Returns:
        Tuple (width, height) hoặc (None, None) nếu lỗi
    """
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        
        # Đọc ảnh từ bytes
        img = Image.open(BytesIO(response.content))
        width, height = img.size
        return (width, height)
    except Exception as e:
        # Nếu lỗi, trả về None
        return (None, None)


def create_link_upload(jwt_token: str, cookie: str) -> tuple:
    """
    Tạo presigned URL để upload ảnh
    
    Args:
        jwt_token: JWT token từ get_jwt_token
        cookie: Cookie string từ browser
    
    Returns:
        Tuple (img_id, img_url, upload_url)
    
    Raises:
        Exception: Nếu không thể parse response hoặc lỗi request
    """
    url = "https://fnf.higgsfield.ai/media?require_consent=true"

    payload = {}
    headers = {
        'accept': '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'authorization': jwt_token,
        'content-length': '0',
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Cookie': cookie
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    try:
        data = response.json()
        img_id = data.get("id")
        img_url = data.get("url")
        upload_url = data.get("upload_url")
        return img_id, img_url, upload_url
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse create_link_upload response: {e}, Response: {response.text[:200]}")


def create_link_upload_with_retry(sses: str, cookie: str, max_retries: int = 3) -> tuple:
    """
    Tạo presigned URL với retry và tự động refresh JWT
    
    Args:
        sses: Session ID
        cookie: Cookie string từ browser
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        Tuple (img_id, img_url, upload_url)
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            jwt_token = get_jwt_token_with_retry(sses, cookie)
            return create_link_upload(jwt_token, cookie)
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise


def image_to_binary(image_path: str) -> bytes:
    """
    Đọc file ảnh và trả về binary bytes
    
    Args:
        image_path: Đường dẫn đến file ảnh
    
    Returns:
        Binary bytes của ảnh
    """
    with open(image_path, "rb") as f:
        return f.read()


def upload_img(url: str, image_path: str) -> dict:
    """
    Upload ảnh lên presigned URL
    
    Args:
        url: Presigned URL từ create_link_upload
        image_path: Đường dẫn đến file ảnh
        content_type: Content type của ảnh (mặc định: "image/jpeg")
    
    Returns:
        Dict với keys: status, success, response_text (hoặc error nếu fail)
    """
    try:
        payload = image_to_binary(image_path)

        headers = {
            'Accept': '*/*',
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
            'Content-Type': 'image/jpeg',
            'Origin': 'https://higgsfield.ai',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }

        response = requests.put(url, headers=headers, data=payload)

        return {
            "status": response.status_code,
            "success": response.status_code in [200, 201],
            "response_text": response.text
        }

    except Exception as e:
        return {
            "status": None,
            "success": False,
            "error": str(e)
        }


def check_upload(img_id: str, jwt_token: str) -> str:
    """
    Xác nhận upload đã hoàn thành
    
    Args:
        img_id: ID của ảnh đã upload
        jwt_token: JWT token từ get_jwt_token
    
    Returns:
        Response text từ API
    """
    url = f"https://fnf.higgsfield.ai/media/{img_id}/upload"

    payload = {}
    headers = {
        'accept': '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'authorization': jwt_token,
        'content-length': '0',
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    return response.text


def check_upload_with_retry(img_id: str, sses: str, cookie: str, max_retries: int = 3) -> str:
    """
    Xác nhận upload với retry và tự động refresh JWT
    
    Args:
        img_id: ID của ảnh đã upload
        sses: Session ID
        cookie: Cookie string từ browser
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        Response text từ API
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            jwt_token = get_jwt_token_with_retry(sses, cookie)
            return check_upload(img_id, jwt_token)
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise


def send_job(authorization: str, id: str, url_img: str, prompt: str, cookie: str, 
             resolution: str = "1080p", use_unlim: bool = False) -> str:
    """
    Gửi job tạo video từ ảnh
    
    Args:
        authorization: JWT token từ get_jwt_token
        id: Image ID từ create_link_upload
        url_img: Image URL từ create_link_upload
        prompt: Prompt mô tả video
        cookie: Cookie string từ browser
        resolution: Độ phân giải video ("720p" hoặc "1080p", mặc định: "1080p")
        use_unlim: Có sử dụng unlimited hay không (mặc định: False)
    
    Returns:
        Job ID nếu thành công, None nếu không tạo được job
    
    Raises:
        Exception: Nếu không thể parse response hoặc lỗi request
    """
    url = "https://fnf.higgsfield.ai/jobs/kling"

    payload = json.dumps({
        "params": {
            "input_image": {
                "type": "media_input",
                "id": id,
                "url": url_img,
                "width": 768,
                "height": 1344
            },
            "width": 768,
            "height": 1344,
            "prompt": prompt,
            "seed": random.randint(100000, 999999),
            "cfg_scale": 0.5,
            "camera_control": None,
            "duration": 5,
            "model": "kling-v2-5-turbo",
            "resolution": resolution,
            "motion_id": "7077cde8-7947-46d6-aea2-dbf2ff9d441c",
            "enhance_prompt": False,
            "mode": "std",
            "input_image_end": None
        },
        "use_unlim": use_unlim
    })
    
    headers = {
        'accept': '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'authorization': authorization,
        'content-type': 'application/json',
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Cookie': cookie
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    try:
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            target_id = data['job_sets'][0]['id']
            return target_id
        else:
            return None
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse send_job response: {e}, Response: {response.text[:200]}")


def send_job_with_retry(id: str, url_img: str, prompt: str, sses: str, cookie: str, 
                        resolution: str, use_unlim: bool, max_retries: int = 3) -> str:
    """
    Gửi job với retry và tự động refresh JWT
    
    Args:
        id: Image ID từ create_link_upload
        url_img: Image URL từ create_link_upload
        prompt: Prompt mô tả video
        sses: Session ID
        cookie: Cookie string từ browser
        resolution: Độ phân giải video ("720p" hoặc "1080p")
        use_unlim: Có sử dụng unlimited hay không
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        Job ID nếu thành công, None nếu không tạo được job
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            jwt_token = get_jwt_token_with_retry(sses, cookie)
            return send_job(jwt_token, id, url_img, prompt, cookie, resolution, use_unlim)
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise


def check_job(authorization: str, job_id: str, cookie: str) -> tuple:
    """
    Kiểm tra trạng thái job
    
    Args:
        authorization: JWT token từ get_jwt_token
        job_id: Job ID từ send_job
        cookie: Cookie string từ browser
    
    Returns:
        Tuple (status, video_url):
        - Nếu completed: ('completed', video_url)
        - Nếu chưa xong: (status, None)
        - Nếu lỗi: ('error', None)
    
    Raises:
        Exception: Nếu không thể parse response
    """
    url = f"https://fnf.higgsfield.ai/job-sets/{job_id}"

    payload = {}
    headers = {
        'accept': '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'authorization': authorization,
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Cookie': cookie
    }

    response = requests.request("GET", url, headers=headers, data=payload)
    try:
        data = response.json()
        first_job = data['jobs'][0]
        status = first_job['status']
        
        if status == 'completed':
            video_url = first_job['results']['raw']['url']
            return ('completed', video_url)
        else:
            return (status, None)
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse check_job response: {e}, Response: {response.text[:200]}")
    except (KeyError, IndexError, TypeError) as e:
        return ('error', None)


def check_job_with_retry(job_id: str, sses: str, cookie: str, max_retries: int = 3) -> tuple:
    """
    Kiểm tra trạng thái job với retry và tự động refresh JWT
    
    Args:
        job_id: Job ID từ send_job
        sses: Session ID
        cookie: Cookie string từ browser
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        Tuple (status, video_url):
        - Nếu completed: ('completed', video_url)
        - Nếu chưa xong: (status, None)
        - Nếu lỗi: ('error', None)
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            jwt_token = get_jwt_token_with_retry(sses, cookie)
            return check_job(jwt_token, job_id, cookie)
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise


def download_video(url: str, filename: str) -> bool:
    """
    Tải video từ URL
    
    Args:
        url: URL của video
        filename: Tên file để lưu video
    
    Returns:
        True nếu thành công
    """
    response = requests.get(url)
    with open(filename, "wb") as f:
        f.write(response.content)
    return True
def create_reference_media(authorization: str, cookie: str) -> dict:
    """
    Tạo reference media và trả về thông tin upload
    
    Args:
        authorization: JWT token từ get_jwt_token
        cookie: Cookie string từ browser
    
    Returns:
        Dict với keys: id, url, upload_url (hoặc error nếu fail)
    """
    url = "https://fnf.higgsfield.ai/reference-media"

    payload = json.dumps({
        "mimetype": "image/jpeg"
    })
    headers = {
        'accept': '*/*',
        'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
        'authorization': authorization,
        'content-type': 'application/json',
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Cookie': cookie
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    try:
        data = response.json()
        return {
            "id": data.get("id"),
            "url": data.get("url"),
            "upload_url": data.get("upload_url")
        }
    except (json.JSONDecodeError, ValueError) as e:
        return {
            "error": f"Lỗi parse create_reference_media response: {e}, Response: {response.text[:200]}"
        }


def create_reference_media_with_retry(sses: str, cookie: str, max_retries: int = 3) -> dict:
    """
    Tạo reference media với retry và tự động refresh JWT
    
    Args:
        sses: Session ID
        cookie: Cookie string từ browser
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        Dict với keys: id, url, upload_url (hoặc error nếu fail)
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            jwt_token = get_jwt_token_with_retry(sses, cookie)
            result = create_reference_media(jwt_token, cookie)
            if "error" not in result:
                return result
            else:
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                raise Exception(result.get("error", "Unknown error"))
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise



def batch_media(authorization: str) -> dict:
    """
    Tạo batch media và trả về thông tin upload
    
    Args:
        authorization: JWT token từ get_jwt_token
    
    Returns:
        Dict với keys: id, url, upload_url (hoặc error nếu fail)
    """
    url = "https://fnf.higgsfield.ai/media/batch"

    payload = json.dumps({
        "mimetypes": [
            "image/jpeg"
        ]
    })
    headers = {
        'accept': '*/*',
        'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
        'authorization': authorization,
        'content-type': 'application/json',
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    try:
        data = response.json()
        # batch_media có thể trả về list, lấy phần tử đầu tiên
        if isinstance(data, list) and len(data) > 0:
            item = data[0]
            return {
                "id": item.get("id"),
                "url": item.get("url"),
                "upload_url": item.get("upload_url")
            }
        elif isinstance(data, dict):
            return {
                "id": data.get("id"),
                "url": data.get("url"),
                "upload_url": data.get("upload_url")
            }
        else:
            return {
                "error": f"Unexpected response format: {response.text[:200]}"
            }
    except (json.JSONDecodeError, ValueError) as e:
        return {
            "error": f"Lỗi parse batch_media response: {e}, Response: {response.text[:200]}"
        }


def batch_media_with_retry(sses: str, cookie: str, max_retries: int = 3) -> dict:
    """
    Tạo batch media với retry và tự động refresh JWT
    
    Args:
        sses: Session ID
        cookie: Cookie string từ browser
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        Dict với keys: id, url, upload_url (hoặc error nếu fail)
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            jwt_token = get_jwt_token_with_retry(sses, cookie)
            result = batch_media(jwt_token)
            if "error" not in result:
                return result
            else:
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                raise Exception(result.get("error", "Unknown error"))
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise


def send_job_t2i_nano_banana(authorization: str,aspect_ratio: str, prompt: str, cookie: str, use_unlim: bool = True) -> str:
    """
    Gửi job tạo ảnh từ ảnh
    """

    url = "https://fnf.higgsfield.ai/jobs/nano-banana"

    payload = json.dumps({
    "params": {
        "prompt": prompt,
        "input_images": [],
        "width": 1024,
        "height": 1024,
        "batch_size": 1,
        "aspect_ratio": aspect_ratio,
        "use_unlim": use_unlim,
    },
    "use_unlim": use_unlim
    })
    headers = {
    'accept': '*/*',
    'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
    'authorization': authorization,
    'content-type': 'application/json',
    'origin': 'https://higgsfield.ai',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'Cookie': cookie
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    try:
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            target_id = data['job_sets'][0]['id']
            return target_id
        else:
            return None
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse send_job response: {e}, Response: {response.text[:200]}")

def send_job_t2i_nano_banana_pro(authorization: str, aspect_ratio: str, resolution: str, prompt: str, cookie: str, use_unlim: bool = True) -> str:
    """
    Gửi job tạo ảnh từ ảnh
    resolution 1K, 2K, 4K
    aspect ratio 1:1, 9:16, 16:9
    """

    url = "https://fnf.higgsfield.ai/jobs/nano-banana-2"

    payload = json.dumps({
    "params": {
        "prompt": prompt,
        "input_images": [],
        "width": 1024,
        "height": 1024,
        "batch_size": 1,
        "aspect_ratio": aspect_ratio,
        "use_unlim": use_unlim,
        "resolution": resolution
    },
    "use_unlim": use_unlim
    })
    headers = {
    'accept': '*/*',
    'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
    'authorization': authorization,
    'content-type': 'application/json',
    'origin': 'https://higgsfield.ai',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'Cookie': cookie
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    try:
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            target_id = data['job_sets'][0]['id']
            return target_id
        else:
            return None
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse send_job response: {e}, Response: {response.text[:200]}")

def send_job_i2i_nano_banana_pro_with_retry(list_ids: list, list_urls: list,
                                        list_widths: list, list_heights: list, prompt: str,
                                        sses: str, cookie: str, width: int = None, 
                                        height: int = None, batch_size: int = 1,
                                        aspect_ratio: str = "9:16", resolution: str = "1k",
                                        use_unlim: bool = True, max_retries: int = 3) -> str:
    """
    Gửi job I2I nano-banana-2 với retry và tự động refresh JWT
    
    Args:
        list_ids: List các image ID
        list_urls: List các image URL tương ứng
        list_widths: List các width của từng ảnh
        list_heights: List các height của từng ảnh
        prompt: Prompt mô tả
        sses: Session ID
        cookie: Cookie string từ browser
        width: Width cho params (mặc định: lấy từ ảnh đầu tiên)
        height: Height cho params (mặc định: lấy từ ảnh đầu tiên)
        batch_size: Batch size (mặc định: 1)
        aspect_ratio: Aspect ratio (mặc định: "9:16")
        resolution: Resolution (mặc định: "1k")
        use_unlim: Use unlimited (mặc định: True)
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        Job ID nếu thành công, None nếu không tạo được job
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            jwt_token = get_jwt_token_with_retry(sses, cookie)
            job_id, response_text = send_job_i2i_nano_banana_pro(
                jwt_token, list_ids, list_urls, list_widths, list_heights,
                prompt, cookie, width, height, batch_size, aspect_ratio,
                resolution, use_unlim
            )
            return job_id
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise

def send_job_i2i_nano_banana(authorization: str, list_ids: list, list_urls: list, 
                              list_widths: list, list_heights: list, prompt: str, cookie: str,
                              width: int = None, height: int = None, batch_size: int = 1,
                              aspect_ratio: str = "9:16",use_unlim: bool = True) -> tuple:
    """
    Gửi job I2I nano-banana-2 với nhiều ảnh, mỗi ảnh có width/height riêng
    
    Args:
        authorization: JWT token từ get_jwt_token
        list_ids: List các image ID
        list_urls: List các image URL tương ứng
        list_widths: List các width của từng ảnh
        list_heights: List các height của từng ảnh
        prompt: Prompt mô tả
        cookie: Cookie string từ browser
        width: Width cho params (mặc định: lấy từ ảnh đầu tiên)
        height: Height cho params (mặc định: lấy từ ảnh đầu tiên)
        batch_size: Batch size (mặc định: 1)
        aspect_ratio: Aspect ratio (mặc định: "9:16")
        resolution: Resolution (mặc định: "1k")
        use_unlim: Use unlimited (mặc định: True)
    
    Returns:
        Tuple (job_id, response_text):
        - job_id: Job ID nếu thành công, None nếu không tạo được job
        - response_text: Response text từ API
    
    Raises:
        Exception: Nếu không thể parse response hoặc lỗi request
    """
    url = "https://fnf.higgsfield.ai/jobs/nano-banana"
    
    # Kiểm tra độ dài các list phải bằng nhau
    if not (len(list_ids) == len(list_urls) == len(list_widths) == len(list_heights)):
        raise ValueError("Tất cả các list phải có cùng độ dài")
    
    # Tạo input_images list
    input_images = []
    for i in range(len(list_ids)):
        img_obj = {
            "type": "media_input",
            "id": list_ids[i],
            "url": list_urls[i],
            "width": list_widths[i],
            "height": list_heights[i]
        }
        input_images.append(img_obj)
    
    # Nếu không chỉ định width/height cho params, lấy từ ảnh đầu tiên
    if width is None:
        width = list_widths[0]
    if height is None:
        height = list_heights[0]
    
    payload = json.dumps({
        "params": {
            "prompt": prompt,
            "input_images": input_images,
            "width": width,
            "height": height,
            "batch_size": batch_size,
            "use_unlim": use_unlim
        },
        "use_unlim": use_unlim
    })
    
    headers = {
        'accept': '*/*',
        'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
        'authorization': authorization,
        'content-type': 'application/json',
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }
    
    response = requests.request("POST", url, headers=headers, data=payload)
    try:
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            target_id = data['job_sets'][0]['id']
            return target_id, response.text
        else:
            return None, response.text
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse send_job_i2i_nano_banana response: {e}, Response: {response.text[:200]}")

def send_job_i2i_nano_banana_with_retry(list_ids: list, list_urls: list,
                                        list_widths: list, list_heights: list, prompt: str,
                                        sses: str, cookie: str, width: int = None, 
                                        height: int = None, batch_size: int = 1,
                                        aspect_ratio: str = "9:16", use_unlim: bool = True, max_retries: int = 3) -> str:
    """    
    Args:
        list_ids: List các image ID
        list_urls: List các image URL tương ứng
        list_widths: List các width của từng ảnh
        list_heights: List các height của từng ảnh
        prompt: Prompt mô tả
        sses: Session ID
        cookie: Cookie string từ browser
        width: Width cho params (mặc định: lấy từ ảnh đầu tiên)
        height: Height cho params (mặc định: lấy từ ảnh đầu tiên)
        batch_size: Batch size (mặc định: 1)
        use_unlim: Use unlimited (mặc định: True)
        max_retries: Số lần retry tối đa (mặc định: 3)
    
    Returns:
        Job ID nếu thành công, None nếu không tạo được job
    
    Raises:
        Exception: Nếu tất cả retry đều fail
    """
    for attempt in range(max_retries):
        try:
            jwt_token = get_jwt_token_with_retry(sses, cookie)
            job_id, response_text = send_job_i2i_nano_banana(
                jwt_token, list_ids, list_urls, list_widths, list_heights,
                prompt, cookie, width, height, batch_size, aspect_ratio,
                resolution, use_unlim
            )
            return job_id
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise

    """
    Gửi job tạo ảnh từ ảnh
    resolution 1K, 2K, 4K
    aspect ratio 1:1, 9:16, 16:9
    """

    url = "https://fnf.higgsfield.ai/jobs/nano-banana-2"

    payload = json.dumps({
    "params": {
        "prompt": prompt,
        "input_images": [],
        "width": 1024,
        "height": 1024,
        "batch_size": 1,
        "aspect_ratio": aspect_ratio,
        "use_unlim": use_unlim,
        "resolution": resolution
    },
    "use_unlim": use_unlim
    })
    headers = {
    'accept': '*/*',
    'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
    'authorization': authorization,
    'content-type': 'application/json',
    'origin': 'https://higgsfield.ai',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'Cookie': cookie
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    try:
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            target_id = data['job_sets'][0]['id']
            return target_id
        else:
            return None
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse send_job response: {e}, Response: {response.text[:200]}")

def send_job_i2i_nano_banana_pro(authorization: str, list_ids: list, list_urls: list, 
                              list_widths: list, list_heights: list, prompt: str, cookie: str,
                              width: int = None, height: int = None, batch_size: int = 1,
                              aspect_ratio: str = "9:16", resolution: str = "1k", 
                              use_unlim: bool = True) -> tuple:
    """
    Gửi job I2I nano-banana-2 với nhiều ảnh, mỗi ảnh có width/height riêng
    
    Args:
        authorization: JWT token từ get_jwt_token
        list_ids: List các image ID
        list_urls: List các image URL tương ứng
        list_widths: List các width của từng ảnh
        list_heights: List các height của từng ảnh
        prompt: Prompt mô tả
        cookie: Cookie string từ browser
        width: Width cho params (mặc định: lấy từ ảnh đầu tiên)
        height: Height cho params (mặc định: lấy từ ảnh đầu tiên)
        batch_size: Batch size (mặc định: 1)
        aspect_ratio: Aspect ratio (mặc định: "9:16")
        resolution: Resolution (mặc định: "1k")
        use_unlim: Use unlimited (mặc định: True)
    
    Returns:
        Tuple (job_id, response_text):
        - job_id: Job ID nếu thành công, None nếu không tạo được job
        - response_text: Response text từ API
    
    Raises:
        Exception: Nếu không thể parse response hoặc lỗi request
    """
    url = "https://fnf.higgsfield.ai/jobs/nano-banana-2"
    
    # Kiểm tra độ dài các list phải bằng nhau
    if not (len(list_ids) == len(list_urls) == len(list_widths) == len(list_heights)):
        raise ValueError("Tất cả các list phải có cùng độ dài")
    
    # Tạo input_images list
    input_images = []
    for i in range(len(list_ids)):
        img_obj = {
            "type": "media_input",
            "id": list_ids[i],
            "url": list_urls[i],
            "width": list_widths[i],
            "height": list_heights[i]
        }
        input_images.append(img_obj)
    
    # Nếu không chỉ định width/height cho params, lấy từ ảnh đầu tiên
    if width is None:
        width = list_widths[0]
    if height is None:
        height = list_heights[0]
    
    payload = json.dumps({
        "params": {
            "prompt": prompt,
            "input_images": input_images,
            "width": width,
            "height": height,
            "batch_size": batch_size,
            "aspect_ratio": aspect_ratio,
            "use_unlim": use_unlim,
            "resolution": resolution
        },
        "use_unlim": use_unlim
    })
    
    headers = {
        'accept': '*/*',
        'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
        'authorization': authorization,
        'content-type': 'application/json',
        'origin': 'https://higgsfield.ai',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }
    
    response = requests.request("POST", url, headers=headers, data=payload)
    try:
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            target_id = data['job_sets'][0]['id']
            return target_id, response.text
        else:
            return None, response.text
    except (json.JSONDecodeError, ValueError) as e:
        raise Exception(f"Lỗi parse send_job_i2i_nano_banana_pro response: {e}, Response: {response.text[:200]}")
