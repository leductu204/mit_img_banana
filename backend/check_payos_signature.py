
import hmac
import hashlib
import json

def verify_signature(data, checksum_key):
    # Sort data by key
    sorted_data = dict(sorted(data.items()))
    
    # Create query string
    query_string_parts = []
    for key, value in sorted_data.items():
        if key == "signature":
            continue
        
        value_str = str(value) if value is not None else ""
        if isinstance(value, (list, dict)):
             # PayOS logic for nested objects might differ, but assuming flat for simple webhook data
             import json
             # Need to match PayOS exact serialization for lists/dicts if any
             value_str = json.dumps(value, separators=(',', ':'))
        
        query_string_parts.append(f"{key}={value_str}")
        
    query_string = "&".join(query_string_parts)
    print(f"Query String: {query_string}")
    
    # HMAC SHA256
    signature = hmac.new(
        checksum_key.encode("utf-8"), 
        msg=query_string.encode("utf-8"), 
        digestmod=hashlib.sha256
    ).hexdigest()
    
    return signature

if __name__ == "__main__":
    # Example data from PayOS webhook
    # Replace with actual data to test
    dummy_data = {
        "orderCode": 123456,
        "amount": 2000,
        "description": "Thanh toan don hang",
        "accountNumber": "123",
        "reference": "ref123",
        "transactionDateTime": "2023-10-01 12:00:00",
        "currency": "VND",
        "paymentLinkId": "link123",
        "code": "00",
        "desc": "success",
        "counterAccountBankId": "",
        "counterAccountBankName": "",
        "counterAccountName": "",
        "counterAccountNumber": "",
        "virtualAccountName": "",
        "virtualAccountNumber": ""
    }
    
    # YOUR CHECKSUM KEY
    KEY = "YOUR_CHECKSUM_KEY_HERE" 
    
    if KEY == "YOUR_CHECKSUM_KEY_HERE":
        print("Please set your CHECKSUM_KEY in the script to test.")
    else:
        sig = verify_signature(dummy_data, KEY)
        print(f"Calculated Signature: {sig}")
