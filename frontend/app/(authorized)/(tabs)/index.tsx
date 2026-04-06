import { Text, View, StyleSheet, Pressable, Button, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuthSession } from '@/providers/AuthProvider';

export default function Index() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [contains, setContains] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const router = useRouter();
  const { user } = useAuthSession();

  async function handlePress() {
    const response = await fetch(
      'http://localhost:3000/ingredients/894700010021'
    );

    const data = await response.json();

    setIngredients(data.ingredients);
    setContains(data.contains);
  }

  async function saveAllergies() {
    if (!user) return;

    const allergyArray = allergyInput
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);

    try {
    
    const response = await fetch(`http://localhost:3000/users/${user.uid}/allergies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allergies: allergyArray // e.g., ["Peanuts", "Soy"]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    console.log('Success:', data.message);
    return data;
  } catch (error) {
    console.log('Error:', error);
  }
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

