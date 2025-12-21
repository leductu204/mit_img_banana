import { 
  Palette, Image as ImageIcon, User, Shirt, ShoppingBag, 
  Target, Video, Globe, Mic, Search,
  Wand2, Scissors, Layers, Maximize, History, 
  Sparkles, Camera, Zap, Plane, MessageSquare
} from "lucide-react";

export type StudioCategory = 
  | 'create' | 'background' | 'portrait' | 'fashion' 
  | 'product' | 'ads' | 'video' | 'travel' | 'audio' | 'analysis';

export interface StudioFeatureSettings {
  prompt?: { enabled: boolean; label?: string; placeholder?: string };
  aspectRatio?: { enabled: boolean; default?: string; options?: string[] };
  speed?: { enabled: boolean; default?: 'fast' | 'slow' };
  imageInput?: { enabled: boolean; maxImages?: number; label?: string };
  quality?: { enabled: boolean; default?: string };
}

export interface StudioFeature {
  id: string;
  category: StudioCategory;
  label: string;
  description: string;
  icon: any;
  priority: 1 | 2 | 3 | 4 | 5;
  badge?: 'Free' | 'Pro' | 'New';
  apiEndpoint?: string;
  comingSoon?: boolean;
  settings?: StudioFeatureSettings;
}

export const STUDIO_CATEGORIES: { id: StudioCategory; label: string; icon: any }[] = [
  { id: 'create', label: 'Tạo & Sửa ảnh', icon: Palette },
  { id: 'background', label: 'Background', icon: Layers },
  // { id: 'portrait', label: 'Chân dung', icon: User },
  // { id: 'fashion', label: 'Thời trang', icon: Shirt },
  // { id: 'product', label: 'Sản phẩm', icon: ShoppingBag },
  // { id: 'ads', label: 'Quảng cáo', icon: Target },
  // { id: 'video', label: 'Video Analysis', icon: Video },
  // { id: 'travel', label: 'Du lịch', icon: Globe },
  // { id: 'audio', label: 'Âm thanh', icon: Mic },
  // { id: 'analysis', label: 'Phân tích', icon: Search },
];

