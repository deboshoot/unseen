import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Arena from "./pages/Arena";
import ArenaChoice from "./pages/ArenaChoice";
import MusicArena from "./pages/MusicArena";
import Gallery from "./pages/Gallery";
import Regolamento from "./pages/Regolamento";
import Submit from "./pages/Submit";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <div translate="no" className="notranslate">
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/arena" element={<ArenaChoice />} />
          <Route path="/arena/fotografica" element={<Arena />} />
          <Route path="/arena/musicale" element={<MusicArena />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/regolamento" element={<Regolamento />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  </div>
);

export default App;
