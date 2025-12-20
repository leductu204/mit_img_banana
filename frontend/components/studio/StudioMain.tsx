"use client"

import React, { Suspense } from "react";
import StudioLayout from "@/components/studio/StudioLayout";
import { useSearchParams } from "next/navigation";
import { getFeatureById } from "@/lib/studio-config";
import { Loader2 } from "lucide-react";

// Lazy load feature components
const TextToImageForm = React.lazy(() => import('@/components/studio/features/TextToImageForm'));
const ImageEditorForm = React.lazy(() => import('@/components/studio/features/ImageEditorForm'));
const RemoveBackgroundForm = React.lazy(() => import('@/components/studio/features/RemoveBackgroundForm'));
const ChangeBackgroundForm = React.lazy(() => import('@/components/studio/features/ChangeBackgroundForm'));
const UpscaleImageForm = React.lazy(() => import('@/components/studio/features/UpscaleImageForm'));
const RestorePhotoForm = React.lazy(() => import('@/components/studio/features/RestorePhotoForm'));
const ExpandImageForm = React.lazy(() => import('@/components/studio/features/ExpandImageForm'));
const FestivalBackgroundsForm = React.lazy(() => import('@/components/studio/features/FestivalBackgroundsForm'));
const ProfileImageGeneratorForm = React.lazy(() => import('@/components/studio/features/ProfileImageGeneratorForm'));
const FaceSwapForm = React.lazy(() => import('@/components/studio/features/FaceSwapForm'));
const FashionStudioForm = React.lazy(() => import('@/components/studio/features/FashionStudioForm'));
const ExtractClothesForm = React.lazy(() => import('@/components/studio/features/ExtractClothesForm'));
const ProductPhotoshootForm = React.lazy(() => import('@/components/studio/features/ProductPhotoshootForm'));
const EcommercePhotoForm = React.lazy(() => import('@/components/studio/features/EcommercePhotoForm'));
const FaceOutfitForm = React.lazy(() => import('@/components/studio/features/FaceOutfitForm'));
const CombineProductForm = React.lazy(() => import('@/components/studio/features/CombineProductForm'));
const TravelPhotoForm = React.lazy(() => import('@/components/studio/features/TravelPhotoForm'));
const VideoAnalysisForm = React.lazy(() => import('@/components/studio/features/VideoAnalysisForm'));
const TextToSpeechForm = React.lazy(() => import('@/components/studio/features/TextToSpeechForm'));
const PromptEnhancementForm = React.lazy(() => import('@/components/studio/features/PromptEnhancementForm'));
const VideoGenerationForm = React.lazy(() => import('@/components/studio/features/VideoGenerationForm'));
const VideoIdeaForm = React.lazy(() => import('@/components/studio/features/VideoIdeaForm'));

// Placeholder for unimplemented features
const ComingSoon = ({ featureName }: { featureName: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Coming Soon: {featureName}</h3>
        <p>Tính năng này đang được phát triển và sẽ sớm ra mắt.</p>
    </div>
);

function StudioContent() {
    const searchParams = useSearchParams();
    const featureId = searchParams.get('feature') || 'text-to-image';
    const feature = getFeatureById(featureId);

    if (!feature) {
        return <div>Feature not found</div>;
    }

    // Dynamic component rendering
    const renderFeature = () => {
        switch (featureId) {
            // Priority 1
            case 'text-to-image': return <TextToImageForm />;
            case 'image-editor': return <ImageEditorForm />;
            case 'remove-bg': return <RemoveBackgroundForm />;
            case 'change-bg': return <ChangeBackgroundForm />;
            
            // Priority 2
            case 'upscale-image': return <UpscaleImageForm />;
            case 'restore-photo': return <RestorePhotoForm />;
            case 'expand-image': return <ExpandImageForm />;
            case 'festival-backgrounds': return <FestivalBackgroundsForm />;

            // Priority 3
            case 'profile-image-generator': return <ProfileImageGeneratorForm />;
            case 'face-swap': return <FaceSwapForm />;
            case 'fashion-studio': return <FashionStudioForm />;
            case 'extract-clothes': return <ExtractClothesForm />;
            case 'product-photoshoot': return <ProductPhotoshootForm />;
            case 'ecommerce-photo': return <EcommercePhotoForm />;

            // Priority 4 & 5
            case 'face-outfit-3-poses': return <FaceOutfitForm />;
            case 'combine-product': return <CombineProductForm />;
            case 'travel-photo': return <TravelPhotoForm />;
            case 'text-to-speech': return <TextToSpeechForm />;
            case 'prompt-enhancement': return <PromptEnhancementForm />;
            case 'text-to-video':
            case 'image-to-video':
                return <VideoGenerationForm />;
            case 'ad-creative':
            case 'video-idea':
                return <VideoIdeaForm />;
            
            // Video Analysis Group (7 modes)
            case 'video-ai-prompt':
            case 'video-extract-script':
            case 'video-deep-analysis':
            case 'video-audit-thumbnail':
            case 'video-remake-post':
            case 'video-remake-script':
            case 'video-tiktok-script':
                return <VideoAnalysisForm />;

            default:
                return <ComingSoon featureName={feature.label} />;
        }
    };

    return (
        <div className="h-full flex flex-col">
           <Suspense fallback={
               <div className="flex items-center justify-center h-full">
                   <Loader2 className="w-8 h-8 animate-spin text-primary" />
               </div>
           }>
               {renderFeature()}
           </Suspense>
        </div>
    );
}

export default function StudioMain() {
  return (
    <StudioLayout>
        <StudioContent />
    </StudioLayout>
  );
}
