import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, Animated, Easing, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGO = require('../../../assets/360watts-logo-brand.png');
const LOGO_W = 220;
const LOGO_H = Math.round(220 * (143 / 197)); // maintain aspect ratio ≈ 159


export function SplashScreen() {
  const insets = useSafeAreaInsets();

  const logoA  = useRef(new Animated.Value(0)).current;
  const tagA   = useRef(new Animated.Value(0)).current;
  const dot1A  = useRef(new Animated.Value(0.2)).current;
  const dot2A  = useRef(new Animated.Value(0.2)).current;
  const dot3A  = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Logo springs in
    Animated.spring(logoA, {
      toValue: 1, delay: 120,
      damping: 18, stiffness: 120,
      useNativeDriver: true,
    }).start();

    // Tagline fades in after logo
    Animated.timing(tagA, {
      toValue: 1, delay: 420, duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Pulsing dots (loading indicator)
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, delay, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2, duration: 400, useNativeDriver: true }),
          Animated.delay(400),
        ])
      );

    Animated.parallel([
      pulse(dot1A, 600),
      pulse(dot2A, 800),
      pulse(dot3A, 1000),
    ]).start();
  }, []);

  const logoScale = logoA.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#000000', '#040C06', '#030A08', '#000000']}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.root, { paddingBottom: insets.bottom + 40 }]}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: logoA, transform: [{ scale: logoScale }] },
          ]}
        >
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagA }]}>
          FIELD OPERATIONS PLATFORM
        </Animated.Text>

        {/* Pulsing dots */}
        <View style={styles.dots}>
          {[dot1A, dot2A, dot3A].map((anim, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity: anim }]}
            />
          ))}
        </View>
      </View>

      {/* Bottom powered-by */}
      <Animated.Text style={[styles.footer, { opacity: tagA, bottom: insets.bottom + 24 }]}>
        Powered by 360watts AI Platform
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoImg: {
    width: LOGO_W,
    height: LOGO_H,
  },

  tagline: {
    color: 'rgba(0,196,74,0.65)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    marginBottom: 52,
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00a63e',
  },

  footer: {
    position: 'absolute',
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.18)',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
