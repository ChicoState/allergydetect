import { useAuthSession } from "@/providers/AuthProvider";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type QuickAddType = "allergen" | "intolerance";
type RecentScan = {
  id: string;
  name?: string;
  upc?: string;
  status: "safe" | "allergen" | "intolerance";
  createdAt?: string;
};

export default function Index() {
  const router = useRouter();
  const { user } = useAuthSession();

  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickAddType, setQuickAddType] = useState<QuickAddType>("allergen");
  const [quickAddValue, setQuickAddValue] = useState("");

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  const getStatusStyle = (status: "safe" | "allergen" | "intolerance") => {
    switch (status) {
      case "allergen":
        return styles.statusDanger;
      case "intolerance":
        return styles.statusWarning;
      default:
        return styles.statusSafe;
    }
  };

  const fetchRecentScans = useCallback(async () => {
    if (!user) {
      setRecentScans([]);
      setHistoryLoading(false);
      return;
    }

    try {
      setHistoryLoading(true);

      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      if (!API_URL) {
        throw new Error("EXPO_PUBLIC_API_URL is not set.");
      }

      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/users/${user.uid}/scans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load recent scans");
      }

      setRecentScans(data.scans || []);
    } catch (error) {
      console.log("Recent scans error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load recent scans"
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setStatusMessage(null);
      fetchRecentScans();
    }, [fetchRecentScans])
  );

  async function handleQuickAdd() {
    if (!user) {
      setErrorMessage("No user is signed in.");
      return;
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    const normalizedValue = quickAddValue.trim().toLowerCase();

    if (!API_URL) {
      setErrorMessage("EXPO_PUBLIC_API_URL is not set.");
      return;
    }

    if (!normalizedValue) {
      setErrorMessage("Please enter a value before saving.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const token = await user.getIdToken();

      const route =
        quickAddType === "allergen"
          ? `${API_URL}/users/${user.uid}/allergens`
          : `${API_URL}/users/${user.uid}/intolerances`;

      const response = await fetch(route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: normalizedValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add item");
      }

      setStatusMessage(
        quickAddType === "allergen"
          ? `Added allergen: ${normalizedValue}`
          : `Added intolerance: ${normalizedValue}`
      );

      setQuickAddValue("");
      setQuickAddVisible(false);
    } catch (error) {
      console.log("Quick add error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add item"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.innerContainer}>
          <Text style={styles.pageTitle}>Home</Text>
          <Text style={styles.pageSubtitle}>
            Add preferences fast, scan products, and review recent results.
          </Text>

          {loading && (
            <View style={styles.feedbackCard}>
              <ActivityIndicator size="small" />
              <Text style={styles.helperText}>Saving...</Text>
            </View>
          )}

          {statusMessage && !loading && (
            <View style={styles.feedbackCard}>
              <Text style={styles.successText}>{statusMessage}</Text>
            </View>
          )}

          {errorMessage && !loading && (
            <View style={styles.feedbackCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Scans</Text>

            {historyLoading ? (
              <ActivityIndicator size="small" />
            ) : recentScans.length === 0 ? (
              <Text style={styles.emptyText}>No recent scans yet.</Text>
            ) : (
              recentScans.map((item) => (
                <View key={item.id} style={styles.scanRow}>
                  <View style={styles.scanTextWrap}>
                    <Text style={styles.scanText}>
                      {item.name || item.upc || "Unnamed product"}
                    </Text>
                    {item.createdAt ? (
                      <Text style={styles.scanMetaText}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                    <Text style={styles.statusText}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.bottomNav}>
            <Pressable
              style={styles.navButtonSecondary}
              onPress={() => {
                setErrorMessage(null);
                setStatusMessage(null);
                setQuickAddType("allergen");
                setQuickAddValue("");
                setQuickAddVisible(true);
              }}
            >
              <Text style={styles.navButtonSecondaryText}>Quick Add</Text>
            </Pressable>

            <Pressable
              style={styles.navButtonPrimary}
              onPress={() => router.push("/camera")}
            >
              <Text style={styles.navButtonPrimaryText}>Scan</Text>
            </Pressable>

            <Pressable
              style={styles.navButtonSecondary}
              onPress={() => router.push("/profiles")}
            >
              <Text style={styles.navButtonSecondaryText}>Profile</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={quickAddVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickAddVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Quick Add</Text>
            <Text style={styles.helperText}>
              Add one allergen or intolerance without leaving Home.
            </Text>

            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.typeButton,
                  quickAddType === "allergen" && styles.typeButtonActive,
                ]}
                onPress={() => setQuickAddType("allergen")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    quickAddType === "allergen" && styles.typeButtonTextActive,
                  ]}
                >
                  Allergen
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.typeButton,
                  quickAddType === "intolerance" && styles.typeButtonActive,
                ]}
                onPress={() => setQuickAddType("intolerance")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    quickAddType === "intolerance" &&
                      styles.typeButtonTextActive,
                  ]}
                >
                  Intolerance
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder={
                quickAddType === "allergen"
                  ? "e.g., peanuts"
                  : "e.g., lactose"
              }
              placeholderTextColor="#64748b"
              value={quickAddValue}
              onChangeText={setQuickAddValue}
              autoCapitalize="none"
            />

            <View style={styles.modalButtonRow}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setQuickAddVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.modalSaveButton} onPress={handleQuickAdd}>
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#dbeafe",
    padding: 20,
  },
  innerContainer: {
    width: "100%",
    gap: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  pageTitle: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 8,
  },
  pageSubtitle: {
    color: "#334155",
    fontSize: 15,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#f8fbff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 260,
  },
  feedbackCard: {
    backgroundColor: "#f8fbff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 8,
  },
  cardTitle: {
    color: "#1d4ed8",
    fontSize: 18,
    fontWeight: "700",
  },
  helperText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  successText: {
    color: "#15803d",
    fontWeight: "700",
  },
  errorText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  scanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  scanTextWrap: {
    flex: 1,
  },
  scanText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  scanMetaText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  statusSafe: {
    backgroundColor: "#22c55e",
  },
  statusWarning: {
    backgroundColor: "#f59e0b",
  },
  statusDanger: {
    backgroundColor: "#ef4444",
  },
  bottomNav: {
    marginTop: "auto",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  navButtonPrimary: {
    flex: 1.2,
    backgroundColor: "#3b82f6",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  navButtonPrimaryText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  navButtonSecondary: {
    flex: 1,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#93c5fd",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  navButtonSecondaryText: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#f8fbff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 14,
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  typeButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  typeButtonTextActive: {
    color: "#1e3a8a",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: "#0f172a",
    fontSize: 15,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalSaveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
