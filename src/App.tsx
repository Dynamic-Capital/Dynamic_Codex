import { MessagesDashboard } from '@/components/MessagesDashboard';
import { BotSetup } from '@/components/BotSetup';
import { WebhookTester } from '@/components/WebhookTester';
import { ThemeProvider } from '@/components/theme-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="telegram-bot-theme">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Messages Dashboard</TabsTrigger>
              <TabsTrigger value="setup">Bot Setup</TabsTrigger>
              <TabsTrigger value="testing">System Health</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <MessagesDashboard />
            </TabsContent>
            <TabsContent value="setup">
              <BotSetup />
            </TabsContent>
            <TabsContent value="testing">
              <WebhookTester />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;