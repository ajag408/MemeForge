import { ContractProvider } from '../contexts/ContractContext';
import MainLayout from '@/components/layout/MainLayout';
import '@/styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ContractProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </ContractProvider>
      </body>
    </html>
  );
}