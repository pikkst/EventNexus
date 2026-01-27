import React, { useEffect, useRef } from 'react';

const ADSENSE_CLIENT = 'ca-pub-3976076739536296';

type AdSlotProps = {
  slotId: string;
  className?: string;
  width?: number;
  height?: number;
};

export const AdSlot: React.FC<AdSlotProps> = ({ slotId, className, width = 160, height = 600 }) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!adRef.current || !slotId) return;
    try {
      const queue = (window as any).adsbygoogle || [];
      queue.push({});
      (window as any).adsbygoogle = queue;
    } catch (error) {
      console.warn('AdSense render error', error);
    }
  }, [slotId]);

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle block ${className || ''}`}
      style={{ display: 'block', width: `${width}px`, height: `${height}px` }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="false"
    />
  );
};

type AdRailsProps = {
  leftSlotId?: string;
  rightSlotId?: string;
};

export const AdRails: React.FC<AdRailsProps> = ({ leftSlotId, rightSlotId }) => {
  if (!leftSlotId && !rightSlotId) return null;

  return (
    <>
      {leftSlotId && (
        <div className="hidden xl:block fixed top-24 left-4 z-[600] pointer-events-none">
          <div className="pointer-events-auto drop-shadow-2xl">
            <AdSlot slotId={leftSlotId} />
          </div>
        </div>
      )}
      {rightSlotId && (
        <div className="hidden xl:block fixed top-24 right-4 z-[600] pointer-events-none">
          <div className="pointer-events-auto drop-shadow-2xl">
            <AdSlot slotId={rightSlotId} />
          </div>
        </div>
      )}
    </>
  );
};
