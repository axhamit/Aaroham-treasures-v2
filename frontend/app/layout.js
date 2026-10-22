import { Bodoni_Moda, Jost } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const display = Bodoni_Moda({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Jost({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = { title: 'Aaroham treasures', description: 'Watches, leather, fragrance and fine jewellery.' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
