import { Text, View, StyleSheet, Pressable, Button, TextInput, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function Index() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [contains, setContains] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
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
    const response = await fetch(
      'http://localhost:3000/ingredients/894700010021'
    );

    const data = await response.json();

    setIngredients(data.ingredients);
    setContains(data.contains);
  }

  async function saveAllergies() {
    const allergyArray = allergyInput
      .split(',')
      .map(item => item.trim().toLowerCase());

    await fetch('http://localhost:3000/allergies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergies: allergyArray }),
    });

    console.log('Allergies saved');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.text}>Home screen</Text>

      {/* Allergy Input */}
      <TextInput
        style={styles.input}
        placeholder="milk, soy, peanuts"
        value={allergyInput}
        onChangeText={setAllergyInput}
      />

      <Button title="Save Allergies" onPress={saveAllergies} />

      {/* Scan Barcode navigation */}
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

      {contains.length > 0 && (
        <Text style={styles.alert}>
          CONTAINS: {contains.join(', ')}
        </Text>
      )}

      {ingredients.map((item, index) => (
        <Text key={index} style={styles.text}>
          {item}
        </Text>
      ))}

    </ScrollView>
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
  input: {
    backgroundColor: '#fff',
    width: 250,
    padding: 8,
    marginBottom: 10,
  },
  alert: {
    color: 'red',
    marginTop: 20,
    fontWeight: 'bold',
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

