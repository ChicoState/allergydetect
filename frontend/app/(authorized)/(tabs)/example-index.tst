import { useAuthSession } from "@/providers/AuthProvider";
import { View, Text, Button } from "react-native";

export default function Index() {
  const { signOut, user } = useAuthSession();

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        backgroundColor: '#FFFFFF'
      }}
    >
      <Text>Home</Text>
      <Text>{`Signed in as: ${user?.email}`}</Text>
      <Button title={"Logout"} onPress={signOut} />
    </View>
  );
}
