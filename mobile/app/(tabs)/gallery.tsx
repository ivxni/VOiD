import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCloakStore, type CloakedImage } from '../../lib/store/useCloakStore';
import {
  colors,
  fonts,
  fontSize,
  spacing,
  borderRadius,
} from '../../lib/constants/theme';

const { width: SW } = Dimensions.get('window');
const GRID_GAP = spacing.xs;
const COLS = 3;
const THUMB_SIZE = (SW - spacing.lg * 2 - GRID_GAP * (COLS - 1)) / COLS;

type DetailViewMode = 'cloaked' | 'ai';

export default function GalleryScreen() {
  const { images, markSaved, removeImage } = useCloakStore();
  const [selectedImage, setSelectedImage] = useState<CloakedImage | null>(null);
  const [viewMode, setViewMode] = useState<DetailViewMode>('cloaked');
  // Local save state — resets each time a new image is opened
  const [justSaved, setJustSaved] = useState(false);

  const openDetail = (img: CloakedImage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(img);
    setViewMode('cloaked');
    setJustSaved(false);
  };

  const closeDetail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(null);
    setJustSaved(false);
  };

  const handleSaveToDevice = async (img: CloakedImage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant gallery access to save photos.');
      return;
    }
    try {
      await MediaLibrary.saveToLibraryAsync(img.cloakedUri);
      markSaved(img.id);
      setJustSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save photo.');
    }
  };

  // Which URI to display based on view mode
  const displayUri = selectedImage
    ? viewMode === 'ai' && selectedImage.analysisUri
      ? selectedImage.analysisUri
      : selectedImage.cloakedUri
    : '';

  const renderThumb = ({ item }: { item: CloakedImage }) => (
    <TouchableOpacity
      style={styles.thumbWrap}
      activeOpacity={0.7}
      onPress={() => openDetail(item)}
    >
      <Image source={{ uri: item.cloakedUri }} style={styles.thumb} contentFit="cover" />
      {item.savedToGallery && (
        <View style={styles.savedBadge}>
          <Ionicons name="checkmark-circle" size={12} color={colors.success} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gallery</Text>
        <Text style={styles.headerSubtitle}>CLOAKED PHOTOS</Text>
      </View>

      {images.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyState}>
          <View style={styles.emptyIconOuter}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0)']}
              locations={[0, 0.5, 1]}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={styles.emptyIconGradient}
            >
              <View style={styles.emptyIconInner}>
                <Ionicons name="images-outline" size={40} color={colors.subtle} />
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No cloaked photos yet</Text>
          <Text style={styles.emptySubtitle}>
            Photos you cloak will appear here.{'\n'}
            Head to the Home tab to get started.
          </Text>
        </View>
      ) : (
        /* Grid */
        <FlatList
          data={images}
          renderItem={renderThumb}
          keyExtractor={(item) => item.id}
          numColumns={COLS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail overlay */}
      {selectedImage && (
        <View style={styles.detailOverlay}>
          <SafeAreaView edges={['top', 'bottom']} style={styles.detailSafe}>
            {/* Top row: close + timestamp + delete */}
            <View style={styles.detailTopRow}>
              <TouchableOpacity
                style={styles.detailClose}
                onPress={closeDetail}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.silver} />
              </TouchableOpacity>
              <Text style={styles.detailTimestamp}>
                {new Date(selectedImage.timestamp).toLocaleDateString('de-DE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
              <TouchableOpacity
                style={styles.detailDelete}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(
                    'Delete Photo',
                    'Remove this cloaked photo from your history?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          removeImage(selectedImage.id);
                          setSelectedImage(null);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        },
                      },
                    ],
                  );
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>

            {/* Image — contained card */}
            <View style={styles.detailImageWrap}>
              <View style={styles.detailImageCard}>
                <Image
                  source={{ uri: displayUri }}
                  style={styles.detailImage}
                  contentFit="contain"
                  transition={200}
                />
                {/* AI badge */}
                {viewMode === 'ai' && selectedImage.analysisUri && (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>AI FEATURE ANALYSIS</Text>
                  </View>
                )}
              </View>

              {/* CLOAKED / AI VIEW toggle */}
              {selectedImage.analysisUri && (
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'cloaked' && styles.toggleBtnActive]}
                    onPress={() => { setViewMode('cloaked'); Haptics.selectionAsync(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleText, viewMode === 'cloaked' && styles.toggleTextActive]}>
                      CLOAKED
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'ai' && styles.toggleBtnAi]}
                    onPress={() => { setViewMode('ai'); Haptics.selectionAsync(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleText, viewMode === 'ai' && styles.toggleTextAi]}>
                      AI VIEW
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bottom: stats + actions */}
            <View style={styles.detailBottom}>
              <View style={styles.detailStats}>
                <View style={styles.detailStat}>
                  <FontAwesome5 name="user-shield" size={10} color={colors.success} />
                  <Text style={styles.detailStatValue}>
                    {selectedImage.facesCloaked}/{selectedImage.facesDetected}
                  </Text>
                  <Text style={styles.detailStatLabel}>faces</Text>
                </View>
                <View style={styles.detailStatDivider} />
                <View style={styles.detailStat}>
                  <Ionicons name="shield-checkmark" size={12} color={
                    (selectedImage.avgEmbeddingDistance ?? 0) >= 0.3 ? colors.success
                    : (selectedImage.avgEmbeddingDistance ?? 0) >= 0.15 ? '#FFD060'
                    : colors.muted
                  } />
                  <Text style={styles.detailStatValue}>
                    {Math.round((selectedImage.avgEmbeddingDistance ?? 0) * 100)}%
                  </Text>
                  <Text style={styles.detailStatLabel}>disruption</Text>
                </View>
                <View style={styles.detailStatDivider} />
                <View style={styles.detailStat}>
                  <Ionicons name="timer-outline" size={12} color={colors.muted} />
                  <Text style={styles.detailStatValue}>
                    {(selectedImage.processingTimeMs / 1000).toFixed(1)}s
                  </Text>
                  <Text style={styles.detailStatLabel}>time</Text>
                </View>
              </View>

              {!justSaved ? (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => handleSaveToDevice(selectedImage)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#E0E0E0']}
                    style={styles.saveButtonGradient}
                  >
                    <Ionicons name="download-outline" size={17} color={colors.black} />
                    <Text style={styles.saveButtonText}>Save to Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.savedRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.savedText}>Saved to Device</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xxl,
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 2,
    marginTop: 4,
  },

  // Empty
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl,
  },
  emptyIconOuter: {
    width: 88, height: 88, borderRadius: 44, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  emptyIconGradient: { width: '100%', height: '100%' },
  emptyIconInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(14,14,14,0.85)',
  },
  emptyTitle: {
    fontFamily: fonts.sansSemiBold, fontSize: fontSize.lg, color: colors.silver,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.sans, fontSize: fontSize.sm, color: colors.muted,
    textAlign: 'center', lineHeight: fontSize.sm * 1.6,
  },

  // Grid
  gridContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  thumbWrap: {
    width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: borderRadius.sm,
    overflow: 'hidden', position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  savedBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },

  // Detail overlay
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
    zIndex: 100,
  },
  detailSafe: { flex: 1 },
  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 44,
  },
  detailClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailDelete: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,59,48,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailTimestamp: {
    fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 0.5,
  },
  detailImageWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  detailImageCard: {
    width: SW - spacing.lg * 2,
    flex: 1,
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.charcoal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  detailImage: { width: '100%', height: '100%' },

  // AI badge
  aiBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,255,148,0.12)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  aiBadgeText: {
    fontFamily: fonts.monoBold, fontSize: 7, color: '#00FF94', letterSpacing: 1.5,
  },

  // Toggle (same style as processing modal)
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.full,
    padding: 3, gap: 2, marginTop: spacing.md,
  },
  toggleBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full,
  },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  toggleBtnAi: { backgroundColor: 'rgba(0,255,148,0.1)' },
  toggleText: {
    fontFamily: fonts.monoBold, fontSize: 8, color: colors.muted, letterSpacing: 2,
  },
  toggleTextActive: { color: colors.white },
  toggleTextAi: { color: '#00FF94' },

  // Bottom
  detailBottom: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md,
  },
  detailStats: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: spacing.lg,
  },
  detailStat: { alignItems: 'center', gap: 3 },
  detailStatValue: {
    fontFamily: fonts.monoBold, fontSize: fontSize.sm, color: colors.white,
  },
  detailStatLabel: {
    fontFamily: fonts.mono, fontSize: 7, color: colors.muted, letterSpacing: 1,
  },
  detailStatDivider: {
    width: 1, height: 22, backgroundColor: colors.border,
  },
  saveButton: { borderRadius: 14, overflow: 'hidden' },
  saveButtonGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14,
  },
  saveButtonText: {
    fontFamily: fonts.sansBold, fontSize: fontSize.md, color: colors.black,
  },
  savedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
  },
  savedText: {
    fontFamily: fonts.sans, fontSize: fontSize.md, color: colors.success,
  },
});
