// app/camera.tsx
import { useAuthSession } from "@/providers/AuthProvider";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function CameraScreen() {
  const router = useRouter();
  const { user } = useAuthSession();

  const [permission, requestPermission] = useCameraPermissions();

  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [scannedType, setScannedType] = useState<string | null>(null);
  const [scanningEnabled, setScanningEnabled] = useState(true);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [containsAllergens, setContainsAllergens] = useState<string[]>([]);
  const [containsIntolerances, setContainsIntolerances] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningVisible, setWarningVisible] = useState(false);

  const [manualUpc, setManualUpc] = useState("");

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission, requestPermission]);

  async function fetchScanResult(upc: string, scanTypeLabel: string) {
    if (!user) {
      setErrorMessage("No user logged in");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setWarningVisible(false);
      setScanningEnabled(false);

      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      if (!API_URL) {
        throw new Error("EXPO_PUBLIC_API_URL is not set");
      }

      const token = await user.getIdToken();

      setScannedValue(upc);
      setScannedType(scanTypeLabel);

      const response = await fetch(`${API_URL}/ingredients/${upc}/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch");
      }

      const flaggedAllergens = data.containsAllergens || [];
      const flaggedIntolerances = data.containsIntolerances || [];

      setIngredients(data.ingredients || []);
      setContainsAllergens(flaggedAllergens);
      setContainsIntolerances(flaggedIntolerances);

      if (flaggedAllergens.length > 0 || flaggedIntolerances.length > 0) {
        setWarningVisible(true);
      }

      console.log("SAFE:", data.safe);
      console.log("Allergens:", flaggedAllergens);
      console.log("Intolerances:", flaggedIntolerances);
    } catch (error) {
      console.log("Error fetching ingredients:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to fetch ingredients"
      );
    } finally {
      setLoading(false);
    }
  }

  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (!scanningEnabled) return;
    await fetchScanResult(result.data, result.type);
  };

  const handleManualUpcSubmit = async () => {
    const trimmedUpc = manualUpc.trim();

    if (!trimmedUpc) {
      setErrorMessage("Enter a UPC before testing.");
      return;
    }

    await fetchScanResult(trimmedUpc, "manual");
  };

  const resetScan = () => {
    setScannedValue(null);
    setScannedType(null);
    setIngredients([]);
    setContainsAllergens([]);
    setContainsIntolerances([]);
    setErrorMessage(null);
    setManualUpc("");
    setWarningVisible(false);
    setScanningEnabled(true);
  };

  const getOverallStatus = () => {
    if (containsAllergens.length > 0) return "allergen";
    if (containsIntolerances.length > 0) return "intolerance";
    if (ingredients.length > 0) return "safe";
    return null;
  };

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

  const overallStatus = getOverallStatus();

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Loading permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.centerText}>Camera permission required.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </Pressable>

        <View style={styles.manualTestCard}>
          <Text style={styles.manualTestTitle}>Test with UPC instead</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a UPC"
            placeholderTextColor="#64748b"
            value={manualUpc}
            onChangeText={setManualUpc}
            keyboardType="number-pad"
          />
          <Pressable style={styles.primaryButton} onPress={handleManualUpcSubmit}>
            <Text style={styles.primaryButtonText}>Test UPC</Text>
          </Pressable>
        </View>

        {errorMessage && <Text style={styles.alertText}>{errorMessage}</Text>}
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Scan</Text>

        <View style={styles.cameraCard}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["upc_a", "upc_e", "ean13", "ean8", "code128", "qr"],
            }}
          />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.topRow}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>

            {overallStatus && (
              <View style={[styles.statusBadge, getStatusStyle(overallStatus)]}>
                <Text style={styles.statusText}>{overallStatus.toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.metaText}>Type: {scannedType ?? "none"}</Text>
          <Text style={styles.metaText}>Value: {scannedValue ?? "none"}</Text>

          {loading && <ActivityIndicator size="small" />}

          {errorMessage && <Text style={styles.alertText}>{errorMessage}</Text>}

          {!loading && ingredients.length > 0 && (
            <View style={styles.resultBlock}>
              {containsAllergens.length === 0 ? (
                <Text style={styles.safeText}>Safe from saved allergens</Text>
              ) : (
                <Text style={styles.alertText}>
                  Contains allergens: {containsAllergens.join(", ")}
                </Text>
              )}

              {containsIntolerances.length > 0 && (
                <Text style={styles.warningText}>
                  Contains intolerances: {containsIntolerances.join(", ")}
                </Text>
              )}

              <Text style={styles.ingredientsTitle}>Ingredients</Text>
              {ingredients.slice(0, 8).map((item, index) => (
                <Text key={`${item}-${index}`} style={styles.ingredientItem}>
                  • {item}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.manualTestCard}>
            <Text style={styles.manualTestTitle}>Manual UPC Test</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a UPC"
              placeholderTextColor="#64748b"
              value={manualUpc}
              onChangeText={setManualUpc}
              keyboardType="number-pad"
            />
            <Pressable style={styles.primaryButton} onPress={handleManualUpcSubmit}>
              <Text style={styles.primaryButtonText}>Test UPC</Text>
            </Pressable>
          </View>

          <Pressable style={styles.primaryButton} onPress={resetScan}>
            <Text style={styles.primaryButtonText}>Scan Again</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={warningVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWarningVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.warningModalCard}>
            <Text style={styles.warningModalTitle}>Warning</Text>

            {containsAllergens.length > 0 && (
              <Text style={styles.warningModalText}>
                Allergens detected: {containsAllergens.join(", ")}
              </Text>
            )}

            {containsIntolerances.length > 0 && (
              <Text style={styles.warningModalText}>
                Intolerances detected: {containsIntolerances.join(", ")}
              </Text>
            )}

            <Pressable
              style={styles.warningModalButton}
              onPress={() => setWarningVisible(false)}
            >
              <Text style={styles.warningModalButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#dbeafe",
    padding: 16,
    gap: 16,
  },
  pageTitle: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 8,
  },
  cameraCard: {
    backgroundColor: "#f8fbff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    overflow: "hidden",
    minHeight: 420,
  },
  camera: {
    width: "100%",
    height: 420,
  },
  infoCard: {
    backgroundColor: "#f8fbff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 12,
  },
  manualTestCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 10,
  },
  manualTestTitle: {
    color: "#1d4ed8",
    fontSize: 16,
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#ffffff",
  },
  backButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  metaText: {
    color: "#334155",
    fontSize: 14,
  },
  resultBlock: {
    gap: 8,
  },
  safeText: {
    color: "#15803d",
    fontWeight: "700",
  },
  alertText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  warningText: {
    color: "#d97706",
    fontWeight: "700",
  },
  ingredientsTitle: {
    color: "#1d4ed8",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  ingredientItem: {
    color: "#334155",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
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
  center: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    padding: 20,
    gap: 12,
  },
  centerText: {
    color: "#334155",
    fontSize: 16,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  warningModalCard: {
    width: "100%",
    backgroundColor: "#fff7ed",
    borderRadius: 22,
    padding: 20,
    borderWidth: 2,
    borderColor: "#fb923c",
    gap: 14,
  },
  warningModalTitle: {
    color: "#c2410c",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  warningModalText: {
    color: "#7c2d12",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
  warningModalButton: {
    backgroundColor: "#ea580c",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  warningModalButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
