import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from "react-native";
import { authService } from "../services/authService";

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    // Validation
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const result =
        mode === "login"
          ? await authService.login(email, password)
          : await authService.register(email, password, name || undefined);

      if (result.success) {
        onAuthSuccess();
      } else {
        setError(result.error || "Authentication failed");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    if (Platform.OS !== "web") {
      setError("OAuth login is only available on web");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authService.loginWithOAuth(provider);
      if (result.success) {
        onAuthSuccess();
      } else {
        setError(result.error || "OAuth login failed");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Image
            source={require("../../assets/tealeaves2.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Universal Forecasting Platform</Text>

          <View style={styles.card}>
            <Text style={styles.title}>
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>

            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#928374"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#928374"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder={
                  mode === "register"
                    ? "At least 8 characters"
                    : "Your password"
                }
                placeholderTextColor="#928374"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#282828" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === "login" ? "Log In" : "Sign Up"}
                </Text>
              )}
            </TouchableOpacity>

            {Platform.OS === "web" && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[
                    styles.oauthButton,
                    styles.googleButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={() => handleOAuthLogin("google")}
                  disabled={loading}
                >
                  <Text style={styles.oauthButtonText}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={toggleMode}
              disabled={loading}
            >
              <Text style={styles.switchText}>
                {mode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Log in"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Strong Calibration • Universal Forecasting
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1d2021",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  logoImage: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 16,
  },
  logo: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#ebdbb2",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : Platform.OS === "android"
          ? "monospace"
          : "Courier New, monospace",
  },
  card: {
    backgroundColor: "#282828",
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: "#3c3836",
  },
  title: {
    color: "#ebdbb2",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#ebdbb2",
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#3c3836",
    color: "#ebdbb2",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#504945",
    fontSize: 16,
  },
  error: {
    color: "#fb4934",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#fabd2f",
    padding: 16,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#282828",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    marginTop: 16,
    padding: 8,
  },
  switchText: {
    color: "#928374",
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    color: "#665c54",
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#504945",
  },
  dividerText: {
    color: "#928374",
    paddingHorizontal: 12,
    fontSize: 14,
  },
  oauthButton: {
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
  },
  googleButtonText: {
    color: "#1f1f1f",
  },
  githubButton: {
    backgroundColor: "#24292e",
    borderColor: "#24292e",
  },
  githubButtonText: {
    color: "#fff",
  },
  oauthButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
