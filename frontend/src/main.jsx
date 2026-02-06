

import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/contexts/AuthContext";
import App from "./App.jsx";
import "./index.css";
const root = document.getElementById("root");

createRoot(root).render(
    <AuthProvider>
        <App />
    </AuthProvider>
);

