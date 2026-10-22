import api, { errMsg } from './api';
import toast from 'react-hot-toast';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Opens Razorpay (or the demo payment when no keys are configured), then verifies on the server.
export async function startPayment({ order, razorpay, demoPayment, user, storeName, onDone }) {
  const verify = async (body) => {
    try {
      await api.post(`/orders/${order._id}/verify-payment`, body);
      toast.success('Payment received');
    } catch (e) { toast.error(errMsg(e)); }
    onDone && onDone();
  };

  if (demoPayment || !razorpay) {
    if (window.confirm('Demo payment (no Razorpay keys set). Press OK to simulate a successful payment.')) return verify({ mock: true });
    toast('Payment pending. You can pay from the order page.');
    return onDone && onDone();
  }

  if (!(await loadRazorpay())) { toast.error('Could not load the payment window'); return onDone && onDone(); }
  const rz = new window.Razorpay({
    key: razorpay.key,
    amount: razorpay.amount,
    currency: 'INR',
    name: storeName,
    description: `Order ${order.orderNumber}`,
    order_id: razorpay.orderId,
    prefill: { name: user?.name, email: user?.email, contact: order.shippingAddress?.phone },
    theme: { color: '#0F2D28' },
    handler: (resp) => verify(resp),
    modal: { ondismiss: () => { toast('Payment pending. You can pay from the order page.'); onDone && onDone(); } },
  });
  rz.open();
}
