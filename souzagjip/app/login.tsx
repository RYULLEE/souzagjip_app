import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert, Animated, Image,
  TextInput, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Modal } from 'react-native';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#F5F0E8', primary: '#1A1A2E', accent: '#C8973E',
  accentLight: '#F5ECD7', muted: '#999', white: '#FFFFFF',
  kakao: '#FEE500', kakaoText: '#191919',
  border: '#E0D4C0', inputBg: '#FDFAF5',
  error: '#E05252',
};

const BOOKS = [
  { title: '메밀꽃 필 무렵', delay: 0 },
  { title: '소나기', delay: 120 },
  { title: '님의 침묵', delay: 240 },
  { title: '진달래꽃', delay: 360 },
];

function FloatingCard({ title, index, delay }: { title: string; index: number; delay: number }): JSX.Element {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: delay + 400, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -7, duration: 1800 + index * 200, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: 1800 + index * 200, useNativeDriver: true }),
        ])
      ).start();
    }, delay + 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.previewCard, { opacity: fadeAnim, transform: [{ rotate: `${index % 2 === 0 ? -(index + 1) : (index + 1)}deg` }, { translateY: floatAnim }] }]}>
      <View style={styles.previewCardBar} />
      <Text style={styles.previewCardText}>{title}</Text>
    </Animated.View>
  );
}

