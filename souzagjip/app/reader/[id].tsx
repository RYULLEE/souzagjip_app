import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  Linking,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Book, Theme, ThemeName, ViewMode, Page } from '../../types';

const { width, height } = Dimensions.get('window');

const THEMES: Record<ThemeName, Theme> = {
  light: {
    name: '라이트', icon: 'sunny-outline',
    bg: '#FFFEF9', text: '#1A1A1A', subText: '#555555',
    headerBg: '#FFFEF9', headerBorder: '#E8E0D0',
    settingsBg: '#FFFFFF', overlay: '#00000060',
  },
  sepia: {
    name: '세피아', icon: 'cafe-outline',
    bg: '#F5ECD7', text: '#3B2A1A', subText: '#7A5C3A',
    headerBg: '#F5ECD7', headerBorder: '#D4B896',
    settingsBg: '#FDF6EC', overlay: '#00000060',
  },
  dark: {
    name: '다크', icon: 'moon-outline',
    bg: '#1A1A2E', text: '#E8E0D0', subText: '#A09080',
    headerBg: '#16162A', headerBorder: '#2C2C4A',
    settingsBg: '#24243E', overlay: '#00000080',
  },
};

const ACCENT = '#C8973E';
const ACCENT_LIGHT = '#F5ECD7';
const FONT_SIZES: number[] = [12, 14, 16, 18, 20, 22, 24, 28, 32];
const LINE_HEIGHTS: number[] = [1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4];

// 단락 단위로 페이지 나누기 - numberOfLines로 렌더 시 잘림 처리
function buildPages(content: string, maxLines: number, charsPerLine: number): Page[] {
  const pages: Page[] = [];
  const paras = content.split(/\n+/).filter(p => p.trim());
  let currentParts: string[] = [];
  let usedLines = 0;

  const flush = () => {
    if (currentParts.length > 0) {
      pages.push({ type: 'text', text: currentParts.join('\n') });
      currentParts = [];
      usedLines = 0;
    }
  };

  paras.forEach(para => {
    const trimmed = para.trim();
    if (!trimmed) return;
    const paraLines = Math.ceil(trimmed.length / Math.max(1, charsPerLine));
    const gap = currentParts.length > 0 ? 1 : 0;
    if (usedLines + gap + paraLines > maxLines) {
      flush();
    }
    if (currentParts.length > 0) usedLines += 1;
    currentParts.push(trimmed);
    usedLines += paraLines;
  });
  flush();
  return pages;
}

