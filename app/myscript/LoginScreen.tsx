import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native";
import Toast from "react-native-toast-message";
import { USER_URL } from "./base_url";

console.log(USER_URL);
interface MyToken {
    id?: string;
    email?: string;
    mobile?: string;
    role?: string;
    iat?: number;
    exp?: number;
}

export const decodeToken = (token: string): MyToken | null => {
    try {
        const decoded: MyToken = jwtDecode(token);
        return decoded;
    } catch (error) {
        console.error("Invalid token:", error);
        return null;
    }
};

const LoginScreen = () => {
    const router = useRouter();
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const validatePassword = (pwd: string) =>
        /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/.test(pwd);

    const validateMobile = (num: string) => /^[6-9]\d{9}$/.test(num);

    const showToast = (type: "success" | "error", text1: string, text2?: string) => {
        Toast.show({
            type,
            text1,
            text2,
            position: "top",
            visibilityTime: 3000,
        });
    };

    const handleLogin = async () => {
        if (!mobile || !password) {
            showToast("Error", "Please enter both mobile number and password");
            //Alert.alert("Error", "Please enter both mobile number and password");
            return;
        }

        if (!validateMobile(mobile)) {
            Alert.alert("Error", "Invalid mobile number");
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert(
                "Error",
                "Password must be at least 8 characters long and include at least one number and one special character!"
            );
            return;
        }
             
        setLoading(true);

        try {
            const res = await axios.post(`${USER_URL}/login`, { mobile, password });
            const token: string = res.data.token;

            await AsyncStorage.setItem("jwtToken", token);
            const decoded = decodeToken(token);

            if (!decoded?.role) throw new Error("Role not found in token");
            //router.replace("/(tabs)");
            router.push(`/(tabs)/${decoded.role.toLowerCase()}`);
        } catch (error: any) {
            console.log(error.response?.data || error.message);
            Alert.alert(
                "Login Failed",
                error.response?.data?.message || "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterNavigation = () => {
        router.replace("../myscript/RegisterScreen");
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <TextInput
                placeholder="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                style={styles.input}
                keyboardType="phone-pad"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Login</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRegisterNavigation}>
                <Text style={styles.registerText}>New User? Register here</Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 30,
        alignSelf: "center",
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        marginBottom: 15,
        paddingHorizontal: 15,
        backgroundColor: "#fff",
    },
    button: {
        height: 50,
        backgroundColor: "#007bff",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 18,
    },
    registerText: {
        marginTop: 15,
        color: "#007bff",
        fontSize: 16,
        textAlign: "center",
        textDecorationLine: "underline",
    },
});