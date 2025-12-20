"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudioCategory, StudioFeature, STUDIO_FEATURES, getFeatureById, STUDIO_CATEGORIES } from '@/lib/studio-config';

interface StudioContextType {
  currentCategory: StudioCategory;
  currentFeature: StudioFeature | null;
  setCategory: (category: StudioCategory) => void;
  setFeature: (featureId: string) => void;
  selectedHistoryJob: any | null;
  setSelectedHistoryJob: (job: any | null) => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentCategory, setCurrentCategory] = useState<StudioCategory>('create');
  const [currentFeature, setCurrentFeature] = useState<StudioFeature | null>(null);
  const [selectedHistoryJob, setSelectedHistoryJob] = useState<any | null>(null);

  // Sync state with URL params
  useEffect(() => {
    const featureId = searchParams.get('feature');
    const categoryId = searchParams.get('category') as StudioCategory;

    if (featureId) {
      const feature = getFeatureById(featureId);
      if (feature) {
        setCurrentFeature(feature);
        setCurrentCategory(feature.category);
      }
    } else if (categoryId && STUDIO_CATEGORIES.some(c => c.id === categoryId)) {
      setCurrentCategory(categoryId);
      // Optional: select first feature of category
    } else {
      // Default state
      const defaultFeature = STUDIO_FEATURES[0]; // Text to Image
      setCurrentFeature(defaultFeature);
      setCurrentCategory(defaultFeature.category);
    }
  }, [searchParams]);

  const setCategory = (category: StudioCategory) => {
    setCurrentCategory(category);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('category', category);
    // Don't remove feature param immediately, or maybe do? 
    // Let's clear feature if it doesn't belong to new category
    if (currentFeature && currentFeature.category !== category) {
      newParams.delete('feature');
    }
    router.push(`/studio?${newParams.toString()}`);
  };

  const setFeature = (featureId: string) => {
    const feature = getFeatureById(featureId);
    if (feature) {
      setCurrentFeature(feature);
      setCurrentCategory(feature.category);
      
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('feature', featureId);
      newParams.set('category', feature.category);
      router.push(`/studio?${newParams.toString()}`);
    }
  };

  return (
    <StudioContext.Provider value={{ currentCategory, currentFeature, setCategory, setFeature, selectedHistoryJob, setSelectedHistoryJob }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}
