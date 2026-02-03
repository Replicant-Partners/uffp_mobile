/**
 * Link Preview Card Component
 *
 * Displays a rich preview card for URLs with metadata
 */

import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from "react-native";

interface LinkPreviewCardProps {
  preview: {
    url: string;
    title: string;
    description: string;
    image?: string;
    favicon?: string;
    error?: string;
  };
  onPress?: () => void;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({
  preview,
  onPress,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Linking.openURL(preview.url);
    }
  };

  // If there was an error fetching, show minimal card
  if (preview.error) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          <Text style={styles.errorTitle}>🔗 {preview.title}</Text>
          <Text style={styles.url} numberOfLines={1}>
            {preview.url}
          </Text>
          <Text style={styles.errorText}>
            Preview unavailable: {preview.error}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {preview.image && (
        <Image
          source={{ uri: preview.image }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          {preview.favicon && (
            <Image source={{ uri: preview.favicon }} style={styles.favicon} />
          )}
          <Text style={styles.title} numberOfLines={2}>
            {preview.title}
          </Text>
        </View>

        {preview.description && (
          <Text style={styles.description} numberOfLines={3}>
            {preview.description}
          </Text>
        )}

        <Text style={styles.url} numberOfLines={1}>
          {preview.url}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#32302f",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#504945",
    overflow: "hidden",
    marginVertical: 8,
  },
  thumbnail: {
    width: "100%",
    height: 180,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  favicon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ebdbb2",
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: "#a89984",
    lineHeight: 20,
    marginBottom: 8,
  },
  url: {
    fontSize: 12,
    color: "#83a598",
    fontStyle: "italic",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ebdbb2",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#fb4934",
    fontStyle: "italic",
    marginTop: 4,
  },
});
