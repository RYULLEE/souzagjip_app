export type BookCategory = '고전' | '현대' | '해외';

export interface Book {
  id: string;           // uuid
  title: string;
  author: string;
  description: string;
  youtube_url: string;
  has_video: boolean;
  pages: number;
  content: string;      // DB에서는 전체 텍스트 (string)
  category: BookCategory;
}

export type ThemeName = 'light' | 'sepia' | 'dark';

export interface Theme {
  name: string;
  icon: string;
  bg: string;
  text: string;
  subText: string;
  headerBg: string;
  headerBorder: string;
  settingsBg: string;
  overlay: string;
}

export type ViewMode = 'single' | 'double';

export interface Page {
  type: 'content' | 'toc';
  lines: string[];
  pageNum?: number;
}