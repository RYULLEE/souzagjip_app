import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, Alert, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const COLORS = {
  bg: '#F5F0E8', primary: '#1A1A2E', accent: '#C8973E',
  accentLight: '#F5ECD7', muted: '#888', white: '#FFFFFF',
  border: '#E0D4C0', inputBg: '#FDFAF5',
  error: '#E05252', errorBg: '#FDF0F0',
  success: '#2E9E6B', successBg: '#EDF7F2',
};

interface FieldProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  error?: string;
  rightElement?: React.ReactNode;
}

function InputField({ icon, placeholder, value, onChangeText, secureEntry, keyboardType, autoCapitalize, error, rightElement }: FieldProps): JSX.Element {
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
        <Ionicons name={icon as any} size={18} color={error ? COLORS.error : COLORS.muted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureEntry}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
        />
        {rightElement}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// 비밀번호 강도 체크
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '', color: '#E0D4C0' },
    { label: '약함', color: '#E05252' },
    { label: '보통', color: '#F5A623' },
    { label: '좋음', color: '#4CAF50' },
    { label: '강함', color: '#2E9E6B' },
  ];
  return { score, ...map[Math.min(score, 4)] };
}

export default function SignupScreen(): JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // 유효성
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwStrength = getPasswordStrength(password);
  const pwMatch = password === passwordConfirm && passwordConfirm.length > 0;

  const errors = {
    name: name.length > 0 && name.trim().length < 2 ? '2자 이상 입력해주세요.' : '',
    email: email.length > 0 && !emailValid ? '올바른 이메일 형식이 아닙니다.' : '',
    password: password.length > 0 && password.length < 6 ? '6자 이상 입력해주세요.' : '',
    passwordConfirm: passwordConfirm.length > 0 && !pwMatch ? '비밀번호가 일치하지 않습니다.' : '',
  };

  const canSubmit = name.trim().length >= 2 && emailValid && password.length >= 6 && pwMatch;

  const handleSignup = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });
      if (error) throw error;
      setDone(true);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('already registered')) {
        Alert.alert('이미 가입된 이메일', '해당 이메일로 이미 계정이 존재합니다.\n로그인 화면으로 돌아가주세요.');
      } else {
        Alert.alert('가입 오류', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 완료 화면 ──
  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={styles.doneCard}>
          <View style={styles.doneIcon}>
            <Ionicons name="mail-open-outline" size={36} color={COLORS.accent} />
          </View>
          <Text style={styles.doneTitle}>인증 메일을 확인해주세요</Text>
          <Text style={styles.doneDesc}>{email}{'\n'}으로 인증 링크를 보냈어요.{'\n'}메일을 확인 후 로그인해주세요.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.doneBtnText}>로그인 화면으로</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />

      {/* 상단 바 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>회원가입</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 상단 멘트 */}
          <View style={styles.headerArea}>
            <View style={styles.headerAccent} />
            <View>
              <Text style={styles.headerTitle}>환영합니다 👋</Text>
              <Text style={styles.headerSub}>계정을 만들어 북마크와 독서 기록을 저장하세요.</Text>
            </View>
          </View>

          {/* 폼 카드 */}
          <View style={styles.formCard}>
            <InputField
              icon="person-outline"
              placeholder="이름 (닉네임)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errors.name}
            />
            <InputField
              icon="mail-outline"
              placeholder="이메일"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              error={errors.email}
            />
            <InputField
              icon="lock-closed-outline"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChangeText={setPassword}
              secureEntry={!showPw}
              error={errors.password}
              rightElement={
                <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.muted} />
                </TouchableOpacity>
              }
            />

            {/* 비밀번호 강도 */}
            {password.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map(i => (
                    <View key={i} style={[styles.strengthBar, { backgroundColor: i <= pwStrength.score ? pwStrength.color : '#E0D4C0' }]} />
                  ))}
                </View>
                {pwStrength.label ? <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text> : null}
              </View>
            )}

            <InputField
              icon="lock-closed-outline"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureEntry={!showPwConfirm}
              error={errors.passwordConfirm}
              rightElement={
                <TouchableOpacity onPress={() => setShowPwConfirm(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showPwConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.muted} />
                </TouchableOpacity>
              }
            />

            {/* 체크 표시 */}
            {pwMatch && passwordConfirm.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
                <Text style={styles.matchText}>비밀번호가 일치합니다</Text>
              </View>
            )}
          </View>

          {/* 가입 버튼 */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSignup}
            activeOpacity={0.88}
            disabled={!canSubmit || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>가입하기</Text>
            }
          </TouchableOpacity>

          {/* 이미 계정 있음 */}
          <TouchableOpacity style={styles.loginRow} onPress={() => router.back()}>
            <Text style={styles.loginText}>이미 계정이 있으신가요? </Text>
            <Text style={styles.loginLink}>로그인</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>{'가입 시 이용약관 및 개인정보처리방침에\n동의하는 것으로 간주됩니다.'}</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 0 },
  circle: { position: 'absolute', borderRadius: 999 },
  circle1: { width: 250, height: 250, backgroundColor: COLORS.accent, opacity: 0.1, top: -60, right: -70 },
  circle2: { width: 180, height: 180, backgroundColor: COLORS.primary, opacity: 0.07, bottom: 100, left: -60 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  backBtn: { padding: 6 },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.primary },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 0 },

  headerArea: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 24, marginTop: 8 },
  headerAccent: { width: 4, height: '100%', minHeight: 50, backgroundColor: COLORS.accent, borderRadius: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5, marginBottom: 6 },
  headerSub: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },

  formCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, marginBottom: 16 },

  fieldWrap: { gap: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, height: 52 },
  inputWrapError: { borderColor: COLORS.error, backgroundColor: COLORS.errorBg },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.primary },
  eyeBtn: { padding: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 4 },
  errorText: { fontSize: 12, color: COLORS.error },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 32 },

  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 4 },
  matchText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },

  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5, marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: -0.3 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loginText: { fontSize: 14, color: COLORS.muted },
  loginLink: { fontSize: 14, color: COLORS.accent, fontWeight: '700' },

  disclaimer: { textAlign: 'center', fontSize: 11, color: COLORS.muted, lineHeight: 17, opacity: 0.7 },

  // 완료 화면
  doneCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 24, padding: 32, alignItems: 'center', gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accentLight, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3 },
  doneDesc: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 22 },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});