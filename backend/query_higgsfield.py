
import sys
from pathlib import Path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from app.services.providers.higgsfield_client import higgsfield_client
import json

# Check specific job status from Higgsfield
provider_id = '0405dfd2-c9d8-423d-8ea6-68725650c3b7'
print(f"Checking Higgsfield status for provider job: {provider_id}")

try:
    result = higgsfield_client.get_job_status(provider_id)
    print(f"\nHiggsfield Response:")
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