export default function LoginScreen(): JSX.Element {
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const { session, enterAsGuest } = useAuth();

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (session) router.replace('/');
  }, [session]);

  // ── 이메일 로그인 ──
  const handleEmailLogin = async () => {
    if (!email.trim()) return Alert.alert('이메일을 입력해주세요.');
    if (!password) return Alert.alert('비밀번호를 입력해주세요.');
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('Invalid login')) Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
      else if (msg.includes('Email not confirmed')) Alert.alert('이메일 인증 필요', '가입 시 받은 인증 메일을 확인해주세요.');
      else Alert.alert('로그인 오류', msg);
    } finally {
      setEmailLoading(false);
    }
  };

  // ── OAuth ──
  const handleOAuth = async (provider: 'kakao' | 'google') => {
    setOauthLoading(provider);
    try {
      const redirectUrl = 'souzagjip://oauth-callback';
      const scopes = provider === 'kakao' ? 'profile_nickname profile_image' : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'https://eqqixsdgyzvuabgjiiyv.supabase.co/auth/v1/callback',
          skipBrowserRedirect: true,
          queryParams: { redirect_to: redirectUrl },
          scopes,
        },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const raw = result.url;
          const part = raw.includes('#') ? raw.split('#')[1] : (raw.split('?')[1] ?? '');
          const params = new URLSearchParams(part);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' });
          }
        }
      }
    } catch (e: any) {
      Alert.alert('로그인 오류', e?.message ?? '다시 시도해주세요.');
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 히어로 */}
          <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            <View style={styles.logoOuter}>
              <Image source={require('../assets/images/lib_logo.png')} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.appName}>한국문학도서관</Text>
            <Text style={styles.tagline}>{'한국의 아름다운 문학을\n언제 어디서나'}</Text>
            <View style={styles.dividerRow}>
              <View style={styles.divLine} /><View style={styles.divDot} /><View style={styles.divLine} />
            </View>
          </Animated.View>

          {/* 떠다니는 카드 - 한 줄 */}
          <View style={styles.cards}>
            {BOOKS.map((b, i) => <FloatingCard key={b.title} title={b.title} index={i} delay={b.delay} />)}
          </View>

          {/* ── 이메일 로그인 폼 ── */}
          <View style={styles.emailSection}>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor={COLORS.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="비밀번호 (6자 이상)"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.emailLoginBtn} onPress={handleEmailLogin} activeOpacity={0.88} disabled={emailLoading}>
              {emailLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.emailLoginBtnText}>로그인</Text>
              }
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <TouchableOpacity onPress={() => router.push('/signup')} style={styles.bottomRowBtn}>
                <Text style={styles.signupText}>계정이 없으신가요? </Text>
                <Text style={styles.signupLink}>회원가입</Text>
              </TouchableOpacity>
              <View style={styles.bottomRowDivider} />
              <TouchableOpacity onPress={() => setGuestModalVisible(true)} style={styles.bottomRowBtn}>
                <Text style={styles.guestInlineText}>비회원 입장</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 구분선 */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>또는</Text>
            <View style={styles.orLine} />
          </View>

          {/* 소셜 버튼들 */}
          <View style={styles.socialSection}>
            {/* 카카오 */}
            <TouchableOpacity style={styles.kakaoBtn} onPress={() => handleOAuth('kakao')} activeOpacity={0.88} disabled={oauthLoading !== null}>
              {oauthLoading === 'kakao'
                ? <ActivityIndicator color={COLORS.kakaoText} />
                : <>
                    <View style={styles.kakaoIcon}><Text style={styles.kakaoIconText}>K</Text></View>
                    <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
                    <View style={{ width: 46 }} />
                  </>
              }
            </TouchableOpacity>

            {/* 구글 */}
            <TouchableOpacity style={styles.googleBtn} onPress={() => handleOAuth('google')} activeOpacity={0.88} disabled={oauthLoading !== null}>
              {oauthLoading === 'google'
                ? <ActivityIndicator color="#3C4043" />
                : <>
                    <View style={styles.googleIcon}><Text style={styles.googleIconText}>G</Text></View>
                    <Text style={styles.googleBtnText}>Google로 계속하기</Text>
                    <View style={{ width: 46 }} />
                  </>
              }
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>{'로그인 시 서비스 이용약관 및 개인정보처리방침에\n동의하는 것으로 간주됩니다.'}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    {/* 비회원 안내 모달 */}
    <Modal visible={guestModalVisible} transparent animationType="fade" onRequestClose={() => setGuestModalVisible(false)}>
      <View style={styles.guestOverlay}>
        <View style={styles.guestSheet}>
          <View style={styles.guestIconWrap}>
            <Ionicons name="person-outline" size={36} color="#C8973E" />
          </View>
          <Text style={styles.guestTitle}>비회원으로 입장</Text>
          <Text style={styles.guestBody}>
            {'비회원으로 모든 도서를 읽을 수 있어요.\n\n단, 아래 기능은 로그인 후 이용 가능해요:'}
          </Text>
          <View style={styles.guestLimitBox}>
            <View style={styles.guestLimitRow}><Ionicons name="bookmark-outline" size={16} color="#888" /><Text style={styles.guestLimitText}>북마크 저장</Text></View>
            <View style={styles.guestLimitRow}><Ionicons name="bar-chart-outline" size={16} color="#888" /><Text style={styles.guestLimitText}>읽은 위치 저장</Text></View>
            <View style={styles.guestLimitRow}><Ionicons name="person-circle-outline" size={16} color="#888" /><Text style={styles.guestLimitText}>프로필 및 설정</Text></View>
          </View>
          <TouchableOpacity style={styles.guestConfirmBtn} onPress={() => { setGuestModalVisible(false); enterAsGuest(); router.replace('/'); }} activeOpacity={0.85}>
            <Text style={styles.guestConfirmText}>비회원으로 계속</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestCancelBtn} onPress={() => setGuestModalVisible(false)}>
            <Text style={styles.guestCancelText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 0 },
  circle: { position: 'absolute', borderRadius: 999 },
  circle1: { width: 300, height: 300, backgroundColor: COLORS.accent, opacity: 0.12, top: -100, right: -80 },
  circle2: { width: height * 0.45, height: height * 0.45, backgroundColor: COLORS.primary, opacity: 0.09, bottom: -height * 0.1, left: -height * 0.12 },
  circle3: { width: 130, height: 130, backgroundColor: COLORS.accent, opacity: 0.1, bottom: 180, right: -30 },

  scrollContent: { paddingHorizontal: 28, paddingTop: 52, paddingBottom: 40, gap: 0 },

  hero: { alignItems: 'center', gap: 10, marginBottom: 16 },
  logoOuter: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10, borderWidth: 3, borderColor: COLORS.primary },
  logoImage: { width: '100%', height: '100%' },
  appName: { fontSize: 26, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.8 },
  tagline: { fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 23 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '60%' },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.accent, opacity: 0.35 },
  divDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent, opacity: 0.6 },

  cards: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16, marginTop: 10 },
  previewCard: { backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewCardBar: { width: 3, height: 16, backgroundColor: COLORS.accent, borderRadius: 2 },
  previewCardText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // 이메일 폼
  emailSection: { gap: 8, marginBottom: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.primary },
  eyeBtn: { padding: 4 },
  emailLoginBtn: { marginBottom: 0, backgroundColor: COLORS.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  emailLoginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: -0.3 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 4 },
  signupText: { fontSize: 14, color: COLORS.muted },
  signupLink: { fontSize: 14, color: COLORS.accent, fontWeight: '700' },

  // 구분선
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { fontSize: 13, color: COLORS.muted, fontWeight: '500' },

  // 소셜
  socialSection: { gap: 10, marginBottom: 20 },
  kakaoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.kakao, borderRadius: 14, height: 52, paddingHorizontal: 16, shadowColor: '#D4B800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  kakaoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.13)', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  kakaoIconText: { color: COLORS.kakao, fontWeight: '900', fontSize: 16 },
  kakaoBtnText: { flex: 1, textAlign: 'center', color: COLORS.kakaoText, fontWeight: '700', fontSize: 15, letterSpacing: -0.3 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderRadius: 14, height: 52, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#DADCE0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  googleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  googleIconText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  googleBtnText: { flex: 1, textAlign: 'center', color: '#3C4043', fontWeight: '600', fontSize: 15, letterSpacing: -0.3 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 4 },
  bottomRowBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  bottomRowDivider: { width: 1, height: 14, backgroundColor: '#DDD', marginHorizontal: 4 },
  guestInlineText: { fontSize: 14, color: '#C8973E', fontWeight: '600' },
  guestOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  guestSheet: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center' },
  guestIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF8EC', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  guestTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 12, letterSpacing: -0.3 },
  guestBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  guestLimitBox: { width: '100%', backgroundColor: '#F5F0E8', borderRadius: 12, padding: 16, gap: 10, marginBottom: 24 },
  guestLimitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestLimitText: { fontSize: 14, color: '#666' },
  guestConfirmBtn: { width: '100%', backgroundColor: '#1A1A2E', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  guestConfirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  guestCancelBtn: { paddingVertical: 8 },
  guestCancelText: { fontSize: 14, color: '#C8973E', fontWeight: '600' },
  disclaimer: { textAlign: 'center', fontSize: 11, color: COLORS.muted, lineHeight: 17, opacity: 0.7 },
});