import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#F5F0E8', card: '#FFFFFF', primary: '#1A1A2E',
  accent: '#C8973E', accentLight: '#F5ECD7',
  text: '#2C2C2C', muted: '#9A9A9A', border: '#E8E0D0',
  danger: '#E05252', dangerLight: '#FDF0F0',
};

export default function ProfileScreen(): JSX.Element {
  const { user, bookmarks, toggleBookmark, signOut, isGuest, session } = useAuth();

  const displayName = useMemo(() => {
    if (!user) return '독자';
    return user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? '독자';
  }, [user]);

  const avatarLetter = displayName.charAt(0).toUpperCase();

  const provider = useMemo(() => {
    const p = user?.app_metadata?.provider;
    if (p === 'kakao') return '카카오';
    if (p === 'google') return 'Google';
    return '소셜';
  }, [user]);

  const joinedAt = useMemo(() => {
    if (!user?.created_at) return '';
    const d = new Date(user.created_at);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 가입`;
  }, [user]);

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => { await signOut(); router.replace('/login'); } },
    ]);
  };

  const [totalBooks, setTotalBooks] = useState(104);
  useEffect(() => {
    supabase.from('books').select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (count) setTotalBooks(count); });
  }, []);

  // 북마크된 책 제목/작가 가져오기
  const [bookmarkedBooks, setBookmarkedBooks] = useState<{id: string, title: string, author: string, pages: number}[]>([]);
  useEffect(() => {
    if (bookmarks.length === 0) { setBookmarkedBooks([]); return; }
    supabase.from('books').select('id, title, author, pages').in('id', bookmarks)
      .then(({ data }) => { if (data) setBookmarkedBooks(data as any); });
  }, [bookmarks]);

  if (isGuest && !session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person-outline" size={40} color="#C8973E" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A2E' }}>비회원</Text>
          <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>{'로그인하면 북마크, 읽기 기록 등\n다양한 기능을 이용할 수 있어요.'}</Text>
          <TouchableOpacity
            style={{ backgroundColor: '#1A1A2E', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 }}
            onPress={() => router.replace('/login')}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>로그인 / 회원가입</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* 상단 바 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>내 서재</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── 프로필 카드 ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardHeader} />
          <View style={styles.profileCardBody}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
              <View style={styles.providerDot}>
                <Text style={styles.providerDotText}>{provider[0]}</Text>
              </View>
            </View>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
            <Text style={styles.joinedAt}>{joinedAt}</Text>
            <View style={styles.providerTag}>
              <Ionicons name="shield-checkmark-outline" size={11} color={COLORS.accent} />
              <Text style={styles.providerTagText}>{provider} 계정</Text>
            </View>
          </View>
        </View>

        {/* ── 통계 3칸 ── */}
        <View style={styles.statsRow}>
          {[
            { icon: 'bookmark', val: String(bookmarks.length), label: '북마크' },
            { icon: 'library-outline', val: String(totalBooks), label: '전체 도서' },
            { icon: 'time-outline', val: bookmarks.length > 0 ? '독서중' : '시작 전', label: '상태' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Ionicons name={s.icon as any} size={18} color={COLORS.accent} />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.statDiv} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── 북마크 목록 ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Ionicons name="bookmark" size={15} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>북마크한 도서</Text>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{bookmarks.length}</Text></View>
          </View>

          {bookmarkedBooks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="bookmark-outline" size={38} color={COLORS.border} />
              <Text style={styles.emptyTitle}>북마크한 도서가 없어요</Text>
              <Text style={styles.emptySub}>읽기 화면 상단의 책갈피를 눌러보세요</Text>
              <TouchableOpacity style={styles.goBtn} onPress={() => router.back()}>
                <Text style={styles.goBtnText}>도서관으로 가기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bookmarkList}>
              {bookmarkedBooks.map(book => (
                <TouchableOpacity
                  key={book.id}
                  style={styles.bookmarkCard}
                  onPress={() => router.push(`/reader/${book.id}`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.bookmarkBar} />
                  <View style={styles.bookmarkBody}>
                    <View style={styles.bookmarkText}>
                      <Text style={styles.bookmarkTitle} numberOfLines={1}>{book.title}</Text>
                      <Text style={styles.bookmarkAuthor}>{book.author} · {book.pages}쪽</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleBookmark(book.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="bookmark" size={20} color={COLORS.accent} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── 앱 설정 메뉴 ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Ionicons name="grid-outline" size={15} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>앱 설정</Text>
          </View>
          <View style={styles.menuCard}>
            {[
              { icon: 'notifications-outline', label: '알림 설정', right: null },
              { icon: 'heart-outline', label: '후원하기', right: null },
              { icon: 'information-circle-outline', label: '앱 버전', right: 'v1.0.0' },
              { icon: 'document-text-outline', label: '이용약관', right: null },
            ].map((item, i, arr) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity style={styles.menuItem}>
                  <View style={styles.menuIconBg}>
                    <Ionicons name={item.icon as any} size={17} color={COLORS.accent} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.right
                    ? <Text style={styles.menuRight}>{item.right}</Text>
                    : <Ionicons name="chevron-forward" size={15} color={COLORS.muted} />
                  }
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={styles.menuDiv} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── 로그아웃 ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.82}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 0 },
  scroll: { paddingBottom: 20 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  backBtn: { padding: 6 },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.primary },

  /* 프로필 카드 */
  profileCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: COLORS.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 5 },
  profileCardHeader: { height: 72, backgroundColor: '#E8D5B0' },
  profileCardBody: { alignItems: 'center', paddingBottom: 24, paddingHorizontal: 20 },
  avatarWrap: { marginTop: -34, marginBottom: 10, position: 'relative' },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: COLORS.card },
  avatarLetter: { fontSize: 28, fontWeight: '800', color: '#fff' },
  providerDot: { position: 'absolute', bottom: 1, right: 1, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.card },
  providerDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  displayName: { fontSize: 20, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3 },
  userEmail: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  joinedAt: { fontSize: 11, color: COLORS.muted, marginTop: 3, opacity: 0.7 },
  providerTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.accentLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12 },
  providerTagText: { fontSize: 11, color: COLORS.accent, fontWeight: '600' },

  /* 통계 */
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, backgroundColor: COLORS.card, borderRadius: 16, paddingVertical: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center', gap: 5 },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  statDiv: { width: 1, backgroundColor: COLORS.border, marginVertical: 6 },

  /* 섹션 공통 */
  section: { marginHorizontal: 16, marginTop: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.primary },
  sectionBadge: { backgroundColor: COLORS.accentLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 12, color: COLORS.accent, fontWeight: '700' },

  /* 북마크 */
  bookmarkList: { gap: 8 },
  bookmarkCard: { backgroundColor: COLORS.card, borderRadius: 14, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  bookmarkBar: { width: 4, backgroundColor: COLORS.accent },
  bookmarkBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  bookmarkText: { flex: 1 },
  bookmarkTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  bookmarkAuthor: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  /* 빈 북마크 */
  emptyBox: { backgroundColor: COLORS.card, borderRadius: 16, alignItems: 'center', paddingVertical: 36, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  emptySub: { fontSize: 13, color: COLORS.muted },
  goBtn: { marginTop: 8, backgroundColor: COLORS.accentLight, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.accent },
  goBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },

  /* 메뉴 */
  menuCard: { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.accentLight, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuRight: { fontSize: 13, color: COLORS.muted },
  menuDiv: { height: 1, backgroundColor: COLORS.border, marginLeft: 60 },

  /* 로그아웃 */
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, backgroundColor: COLORS.dangerLight, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#F5CCCC' },
  signOutText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
});