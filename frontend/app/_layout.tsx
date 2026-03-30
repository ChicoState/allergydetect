import AuthProvider from "@/providers/AuthProvider";
import { Stack } from "expo-router";
import { Slot } from "expo-router";
import {ReactNode} from "react";

export default function RootLayout(): ReactNode {
    return (
        <AuthProvider>
            <Slot />
        </AuthProvider>
    );
}
/*export default function RootLayout() {
  return <Stack />;
}*/
