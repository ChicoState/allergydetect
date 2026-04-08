import { useAuthSession } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Index() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [containsAllergens, setContainsAllergens] = useState<string[]>([]);
  const [containsIntolerances, setContainsIntolerances] = useState<string[]>([]);
  const [allergenInput, setAllergenInput] = useState('');
  const [intoleranceInput, setIntoleranceInput] = useState('');
  const router = useRouter();
  const { user } = useAuthSession();

  async function handlePress() {
    if (!user) {
      console.log("No user logged in");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/ingredients/894700010021/${user.uid}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch");
      }

      setIngredients(data.ingredients);
      setContainsAllergens(data.containsAllergens);
      setContainsIntolerances(data.containsIntolerances);

      console.log("SAFE:", data.safe);
      console.log("Allergens matched:", data.containsAllergens);
      console.log("Intolerances matched:", data.containsIntolerances);

    } catch (error) {
      console.log("Error:", error);
    }
  }

  async function saveAllergies() {
    if (!user) return;

    const allergenArray = allergenInput
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);

    const intoleranceArray = intoleranceInput
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
          allergens: allergenArray,
          intolerances: intoleranceArray
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.text}>Home screen</Text>

        {/* Allergy Input */}
        <TextInput
          style={styles.input}
          placeholder="Allergens (e.g., peanuts, milk)"
          value={allergenInput}
          onChangeText={setAllergenInput}
        />

        <TextInput
          style={styles.input}
          placeholder="Intolerances (e.g., lactose, gluten)"
          value={intoleranceInput}
          onChangeText={setIntoleranceInput}
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
      </View>

      {/* Display allergen/intolerance alerts */}
      {ingredients.length > 0 && (
        <>
          {containsAllergens.length === 0 ? (
            <Text style={{ color: 'green', marginTop: 20, fontWeight: 'bold' }}>
              ✅ SAFE (No allergens)
            </Text>
          ) : (
            <Text style={styles.alert}>
              ⚠️ Contains allergens: {containsAllergens.join(', ')}
            </Text>
          )}

          {containsIntolerances.length > 0 && (
            <Text style={{ color: 'orange', marginTop: 10, fontWeight: 'bold' }}>
              ⚠️ Contains intolerances: {containsIntolerances.join(', ')}
            </Text>
          )}
        </>
      )}

      {/* Ingredients list */}
      {ingredients.map((item, index) => (
        <Text key={index} style={styles.text}>
          {item}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#25292e',
    padding: 20,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 250,               // limits how wide it can grow on large screens
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
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 8,
    marginBottom: 10,
    borderRadius: 6,
  },
  alert: {
    color: 'red',
    marginTop: 20,
    fontWeight: 'bold',
  },
});