export default function ReaderScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  // ── 모든 state/ref를 먼저 선언 ──
  const [book, setBook] = useState<Book | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [themeName, setThemeName] = useState<ThemeName>('light');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeightMult, setLineHeightMult] = useState<number>(1.6);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);

  const { bookmarks, toggleBookmark } = useAuth();
  const flatListRef = useRef<FlatList<Page>>(null);
  const swipeHintX = useRef(new Animated.Value(0)).current;
  const swipeHintOpacity = useRef(new Animated.Value(1)).current;

  const theme: Theme = THEMES[themeName];
  const bookmarked = book ? bookmarks.includes(book.id) : false;

  // ── 스와이프 힌트 애니메이션 ──
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(swipeHintX, { toValue: 8, duration: 500, useNativeDriver: true }),
        Animated.timing(swipeHintX, { toValue: -8, duration: 500, useNativeDriver: true }),
        Animated.timing(swipeHintX, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(800),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // ── 책 데이터 fetch ──
  useEffect(() => {
    if (!id) return;
    supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setBook(data as Book);
        setBookLoading(false);
      });
  }, [id]);

  const pages = useMemo<Page[]>(() => {
    const titlePage: Page = { type: 'title', title: book?.title ?? '' };
    if (!book?.content) return [titlePage];
    const lineH = fontSize * lineHeightMult;
    const usableH = pageHeight > 100 ? pageHeight : (height - (Platform.OS === 'android' ? 180 : 200));
    const maxLines = Math.max(5, Math.floor(usableH / lineH) - 1);
    const charsPerLine = Math.max(10, Math.floor((width - 52) / (fontSize * 1.0)));
    const textPages = buildPages(book.content, maxLines, charsPerLine);
    return [titlePage, ...textPages];
  }, [book, fontSize, lineHeightMult, pageHeight]);
  const totalPages = pages.length;

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      setCurrentPage(index);
    },
    []
  );

  const goToPage = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(index, totalPages - 1));
      flatListRef.current?.scrollToIndex({ index: target, animated: true });
      setCurrentPage(target);
    },
    [totalPages]
  );

  if (bookLoading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F0E8' }]}>
        <ActivityIndicator size="large" color="#C8973E" />
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>책을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const renderPage = ({ item, index }: ListRenderItemInfo<Page>): JSX.Element => {
    if (item.type === 'title') {
      const catColor = book?.category === '고전' ? '#8B6914' : book?.category === '해외' ? '#2E6EA6' : '#2E7D52';
      const catBg = book?.category === '고전' ? '#FFF3CD' : book?.category === '해외' ? '#E3F0FB' : '#E8F5E9';
      const cleanDesc = (book?.description || '')
        .split('\n').map((l: string) => l.trim())
        .filter((l: string) => l && !/^[\*\-\s]+$/.test(l) && !/^-?\d+-?$/.test(l))
        .join(' ').slice(0, 200).trim();
      return (
        <View style={[styles.pageSlide, { backgroundColor: theme.bg }]}>
          <View style={styles.titlePage}>
            {/* 상단 장식 */}
            <View style={[styles.titleTopAccent, { backgroundColor: catColor }]} />
            
            {/* 카테고리 배지 */}
            <View style={[styles.titleCatBadge, { backgroundColor: catBg }]}>
              <Text style={[styles.titleCatText, { color: catColor }]}>{book?.category}</Text>
            </View>

            {/* 제목 */}
            <Text style={[styles.titlePageText, { color: theme.text, fontSize: fontSize + 10 }]}>
              {book?.title}
            </Text>

            {/* 작가 */}
            {book?.author ? (
              <View style={styles.titleAuthorRow}>
                <View style={[styles.titleAuthorLine, { backgroundColor: catColor, opacity: 0.4 }]} />
                <Text style={[styles.authorPageText, { color: theme.subText, fontSize: fontSize }]}>
                  {book.author}
                </Text>
                <View style={[styles.titleAuthorLine, { backgroundColor: catColor, opacity: 0.4 }]} />
              </View>
            ) : null}

            {/* 설명 */}
            {cleanDesc ? (
              <Text style={[styles.descPageText, { color: theme.subText, fontSize: fontSize - 3, lineHeight: (fontSize - 3) * 1.8 }]}>
                {cleanDesc}
              </Text>
            ) : null}

            {/* 하단 시작 안내 - 애니메이션 (← 방향) */}
            <Animated.View style={[styles.titleStartHint, { opacity: swipeHintOpacity }]}>
              <Animated.View style={{ transform: [{ translateX: swipeHintX }] }}>
                <Ionicons name="chevron-back" size={16} color={catColor} />
              </Animated.View>
              <Text style={[styles.titleStartText, { color: theme.subText }]}>옆으로 넘겨 읽기 시작하세요</Text>
            </Animated.View>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.pageSlide, { backgroundColor: theme.bg }]}>
        <Text style={[styles.pageText, { color: theme.text, fontSize, lineHeight: fontSize * lineHeightMult }]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      {/* 상단 바 */}
      <View style={[styles.topBar, { backgroundColor: theme.headerBg, borderBottomColor: theme.headerBorder }]}>
        <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={[styles.topTitle, { color: theme.text }]} numberOfLines={1}>{book.title}</Text>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.topBtn} onPress={() => book && toggleBookmark(book.id)}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={bookmarked ? ACCENT : theme.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, settingsVisible && styles.topBtnActive]}
            onPress={() => setSettingsVisible(true)}
          >
            <Ionicons name="settings-outline" size={20} color={settingsVisible ? ACCENT : theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/*
        ★ 핵심 ★
        - windowSize={21}: 현재 페이지 기준 앞뒤 10페이지씩 미리 렌더링 → 넘길 때 이미 완성돼있음
        - initialNumToRender={5}: 처음에 5페이지 미리 렌더
        - maxToRenderPerBatch={5}: 한 번에 5개씩 백그라운드 렌더
        - removeClippedSubviews={false}: 화면 밖 페이지 언마운트 안 함 → 재렌더 없음
        - updateCellsBatchingPeriod={10}: 렌더 배치 간격 짧게
      */}
      <FlatList<Page>
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) setPageHeight(h - 28); // paddingTop20 + paddingBottom8
          }}
        ref={flatListRef}
        data={pages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        windowSize={21}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={10}
        removeClippedSubviews={false}
        style={{ flex: 1 }}
      />

      {/* 하단 네비게이션 */}
      <View style={[styles.bottomBar, { backgroundColor: theme.headerBg, borderTopColor: theme.headerBorder }]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => goToPage(currentPage - 1)} disabled={currentPage === 0}>
          <Ionicons name="chevron-back" size={22} color={currentPage === 0 ? theme.subText : theme.text} />
        </TouchableOpacity>
        <Text style={[styles.pageIndicator, { color: theme.subText }]}>{currentPage + 1} / {totalPages}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages - 1}>
          <Ionicons name="chevron-forward" size={22} color={currentPage === totalPages - 1 ? theme.subText : theme.text} />
        </TouchableOpacity>
      </View>

      {/* 설정 모달 */}
      <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay, paddingTop: Platform.OS === 'android' ? 80 : 60 }]}
          activeOpacity={1}
          onPress={() => setSettingsVisible(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.settingsPanel, { backgroundColor: theme.settingsBg }]}>
              <Text style={styles.settingLabel}>테마</Text>
              <View style={styles.themeRow}>
                {(Object.entries(THEMES) as [ThemeName, Theme][]).map(([key, t]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.themeBtn, themeName === key && styles.themeBtnActive]}
                    onPress={() => setThemeName(key)}
                  >
                    <Ionicons name={t.icon as any} size={22} color={themeName === key ? ACCENT : '#666'} />
                    <Text style={[styles.themeBtnLabel, themeName === key && { color: ACCENT }]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>글자 크기</Text>
                <View style={styles.settingBadge}><Text style={styles.settingBadgeText}>{fontSize}px</Text></View>
              </View>
              <View style={styles.sliderRow}>
                <Ionicons name="text" size={14} color="#888" />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={FONT_SIZES.length - 1}
                  step={1}
                  value={FONT_SIZES.indexOf(fontSize)}
                  onValueChange={(v: number) => setFontSize(FONT_SIZES[Math.round(v)])}
                  minimumTrackTintColor={ACCENT}
                  maximumTrackTintColor="#E0D8CC"
                  thumbTintColor={ACCENT}
                  tapToSeek
                />
                <Ionicons name="text" size={20} color="#888" />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>줄 간격</Text>
                <View style={styles.settingBadge}><Text style={styles.settingBadgeText}>{lineHeightMult.toFixed(1)}</Text></View>
              </View>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderEdgeText}>좁게</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={LINE_HEIGHTS.length - 1}
                  step={1}
                  value={LINE_HEIGHTS.indexOf(lineHeightMult)}
                  onValueChange={(v: number) => setLineHeightMult(LINE_HEIGHTS[Math.round(v)])}
                  minimumTrackTintColor={ACCENT}
                  maximumTrackTintColor="#E0D8CC"
                  thumbTintColor={ACCENT}
                  tapToSeek
                />
                <Text style={styles.sliderEdgeText}>넓게</Text>
              </View>

              <Text style={styles.settingLabel}>보기 모드</Text>
              <View style={styles.viewModeRow}>
                {(['single', 'double'] as ViewMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.viewModeBtn, viewMode === mode && styles.viewModeBtnActive]}
                    onPress={() => setViewMode(mode)}
                  >
                    <Ionicons
                      name={mode === 'single' ? 'phone-portrait-outline' : 'tablet-landscape-outline'}
                      size={16}
                      color={viewMode === mode ? ACCENT : '#888'}
                    />
                    <Text style={[styles.viewModeTxt, viewMode === mode && { color: ACCENT }]}>
                      {mode === 'single' ? '한 페이지' : '두 페이지'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.settingsDivider} />
              <TouchableOpacity
                style={styles.openDocBtn}
                onPress={() => { if (book.youtubeUrl) Linking.openURL(book.youtubeUrl); }}
              >
                <Text style={styles.openDocText}>원본 문서 열기</Text>
                <Ionicons name="open-outline" size={16} color={ACCENT} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1 },
  topBtn: { padding: 8, borderRadius: 8 },
  topBtnActive: { backgroundColor: ACCENT_LIGHT },
  topCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  topTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  topRight: { flexDirection: 'row', alignItems: 'center' },

  // ★ 페이지 슬라이드: 정확히 화면 너비 1개
  pageSlide: { width, flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  pageScroll: { flex: 1 },
  pageScrollContent: { paddingBottom: 20 },
  chapterNum: { marginBottom: 20, fontWeight: '600' },
  pageText: { textAlign: 'left', flexShrink: 1 },

  titlePage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  titleDecorLine: { width: 48, height: 3, backgroundColor: ACCENT, borderRadius: 2 },
  titlePageText: { fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  authorPageText: { fontWeight: '500', textAlign: 'center' },
  descPageText: { textAlign: 'center', lineHeight: 22, opacity: 0.8 },

  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 40, borderTopWidth: 1 },
  navBtn: { padding: 8 },
  pageIndicator: { fontSize: 13, fontWeight: '500' },

  modalOverlay: { flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 8 },
  settingsPanel: { width: width - 40, borderRadius: 20, padding: 20, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  settingLabel: { fontSize: 13, fontWeight: '700', color: '#555', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingBadge: { backgroundColor: '#2C2C4A', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  settingBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#E0D8CC', gap: 4, backgroundColor: '#F8F4ED' },
  themeBtnActive: { borderColor: ACCENT, backgroundColor: ACCENT_LIGHT },
  themeBtnLabel: { fontSize: 11, fontWeight: '600', color: '#666' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderEdgeText: { fontSize: 11, color: '#888', width: 28 },
  slider: { flex: 1, height: 40 },
  viewModeRow: { flexDirection: 'row', backgroundColor: '#2C2C4A', borderRadius: 12, padding: 3, gap: 2 },
  viewModeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, gap: 6 },
  viewModeBtnActive: { backgroundColor: '#3E3E60' },
  viewModeTxt: { color: '#888', fontSize: 13, fontWeight: '600' },
  settingsDivider: { height: 1, backgroundColor: '#E0D8CC', marginVertical: 4 },
  openDocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F0E8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  openDocText: { color: ACCENT, fontSize: 14, fontWeight: '600' },
});