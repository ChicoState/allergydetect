import { Text, View, StyleSheet, Pressable, Button } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const router = useRouter();

  async function handlePress() {
    const data = await getIngredients('894700010021');
    setIngredients(data);
    console.log(data);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home screen</Text>

      {/* Scan Barcode navigation */}
      <Pressable
        style={styles.button}
        onPress={() => router.push('/camera')}
      >
        <Text style={styles.buttonText}>Scan Barcode</Text>
      </Pressable>

      {/* Test UPC fetch */}
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
  },
  buttonText: {
    color: '#fff',
  },
});

async function getIngredients(upc: string): Promise<string[]> {
const response = await fetch(`http://localhost:3000/ingredients/${upc}`);
const data = await response.json();
return data.ingredients;
}


//getIngredients('894700010021');
