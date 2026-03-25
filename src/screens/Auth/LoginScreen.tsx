import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  View, Text, TextInput, Pressable, Animated, Easing,
  StyleSheet, KeyboardAvoidingView, Platform, Dimensions,
  ActivityIndicator, Image,
  type TextInput as RNTextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';

const LOGO = require('../../../assets/360watts-logo-brand.png');
// Rendered at 197×143 logical px — backed by 591×429 @3x PNG (crisp on all DPI)
const LOGO_W = 197;
const LOGO_H = 143;

const { width: W, height: H } = Dimensions.get('window');

// ─── Underline Input ─────────────────────────────────────────────────────────

interface UnderlineInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<RNTextInput | null>;
  rightElement?: React.ReactNode;
  entryAnim: Animated.Value;
}

function UnderlineInput({
  label, value, onChangeText, placeholder,
  secureTextEntry, returnKeyType = 'next',
  onSubmitEditing, inputRef, rightElement,
  entryAnim,
}: UnderlineInputProps) {
  const [focused, setFocused] = useState(false);
  const lineA = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(lineA, {
      toValue: focused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const lineW = lineA.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const labelColor = lineA.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.35)', '#00c44a'],
  });

  const translateY = entryAnim.interpolate({
    inputRange: [0, 1], outputRange: [24, 0],
  });

  return (
    <Animated.View
      style={[
        styles.fieldWrap,
        { opacity: entryAnim, transform: [{ translateY }] },
      ]}
    >
      <Animated.Text style={[styles.fieldLabel, { color: labelColor }]}>
        {label}
      </Animated.Text>

      <View style={styles.underlineRow}>
        <TextInput
          ref={inputRef}
          style={styles.underlineInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.18)"
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement}
      </View>

      {/* Base underline */}
      <View style={styles.underlineBase} />
      {/* Active indicator */}
      <Animated.View style={[styles.underlineActive, { width: lineW }]} />
    </Animated.View>
  );
}

// ─── LoginScreen ─────────────────────────────────────────────────────────────

export function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<RNTextInput>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(
    () => submitting || !username.trim() || !password,
    [submitting, username, password],
  );

  // ── Entry animations (staggered) ─────────────────────────────────────────
  const logoA   = useRef(new Animated.Value(0)).current;
  const field1A = useRef(new Animated.Value(0)).current;
  const field2A = useRef(new Animated.Value(0)).current;
  const btnA    = useRef(new Animated.Value(0)).current;
  const errA    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spring = (anim: Animated.Value, delay: number) =>
      Animated.spring(anim, { toValue: 1, delay, damping: 18, stiffness: 130, useNativeDriver: false });
    const timing = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, { toValue: 1, delay, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false });

    Animated.parallel([
      spring(logoA, 80),
      timing(field1A, 280),
      timing(field2A, 380),
      timing(btnA, 480),
    ]).start();
  }, []);

  // ── Shake on error ───────────────────────────────────────────────────────
  const shakeA = useRef(new Animated.Value(0)).current;
  const triggerShake = useCallback(() => {
    shakeA.setValue(0);
    Animated.sequence([
      Animated.timing(shakeA, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: 12,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: -9,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: 9,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: -4,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: 0,   duration: 45, useNativeDriver: true }),
    ]).start();
  }, [shakeA]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async () => {
    if (disabled) return;
    setError(null);
    setSubmitting(true);
    const ok = await login(username.trim(), password);
    if (!ok) {
      setError('Invalid username or password');
      triggerShake();
      Animated.timing(errA, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
    setSubmitting(false);
  };

  const logoScale = logoA.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const logoTransY = logoA.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const btnTransY = btnA.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background */}
      <LinearGradient
        colors={['#000000', '#040C06', '#030A08', '#000000']}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* ── Logo hero ── */}
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: logoA, transform: [{ scale: logoScale }, { translateY: logoTransY }] },
          ]}
        >
          <Image
            source={LOGO}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>FIELD OPERATIONS PLATFORM</Text>
        </Animated.View>

        {/* ── Divider ── */}
        <Animated.View style={[styles.dividerRow, { opacity: field1A }]}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>Sign in to continue</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* ── Form ── */}
        <Animated.View
          style={[
            styles.form,
            { transform: [{ translateX: shakeA }] },
          ]}
        >
          {/* Error */}
          {error && (
            <Animated.View style={[styles.errorRow, { opacity: errA }]}>
              <Ionicons name="alert-circle-outline" size={15} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          <UnderlineInput
            label="USERNAME"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            entryAnim={field1A}
          />

          <UnderlineInput
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPw}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            inputRef={passwordRef}
            entryAnim={field2A}
            rightElement={
              <Pressable onPress={() => setShowPw(v => !v)} hitSlop={12} style={styles.eyeBtn}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="rgba(255,255,255,0.35)"
                />
              </Pressable>
            }
          />

          {/* Sign In Button */}
          <Animated.View
            style={[
              styles.btnWrap,
              { opacity: btnA, transform: [{ translateY: btnTransY }] },
            ]}
          >
            <Pressable
              onPress={onSubmit}
              disabled={disabled}
              style={({ pressed }) => [styles.btnOuter, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={disabled ? ['#1a3d29', '#162e1e'] : ['#00d454', '#00a63e', '#008c35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {submitting ? (
                  <ActivityIndicator color="rgba(255,255,255,0.9)" />
                ) : (
                  <>
                    <Text style={[styles.btnText, disabled && styles.btnTextOff]}>
                      Sign In
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color={disabled ? 'rgba(255,255,255,0.25)' : '#fff'}
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Footer */}
        <Animated.Text style={[styles.footer, { opacity: btnA }]}>
          Powered by 360watts AI Platform
        </Animated.Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Logo
  logoWrap: {
    alignItems: 'center',
    marginBottom: H * 0.052,
  },
  logoImg: {
    width: LOGO_W,
    height: LOGO_H,
    marginBottom: 10,
  },
  tagline: {
    color: 'rgba(0,196,74,0.65)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: H * 0.042,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerLabel: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  // Form
  form: {
    width: '100%',
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    flex: 1,
  },

  // Field
  fieldWrap: {
    marginBottom: 30,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  underlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
  },
  underlineInput: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '400',
    paddingVertical: 0,
    letterSpacing: 0.2,
  },
  eyeBtn: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  underlineBase: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    width: '100%',
  },
  underlineActive: {
    height: 1.5,
    backgroundColor: '#00c44a',
    marginTop: -1,
  },

  // Button
  btnWrap: {
    marginTop: 10,
  },
  btnOuter: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#00a63e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  btn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnTextOff: {
    color: 'rgba(255,255,255,0.25)',
  },

  footer: {
    position: 'absolute',
    bottom: 28,
    color: 'rgba(255,255,255,0.18)',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
