import { MessagesDashboard } from '@/components/MessagesDashboard';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="telegram-bot-theme">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <MessagesDashboard />
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;