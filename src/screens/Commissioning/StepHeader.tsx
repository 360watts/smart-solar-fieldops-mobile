import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../../theme/theme';

const STEPS = ['Device', 'Site Info', 'Owner', 'Review'];

export function StepHeader({
  currentStep,
  onBack,
  onClose,
}: {
  currentStep: 1 | 2 | 3 | 4;
  onBack?: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <Pressable onPress={onBack ?? onClose} hitSlop={10} style={styles.iconBtn}>
          <Ionicons
            name={onBack ? 'arrow-back' : 'close'}
            size={22}
            color={AppTheme.colors.text}
          />
        </Pressable>
        <Text style={styles.title}>Commission New Site</Text>
        <Pressable onPress={onClose} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={AppTheme.colors.mutedText} />
        </Pressable>
      </View>

      {/* Step indicators */}
      <View style={styles.stepsRow}>
        {STEPS.map((label, idx) => {
          const step = idx + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          return (
            <View key={label} style={styles.stepWrap}>
              <View
                style={[
                  styles.stepDot,
                  done && styles.stepDone,
                  active && styles.stepActive,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text style={[styles.stepNum, active && styles.stepNumActive]}>
                    {step}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  active && styles.stepLabelActive,
                  done && styles.stepLabelDone,
                ]}
              >
                {label}
              </Text>
              {idx < STEPS.length - 1 && (
                <View style={[styles.connector, done && styles.connectorDone]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 2,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDone: {
    backgroundColor: AppTheme.colors.accent,
    borderColor: AppTheme.colors.accent,
  },
  stepActive: {
    borderColor: AppTheme.colors.accent,
    backgroundColor: AppTheme.colors.accentSoft,
  },
  stepNum: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    fontWeight: '700',
  },
  stepNumActive: {
    color: AppTheme.colors.accent,
  },
  stepLabel: {
    color: AppTheme.colors.dimText,
    fontSize: 10,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: AppTheme.colors.accent,
  },
  stepLabelDone: {
    color: AppTheme.colors.mutedText,
  },
  connector: {
    position: 'absolute',
    top: 13,
    right: -'50%' as any,
    width: '100%',
    height: 2,
    backgroundColor: AppTheme.colors.border,
    zIndex: -1,
  },
  connectorDone: {
    backgroundColor: AppTheme.colors.accent,
  },
});
