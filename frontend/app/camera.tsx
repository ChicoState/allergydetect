// app/camera.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [scannedType, setScannedType] = useState<string | null>(null);
  const [scanningEnabled, setScanningEnabled] = useState(true);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission, requestPermission]);

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (!scanningEnabled) return; // prevents repeated scans firing
    setScanningEnabled(false);

    setScannedValue(result.data); // <-- this is your UPC/barcode number (string)
    setScannedType(result.type);

    console.log("Scanned type:", result.type);
    console.log("Scanned data:", result.data);
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
        // Optional: restrict to common barcode types (helps performance/accuracy)
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

        <Pressable
          style={styles.btn}
          onPress={() => {
            setScannedValue(null);
            setScannedType(null);
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
  camera: { 
    flex: 1//, 
    //transform: [{ scaleX: -1 }],
  },
  controls: { padding: 12, gap: 10, alignItems: "center" },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderRadius: 8 },
  text: { fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
