// lib/api.ts
/**
 * API request utility with authentication support and friendly error messages
 */

import { NEXT_PUBLIC_API } from './config';
import { getAuthHeader, removeToken } from './auth';

/**
 * Get friendly error message in Vietnamese
 */
function getFriendlyErrorMessage(status: number, detail: any): string {
    // Handle 401 Unauthorized
    if (status === 401) {
        removeToken(); // Auto-clear invalid token
        return 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại';
    }
    
    // Handle 402 Insufficient Credits
    if (status === 402) {
        if (typeof detail === 'object' && detail.required && detail.available) {
            return `Không đủ credits. Bạn cần ${detail.required} credits nhưng chỉ còn ${detail.available}`;
        }
        return 'Không đủ credits để thực hiện thao tác này';
    }
    
    // Handle 403 Forbidden
    if (status === 403) {
        return 'Bạn không có quyền truy cập tài nguyên này';
    }
    
    // Handle 429 Too Many Requests (concurrent job limit)
    if (status === 429) {
        if (typeof detail === 'object' && detail.message) {
            return detail.message;
        }
        return 'Bạn đang có quá nhiều tác vụ đang xử lý. Vui lòng đợi hoàn thành.';
    }
    
    // Handle 404 Not Found
    if (status === 404) {
        return 'Không tìm thấy tài nguyên';
    }
    
    // Handle 400 Bad Request
    if (status === 400) {
        if (typeof detail === 'string') {
            // Try to make backend error messages friendlier
            if (detail.includes('Invalid') || detail.includes('invalid')) {
                return 'Thông tin không hợp lệ. Vui lòng kiểm tra lại';
            }
            if (detail.includes('resolution') || detail.includes('aspect_ratio')) {
                return 'Model không hỗ trợ cấu hình này. Vui lòng chọn lại';
            }
            return detail;
        }
        return 'Yêu cầu không hợp lệ';
    }
    
    // Handle 500 Server Error
    if (status >= 500) {
        return 'Lỗi hệ thống. Vui lòng thử lại sau';
    }
    
    // Default error message
    if (typeof detail === 'string') {
        return detail;
    }
    
    return `Đã xảy ra lỗi (${status})`;
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${NEXT_PUBLIC_API}${endpoint}`;
    
    // Merge auth headers with provided headers
    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...(options.headers || {}),
    };
    
    const response = await fetch(url, {
        ...options,
        headers,
    });
    
    if (!response.ok) {
        let detail: any;
        try {
            detail = await response.json();
        } catch {
            detail = await response.text().catch(() => 'Unknown error');
        }
        
        const friendlyMessage = getFriendlyErrorMessage(response.status, detail);
        throw new Error(friendlyMessage);
    }
    
    return (await response.json()) as T;
}

/**
 * API request that returns credit information along with data
 */
export interface ApiResponseWithCredits<T> {
    data: T;
    credits_cost?: number;
    credits_remaining?: number;
}

export async function apiRequestWithCredits<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponseWithCredits<T>> {
    const result = await apiRequest<T & { credits_cost?: number; credits_remaining?: number }>(
        endpoint,
        options
    );
    
    const { credits_cost, credits_remaining, ...data } = result;
    
    return {
        data: data as T,
        credits_cost,
        credits_remaining,
    };
}
