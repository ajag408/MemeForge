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
      <head>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      </head>
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