# Database Schema

## Jobs Table
- job_id (PK)
- user_id
- type (t2i, t2v, etc.)
- status (queued, processing, completed, failed)
- input_params (JSON)
- output_url
- created_at
- updated_at

## Users Table
- user_id (PK)
- username
- credits
