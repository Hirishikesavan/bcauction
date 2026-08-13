// ════════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE RAZORPAY HELPERS
// Single source of truth for loading the Razorpay checkout SDK and
// opening the payment modal.
//
// Usage:
//   import { loadRazorpay, openCheckout } from '@/lib/razorpay';
//   await loadRazorpay();
//   openCheckout({ orderId, keyId, amount, ... });
// ════════════════════════════════════════════════════════════════════════════

declare global {
  interface Window {
    Razorpay: any;
    __rzpLoaded: boolean;
    __rzpLoading: boolean;
  }
}

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loads the Razorpay checkout.js script exactly once.
 * Resolves when the script is ready; rejects after 15 s timeout.
 */
export const loadRazorpay = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Not in browser'));
    if (window.__rzpLoaded && window.Razorpay) return resolve();

    if (window.__rzpLoading) {
      // Wait for the in-flight load to complete
      const wait = setInterval(() => {
        if (window.__rzpLoaded && window.Razorpay) { clearInterval(wait); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(wait); reject(new Error('Razorpay load timeout')); }, 15000);
      return;
    }

    window.__rzpLoading = true;
    const script = document.createElement('script');
    script.src  = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => {
      window.__rzpLoaded  = true;
      window.__rzpLoading = false;
      resolve();
    };
    script.onerror = () => {
      window.__rzpLoading = false;
      reject(new Error('Failed to load Razorpay script'));
    };
    document.head.appendChild(script);

    setTimeout(() => reject(new Error('Razorpay script load timeout')), 15000);
  });
};

export interface CheckoutOptions {
  orderId:     string;
  keyId:       string;
  amount:      number;          // paise
  name:        string;          // merchant / event name displayed in modal
  description: string;
  prefillName?:  string;
  prefillEmail?: string;
  prefillPhone?: string;
  onSuccess: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
}

/**
 * Open the Razorpay checkout modal.
 * Call loadRazorpay() first.
 */
export const openCheckout = (opts: CheckoutOptions): void => {
  if (!window.Razorpay) throw new Error('Razorpay SDK not loaded — call loadRazorpay() first');

  const rzp = new window.Razorpay({
    key:         opts.keyId,
    order_id:    opts.orderId,
    amount:      opts.amount,
    currency:    'INR',
    name:        opts.name,
    description: opts.description,
    prefill: {
      name:    opts.prefillName  || '',
      email:   opts.prefillEmail || '',
      contact: opts.prefillPhone || '',
    },
    theme: { color: '#f59e0b' },    // matches Beast Cricket gold
    modal: {
      ondismiss: opts.onDismiss || (() => {}),
      escape: true,
    },
    handler: opts.onSuccess,
  });

  rzp.on('payment.failed', (resp: any) => {
    console.error('Razorpay payment.failed:', resp?.error);
    opts.onFailure?.(resp?.error || resp);
  });

  rzp.open();
};
