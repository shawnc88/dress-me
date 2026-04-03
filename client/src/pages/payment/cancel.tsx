import { useRouter } from 'next/router';
import Head from 'next/head';
import { X } from 'lucide-react';

export default function PaymentCancel() {
  const router = useRouter();

  return (
    <>
      <Head><title>Payment Cancelled - Dress Me</title></Head>
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-white/40" />
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Payment Cancelled</h1>
          <p className="text-white/50 text-sm mb-6">No charges were made</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    </>
  );
}
