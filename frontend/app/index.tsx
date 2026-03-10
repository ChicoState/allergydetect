import { Text, View, StyleSheet, Pressable, Button, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [contains, setContains] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const router = useRouter();

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

      <Pressable style={styles.button} onPress={() => router.push("/profiles")}>
        <Text style={styles.buttonText}>Profiles / Settings</Text>
      </Pressable>

      {/* Test UPC fetch */}
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

