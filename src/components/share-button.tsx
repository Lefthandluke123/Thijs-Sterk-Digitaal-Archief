
"use client";

import React, { useState } from 'react';
import { Facebook, Share2, Loader2, Check } from 'lucide-react';
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
 * @fileOverview Slimme deel-component die switcht tussen native share en Facebook fallback.
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
        // Gebruiker heeft mogelijk geannuleerd of er is een beperking
        if ((error as Error).name !== 'AbortError') {
          console.error('Native share failed:', error);
        }
      }
    }

    // 2. Fallback naar Facebook popup
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500,location=no,menubar=no,status=no,toolbar=no');
    
    setIsSharing(false);
    toast({
      title: "Deelvenster geopend",
      description: "U kunt het werk nu delen op uw tijdlijn.",
    });
  };

  const copyToClipboard = () => {
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
        className="rounded-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold uppercase tracking-widest text-[10px] h-12 px-6 shadow-xl transition-all hover:scale-105 active:scale-95"
      >
        {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4 mr-2" />}
        Deel op Facebook
      </Button>
      
      <Button
        variant="outline"
        onClick={copyToClipboard}
        className="rounded-full border-2 h-12 w-12 p-0 bg-white/10 backdrop-blur-md hover:bg-white/20 border-white/20 transition-all"
        title="Kopieer Link"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
      </Button>
    </div>
  );
}
