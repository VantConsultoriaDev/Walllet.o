import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import ProtectedRoute from "@/components/protected-route"
import MainLayout from "@/components/layout/MainLayout"
import Dashboard from "@/pages/Dashboard"
import Agenda from "@/pages/Agenda"
import Clientes from "@/pages/Clientes"
import Financeiro from "@/pages/Financeiro"
import Sinistros from "@/pages/Sinistros"
import Cotacoes from "@/pages/Cotacoes"
import Representacoes from "@/pages/Representacoes"
import Login from "@/pages/Login"
import { Toaster } from "@/components/ui/toaster"

function App() {
  console.log('App component rendering...');
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/sinistros" element={<Sinistros />} />
                <Route path="/cotacoes" element={<Cotacoes />} />
                <Route path="/representacoes" element={<Representacoes />} />
                <Route path="*" element={<Dashboard />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  )
}

export default App