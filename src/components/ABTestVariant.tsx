import React, { useEffect, useState } from 'react';
import {
  getAssignedVariant,
  trackABTestImpression,
  trackABTestClick,
  getABTest
} from '@/utils/abTestingService';

interface ABTestVariantProps {
  testId: string;
  variantId: string;
  children: React.ReactNode;
  onVisible?: () => void;
  onClick?: () => void;
}

/**
 * Renders content for a specific A/B test variant
 * Only shows if user is assigned to this variant
 */
export const ABTestVariant: React.FC<ABTestVariantProps> = ({
  testId,
  variantId,
  children,
  onVisible,
  onClick
}) => {
  const [isAssigned, setIsAssigned] = useState(false);

  useEffect(() => {
    try {
      const test = getABTest(testId);
      if (!test) return;

      const assigned = getAssignedVariant(testId, test.variants);
      const assigned_to_this = assigned === variantId;
      setIsAssigned(assigned_to_this);

      if (assigned_to_this) {
        trackABTestImpression(testId, variantId);
        onVisible?.();
      }
    } catch (error) {
      console.error('Error in ABTestVariant:', error);
    }
  }, [testId, variantId, onVisible]);

  if (!isAssigned) {
    return null;
  }

  const handleClick = () => {
    trackABTestClick(testId, variantId);
    onClick?.();
  };

  // If children is a function, call it with the click handler
  if (typeof children === 'function') {
    return <>{(children as any)(handleClick)}</>;
  }

  // Wrap children with click handler
  return (
    <div onClick={handleClick}>
      {children}
    </div>
  );
};

/**
 * Wrapper component to A/B test different button text/styles
 */
interface ABTestButtonProps {
  testId: string;
  variantId: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export const ABTestButton: React.FC<ABTestButtonProps> = ({
  testId,
  variantId,
  className = '',
  onClick,
  children
}) => {
  const [isAssigned, setIsAssigned] = useState(false);

  useEffect(() => {
    try {
      const test = getABTest(testId);
      if (!test) return;

      const assigned = getAssignedVariant(testId, test.variants);
      setIsAssigned(assigned === variantId);

      if (assigned === variantId) {
        trackABTestImpression(testId, variantId);
      }
    } catch (error) {
      console.error('Error in ABTestButton:', error);
    }
  }, [testId, variantId]);

  const handleClick = () => {
    trackABTestClick(testId, variantId);
    onClick?.();
  };

  if (!isAssigned) {
    return null;
  }

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
};

/**
 * Hook to get assigned variant for a test
 */
export function useABTestVariant(testId: string): string | null {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    try {
      const test = getABTest(testId);
      if (!test) return;

      const assigned = getAssignedVariant(testId, test.variants);
      setVariant(assigned);
    } catch (error) {
      console.error('Error in useABTestVariant:', error);
    }
  }, [testId]);

  return variant;
}
