import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../lib/store/useAuthStore';
import {
  colors,
  fonts,
  fontSize,
  spacing,
} from '../../lib/constants/theme';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Your Face.\nYour Rules.',
    subtitle:
      'AI scrapes billions of photos daily to train facial recognition. VOiD makes your face invisible to machines.',
    icon: <FontAwesome5 name="shield-alt" size={64} color={colors.white} />,
  },
  {
    id: '2',
    title: 'Invisible\nPerturbation.',
    subtitle:
      'We add a mathematically crafted noise pattern to your photos. Humans see nothing. AI sees chaos.',
    icon: <MaterialCommunityIcons name="eye-off-outline" size={68} color={colors.white} />,
  },
  {
    id: '3',
    title: 'Never Leaves\nYour Device.',
    subtitle:
      'All processing happens locally on your phone. We never see, store, or transmit your photos. Zero data.',
    icon: <FontAwesome6 name="lock" size={58} color={colors.white} />,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Complete onboarding - mock user login
      setUser({
        id: 'demo-user',
        appleSubjectId: 'demo-apple-id',
        isPremium: false,
        subscriptionStatus: 'none',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        {item.icon}
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            if (idx !== currentIndex) {
              Haptics.selectionAsync();
            }
            setCurrentIndex(idx);
          }}
        />

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Action */}
        <View style={styles.footer}>
          <Button
            title={currentIndex === slides.length - 1 ? 'Enter the Void' : 'Next'}
            onPress={handleNext}
            variant="primary"
            size="lg"
            icon={
              currentIndex === slides.length - 1 ? (
                <FontAwesome5 name="arrow-right" size={14} color={colors.black} />
              ) : undefined
            }
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  slide: {
    width,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xxxl,
    color: colors.white,
    textAlign: 'center',
    lineHeight: fontSize.xxxl * 1.15,
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.6,
    paddingHorizontal: spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  dot: {
    height: 3,
    borderRadius: 2,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.white,
  },
  dotInactive: {
    width: 12,
    backgroundColor: colors.subtle,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 14,
  },
});