export const STUDIO_FEATURES: StudioFeature[] = [
  // 1. Create & Edit (Priority 1-2)
  {
    id: 'text-to-image',
    category: 'create',
    label: 'Text to Image',
    description: 'Tạo ảnh từ mô tả văn bản với AI',
    icon: Wand2,
    priority: 1,
    badge: 'Free',
    settings: {
      prompt: { 
        enabled: true, 
        label: "Mô tả ảnh (Prompt)",
        placeholder: "Một chú mèo phi hành gia trên sao Hỏa, digital art..."
      },
      aspectRatio: { enabled: true, default: "9:16" },
      speed: { enabled: true, default: "slow" },
      quality: { enabled: true, default: "2k" }
    }
  },
  {
    id: 'image-editor',
    category: 'create',
    label: 'Image Editor',
    description: 'Chỉnh sửa ảnh bằng AI với mô tả văn bản',
    icon: Sparkles,
    priority: 1,
    settings: {
      imageInput: { enabled: true, maxImages: 1, label: "Ảnh gốc cần sửa" },
      prompt: { 
        enabled: true, 
        label: "Bạn muốn sửa gì?",
        placeholder: "Thêm một chiếc mũ màu đỏ, đổi màu tóc thành vàng..."
      },
      aspectRatio: { enabled: true, default: "9:16" },
      speed: { enabled: true, default: "slow" }
    }
  },
  {
    id: 'upscale-image',
    category: 'create',
    label: 'Upscale Image',
    description: 'Nâng cấp độ phân giải ảnh lên HD/2K/4K',
    icon: Maximize,
    priority: 2
  },
  {
    id: 'restore-photo',
    category: 'create',
    label: 'Restore Old Photo',
    description: 'Phục hồi và sửa chữa ảnh cũ/hư hỏng',
    icon: History,
    priority: 2
  },
  {
    id: 'expand-image',
    category: 'create',
    label: 'Expand Image',
    description: 'Mở rộng ảnh với AI tạo nội dung xung quanh',
    icon: Maximize,
    priority: 2
  },

  // 2. Background (Priority 1-2)
  {
    id: 'remove-bg',
    category: 'background',
    label: 'Remove Background',
    description: 'Xóa nền tự động, tạo PNG trong suốt',
    icon: Scissors,
    priority: 1
  },
  {
    id: 'change-bg',
    category: 'background',
    label: 'Change Background',
    description: 'Thay đổi nền ảnh với preset chuyên nghiệp',
    icon: Layers,
    priority: 1
  },
  {
    id: 'festival-bg',
    category: 'background',
    label: 'Festival Backgrounds',
    description: '12 nền lễ hội Việt Nam (Tết, Trung Thu...)',
    icon: Sparkles,
    priority: 2
  },

  // 3. Portrait (Priority 3)
  {
    id: 'profile-gen',
    category: 'portrait',
    label: 'Profile Image Gen',
    description: 'Tạo ảnh profile theo nhiều phong cách',
    icon: User,
    priority: 3
  },
  {
    id: 'face-swap',
    category: 'portrait',
    label: 'Face Swap',
    description: 'Ghép gương mặt vào người mẫu',
    icon: User,
    priority: 3
  },

  // 4. Fashion (Priority 3-4)
  {
    id: 'fashion-studio',
    category: 'fashion',
    label: 'Fashion Studio',
    description: 'Mặc trang phục cho người mẫu AI',
    icon: Shirt,
    priority: 3
  },
  {
    id: 'extract-clothes',
    category: 'fashion',
    label: 'Extract Clothes',
    description: 'Tách quần áo từ ảnh người mẫu',
    icon: Scissors,
    priority: 3
  },
  {
    id: 'combine-product',
    category: 'fashion',
    label: 'Combine Product',
    description: 'Ghép sản phẩm lên người mẫu',
    icon: Layers,
    priority: 3
  },
  {
    id: 'face-outfit',
    category: 'fashion',
    label: 'Face + Outfit',
    description: 'Tạo 3 dáng chụp với cùng 1 bộ đồ',
    icon: Camera,
    priority: 4
  },

  // 5. Product (Priority 3)
  {
    id: 'product-photoshoot',
    category: 'product',
    label: 'Product Photoshoot',
    description: 'Chụp ảnh sản phẩm chuyên nghiệp',
    icon: Camera,
    priority: 3
  },
  {
    id: 'ecommerce-photo',
    category: 'product',
    label: 'E-commerce Photo',
    description: 'Ảnh thương mại điện tử (TikTok Shop)',
    icon: ShoppingBag,
    priority: 3
  },
  {
    id: 'product-bg',
    category: 'product',
    label: 'Product Backgrounds',
    description: 'Kho nền sản phẩm chuyên nghiệp',
    icon: Layers,
    priority: 3
  },

  // 6. Ads (Priority 4)
  {
    id: 'ad-creative',
    category: 'ads',
    label: 'Ad Creative Gen',
    description: 'Tạo ảnh quảng cáo chất lượng cao',
    icon: Target,
    priority: 4
  },
  {
    id: 'video-idea',
    category: 'ads',
    label: 'Video Idea Gen',
    description: 'Gợi ý ý tưởng video từ sản phẩm',
    icon: Sparkles,
    priority: 4
  },
  {
    id: 'video-gen',
    category: 'ads',
    label: 'Video Generation',
    description: 'Tạo video từ hình ảnh (Veo)',
    icon: Video,
    priority: 4,
    comingSoon: true
  },

  // 7. Video Analysis (Priority 5)
  {
    id: 'video-ai-prompt',
    category: 'video',
    label: 'Create AI Prompt',
    description: 'Tạo prompt tái tạo video',
    icon: Wand2,
    priority: 5
  },
  {
    id: 'video-extract-script',
    category: 'video',
    label: 'Extract Script',
    description: 'Trích xuất kịch bản chi tiết',
    icon: MessageSquare,
    priority: 5
  },
  {
    id: 'video-deep-analysis',
    category: 'video',
    label: 'Deep Analysis',
    description: 'Phân tích chiến lược marketing',
    icon: Search,
    priority: 5
  },
  {
    id: 'video-audit-thumbnail',
    category: 'video',
    label: 'Audit Thumbnail',
    description: 'Đánh giá & tối ưu thumbnail',
    icon: Target,
    priority: 5
  },
  {
    id: 'video-remake-post',
    category: 'video',
    label: 'Remake Post',
    description: 'Viết bài MXH từ video',
    icon: MessageSquare,
    priority: 5
  },
  {
    id: 'video-remake-script',
    category: 'video',
    label: 'Remake Script',
    description: 'Tạo kịch bản quay remake',
    icon: Video,
    priority: 5
  },
  {
    id: 'video-tiktok-script',
    category: 'video',
    label: 'TikTok Script',
    description: 'Kịch bản TikTok tối ưu từng giây',
    icon: Video,
    priority: 5
  },

  // 8. Travel (Priority 4)
  {
    id: 'travel-photo',
    category: 'travel',
    label: 'Travel Photo',
    description: 'Ghép ảnh du lịch (người + cảnh)',
    icon: Plane,
    priority: 4
  },
  {
    id: 'online-travel',
    category: 'travel',
    label: 'Online Travel Gen',
    description: 'Du lịch qua ảnh với địa danh nổi tiếng',
    icon: Globe,
    priority: 4
  },

  // 9. Audio (Priority 4)
  {
    id: 'text-to-speech',
    category: 'audio',
    label: 'Text to Speech',
    description: 'Chuyển văn bản thành giọng nói',
    icon: Mic,
    priority: 4,
    comingSoon: true
  },

  // 10. Analysis (Priority 4)
  {
    id: 'prompt-from-image',
    category: 'analysis',
    label: 'Prompt from Image',
    description: 'Lấy prompt từ hình ảnh có sẵn',
    icon: Search,
    priority: 4
  },
  {
    id: 'prompt-enhancement',
    category: 'analysis',
    label: 'Prompt Enhancement',
    description: 'Tối ưu hóa prompt của bạn',
    icon: Sparkles,
    priority: 4
  }
];

export const getFeaturesByCategory = (categoryId: StudioCategory) => {
  return STUDIO_FEATURES.filter(f => f.category === categoryId);
}

export const getFeatureById = (featureId: string) => {
  return STUDIO_FEATURES.find(f => f.id === featureId);
}
