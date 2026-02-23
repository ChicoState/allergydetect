import { Text, View,  StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home screen</Text>
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
  const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
  const data = await response.json();
  const ingredients = data.items[0].description;
  //console.log(ingredients.split(', '));
  return ingredients.split(', ');
}

//getIngredients('894700010021');
