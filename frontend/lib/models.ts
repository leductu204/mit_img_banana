// models.ts
export interface GenerationResponse {
    job_id: string;
    status: string;
    image_url?: string;
    video_url?: string;
}

export interface JobInfo {
    job_id: string;
    status: string;
    created_at?: string;
    updated_at?: string;
}

export interface UserProfile {
    user_id: string;
    username: string;
    credits: number;
}
