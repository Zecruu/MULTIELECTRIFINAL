# Stripe Test Card Information

## 🔐 Test Mode Credentials

Your Stripe account is currently in **TEST MODE**. This means:
- No real money will be charged
- You can use test card numbers to simulate payments
- All transactions are fake and for testing purposes only

---

## ✅ Successful Payment Test Cards

### **Basic Test Card (Most Common)**
```
Card Number:    4242 4242 4242 4242
Expiry Date:    Any future date (e.g., 12/25, 01/26, etc.)
CVC:            Any 3 digits (e.g., 123, 456, 789)
ZIP Code:       Any 5 digits (e.g., 12345, 90210)
```

### **Visa**
```
Card Number:    4242 4242 4242 4242
Expiry:         Any future date
CVC:            Any 3 digits
```

### **Visa (Debit)**
```
Card Number:    4000 0566 5566 5556
Expiry:         Any future date
CVC:            Any 3 digits
```

### **Mastercard**
```
Card Number:    5555 5555 5555 4444
Expiry:         Any future date
CVC:            Any 3 digits
```

### **Mastercard (Debit)**
```
Card Number:    5200 8282 8282 8210
Expiry:         Any future date
CVC:            Any 3 digits
```

### **American Express**
```
Card Number:    3782 822463 10005
Expiry:         Any future date
CVC:            Any 4 digits (e.g., 1234)
```

### **Discover**
```
Card Number:    6011 1111 1111 1117
Expiry:         Any future date
CVC:            Any 3 digits
```

---

## ❌ Declined Payment Test Cards

### **Generic Decline**
```
Card Number:    4000 0000 0000 0002
Result:         Card declined (generic)
```

### **Insufficient Funds**
```
Card Number:    4000 0000 0000 9995
Result:         Card declined (insufficient funds)
```

### **Lost Card**
```
Card Number:    4000 0000 0000 9987
Result:         Card declined (lost card)
```

### **Stolen Card**
```
Card Number:    4000 0000 0000 9979
Result:         Card declined (stolen card)
```

### **Expired Card**
```
Card Number:    4000 0000 0000 0069
Result:         Card declined (expired card)
```

### **Incorrect CVC**
```
Card Number:    4000 0000 0000 0127
Result:         Card declined (incorrect CVC)
```

### **Processing Error**
```
Card Number:    4000 0000 0000 0119
Result:         Card declined (processing error)
```

---

## 🔄 Special Test Scenarios

### **Requires Authentication (3D Secure)**
```
Card Number:    4000 0025 0000 3155
Result:         Requires authentication (will show a test authentication modal)
```

### **Always Requires Authentication**
```
Card Number:    4000 0027 6000 3184
Result:         Always requires authentication
```

### **Charge Succeeds After Authentication**
```
Card Number:    4000 0025 0000 3155
Result:         Payment succeeds after completing authentication
```

---

## 📝 How to Test Checkout

1. **Go to your website** and add products to cart
2. **Click "Proceder al Pago"** (Proceed to Checkout)
3. **Fill in shipping information:**
   - Name: Test User
   - Email: test@example.com
   - Phone: 555-1234
   - Address: 123 Test St
   - City: Test City
   - State: CA
   - ZIP: 12345

4. **Enter test card details:**
   - Card Number: `4242 4242 4242 4242`
   - Expiry: `12/25` (or any future date)
   - CVC: `123` (any 3 digits)

5. **Click "Pay Now"**
6. **You should see:** Order confirmation page with order number

---

## 🌍 International Test Cards

### **Mexico (MX)**
```
Card Number:    4000 0048 4000 0008
Country:        Mexico
```

### **Canada (CA)**
```
Card Number:    4000 0012 4000 0000
Country:        Canada
```

### **United Kingdom (GB)**
```
Card Number:    4000 0082 6000 0000
Country:        United Kingdom
```

---

## 💡 Testing Tips

1. **Use the basic card first**: `4242 4242 4242 4242` is the easiest to remember
2. **Any future date works**: Don't worry about the exact expiry date
3. **Any CVC works**: Use `123` or any 3-digit number
4. **Test declined cards**: Try `4000 0000 0000 0002` to see error handling
5. **Check order history**: After successful payment, check `/cuenta` to see your order

---

## 🔍 Viewing Test Payments in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/payments
2. Login with your Stripe account
3. You'll see all test payments made with these cards
4. Click on any payment to see full details

---

## ⚠️ Important Notes

- **These cards ONLY work in TEST MODE**
- **No real money is charged**
- **Do NOT use these cards in production**
- **Switch to LIVE MODE** when ready to accept real payments
- **Real cards will NOT work in test mode**

---

## 🚀 Going Live (When Ready)

To accept real payments:

1. **Complete Stripe account verification**
2. **Switch environment variables** in Vercel:
   - Replace `STRIPE_SECRET_KEY` with live key (starts with `sk_live_`)
   - Replace `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with live key (starts with `pk_live_`)
3. **Test with a real card** (your own card, small amount)
4. **Enable production mode**

---

## 📞 Support

If you encounter issues:
- Check Stripe Dashboard: https://dashboard.stripe.com/test/logs
- View payment logs for error details
- Contact Stripe Support: https://support.stripe.com

---

**Happy Testing! 🎉**

