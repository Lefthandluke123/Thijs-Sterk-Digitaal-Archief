"use client";

import React, { useState } from 'react';
import { Share2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ShareButtonProps {
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
  className?: string;
}

/**
 * @fileOverview Subtiele deel-component die switcht tussen native share en universele fallback.
 * De 'lelijke' blauwe branded knop is verwijderd voor een museale uitstraling.
 */
export function ShareButton({ title, description, url, className }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    
    // 1. Probeer Native Share (iOS/Android)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description || `Bekijk dit werk van Thijs Sterk: ${title}`,
          url: url,
        });
        setIsSharing(false);
        return;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Native share failed:', error);
        }
      }
    }

    // 2. Fallback naar Facebook popup (discreet via icon)
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500,location=no,menubar=no,status=no,toolbar=no');
    
    setIsSharing(false);
    toast({
      title: "Deelopties geopend",
      description: "U kunt de link nu delen.",
    });
  };

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link gekopieerd!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button 
        onClick={handleShare}
        disabled={isSharing}
        className="rounded-full border-2 h-12 w-12 p-0 bg-white/10 backdrop-blur-md hover:bg-white/20 border-white/20 transition-all shadow-xl"
        title="Deel dit werk"
      >
        {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
      </Button>
      
      <Button
        variant="ghost"
        onClick={copyToClipboard}
        className={cn(
          "rounded-full h-12 px-4 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all",
          copied && "text-green-400"
        )}
      >
        {copied ? <Check className="w-3 h-3 mr-2" /> : null}
        {copied ? "Gekopieerd" : "Kopieer Link"}
      </Button>
    </div>
  );
}
