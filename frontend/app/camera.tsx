// app/camera.tsx
import { useAuthSession } from "@/providers/AuthProvider";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export default function CameraScreen() {
  const router = useRouter();
  const { user } = useAuthSession();

  const [permission, requestPermission] = useCameraPermissions();

  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [scannedType, setScannedType] = useState<string | null>(null);
  const [scanningEnabled, setScanningEnabled] = useState(true);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [contains, setContains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission, requestPermission]);

  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (!scanningEnabled) return;

    if (!user) {
      console.log("No user logged in");
      return;
    }

    setScanningEnabled(false);
    setLoading(true);

    const barcode = result.data;

    setScannedValue(barcode);
    setScannedType(result.type);

    try {
      const response = await fetch(
        `http://localhost:3000/ingredients/${barcode}/${user.uid}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch");
      }

      setIngredients(data.ingredients);
      setContains(data.contains);

      console.log("SAFE:", data.safe);
      console.log("Matches:", data.contains);

    } catch (error) {
      console.log("Error fetching ingredients:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Loading permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Camera permission required.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["upc_a", "upc_e", "ean13", "ean8", "code128", "qr"],
        }}
      />

      <View style={styles.controls}>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text>Back</Text>
        </Pressable>

        <Text style={styles.text}>Type: {scannedType ?? "none"}</Text>
        <Text style={styles.text}>Value: {scannedValue ?? "none"}</Text>

        {loading && <ActivityIndicator />}

        {/* ✅ RESULT DISPLAY */}
        {ingredients.length > 0 && !loading && (
          contains.length === 0 ? (
            <Text style={{ color: "green", fontWeight: "bold" }}>
              ✅ SAFE
            </Text>
          ) : (
            <Text style={{ color: "red", fontWeight: "bold" }}>
              ⚠️ CONTAINS: {contains.join(", ")}
            </Text>
          )
        )}

        {/* Optional: show ingredients */}
        {ingredients.map((item, index) => (
          <Text key={index} style={styles.text}>
            {item}
          </Text>
        ))}

        <Pressable
          style={styles.btn}
          onPress={() => {
            setScannedValue(null);
            setScannedType(null);
            setIngredients([]);
            setContains([]);
            setScanningEnabled(true);
          }}
        >
          <Text>Scan Again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  controls: { padding: 12, gap: 10, alignItems: "center" },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderRadius: 8 },
  text: { fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});