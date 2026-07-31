import ethIcon from '@/assets/image/network/eth.webp';
import solIcon from '@/assets/image/network/sol.webp';
import bnbIcon from '@/assets/image/network/bnb.webp';
import okbIcon from '@/assets/image/network/okb.webp';
import trxIcon from '@/assets/image/network/trx.webp';
import ploIcon from '@/assets/image/network/plo.webp';
import arbIcon from '@/assets/image/network/arb.webp';
import baseIcon from '@/assets/image/network/base.webp';

export interface TippingAddress {
  icon: string;
  name: string;
  color: string;
  address: string;
}
export const TIPPING_ADDRESS: TippingAddress[] = [
  {
    icon: bnbIcon,
    name: 'BSC (BNB Smart Chain)',
    color: '#F3BA2F',
    address: '0x383582221715cfc59e96eca54323e02a38b2c6c7'
  },
  {
    icon: trxIcon,
    name: 'TRON (Tron)',
    color: '#EF0027',
    address: 'TAWq6ipfpJLHPSey6V2zFZSgdT6Af3251e'
  },
  {
    icon: ploIcon,
    name: 'Polygon (Polygon)',
    color: '#8247E5',
    address: '0x383582221715cfc59e96eca54323e02a38b2c6c7'
  },
  {
    icon: arbIcon,
    name: 'ARB (Arbitrum One)',
    color: '#28A0F0',
    address: '0x383582221715cfc59e96eca54323e02a38b2c6c7'
  },
  {
    icon: ethIcon,
    name: 'Ethereum',
    color: '#6284f7',
    address: '0x383582221715cfc59e96eca54323e02a38b2c6c7'
  },
  {
    icon: solIcon,
    name: 'SOL (Solana)',
    color: '#9945FF',
    address: '5BVnGG1LvZXPye2dKMNgHkS9z9tk8FB1ZA9uBqEGMtoi'
  },
  {
    icon: okbIcon,
    name: 'XLayer (OKX Chain)',
    color: '#25F4A8',
    address: 'XKO383582221715cfc59e96eca54323e02a38b2c6c7'
  },
  {
    icon: baseIcon,
    name: 'Base (Base)',
    color: '#0052FF',
    address: '0x383582221715cfc59e96eca54323e02a38b2c6c7'
  }
];
