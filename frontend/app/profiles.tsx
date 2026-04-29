import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthSession } from "@/providers/AuthProvider";

export default function ProfilesScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthSession();

  const [allergens, setAllergens] = useState<string[]>([]);
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    if (!user) {
      setErrorMessage("No user is signed in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      if (!API_URL) {
        throw new Error("EXPO_PUBLIC_API_URL is not set");
      }

      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/users/${user.uid}/allergies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load profile data");
      }

      setAllergens(data.allergens || []);
      setIntolerances(data.intolerances || []);
    } catch (error) {
      console.log("Error loading profile data:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load profile data"
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  const allergenLabel =
    allergens.length === 1 ? "1 Allergen" : `${allergens.length} Allergens`;

  const intoleranceLabel =
    intolerances.length === 1
      ? "1 Intolerance"
      : `${intolerances.length} Intolerances`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Profile</Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.accountText}>
          {user?.email ?? "No email available"}
        </Text>
      </View>

      {loading && (
        <View style={styles.sectionCard}>
          <ActivityIndicator size="small" />
          <Text style={styles.emptyText}>Loading profile data...</Text>
        </View>
      )}

      {errorMessage && !loading && (
        <View style={styles.sectionCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.editButton} onPress={fetchProfileData}>
            <Text style={styles.editButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !errorMessage && (
        <>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{allergenLabel}</Text>
              <Pressable
                style={styles.editButton}
                onPress={() => router.push("/edit-allergies")}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>

            <View style={styles.chipContainer}>
              {allergens.length > 0 ? (
                allergens.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.chip}>
                    <Text style={styles.chipText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No allergens added yet.</Text>
              )}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{intoleranceLabel}</Text>
              <Pressable
                style={styles.editButton}
                onPress={() => router.push("/edit-intolerances")}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>

            <View style={styles.chipContainer}>
              {intolerances.length > 0 ? (
                intolerances.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.chipAlt}>
                    <Text style={styles.chipText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No intolerances added yet.</Text>
              )}
            </View>
          </View>
        </>
      )}

      <View style={styles.row}>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      <Pressable style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>  
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#dbeafe",
    padding: 20,
    gap: 16,
  },
  pageTitle: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: "#f8fbff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#1d4ed8",
    fontSize: 18,
    fontWeight: "700",
  },
  editButton: {
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#93c5fd",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  editButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
    fontSize: 14,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: "#dbeafe",
    borderColor: "#60a5fa",
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipAlt: {
    backgroundColor: "#e0f2fe",
    borderColor: "#38bdf8",
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipText: {
    color: "#1e3a8a",
    fontWeight: "600",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
  },
  accountText: {
    color: "#334155",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#60a5fa",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  logoutButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#93c5fd",
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
