import { MessagesDashboard } from './components/MessagesDashboard';
import { BotSetup } from './components/BotSetup';
import { WebhookTester } from './components/WebhookTester';
import { TelegramTester } from './components/TelegramTester';
import { WebhookConfigurator } from './components/WebhookConfigurator';
import { ThemeProvider } from './components/theme-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="telegram-bot-theme">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">Messages Dashboard</TabsTrigger>
              <TabsTrigger value="setup">Bot Setup</TabsTrigger>
              <TabsTrigger value="webhook">Webhook Config</TabsTrigger>
              <TabsTrigger value="testing">System Health</TabsTrigger>
              <TabsTrigger value="telegram">Telegram Test</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <MessagesDashboard />
            </TabsContent>
            <TabsContent value="setup">
              <BotSetup />
            </TabsContent>
            <TabsContent value="webhook">
              <WebhookConfigurator />
            </TabsContent>
            <TabsContent value="testing">
              <WebhookTester />
            </TabsContent>
            <TabsContent value="telegram">
              <TelegramTester />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;