import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, Animated, Linking,
  ListRenderItemInfo, ActivityIndicator, Image,
  Modal, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Book, BookCategory } from '../types';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  bg: '#F5F0E8', card: '#FFFFFF', primary: '#1A1A2E',
  accent: '#C8973E', accentLight: '#F5ECD7',
  text: '#2C2C2C', textMuted: '#888888', border: '#E8E0D0',
} as const;

type FilterType = '전체' | BookCategory;
const FILTERS: FilterType[] = ['전체', '현대', '고전', '해외'];

// ── 후원 모달 ──────────────────────────────────────────────
function SupportModal({ visible, onClose }: { visible: boolean; onClose: () => void }): JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[modal.overlay, { paddingTop: Platform.OS === 'android' ? 24 : 0 }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={modal.sheet}>
          <View style={modal.handle} />
          <View style={modal.header}>
            <Text style={modal.title}>한국문학도서관을 응원해 주세요</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={modal.body}>
              무료로 제공되는 이 문학도서관은 개인의 노력으로 운영되고 있습니다.{'\n\n'}
              서버 유지비와 자료 정리를 위한 후원은 자발적으로만 받고 있으며, 후원금은 사이트 운영 및 한국문학 자료 보존에 사용됩니다.
            </Text>
            <Text style={modal.accent}>*후원은 자율적이며, 어떠한 대가나 특별 서비스가 제공되지 않습니다.</Text>
            <View style={modal.bankBox}>
              <Text style={modal.bankTitle}>후원 방법</Text>
              <Text style={modal.bankRow}>카카오뱅크  <Text style={modal.bankBold}>3333-29-8406357</Text></Text>
              <Text style={modal.bankRow}>예금주  <Text style={modal.bankBold}>홍기환</Text></Text>
            </View>
            <Text style={modal.contact}>문의: <Text style={modal.contactLink}>tassy@naver.com</Text></Text>
            <Text style={modal.body}>감사합니다.{'\n'}여러분의 관심이 한국문학의 지속적인 보존과 확산에 큰 힘이 됩니다.{'\n\n'}<Text style={modal.boldText}>이도출판 대표 홍기환</Text></Text>
            <View style={modal.disclaimer}>
              <Text style={modal.disclaimerText}>※ 본 페이지의 후원금은 「기부금품법」 상의 법정 기부금이 아닌, 운영자 개인에 대한 자발적 후원금으로 세제공제 대상이 아닙니다.</Text>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// 목록 미리보기용 description 정제 (*, -숫자-, 공백줄 제거)
function cleanPreview(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^[\*\-\d\s]+$/.test(l) && !/^-?\d+-?$/.test(l))
    .join(' ')
    .slice(0, 120)
    .trim();
}

// ── 리스트 아이템 ─────────────────────────────────────────
interface ListItemProps { book: Book; isBookmarked: boolean; onPress: () => void; }

