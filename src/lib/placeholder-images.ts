
import data from '@/app/lib/placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  title?: string;
  series?: string;
  year?: string;
  medium?: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  tags?: string[];
  cropTop?: number;
  cropBottom?: number;
  cropLeft?: number;
  cropRight?: number;
  brightness?: number;
  featured?: boolean;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages as ImagePlaceholder[];
