import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

type FavoriteItem = { id: string; name: string };

export default function ProfilesScreen() {
  const router = useRouter();

  // havnt implemented yet but should be the list of favs
  const favorites: FavoriteItem[] = [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profiles / Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorites</Text>
        <Text style={styles.empty}>No favorites yet.</Text>
      </View>

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => { /* placeholder */ }}>
          <Text style={styles.buttonText}>Create/Edit Profiles</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#25292e", gap: 15, padding: 16},
  title: { color: "#fff", fontSize: 22},
  section: { borderWidth: 1, borderColor: "#fff", borderRadius: 12, padding: 12, gap: 8 },
  sectionTitle: { color: "#fff", fontSize: 16},
  empty: { color: "#bbb" },
  row: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: "#fff", borderRadius: 10 },
  buttonText: { color: "#fff" },
});
