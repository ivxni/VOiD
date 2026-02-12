import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome6, Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import {
  colors,
  fonts,
  fontSize,
  spacing,
} from '../../lib/constants/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  const handleSignIn = () => {
    // TODO: Implement Apple Sign In
    router.push('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>V</Text>
            <Text style={styles.logoTextAccent}>O</Text>
            <Text style={styles.logoText}>i</Text>
            <Text style={styles.logoText}>D</Text>
          </View>

          <Text style={styles.tagline}>
            Be visible to friends.{'\n'}Invisible to machines.
          </Text>

          <Text style={styles.description}>
            Protect your photos from AI facial recognition{'\n'}
            while keeping them perfect for humans.
          </Text>
        </View>

        {/* Features Preview */}
        <View style={styles.features}>
          <FeatureRow
            icon={<FontAwesome5 name="microchip" size={16} color={colors.white} />}
            text="On-device processing. Your photos never leave."
          />
          <FeatureRow
            icon={<FontAwesome5 name="eye-slash" size={16} color={colors.white} />}
            text="Invisible to AI. Beautiful to humans."
          />
          <FeatureRow
            icon={<Ionicons name="flash" size={18} color={colors.white} />}
            text="One tap. Instant protection."
          />
        </View>

        {/* Auth Section */}
        <View style={styles.authSection}>
          <View style={styles.appleButton}>
            <Button
              title="Continue with Apple"
              onPress={handleSignIn}
              variant="primary"
              size="lg"
              icon={<FontAwesome6 name="apple" size={20} color={colors.black} />}
              style={styles.appleButtonInner}
            />
          </View>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconContainer}>
        {icon}
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.display + 8,
    color: colors.white,
    letterSpacing: 8,
  },
  logoTextAccent: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.display + 8,
    color: colors.muted,
    letterSpacing: 8,
  },
  tagline: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.xl,
    color: colors.silver,
    textAlign: 'center',
    lineHeight: fontSize.xl * 1.4,
    marginBottom: spacing.md,
  },
  description: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.6,
  },
  features: {
    gap: spacing.md + 4,
    paddingHorizontal: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.silver,
    flex: 1,
  },
  authSection: {
    alignItems: 'center',
    gap: spacing.md,
  },
  appleButton: {
    width: width - spacing.lg * 2,
  },
  appleButtonInner: {
    width: '100%',
    height: 56,
    borderRadius: 14,
  },
  terms: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.6,
  },
});
