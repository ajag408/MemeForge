import { ContractProvider } from '../contexts/ContractContext';
import MainLayout from '@/components/layout/MainLayout';
import '@/styles/globals.css';
import { SmartAccountProvider } from '@/contexts/SmartAccountContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SmartAccountProvider>
          <ContractProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </ContractProvider>
        </SmartAccountProvider>
      </body>
    </html>
  );
}