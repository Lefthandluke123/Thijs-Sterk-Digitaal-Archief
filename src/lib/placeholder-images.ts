
import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  title?: string;
  series?: string;
  year?: string;
  medium?: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages as ImagePlaceholder[];
