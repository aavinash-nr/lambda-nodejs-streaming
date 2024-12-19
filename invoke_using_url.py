import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

def get_signed_headers(url, region, service, access_key, secret_key, session_token=None):
    session = boto3.Session(
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        aws_session_token=session_token
    )
    credentials = session.get_credentials().get_frozen_credentials()
    
    # Extract the host from the URL
    host = url.split('//')[1].split('/')[0]
    
    # Create the AWS request
    request = AWSRequest(method='GET', url=url)
    request.headers['Host'] = host

    # Sign the request
    SigV4Auth(credentials, service, region).add_auth(request)
    return dict(request.headers.items())

def call_lambda_function(url, region, service, access_key, secret_key, session_token=None):
    headers = get_signed_headers(url, region, service, access_key, secret_key, session_token)

    # Print the URL and headers for debugging
    print(f"URL: {url}")
    print("Headers:", headers)

    # Make the request with streaming enabled
    response = requests.get(url, headers=headers, stream=True)

    # Check if the request was successful
    if response.status_code == 200:
        print("Streaming response:")
        # Iterate over the response in chunks
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                # Ensure the output buffer is flushed immediately
                print(chunk.decode('utf-8'), end='', flush=True)
    else:
        print(f"Failed to get response: {response.status_code}")
        print(response.text)

# # Example usage:
# # Replace the following variables with your actual values
url = 'https://your-function-url-id.lambda-url.region.on.aws/'
region = 'your-region'  # e.g., 'us-east-1'
service = 'lambda'
access_key = 'your-access-key'
secret_key = 'your-secret-key'
session_token = 'your-session-token'  # Only if using temporary credentials



call_lambda_function(url, region, service, access_key, secret_key, session_token)