function ListItem({ book, isBookmarked, onPress }: ListItemProps): JSX.Element {
  const catColor = book.category === '고전' ? '#8B6914' : book.category === '해외' ? '#2E6EA6' : '#2E7D52';
  return (
    <TouchableOpacity style={listStyles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[listStyles.accent, { backgroundColor: catColor }]} />
      <View style={listStyles.info}>
        <Text style={listStyles.title} numberOfLines={1}>{book.title}</Text>
        {book.author ? <Text style={listStyles.author} numberOfLines={1}>{book.author}</Text> : null}
      </View>
      {isBookmarked && <Ionicons name="bookmark" size={13} color={COLORS.accent} style={{ marginRight: 8 }} />}
      <TouchableOpacity style={listStyles.btn} onPress={onPress} activeOpacity={0.85}>
        <Text style={listStyles.btnText}>읽기</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const listStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 3, borderRadius: 12, paddingVertical: 10, paddingRight: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  accent: { width: 4, alignSelf: 'stretch', marginRight: 12, borderRadius: 2 },
  info: { flex: 1, justifyContent: 'center', gap: 2 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },
  author: { fontSize: 12, color: COLORS.textMuted },
  btn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ── 책 카드 ────────────────────────────────────────────────
interface BookCardProps { book: Book; isBookmarked: boolean; onPress: () => void; }

function BookCard({ book, isBookmarked, onPress }: BookCardProps): JSX.Element {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();

  const catColor = book.category === '고전' ? '#8B6914' : book.category === '해외' ? '#2E6EA6' : '#2E7D52';
  const catBg = book.category === '고전' ? '#FFF3CD' : book.category === '해외' ? '#E3F0FB' : '#E8F5E9';

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={styles.card}>
        <View style={[styles.cardAccentBar, { backgroundColor: catColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
            {book.author ? <Text style={styles.authorTag}>{book.author}</Text> : null}
            {isBookmarked && <Ionicons name="bookmark" size={13} color={COLORS.accent} />}
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.catBadge, { backgroundColor: catBg }]}>
              <Text style={[styles.catBadgeText, { color: catColor }]}>{book.category}</Text>
            </View>
          </View>
          {cleanPreview(book.description) ? (
            <Text style={styles.bookDesc} numberOfLines={2}>{cleanPreview(book.description)}</Text>
          ) : null}
          <TouchableOpacity style={styles.btnRead} onPress={onPress} activeOpacity={0.85}>
            <Ionicons name="book-outline" size={16} color="#fff" />
            <Text style={styles.btnReadText}>읽기</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── 홈 스크린 ──────────────────────────────────────────────
export default function HomeScreen(): JSX.Element {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('전체');
  const [supportVisible, setSupportVisible] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { session, loading, bookmarks, isGuest } = useAuth();

  useEffect(() => {
    if (!loading && !session && !isGuest) router.replace('/login');
  }, [session, loading, isGuest]);

  // 수파베이스에서 책 목록 불러오기
  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      let q = supabase
        .from('books')
        .select('id, title, author, description, category, pages, youtube_url, has_video')
        .order('title');

      if (activeFilter !== '전체') {
        q = q.eq('category', activeFilter);
      }
      if (query.trim()) {
        q = q.or(`title.ilike.%${query.trim()}%,author.ilike.%${query.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      setBooks((data as Book[]) ?? []);
    } catch (e) {
      console.error('책 불러오기 실패:', e);
    } finally {
      setLoadingBooks(false);
    }
  }, [activeFilter, query]);

  useEffect(() => {
    if (session || isGuest) fetchBooks();
  }, [session, isGuest, fetchBooks]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <SupportModal visible={supportVisible} onClose={() => setSupportVisible(false)} />

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Image source={require('../assets/images/lib_logo.png')} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.appTitle}>한국문학도서관</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setSupportVisible(true)}>
          <Text style={styles.headerSub}>
            한국문화도서관은 여러분의 후원과 구독으로 운영됩니다.{' '}
            <Text style={styles.headerLink}>자세히 보기</Text>
          </Text>
        </TouchableOpacity>

        {/* 검색 */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="도서명 또는 작가 검색..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* 필터 탭 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {FILTERS.map(f => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.resultRow}>
          <Text style={styles.resultCount}>
            {activeFilter !== '전체' ? `${activeFilter} · ` : ''}{books.length}권
            {query ? '의 검색 결과' : ''}
          </Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity onPress={() => setViewMode('card')} style={[styles.toggleBtn, viewMode === 'card' && styles.toggleBtnActive]}>
              <Ionicons name="grid-outline" size={17} color={viewMode === 'card' ? '#fff' : COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('list')} style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}>
              <Ionicons name="list-outline" size={17} color={viewMode === 'list' ? '#fff' : COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loadingBooks ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList<Book>
          data={books}
          keyExtractor={item => item.id}
          renderItem={({ item }: ListRenderItemInfo<Book>) =>
            viewMode === 'card'
              ? <BookCard book={item} isBookmarked={bookmarks.includes(item.id)} onPress={() => router.push(`/reader/${item.id}`)} />
              : <ListItem book={item} isBookmarked={bookmarks.includes(item.id)} onPress={() => router.push(`/reader/${item.id}`)} />
          }
          contentContainerStyle={viewMode === 'card' ? styles.listContent : styles.listContentCompact}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  appTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  iconBtn: { padding: 6 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12, lineHeight: 18 },
  headerLink: { color: COLORS.accent, textDecorationLine: 'underline' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, height: 46, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  filterScroll: { marginBottom: 10 },
  filterContent: { gap: 8, paddingRight: 4 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#EDE8DF' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  filterChipTextActive: { color: '#fff' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  resultCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  viewToggle: { flexDirection: 'row', gap: 4 },
  toggleBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE8DF' },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, gap: 12 },
  listContentCompact: { paddingTop: 8, paddingBottom: 32 },
  cardWrapper: { borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, flexDirection: 'row', overflow: 'hidden' },
  cardAccentBar: { width: 4 },
  cardContent: { flex: 1, padding: 16, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  bookTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3, flexShrink: 1 },
  authorTag: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  bookDesc: { fontSize: 13.5, color: COLORS.text, lineHeight: 20, opacity: 0.8 },
  btnRead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, gap: 6, marginTop: 4 },
  btnReadText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0D4C0', alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', flex: 1, letterSpacing: -0.3 },
  closeBtn: { padding: 4 },
  body: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 16 },
  accent: { fontSize: 13, color: '#C8973E', fontWeight: '600', marginBottom: 16, lineHeight: 20 },
  bankBox: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, marginBottom: 16, gap: 6 },
  bankTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  bankRow: { fontSize: 14, color: '#555' },
  bankBold: { fontWeight: '700', color: '#1A1A2E' },
  contact: { fontSize: 13, color: '#666', marginBottom: 16 },
  contactLink: { color: '#C8973E' },
  boldText: { fontWeight: '700', color: '#1A1A2E' },
  disclaimer: { backgroundColor: '#F5F0E8', borderRadius: 10, padding: 14, marginTop: 8, marginBottom: 8 },
  disclaimerText: { fontSize: 11, color: '#888', lineHeight: 18 },
});