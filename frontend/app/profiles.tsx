import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthSession } from "@/providers/AuthProvider";

type EditCategory = "allergen" | "intolerance";

export default function ProfilesScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthSession();

  const [allergens, setAllergens] = useState<string[]>([]);
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<EditCategory>("allergen");
  const [inputValue, setInputValue] = useState("");

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

  const openEditActions = (category: EditCategory) => {
    setSelectedCategory(category);
    setStatusMessage(null);
    setErrorMessage(null);
    setActionModalVisible(true);
  };

  const openAddModal = () => {
    setActionModalVisible(false);
    setInputValue("");
    setInputModalVisible(true);
  };

  const openDeleteModal = () => {
    setActionModalVisible(false);
    setDeleteModalVisible(true);
  };

  const handleAddItem = async () => {
    if (!user) {
      setErrorMessage("No user is signed in.");
      return;
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    const normalizedValue = inputValue.trim().toLowerCase();

    if (!API_URL) {
      setErrorMessage("EXPO_PUBLIC_API_URL is not set");
      return;
    }

    if (!normalizedValue) {
      setErrorMessage("Please enter a value.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const token = await user.getIdToken();

      const route =
        selectedCategory === "allergen"
          ? `${API_URL}/users/${user.uid}/allergens`
          : `${API_URL}/users/${user.uid}/intolerances`;

      const response = await fetch(route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: normalizedValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add item");
      }

      setAllergens(data.allergens || []);
      setIntolerances(data.intolerances || []);
      setStatusMessage(
        selectedCategory === "allergen"
          ? `Added allergen: ${normalizedValue}`
          : `Added intolerance: ${normalizedValue}`
      );

      setInputValue("");
      setInputModalVisible(false);
    } catch (error) {
      console.log("Error adding item:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add item"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (name: string) => {
    if (!user) {
      setErrorMessage("No user is signed in.");
      return;
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    if (!API_URL) {
      setErrorMessage("EXPO_PUBLIC_API_URL is not set");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const token = await user.getIdToken();
      const encodedName = encodeURIComponent(name);

      const route =
        selectedCategory === "allergen"
          ? `${API_URL}/users/${user.uid}/allergens/${encodedName}`
          : `${API_URL}/users/${user.uid}/intolerances/${encodedName}`;

      const response = await fetch(route, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete item");
      }

      setAllergens(data.allergens || []);
      setIntolerances(data.intolerances || []);
      setStatusMessage(
        selectedCategory === "allergen"
          ? `Deleted allergen: ${name}`
          : `Deleted intolerance: ${name}`
      );

      setDeleteModalVisible(false);
    } catch (error) {
      console.log("Error deleting item:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete item"
      );
    } finally {
      setLoading(false);
    }
  };

  const currentItems =
    selectedCategory === "allergen" ? allergens : intolerances;

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Profile</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.accountText}>
            {user?.email ?? "No email available"}
          </Text>
        </View>

        {statusMessage && !loading && (
          <View style={styles.sectionCard}>
            <Text style={styles.successText}>{statusMessage}</Text>
          </View>
        )}

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
                  onPress={() => openEditActions("allergen")}
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
                  onPress={() => openEditActions("intolerance")}
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
                  <Text style={styles.emptyText}>
                    No intolerances added yet.
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        <View style={styles.row}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={signOut}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Edit {selectedCategory === "allergen" ? "Allergens" : "Intolerances"}
            </Text>

            <Pressable style={styles.modalPrimaryButton} onPress={openAddModal}>
              <Text style={styles.modalPrimaryButtonText}>
                Add {selectedCategory === "allergen" ? "Allergen" : "Intolerance"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.modalSecondaryButton}
              onPress={openDeleteModal}
            >
              <Text style={styles.modalSecondaryButtonText}>
                Delete{" "}
                {selectedCategory === "allergen" ? "Allergen" : "Intolerance"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={inputModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInputModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Add {selectedCategory === "allergen" ? "Allergen" : "Intolerance"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={
                selectedCategory === "allergen"
                  ? "e.g., peanuts"
                  : "e.g., lactose"
              }
              placeholderTextColor="#64748b"
              value={inputValue}
              onChangeText={setInputValue}
              autoCapitalize="none"
            />

            <View style={styles.modalRow}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setInputModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.modalPrimaryButton}
                onPress={handleAddItem}
              >
                <Text style={styles.modalPrimaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Delete {selectedCategory === "allergen" ? "Allergen" : "Intolerance"}
            </Text>

            {currentItems.length === 0 ? (
              <Text style={styles.emptyText}>
                No {selectedCategory === "allergen" ? "allergens" : "intolerances"}{" "}
                to delete.
              </Text>
            ) : (
              currentItems.map((item, index) => (
                <Pressable
                  key={`${item}-${index}`}
                  style={styles.deleteItemButton}
                  onPress={() => handleDeleteItem(item)}
                >
                  <Text style={styles.deleteItemButtonText}>{item}</Text>
                </Pressable>
              ))
            )}

            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setDeleteModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  successText: {
    color: "#15803d",
    fontSize: 14,
    fontWeight: "700",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#f8fbff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 14,
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "700",
  },
  modalRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalPrimaryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
  },
  modalPrimaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  modalSecondaryButton: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#93c5fd",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalSecondaryButtonText: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 15,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
  },
  modalCancelButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: "#0f172a",
    fontSize: 15,
  },
  deleteItemButton: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  deleteItemButtonText: {
    color: "#b91c1c",
    fontWeight: "700",
    textAlign: "center",
  },
});
