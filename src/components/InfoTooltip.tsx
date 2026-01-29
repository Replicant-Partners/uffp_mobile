import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { TufteColors, TufteTypography, TufteSpacing } from '../styles/tufte';

interface InfoTooltipProps {
  term: string;
  definition: string;
  example?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ term, definition, example }) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>{term}</Text>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>?</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={styles.tooltipContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipTerm}>{term}</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tooltipBody}>
              <Text style={styles.tooltipDefinition}>{definition}</Text>

              {example && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleLabel}>Example</Text>
                  <Text style={styles.exampleText}>{example}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  triggerText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    marginRight: TufteSpacing.xs,
  },
  iconContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: TufteColors.dataAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: TufteColors.paper,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: TufteSpacing.lg,
  },
  tooltipContainer: {
    backgroundColor: TufteColors.paper,
    borderWidth: 2,
    borderColor: TufteColors.dataAccent,
    maxWidth: 400,
    width: '100%',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: TufteSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.border,
    backgroundColor: TufteColors.background,
  },
  tooltipTerm: {
    fontSize: TufteTypography.fontSize.lg,
    fontWeight: '600' as const,
    color: TufteColors.text,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: TufteSpacing.md,
  },
  closeText: {
    fontSize: 32,
    color: TufteColors.textSecondary,
    lineHeight: 32,
  },
  tooltipBody: {
    padding: TufteSpacing.lg,
  },
  tooltipDefinition: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.text,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.base,
    marginBottom: TufteSpacing.md,
  },
  exampleBox: {
    borderLeftWidth: 3,
    borderLeftColor: TufteColors.dataAccent,
    paddingLeft: TufteSpacing.md,
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
  },
  exampleLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: TufteSpacing.xs,
  },
  exampleText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textSecondary,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
    fontStyle: 'italic',
  },
});
