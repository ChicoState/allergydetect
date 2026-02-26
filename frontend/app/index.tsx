import { Text, View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home screen</Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push('/camera')}
      >
        <Text style={styles.buttonText}>Scan Barcode</Text>
      </Pressable>
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
  const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
  const data = await response.json();
  const ingredients = data.items[0].description;
  //console.log(ingredients.split(', '));
  return ingredients.split(', ');
}

//getIngredients('894700010021');
