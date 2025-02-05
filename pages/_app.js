// pages/_app.js
import '../styles/globals.css';
// Import wallet adapter UI global styles here as well
import '@solana/wallet-adapter-react-ui/styles.css';
import dynamic from 'next/dynamic';

const WalletConnectionProvider = dynamic(
  () => import('../components/WalletConnectionProvider'),
  { ssr: false }
);

function MyApp({ Component, pageProps }) {
  return (
    <WalletConnectionProvider>
      <Component {...pageProps} />
    </WalletConnectionProvider>
  );
}

export default MyApp;
