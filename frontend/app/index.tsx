import { Text, View, StyleSheet, Button } from 'react-native';
import { useState } from 'react';

export default function Index() {
  const [ingredients, setIngredients] = useState<string[]>([]);

  async function handlePress() {
    const data = await getIngredients('894700010021');
    setIngredients(data);
    console.log(data);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home screen</Text>

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
  },
});

async function getIngredients(upc: string): Promise<string[]> {
const response = await fetch(`http://localhost:3000/ingredients/${upc}`);
const data = await response.json();
return data.ingredients;
}


//getIngredients('894700010021');
