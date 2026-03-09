// app/index.tsx
import { Text, View, StyleSheet, Pressable, Button } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function Index() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const router = useRouter();

  const params = useLocalSearchParams();
  const scannedUpc = params.scannedUpc as string;

  // Automatically fetch ingredients when a new scannedUpc arrives
  useEffect(() => {
    async function fetchScannedItem() {
      if (scannedUpc) {
        try {
          const data = await getIngredients(scannedUpc);
          setIngredients(data);
        } catch (error) {
          console.error("Failed to fetch ingredients:", error);
        }
      }
    }

    fetchScannedItem();
  }, [scannedUpc]);

  async function handlePress() {
    const targetUpc = scannedUpc || "012345678905"; // Default UPC for testing
    const data = await getIngredients(targetUpc);
    setIngredients(data);
    console.log(data);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home screen</Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push('/camera')}
      >
        <Text style={styles.buttonText}>Scan Barcode</Text>
      </Pressable>

      {scannedUpc ? (
        <Text style={styles.text}>Scanned UPC: {scannedUpc}</Text>
      ) : null}

      <Button title="Test UPC" onPress={handlePress} />

      {ingredients.map((item, index) => (
        <Text key={index} style={styles.text}>
          {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    marginBottom: 20,
  },
  button: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
  },
});

async function getIngredients(upc: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    const ingredients = data.items[0].description
      .split(',')
      .map((i: string) => i.trim());

    return ingredients;
  } catch (error) {
    console.error('Error fetching UPC data:', error);
    return [];
  }
}

