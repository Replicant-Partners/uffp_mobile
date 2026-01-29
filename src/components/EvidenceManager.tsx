import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
} from "react-native";
import { Evidence } from "../types";
import { TufteColors, TufteTypography, TufteSpacing } from "../styles/tufte";

interface EvidenceManagerProps {
  evidence: Evidence[];
  onAddEvidence: (evidence: Evidence) => void;
  onRemoveEvidence: (id: string) => void;
}

export const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  evidence,
  onAddEvidence,
  onRemoveEvidence,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newEvidence, setNewEvidence] = useState<Partial<Evidence>>({
    type: "research",
    relevance: "high",
  });

  const handleAddEvidence = () => {
    if (newEvidence.title && newEvidence.source && newEvidence.keyFinding) {
      onAddEvidence({
        id: Date.now().toString(),
        type: newEvidence.type || "research",
        title: newEvidence.title,
        source: newEvidence.source,
        url: newEvidence.url,
        summary: newEvidence.summary || "",
        keyFinding: newEvidence.keyFinding,
        date: newEvidence.date || new Date().toISOString().split("T")[0],
        relevance: newEvidence.relevance || "high",
      } as Evidence);

      setNewEvidence({ type: "research", relevance: "high" });
      setModalVisible(false);
    }
  };

  const evidenceTypeLabels = {
    research: "Research Paper",
    web_article: "Web Article",
    competitor_data: "Competitor Data",
    internal_data: "Internal Data",
    expert_opinion: "Expert Opinion",
    sentiment_analysis: "Sentiment Analysis",
  };

  const relevanceColors = {
    high: TufteColors.dataAccent,
    medium: TufteColors.warning,
    low: TufteColors.textTertiary,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Evidence ({evidence.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add Evidence</Text>
        </TouchableOpacity>
      </View>

      {evidence.map((item) => (
        <View key={item.id} style={styles.evidenceCard}>
          <View style={styles.evidenceHeader}>
            <View style={styles.evidenceTypeRow}>
              <View
                style={[styles.relevanceDot, { backgroundColor: relevanceColors[item.relevance] }]}
              />
              <Text style={styles.evidenceType}>{evidenceTypeLabels[item.type]}</Text>
            </View>
            <TouchableOpacity onPress={() => onRemoveEvidence(item.id)} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.evidenceTitle}>{item.title}</Text>
          <Text style={styles.evidenceSource}>
            {item.source} · {item.date}
          </Text>

          <View style={styles.keyFindingBox}>
            <Text style={styles.keyFindingLabel}>Key Finding</Text>
            <Text style={styles.keyFindingText}>{item.keyFinding}</Text>
          </View>

          {item.url && (
            <Text style={styles.evidenceUrl} numberOfLines={1}>
              {item.url}
            </Text>
          )}
        </View>
      ))}

      {evidence.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No evidence added yet. Add research, data, or expert opinions to support your parameter
            choices.
          </Text>
        </View>
      )}

      {/* Add Evidence Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Evidence</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Evidence Type</Text>
              <View style={styles.typeButtons}>
                {Object.entries(evidenceTypeLabels).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.typeButton, newEvidence.type === key && styles.typeButtonActive]}
                    onPress={() =>
                      setNewEvidence({ ...newEvidence, type: key as Evidence["type"] })
                    }
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newEvidence.type === key && styles.typeButtonTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newEvidence.title}
                onChangeText={(text) => setNewEvidence({ ...newEvidence, title: text })}
                placeholder="e.g., Q3 2024 Earnings Report"
                placeholderTextColor={TufteColors.textTertiary}
              />

              <Text style={styles.label}>Source *</Text>
              <TextInput
                style={styles.input}
                value={newEvidence.source}
                onChangeText={(text) => setNewEvidence({ ...newEvidence, source: text })}
                placeholder="e.g., Company SEC Filing, Bloomberg, Internal Analysis"
                placeholderTextColor={TufteColors.textTertiary}
              />

              <Text style={styles.label}>URL (optional)</Text>
              <TextInput
                style={styles.input}
                value={newEvidence.url}
                onChangeText={(text) => setNewEvidence({ ...newEvidence, url: text })}
                placeholder="https://..."
                placeholderTextColor={TufteColors.textTertiary}
              />

              <Text style={styles.label}>Key Finding *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newEvidence.keyFinding}
                onChangeText={(text) => setNewEvidence({ ...newEvidence, keyFinding: text })}
                placeholder="What specific insight does this provide for your driver parameters?"
                placeholderTextColor={TufteColors.textTertiary}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Summary (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newEvidence.summary}
                onChangeText={(text) => setNewEvidence({ ...newEvidence, summary: text })}
                placeholder="Additional context or summary"
                placeholderTextColor={TufteColors.textTertiary}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={newEvidence.date}
                onChangeText={(text) => setNewEvidence({ ...newEvidence, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={TufteColors.textTertiary}
              />

              <Text style={styles.label}>Relevance</Text>
              <View style={styles.relevanceButtons}>
                {(["high", "medium", "low"] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.relevanceButton,
                      newEvidence.relevance === level && styles.relevanceButtonActive,
                    ]}
                    onPress={() => setNewEvidence({ ...newEvidence, relevance: level })}
                  >
                    <Text
                      style={[
                        styles.relevanceButtonText,
                        newEvidence.relevance === level && styles.relevanceButtonTextActive,
                      ]}
                    >
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddEvidence}>
                <Text style={styles.saveButtonText}>Add Evidence</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: TufteSpacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TufteSpacing.md,
  },
  headerText: {
    fontSize: TufteTypography.fontSize.sm,
    fontWeight: "600" as const,
    color: TufteColors.text,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  addButton: {
    paddingVertical: TufteSpacing.xs,
    paddingHorizontal: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.dataAccent,
  },
  addButtonText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.dataAccent,
    letterSpacing: 0.5,
  },
  evidenceCard: {
    backgroundColor: TufteColors.background,
    padding: TufteSpacing.md,
    marginBottom: TufteSpacing.sm,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  evidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TufteSpacing.xs,
  },
  evidenceTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: TufteSpacing.xs,
  },
  relevanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  evidenceType: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  removeButton: {
    padding: TufteSpacing.xs,
  },
  removeButtonText: {
    fontSize: 20,
    color: TufteColors.textSecondary,
  },
  evidenceTitle: {
    fontSize: TufteTypography.fontSize.base,
    fontWeight: "500" as const,
    color: TufteColors.text,
    marginBottom: TufteSpacing.xs,
  },
  evidenceSource: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    marginBottom: TufteSpacing.sm,
  },
  keyFindingBox: {
    borderLeftWidth: 2,
    borderLeftColor: TufteColors.dataAccent,
    paddingLeft: TufteSpacing.sm,
    marginBottom: TufteSpacing.xs,
  },
  keyFindingLabel: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  keyFindingText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.text,
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
  evidenceUrl: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.dataAccent,
    fontStyle: "italic",
  },
  emptyState: {
    padding: TufteSpacing.lg,
    borderWidth: 1,
    borderColor: TufteColors.border,
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: TufteTypography.fontSize.sm,
    color: TufteColors.textTertiary,
    textAlign: "center",
    lineHeight: TufteTypography.lineHeight.relaxed * TufteTypography.fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: TufteColors.paper,
    borderTopWidth: 2,
    borderTopColor: TufteColors.dataAccent,
    maxHeight: "90%",
    padding: TufteSpacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TufteSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: TufteColors.border,
    paddingBottom: TufteSpacing.md,
  },
  modalTitle: {
    fontSize: TufteTypography.fontSize.xl,
    fontWeight: "600" as const,
    color: TufteColors.text,
  },
  closeButton: {
    padding: TufteSpacing.xs,
  },
  closeButtonText: {
    fontSize: 32,
    color: TufteColors.textSecondary,
    lineHeight: 32,
  },
  label: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: TufteSpacing.xs,
    marginTop: TufteSpacing.md,
  },
  input: {
    backgroundColor: TufteColors.background,
    color: TufteColors.text,
    padding: TufteSpacing.md,
    fontSize: TufteTypography.fontSize.base,
    borderWidth: 1,
    borderColor: TufteColors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  typeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TufteSpacing.sm,
    marginBottom: TufteSpacing.md,
  },
  typeButton: {
    paddingVertical: TufteSpacing.xs,
    paddingHorizontal: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.border,
    backgroundColor: TufteColors.background,
  },
  typeButtonActive: {
    backgroundColor: TufteColors.dataAccent,
    borderColor: TufteColors.dataAccent,
  },
  typeButtonText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
  },
  typeButtonTextActive: {
    color: TufteColors.paper,
  },
  relevanceButtons: {
    flexDirection: "row",
    gap: TufteSpacing.sm,
    marginBottom: TufteSpacing.lg,
  },
  relevanceButton: {
    flex: 1,
    paddingVertical: TufteSpacing.md,
    borderWidth: 1,
    borderColor: TufteColors.border,
    backgroundColor: TufteColors.background,
    alignItems: "center",
  },
  relevanceButtonActive: {
    backgroundColor: TufteColors.dataAccent,
    borderColor: TufteColors.dataAccent,
  },
  relevanceButtonText: {
    fontSize: TufteTypography.fontSize.xs,
    color: TufteColors.textSecondary,
    fontWeight: "600" as const,
  },
  relevanceButtonTextActive: {
    color: TufteColors.paper,
  },
  saveButton: {
    backgroundColor: TufteColors.text,
    padding: TufteSpacing.lg,
    alignItems: "center",
    marginTop: TufteSpacing.lg,
  },
  saveButtonText: {
    fontSize: TufteTypography.fontSize.base,
    color: TufteColors.paper,
    fontWeight: "600" as const,
  },
});
